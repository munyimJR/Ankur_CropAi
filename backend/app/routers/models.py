import json
import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.model_registry import RegisteredModel
from app.models.user import User
from app.security import get_current_admin
from app.schemas.model_info import (
    RegisteredModelOut,
    ModelsRegistryResponse,
    ModelTestResultOut,
    TopPrediction
)
from app.schemas.observation import LocalizedText
from app.services.inference_service import inference_engine, CONDITION_MAP

router = APIRouter(prefix="/models", tags=["Model Registry & Provenance"])

def _seed_default_models(db: Session):
    rice_m = db.query(RegisteredModel).filter(RegisteredModel.id == "rice_mobilenetv3").first()
    if not rice_m:
        db.add(RegisteredModel(
            id="rice_mobilenetv3",
            name="Paddy Doctor Rice Disease Classifier (MobileNetV3)",
            version="1.0.0-onnx",
            crop_type="rice",
            framework="onnx",
            artifact_path="rice_mobilenetv3.onnx",
            input_shape="1, 3, 224, 224",
            supported_classes_json=json.dumps(["bacterial_leaf_blight", "blast", "healthy", "other"]),
            provenance_json=json.dumps({
                "sourceRepository": "Hugging Face (Raiyan465/kom-bish-rice-leaf)",
                "license": "CC-BY 4.0",
                "baseArchitecture": "MobileNetV3-Large-100",
                "trainingDataset": "Paddy Doctor (Kaggle paddy-disease-classification) + Mendeley Rice Leaf Datasets",
                "supportedCrops": ["rice"],
                "supportedDiseases": ["Bacterial leaf blight", "Leaf blast", "Healthy foliage", "Unclassified"],
                "limitations": "Trained on individual leaf scans; field photos with intense background foliage require close-up crop."
            }),
            is_active=True
        ))

    pv_eff = db.query(RegisteredModel).filter(RegisteredModel.id == "plantvillage_efficientnetv2").first()
    if not pv_eff:
        classes_path = settings.MODELS_DIR / "classes.json"
        if classes_path.exists():
            with open(classes_path, "r", encoding="utf-8") as f:
                c_data = json.load(f)
                classes_list = c_data.get("classes", [])
        else:
            classes_list = []

        db.add(RegisteredModel(
            id="plantvillage_efficientnetv2",
            name="Crop Disease Classifier (EfficientNetV2-S — 38 Classes)",
            version="1.0.0-onnx",
            crop_type="multi (14 crop species: potato, tomato, maize, apple, grape, pepper, etc.)",
            framework="onnx",
            artifact_path="efficientnet_v2_s_best.onnx",
            input_shape="1, 3, 224, 224",
            supported_classes_json=json.dumps(classes_list),
            provenance_json=json.dumps({
                "sourceRepository": "Hugging Face (BiernyVR/crop-disease-classifier)",
                "sourceUrl": "https://huggingface.co/BiernyVR/crop-disease-classifier",
                "license": "MIT",
                "baseArchitecture": "EfficientNetV2-S (21.5M parameters)",
                "trainingDataset": "PlantVillage Benchmark Dataset (54,306 images across 38 disease & healthy categories spanning 14 crops)",
                "validationAccuracy": "99.89%",
                "macroF1": "~0.999",
                "supportedCrops": ["apple", "blueberry", "cherry", "corn", "grape", "orange", "peach", "pepper", "potato", "raspberry", "soybean", "squash", "strawberry", "tomato"],
                "supportedDiseases": [
                    "Apple Scab", "Black Rot", "Cedar Apple Rust", "Powdery Mildew",
                    "Cercospora / Gray Leaf Spot", "Common Rust", "Northern Leaf Blight",
                    "Esca (Black Measles)", "Isariopsis Leaf Spot", "Huanglongbing (Citrus Greening)",
                    "Bacterial Spot", "Early Blight", "Late Blight", "Leaf Mold",
                    "Septoria Leaf Spot", "Spider Mites", "Target Spot",
                    "Tomato Yellow Leaf Curl Virus (TYLCV)", "Tomato Mosaic Virus", "Leaf Scorch"
                ],
                "limitations": "Trained on individual leaf photographs with controlled backgrounds. Real field images with complex background foliage benefit from close-up leaf cropping."
            }),
            is_active=True
        ))

    pv_m = db.query(RegisteredModel).filter(RegisteredModel.id == "plantvillage_mobilenetv2").first()
    if not pv_m:
        db.add(RegisteredModel(
            id="plantvillage_mobilenetv2",
            name="PlantVillage Multi-Crop Disease Classifier (MobileNetV2)",
            version="1.0.0-onnx",
            crop_type="multi",
            framework="onnx",
            artifact_path="mobilenetv2_plantvillage.onnx",
            input_shape="1, 3, 224, 224",
            supported_classes_json=json.dumps([
                "Potato with Early Blight", "Potato with Late Blight", "Healthy Potato Plant",
                "Tomato with Early Blight", "Tomato with Late Blight", "Tomato Yellow Leaf Curl Virus", "Healthy Tomato Plant",
                "Corn (Maize) with Common Rust", "Healthy Corn (Maize) Plant"
            ]),
            provenance_json=json.dumps({
                "sourceRepository": "Hugging Face (onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX)",
                "license": "Apache-2.0",
                "baseArchitecture": "MobileNetV2-1.0-224 (INT8 Quantized)",
                "trainingDataset": "PlantVillage Benchmark Dataset (38 classes, 54,306 images)",
                "supportedCrops": ["potato", "tomato", "maize", "pepper", "apple", "grape"],
                "supportedDiseases": ["Early blight", "Late blight", "Leaf curl virus", "Common rust", "Bacterial spot"],
                "limitations": "PlantVillage benchmark photos were taken under controlled lab lighting. May exhibit sensitivity to bright tropical sunlight."
            }),
            is_active=True
        ))
    db.commit()

@router.get("", response_model=ModelsRegistryResponse)
def list_registered_models(db: Session = Depends(get_db)):
    """List all registered models, their classes, provenance, and active crop mappings."""
    db_models = db.query(RegisteredModel).order_by(RegisteredModel.created_at.desc()).all()
    if not db_models:
        _seed_default_models(db)
        db_models = db.query(RegisteredModel).order_by(RegisteredModel.created_at.desc()).all()
    out: List[RegisteredModelOut] = []

    for m in db_models:
        try:
            classes = json.loads(str(m.supported_classes_json))
        except Exception:
            classes = []

        try:
            prov = json.loads(str(m.provenance_json))
        except Exception:
            prov = {}

        supp = []
        for cname in classes:
            bn_name = CONDITION_MAP.get(cname, {}).get("name", {}).get("bn", cname)
            supp.append(LocalizedText(en=cname, bn=bn_name))

        # Determine which crops currently map to this model
        active_for = [
            crop for crop, active_id in inference_engine.active_models.items()
            if active_id == str(m.id)
        ]

        out.append(
            RegisteredModelOut(
                id=str(m.id),
                name=str(m.name),
                version=str(m.version),
                cropType=str(m.crop_type),
                framework=str(m.framework),
                inputShape=str(m.input_shape),
                supportedClasses=supp,
                provenance=prov,
                isActive=bool(m.is_active),
                createdAt=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") else str(m.created_at),
                activeForCrops=active_for
            )
        )

    return ModelsRegistryResponse(
        models=out,
        activeMappings=inference_engine.active_models
    )

@router.get("/{model_id}", response_model=RegisteredModelOut)
def get_model_details(model_id: str, db: Session = Depends(get_db)):
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        _seed_default_models(db)
        m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found in registry")

    try:
        classes = json.loads(str(m.supported_classes_json))
    except Exception:
        classes = []

    try:
        prov = json.loads(str(m.provenance_json))
    except Exception:
        prov = {}

    supp = [
        LocalizedText(en=cname, bn=CONDITION_MAP.get(cname, {}).get("name", {}).get("bn", cname))
        for cname in classes
    ]

    active_for = [
        crop for crop, active_id in inference_engine.active_models.items()
        if active_id == str(m.id)
    ]

    return RegisteredModelOut(
        id=str(m.id),
        name=str(m.name),
        version=str(m.version),
        cropType=str(m.crop_type),
        framework=str(m.framework),
        inputShape=str(m.input_shape),
        supportedClasses=supp,
        provenance=prov,
        isActive=bool(m.is_active),
        createdAt=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") else str(m.created_at),
        activeForCrops=active_for
    )

@router.post("/upload", response_model=RegisteredModelOut, status_code=status.HTTP_201_CREATED)
async def upload_model(
    model_file: UploadFile = File(...),
    labels_file: Optional[UploadFile] = File(None),
    model_id: str = Form(...),
    name: str = Form(...),
    version: str = Form("1.0.0-onnx"),
    crop_type: str = Form("rice"),
    classes_text: Optional[str] = Form(None),
    license: Optional[str] = Form("Open Source / CC-BY 4.0"),
    dataset: Optional[str] = Form("Custom Bangladesh Field Dataset"),
    set_active: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Admin endpoint to upload an ONNX model file and its labels,
    dynamically registering it into the inference engine without restarting the server.
    """
    clean_id = re.sub(r"[^a-zA-Z0-9_]", "_", model_id.strip().lower())
    if not clean_id:
        raise HTTPException(status_code=400, detail="Invalid model ID format.")

    if not model_file.filename or not model_file.filename.lower().endswith(".onnx"):
        raise HTTPException(
            status_code=400,
            detail="Invalid model format. Only ONNX (.onnx) format is supported for CPU inference."
        )

    # 1. Save .onnx file to models_weights directory
    target_onnx = settings.MODELS_DIR / f"{clean_id}.onnx"
    try:
        content = await model_file.read()
        if len(content) < 1000:
            raise HTTPException(status_code=400, detail="Uploaded model file is too small or empty.")
        with open(target_onnx, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save model file: {e}")

    # 2. Parse class labels
    classes_list: List[str] = []
    target_cfg = settings.MODELS_DIR / f"{clean_id}_labels.json"

    if labels_file and labels_file.filename:
        try:
            cfg_bytes = await labels_file.read()
            cfg_data = json.loads(cfg_bytes.decode("utf-8"))
            with open(target_cfg, "wb") as f:
                f.write(cfg_bytes)
            if "classes" in cfg_data:
                classes_list = [str(c) for c in cfg_data["classes"]]
            elif "id2label" in cfg_data:
                classes_list = [str(v) for v in cfg_data["id2label"].values()]
            elif isinstance(cfg_data, list):
                classes_list = [str(c) for c in cfg_data]
        except Exception as e:
            # Clean up onnx file
            target_onnx.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=f"Failed to parse labels JSON: {e}")
    elif classes_text and classes_text.strip():
        # Comma or newline separated class names
        raw_items = re.split(r"[,;\n\r]+", classes_text)
        classes_list = [item.strip() for item in raw_items if item.strip()]
        # Write config JSON
        cfg_dict = {"classes": classes_list, "model": clean_id}
        with open(target_cfg, "w", encoding="utf-8") as f:
            json.dump(cfg_dict, f, indent=2)
    else:
        classes_list = ["disease_symptom_1", "healthy"]
        cfg_dict = {"classes": classes_list, "model": clean_id}
        with open(target_cfg, "w", encoding="utf-8") as f:
            json.dump(cfg_dict, f, indent=2)

    # 3. Dynamically test and register into ONNX Runtime Engine
    try:
        inference_engine.register_model_from_files(
            model_id=clean_id,
            model_path=target_onnx,
            config_path=target_cfg if target_cfg.exists() else None,
            classes=classes_list
        )
    except Exception as e:
        target_onnx.unlink(missing_ok=True)
        target_cfg.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded ONNX model could not be initialized by ONNX Runtime: {e}"
        )

    # 4. Activate model for target crop if requested
    if set_active:
        inference_engine.active_models[crop_type.lower()] = clean_id

    # 5. Save to database
    prov_dict = {
        "sourceRepository": "Uploaded via Ankur Admin Model Panel",
        "license": license or "Open Source / CC-BY 4.0",
        "baseArchitecture": "Custom Convolutional Neural Network (ONNX)",
        "trainingDataset": dataset or "Custom Bangladesh Field Research Dataset",
        "supportedCrops": [crop_type],
        "supportedDiseases": classes_list,
        "limitations": "Ensure daylight close-up scan of individual leaves."
    }

    db_model = db.query(RegisteredModel).filter(RegisteredModel.id == clean_id).first()
    if not db_model:
        db_model = RegisteredModel(id=clean_id)
        db.add(db_model)

    db_model.name = name
    db_model.version = version
    db_model.crop_type = crop_type
    db_model.framework = "onnx"
    db_model.artifact_path = f"{clean_id}.onnx"
    db_model.input_shape = "1, 3, 224, 224"
    db_model.supported_classes_json = json.dumps(classes_list)
    db_model.provenance_json = json.dumps(prov_dict)
    db_model.is_active = True
    db.commit()
    db.refresh(db_model)

    supp = [
        LocalizedText(en=c, bn=CONDITION_MAP.get(c, {}).get("name", {}).get("bn", c))
        for c in classes_list
    ]

    active_for = [
        crop for crop, active_id in inference_engine.active_models.items()
        if active_id == clean_id
    ]

    return RegisteredModelOut(
        id=clean_id,
        name=name,
        version=version,
        cropType=crop_type,
        framework="onnx",
        inputShape="1, 3, 224, 224",
        supportedClasses=supp,
        provenance=prov_dict,
        isActive=True,
        createdAt=db_model.created_at.isoformat() if hasattr(db_model.created_at, "isoformat") else str(db_model.created_at),
        activeForCrops=active_for
    )

@router.post("/{model_id}/activate")
def activate_model(
    model_id: str,
    crop: str = "rice",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Activate a registered model for a specific crop (Admin only)."""
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        _seed_default_models(db)
        m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not registered in database")

    # If model is not loaded in engine, attempt to load it
    if model_id not in inference_engine.models:
        model_path = settings.MODELS_DIR / f"{model_id}.onnx"
        cfg_path = settings.MODELS_DIR / f"{model_id}_labels.json"
        if model_path.exists():
            inference_engine.register_model_from_files(model_id, model_path, cfg_path if cfg_path.exists() else None)
        else:
            raise HTTPException(status_code=400, detail="Model binary file missing from storage.")

    inference_engine.active_models[crop.lower()] = model_id
    m.is_active = True
    db.commit()

    return {
        "status": "success",
        "message": f"Model '{model_id}' activated for crop '{crop}'.",
        "activeMappings": inference_engine.active_models
    }

@router.post("/{model_id}/test", response_model=ModelTestResultOut)
async def test_model_inference(model_id: str, file: UploadFile = File(...)):
    """Upload a test leaf image and run inference against this specific model."""
    if model_id not in inference_engine.models:
        # Try loading from disk
        model_path = settings.MODELS_DIR / f"{model_id}.onnx"
        cfg_path = settings.MODELS_DIR / f"{model_id}_labels.json"
        if model_path.exists():
            inference_engine.register_model_from_files(model_id, model_path, cfg_path if cfg_path.exists() else None)
        else:
            raise HTTPException(status_code=404, detail="Model not found or loaded in engine.")

    image_bytes = await file.read()
    try:
        res = inference_engine.test_model(model_id, image_bytes)
        return ModelTestResultOut(
            modelId=res["modelId"],
            latencyMs=res["latencyMs"],
            topClass=res["topClass"],
            confidence=res["confidence"],
            topPredictions=[TopPrediction(**p) for p in res["topPredictions"]]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference failed: {e}")

@router.delete("/{model_id}")
def delete_model(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Remove a custom model from storage, memory, and database (Admin only)."""
    if model_id in ["rice_mobilenetv3", "plantvillage_mobilenetv2", "plantvillage_efficientnetv2"]:
        raise HTTPException(status_code=400, detail="Cannot delete core baseline models.")

    inference_engine.remove_model(model_id)

    # Delete files
    (settings.MODELS_DIR / f"{model_id}.onnx").unlink(missing_ok=True)
    (settings.MODELS_DIR / f"{model_id}_labels.json").unlink(missing_ok=True)

    # Delete from DB
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if m:
        db.delete(m)
        db.commit()

    return {
        "status": "success",
        "message": f"Model '{model_id}' deleted successfully.",
        "activeMappings": inference_engine.active_models
    }
