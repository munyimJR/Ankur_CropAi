def test_weather_and_risks(client):
    r = client.get("/api/v1/farms/farm_sample_bogura/weather")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "current" in data
    assert "tempC" in data["current"]
    assert "humidity" in data["current"]
    assert "forecast" in data
    assert len(data["forecast"]) >= 5
    assert "risks" in data
    assert len(data["risks"]) == 4

    # Climate risks directly
    r_risks = client.get("/api/v1/farms/farm_sample_bogura/climate-risks")
    assert r_risks.status_code == 200
    risks = r_risks.json()
    risk_ids = [rk["id"] for rk in risks]
    assert "heavyRain" in risk_ids
    assert "heat" in risk_ids
    assert "fungal" in risk_ids
    assert "dry" in risk_ids
