import io
import json
from PIL import Image

from app.config import settings
from app.services.inference_service import inference_engine

def create_sample_leaf_bytes():
    """Create a synthetic RGB leaf image."""
    img = Image.new("RGB", (224, 224), color=(46, 125, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()

def test_1_onnx_model_loads_on_cpu():
    """Verify that efficientnet_v2_s_best.onnx loads cleanly on CPU with correct tensor shapes."""
    assert "plantvillage_efficientnetv2" in inference_engine.models
    session = inference_engine.models["plantvillage_efficientnetv2"]
    assert session.is_ready()
    assert session.session is not None

    inputs = session.session.get_inputs()
    outputs = session.session.get_outputs()

    assert len(inputs) == 1
    assert inputs[0].name == "input"
    assert inputs[0].shape == ["batch_size", 3, 224, 224]

    assert len(outputs) == 1
    assert outputs[0].name == "logits"
    assert outputs[0].shape == ["batch_size", 38]

def test_2_exact_38_classes_order():
    """Verify the model session preserves the exact 38-class order from classes.json."""
    classes_path = settings.MODELS_DIR / "classes.json"
    assert classes_path.exists()

    with open(classes_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        raw_classes = data["classes"]

    assert len(raw_classes) == 38
    session = inference_engine.models["plantvillage_efficientnetv2"]
    assert len(session.labels) == 38

    for idx, expected_name in enumerate(raw_classes):
        assert session.labels[idx] == expected_name

    # Check known anchors
    assert session.labels[0] == "Apple___Apple_scab"
    assert session.labels[20] == "Potato___Early_blight"
    assert session.labels[21] == "Potato___Late_blight"
    assert session.labels[22] == "Potato___healthy"
    assert session.labels[37] == "Tomato___healthy"

def test_3_real_inference_execution_and_softmax():
    """Verify inference runs on actual image bytes and produces valid probabilities."""
    img_bytes = create_sample_leaf_bytes()
    test_res = inference_engine.test_model("plantvillage_efficientnetv2", img_bytes)

    assert test_res["modelId"] == "plantvillage_efficientnetv2"
    assert test_res["latencyMs"] > 0
    assert 0.0 <= test_res["confidence"] <= 1.0
    assert test_res["topClass"] in inference_engine.models["plantvillage_efficientnetv2"].labels.values()

    # Verify top predictions
    preds = test_res["topPredictions"]
    assert len(preds) <= 5
    for p in preds:
        assert 0.0 <= p["probability"] <= 1.0

def test_4_crop_aware_filtering_potato_and_tomato(client, tmp_path):
    """Verify crop-aware routing and filtering for supported crops like potato and tomato."""
    img_bytes = create_sample_leaf_bytes()
    test_img = tmp_path / "potato_leaf.jpg"
    test_img.write_bytes(img_bytes)

    # 1. Potato scan
    scan_potato = inference_engine.predict(test_img, crop="potato")
    assert scan_potato.crop == "potato"
    assert scan_potato.model.name == "plantvillage_efficientnetv2"
    assert scan_potato.model.license == "MIT"
    assert "PlantVillage" in scan_potato.model.dataset

    # 2. Tomato scan
    scan_tomato = inference_engine.predict(test_img, crop="tomato")
    assert scan_tomato.crop == "tomato"
    assert scan_tomato.model.name == "plantvillage_efficientnetv2"

    # 3. Via API endpoint POST /api/v1/crop-scans
    files = {"image": ("potato_leaf.jpg", img_bytes, "image/jpeg")}
    r = client.post("/api/v1/crop-scans", files=files, data={"crop": "potato"})
    assert r.status_code == 200
    res = r.json()
    assert res["model"]["name"] == "plantvillage_efficientnetv2"
    assert res["crop"] == "potato"
    assert "condition" in res
    assert "guidance" in res

def test_5_rice_preserves_mobilenetv3(client):
    """Verify rice crop continues using the dedicated rice_mobilenetv3 model."""
    img_bytes = create_sample_leaf_bytes()
    files = {"image": ("rice_leaf.jpg", img_bytes, "image/jpeg")}
    r = client.post("/api/v1/crop-scans", files=files, data={"crop": "rice"})
    assert r.status_code == 200
    res = r.json()
    assert res["model"]["name"] == "rice_mobilenetv3"
    assert res["crop"] == "rice"

def test_6_unsupported_crop_safety_handling(client, tmp_path):
    """Verify unsupported crops (e.g. wheat, which is not in PlantVillage 14 crops) are handled safely."""
    img_bytes = create_sample_leaf_bytes()
    test_img = tmp_path / "wheat_leaf.jpg"
    test_img.write_bytes(img_bytes)

    scan_wheat = inference_engine.predict(test_img, crop="wheat")
    assert scan_wheat.lowConfidence is True
    assert "not in the PlantVillage 38-class" in scan_wheat.safetyNotice

def test_7_model_registry_provenance_and_features(client):
    """Verify model registry returns verified provenance, accuracy, and 38 classes publicly."""
    r = client.get("/api/v1/models/plantvillage_efficientnetv2")
    assert r.status_code == 200
    m = r.json()

    assert m["id"] == "plantvillage_efficientnetv2"
    assert "EfficientNetV2-S" in m["name"]
    assert m["framework"] == "onnx"
    assert m["inputShape"] == "1, 3, 224, 224"
    assert len(m["supportedClasses"]) == 38

    prov = m["provenance"]
    assert prov["sourceUrl"] == "https://huggingface.co/BiernyVR/crop-disease-classifier"
    assert prov["license"] == "MIT"
    assert prov["validationAccuracy"] == "99.89%"
    assert prov["macroF1"] == "~0.999"
    assert "14 crop species" in m["cropType"] or len(prov["supportedCrops"]) == 14

def test_8_admin_access_control_polash_2002(client):
    """
    Verify that AI model edit actions (activate, upload, delete) strictly require
    admin credentials (username 'polash', password '2002'), and reject unauthorized calls.
    """
    # 1. Unauthenticated activate is rejected (401)
    r_unauth = client.post("/api/v1/models/plantvillage_efficientnetv2/activate?crop=potato")
    assert r_unauth.status_code == 401

    # 2. Farmer login (non-admin) cannot activate (403)
    client.post("/api/v1/auth/register", json={
        "email": "farmer_test@ankur.ag",
        "password": "farmerpass123",
        "name": "Normal Farmer",
        "districtId": "dhaka",
        "areaUnit": "acre"
    })
    r_farmer_login = client.post("/api/v1/auth/login", json={
        "email": "farmer_test@ankur.ag",
        "password": "farmerpass123"
    })
    farmer_token = r_farmer_login.json()["accessToken"]
    r_forbidden = client.post(
        "/api/v1/models/plantvillage_efficientnetv2/activate?crop=potato",
        headers={"Authorization": f"Bearer {farmer_token}"}
    )
    assert r_forbidden.status_code == 403
    assert "privileges required" in r_forbidden.json()["detail"].lower()

    # 3. Admin login with polash / 2002 succeeds
    r_admin_login = client.post("/api/v1/auth/login", json={
        "email": "polash",
        "password": "2002"
    })
    assert r_admin_login.status_code == 200
    admin_data = r_admin_login.json()
    assert admin_data["user"]["role"] == "admin"
    admin_token = admin_data["accessToken"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 4. Admin can activate
    r_admin_act = client.post(
        "/api/v1/models/plantvillage_efficientnetv2/activate?crop=potato",
        headers=admin_headers
    )
    assert r_admin_act.status_code == 200
    assert r_admin_act.json()["activeMappings"]["potato"] == "plantvillage_efficientnetv2"

    # 5. Core baseline model cannot be deleted even by admin
    r_del = client.delete(
        "/api/v1/models/plantvillage_efficientnetv2",
        headers=admin_headers
    )
    assert r_del.status_code == 400
    assert "Cannot delete core baseline models" in r_del.json()["detail"]
