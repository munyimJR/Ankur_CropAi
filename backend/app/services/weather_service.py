import time
import logging
from datetime import datetime, timezone
from typing import Dict, Tuple, List
import httpx

from app.config import settings
from app.schemas.weather import (
    CurrentWeatherOut,
    DailyWeatherOut,
    ClimateRiskOut,
    ClimateOverviewOut,
)

logger = logging.getLogger(__name__)

def wmo_code_to_condition(code: int, rain_mm: float = 0.0) -> str:
    """Map WMO weather code to AgriPilot condition: sunny, partly, cloudy, rain, storm."""
    if code in [95, 96, 99] or rain_mm > 35:
        return "storm"
    if code in [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82] or rain_mm > 3:
        return "rain"
    if code in [3, 45, 48]:
        return "cloudy"
    if code in [1, 2]:
        return "partly"
    return "sunny"

class WeatherService:
    def __init__(self):
        # In-memory cache: (lat_round, lng_round) -> (timestamp, data)
        self._cache: Dict[str, Tuple[float, ClimateOverviewOut]] = {}

    async def get_climate_overview(
        self,
        farm_id: str,
        lat: float,
        lng: float
    ) -> ClimateOverviewOut:
        cache_key = f"{round(lat, 2)}_{round(lng, 2)}"
        now = time.time()

        if cache_key in self._cache:
            cached_time, cached_data = self._cache[cache_key]
            if now - cached_time < settings.WEATHER_CACHE_TTL_SECONDS:
                logger.info(f"Returning cached weather for {cache_key}")
                # Clone with current farm_id
                return ClimateOverviewOut(
                    farmId=farm_id,
                    current=cached_data.current,
                    forecast=cached_data.forecast,
                    history=cached_data.history,
                    risks=cached_data.risks,
                    isDemo=False,
                    sourceAttribution="Open-Meteo Weather API (CC-BY 4.0)"
                )

        # Call Open-Meteo API
        url = (
            f"{settings.OPEN_METEO_BASE_URL}/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m"
            f"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max"
            f"&timezone=Asia%2FDhaka&past_days=30&forecast_days=7"
        )

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, headers={"User-Agent": "Ankur/1.0 (https://ankur-bd.ag)"})
                res.raise_for_status()
                data = res.json()
        except Exception as e:
            logger.error(f"Open-Meteo fetch error: {e}. Falling back to safe calculated overview.")
            return self._fallback_weather(farm_id, lat, lng)

        current_raw = data.get("current", {})
        daily_raw = data.get("daily", {})

        cur_temp = float(current_raw.get("temperature_2m", 26.0))
        cur_feels = float(current_raw.get("apparent_temperature", cur_temp + 1))
        cur_hum = int(current_raw.get("relative_humidity_2m", 70))
        cur_wind = float(current_raw.get("wind_speed_10m", 8.0))
        cur_rain = float(current_raw.get("precipitation", 0.0))
        cur_code = int(current_raw.get("weather_code", 1))
        cur_cond = wmo_code_to_condition(cur_code, cur_rain)

        times: List[str] = daily_raw.get("time", [])
        codes: List[int] = daily_raw.get("weather_code", [])
        max_temps: List[float] = daily_raw.get("temperature_2m_max", [])
        min_temps: List[float] = daily_raw.get("temperature_2m_min", [])
        precip_sums: List[float] = daily_raw.get("precipitation_sum", [])
        precip_probs: List[int] = daily_raw.get("precipitation_probability_max", [])

        # The first 30 items are past_days, items from index 30 onwards are today + 6 forecast days
        history_days: List[DailyWeatherOut] = []
        forecast_days: List[DailyWeatherOut] = []

        total_days = len(times)
        split_idx = max(0, total_days - 7)

        for i in range(total_days):
            d_time = times[i] if i < len(times) else "2026-11-19"
            d_code = codes[i] if i < len(codes) else 1
            d_max = float(max_temps[i]) if i < len(max_temps) else 30.0
            d_min = float(min_temps[i]) if i < len(min_temps) else 22.0
            d_rain = float(precip_sums[i]) if i < len(precip_sums) else 0.0
            d_prob = int(precip_probs[i]) if (i < len(precip_probs) and precip_probs[i] is not None) else (80 if d_rain > 5 else 20)
            d_cond = wmo_code_to_condition(d_code, d_rain)

            item = DailyWeatherOut(
                date=d_time,
                condition=d_cond,
                maxC=round(d_max, 1),
                minC=round(d_min, 1),
                rainMm=round(d_rain, 1),
                rainChance=d_prob,
                humidity=cur_hum
            )

            if i < split_idx:
                history_days.append(item)
            else:
                forecast_days.append(item)

        # Calculate climate risks
        max_forecast_rain = max([f.rainMm for f in forecast_days], default=0.0)
        max_forecast_temp = max([f.maxC for f in forecast_days], default=cur_temp)
        total_forecast_rain = sum([f.rainMm for f in forecast_days])

        # 1. Heavy rain risk
        if max_forecast_rain >= 40.0:
            rain_level, rain_score = "high", min(100, int(max_forecast_rain * 2))
        elif max_forecast_rain >= 15.0:
            rain_level, rain_score = "moderate", int(max_forecast_rain * 2.2)
        else:
            rain_level, rain_score = "low", max(5, int(max_forecast_rain * 2))

        # 2. Heat stress risk
        if max_forecast_temp >= 35.0:
            heat_level, heat_score = "high", min(100, int((max_forecast_temp - 25) * 8))
        elif max_forecast_temp >= 31.0:
            heat_level, heat_score = "moderate", int((max_forecast_temp - 25) * 6)
        else:
            heat_level, heat_score = "low", max(5, int((max_forecast_temp - 20) * 3))

        # 3. Fungal favorability risk (high humidity + warm temperature)
        if cur_hum >= 80 and 22 <= cur_temp <= 30:
            fungal_level, fungal_score = "high", min(95, int(cur_hum * 0.95))
        elif cur_hum >= 65 and 20 <= cur_temp <= 32:
            fungal_level, fungal_score = "moderate", 50
        else:
            fungal_level, fungal_score = "low", 20

        # 4. Dry spell risk
        if total_forecast_rain < 2.0 and cur_hum < 55:
            dry_level, dry_score = "high", 80
        elif total_forecast_rain < 8.0:
            dry_level, dry_score = "moderate", 45
        else:
            dry_level, dry_score = "low", 15

        risks = [
            ClimateRiskOut(id="heavyRain", level=rain_level, score=rain_score),
            ClimateRiskOut(id="heat", level=heat_level, score=heat_score),
            ClimateRiskOut(id="fungal", level=fungal_level, score=fungal_score),
            ClimateRiskOut(id="dry", level=dry_level, score=dry_score),
        ]

        overview = ClimateOverviewOut(
            farmId=farm_id,
            current=CurrentWeatherOut(
                tempC=round(cur_temp, 1),
                feelsLikeC=round(cur_feels, 1),
                humidity=cur_hum,
                windKph=round(cur_wind, 1),
                rainMm24h=round(cur_rain, 1),
                condition=cur_cond,
                updatedAt=datetime.now(timezone.utc).isoformat(),
                isDemo=False
            ),
            forecast=forecast_days,
            history=history_days,
            risks=risks,
            isDemo=False,
            sourceAttribution="Open-Meteo Weather API (CC-BY 4.0)"
        )

        self._cache[cache_key] = (now, overview)
        return overview

    def _fallback_weather(self, farm_id: str, lat: float, lng: float) -> ClimateOverviewOut:
        """Safe deterministic fallback when external weather API is momentarily unreachable."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return ClimateOverviewOut(
            farmId=farm_id,
            current=CurrentWeatherOut(
                tempC=26.0,
                feelsLikeC=27.0,
                humidity=72,
                windKph=8.5,
                rainMm24h=0.0,
                condition="partly",
                updatedAt=datetime.now(timezone.utc).isoformat(),
                isDemo=True
            ),
            forecast=[
                DailyWeatherOut(date=today, condition="partly", maxC=29.0, minC=20.0, rainMm=0.0, rainChance=10, humidity=70)
            ],
            history=[
                DailyWeatherOut(date=today, condition="sunny", maxC=28.0, minC=19.0, rainMm=0.0, rainChance=5, humidity=68)
            ],
            risks=[
                ClimateRiskOut(id="heavyRain", level="low", score=10),
                ClimateRiskOut(id="heat", level="low", score=20),
                ClimateRiskOut(id="fungal", level="moderate", score=45),
                ClimateRiskOut(id="dry", level="low", score=15),
            ],
            isDemo=True,
            sourceAttribution="Offline Estimation (Open-Meteo unreachable)"
        )

weather_service = WeatherService()
