from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)

def seed_initial_data():
    from app.models.user import User, Profile
    from app.models.model_registry import RegisteredModel
    from app.security import hash_password
    import json

    db = SessionLocal()
    try:
        # Seed requested admin user: polash / 2002
        polash = db.query(User).filter((User.email == "polash@ankur.ag") | (User.email == "polash")).first()
        if not polash:
            polash = User(
                email="polash@ankur.ag",
                hashed_password=hash_password("2002"),
                role="admin",
                is_active=True
            )
            db.add(polash)
            db.flush()
            prof = Profile(
                user_id=polash.id,
                name="Polash (Administrator)",
                phone="+8801700000001",
                district_id="dhaka",
                area_unit="acre",
                weather_alerts=True,
                simulate_errors=False
            )
            db.add(prof)
            db.commit()
        else:
            polash.hashed_password = hash_password("2002")
            polash.role = "admin"
            db.commit()

        # Seed default admin user
        admin = db.query(User).filter(User.email == "admin@ankur.ag").first()
        if not admin:
            admin = User(
                email="admin@ankur.ag",
                hashed_password=hash_password("admin123456"),
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.flush()
            prof = Profile(
                user_id=admin.id,
                name="Ankur Administrator",
                phone="+8801700000000",
                district_id="dhaka",
                area_unit="acre",
                weather_alerts=True,
                simulate_errors=False
            )
            db.add(prof)
            db.commit()

        # Seed default registered models
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

        # Seed EfficientNetV2 PlantVillage (38 Classes)
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
                is_active=False
            ))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding initial data: {e}")
    finally:
        db.close()
