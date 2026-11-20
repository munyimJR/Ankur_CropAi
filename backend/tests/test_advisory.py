def test_advisory_service(client):
    # English query
    payload_en = {"query": "How to save water with AWD in paddy?", "lang": "en", "crop": "rice"}
    r_en = client.post("/api/v1/advisor/ask", json=payload_en)
    assert r_en.status_code == 200
    data_en = r_en.json()
    assert "AWD" in data_en["title"] or "Water" in data_en["title"]
    assert len(data_en["bullets"]) > 0
    assert len(data_en["sourceCitations"]) > 0

    # Bangla query
    payload_bn = {"query": "ধানের জমিতে ইউরিয়া সার কীভাবে দেব?", "lang": "bn", "crop": "rice"}
    r_bn = client.post("/api/v1/advisor/ask", json=payload_bn)
    assert r_bn.status_code == 200
    data_bn = r_bn.json()
    assert len(data_bn["bullets"]) > 0
    assert len(data_bn["sourceCitations"]) > 0

def test_models_registry(client):
    r = client.get("/api/v1/models")
    assert r.status_code == 200
    data = r.json()
    models = data["models"] if isinstance(data, dict) and "models" in data else data
    assert len(models) >= 2
    model_ids = [m["id"] for m in models]
    assert "rice_mobilenetv3" in model_ids
    assert "plantvillage_mobilenetv2" in model_ids
    if isinstance(data, dict) and "activeMappings" in data:
        assert "rice" in data["activeMappings"]

def test_model_testing_and_activation(client):
    import io
    from PIL import Image

    # Test direct model benchmark
    buf = io.BytesIO()
    Image.new("RGB", (224, 224), color="green").save(buf, format="JPEG")
    buf.seek(0)
    files = {"file": ("leaf.jpg", buf, "image/jpeg")}
    r_test = client.post("/api/v1/models/rice_mobilenetv3/test", files=files)
    assert r_test.status_code == 200
    test_res = r_test.json()
    assert test_res["modelId"] == "rice_mobilenetv3"
    assert "latencyMs" in test_res
    assert len(test_res["topPredictions"]) > 0

    # Test activate endpoint requires admin authentication
    r_unauth = client.post("/api/v1/models/rice_mobilenetv3/activate?crop=rice")
    assert r_unauth.status_code == 401

    # Login as polash (admin)
    r_login = client.post("/api/v1/auth/login", json={"email": "polash", "password": "2002"})
    assert r_login.status_code == 200
    token = r_login.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # Activate model with admin authorization
    r_act = client.post("/api/v1/models/rice_mobilenetv3/activate?crop=rice", headers=headers)
    assert r_act.status_code == 200
    assert r_act.json()["activeMappings"]["rice"] == "rice_mobilenetv3"
