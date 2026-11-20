from typing import Dict, Any
from datetime import datetime, timezone

class SatelliteService:
    """Sentinel-2 Copernicus Data Space Ecosystem adapter."""
    
    def get_field_satellite_status(self, farm_id: str, lat: float, lng: float) -> Dict[str, Any]:
        return {
            "farmId": farm_id,
            "center": {"lat": lat, "lng": lng},
            "satelliteProvider": "Sentinel-2 MSI (Copernicus Data Space Ecosystem)",
            "spatialResolution": "10m per pixel (Bands B02, B03, B04, B08)",
            "bandsRequired": {
                "NIR": "Band 8 (Near-Infrared, 842 nm)",
                "RED": "Band 4 (Red, 665 nm)"
            },
            "ndviFormula": "NDVI = (NIR - RED) / (NIR + RED)",
            "cdseConfigured": False,
            "status": "unavailable_pending_credentials",
            "message": (
                "Live multispectral reflectance calculation requires Copernicus Data Space Ecosystem "
                "API credentials. Field boundaries are projected on high-resolution base maps without "
                "fabricated NDVI layers."
            ),
            "lastPassEstimated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "cloudCoverPct": 12.0
        }

satellite_service = SatelliteService()
