import io
from PIL import Image

def create_test_image_bytes():
    img = Image.new("RGB", (224, 224), color=(34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()

def test_crop_scan_inference(client):
    img_bytes = create_test_image_bytes()
    files = {"image": ("test_leaf.jpg", img_bytes, "image/jpeg")}
    data = {"crop": "rice"}

    r = client.post("/api/v1/crop-scans", files=files, data=data)
    assert r.status_code == 200, r.text
    res = r.json()

    assert "id" in res
    assert res["crop"] == "rice"
    assert "condition" in res
    assert "name" in res["condition"]
    assert "sampleConfidence" in res
    assert 0.0 <= res["sampleConfidence"] <= 1.0
    assert "alternatives" in res
    assert "guidance" in res
    assert len(res["guidance"]) > 0
    assert "model" in res
    assert res["model"]["name"] == "rice_mobilenetv3"
    assert "safetyNotice" in res
    assert res["isDemo"] is False

def test_crop_scan_potato_inference(client):
    img_bytes = create_test_image_bytes()
    files = {"image": ("potato_leaf.jpg", img_bytes, "image/jpeg")}
    data = {"crop": "potato"}

    r = client.post("/api/v1/crop-scans", files=files, data=data)
    assert r.status_code == 200, r.text
    res = r.json()
    assert res["crop"] == "potato"
    assert res["model"]["name"] == "plantvillage_efficientnetv2"

def test_crop_scan_invalid_file(client):
    # Empty file
    files = {"image": ("empty.jpg", b"", "image/jpeg")}
    r = client.post("/api/v1/crop-scans", files=files, data={"crop": "rice"})
    assert r.status_code == 400

    # Non-image file
    files = {"image": ("bad.txt", b"not an image", "text/plain")}
    r = client.post("/api/v1/crop-scans", files=files, data={"crop": "rice"})
    assert r.status_code == 415
