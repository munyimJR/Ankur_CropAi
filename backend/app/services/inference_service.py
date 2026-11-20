import json
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List

import numpy as np
from PIL import Image
import onnxruntime as ort

from app.config import settings
from app.schemas.crop_scan import (
    CropAnalysisResultOut,
    CropConditionSchema,
    AlternativePrediction,
    ModelMetadataOut,
)
from app.schemas.observation import LocalizedText

logger = logging.getLogger(__name__)

# Agronomic localized labels and guidelines
CONDITION_MAP: Dict[str, Dict[str, Any]] = {
    # Rice classes (from Paddy Doctor / MobileNetV3)
    "bacterial_leaf_blight": {
        "id": "rice_blb",
        "name": {"en": "Bacterial leaf blight", "bn": "পাতা পোড়া রোগ (ব্যাকটেরিয়াল লিফ ব্লাইট)"},
        "category": "bacterial",
        "crop": "rice",
        "guidance": [
            {"en": "Avoid excess nitrogen fertilizer (urea); split application into multiple doses.", "bn": "অতিরিক্ত ইউরিয়া সার এড়িয়ে চলুন; কিস্তিতে প্রয়োগ করুন।"},
            {"en": "Keep irrigation water moving or drain standing water if infected plots are flooded.", "bn": "আক্রান্ত জমিতে দীর্ঘক্ষণ পানি জমিয়ে রাখবেন না; নিষ্কাশন ব্যবস্থা সচল রাখুন।"},
            {"en": "Consult your local DAE upazila agriculture office before applying copper bactericide.", "bn": "কপারযুক্ত ব্যাকটেরিসাইড ব্যবহারের পূর্বে স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।"}
        ]
    },
    "blast": {
        "id": "rice_blast",
        "name": {"en": "Leaf blast", "bn": "ব্লাস্ট রোগ (লিফ ব্লাস্ট)"},
        "category": "fungal",
        "crop": "rice",
        "guidance": [
            {"en": "Maintain a standing water layer (2–3 inches) to discourage blast spore germination.", "bn": "জমিতে পর্যাপ্ত পানি (২-৩ ইঞ্চি) ধরে রাখুন যাতে ব্লাস্ট ছত্রাক দ্রুত ছড়াতে না পারে।"},
            {"en": "Avoid excessive nitrogen top-dressing during vegetative and tillering stages.", "bn": "কুশি ও বৃদ্ধির পর্যায়ে অতিরিক্ত নাইট্রোজেন সার ব্যবহার বন্ধ রাখুন।"},
            {"en": "Inspect neighboring plots for diamond-shaped lesions with gray centers.", "bn": "ধূসর কেন্দ্রযুক্ত চোখা দাগ দেখা দিলে দ্রুত স্থানীয় উপসহকারী কৃষি কর্মকর্তার পরামর্শ নিন।"}
        ]
    },
    "healthy": {
        "id": "crop_healthy",
        "name": {"en": "Healthy plant / leaf", "bn": "সুস্থ গাছ / পাতা"},
        "category": "healthy",
        "crop": "any",
        "guidance": [
            {"en": "No disease symptoms detected. Continue routine scouting and water monitoring.", "bn": "কোনো রোগের লক্ষণ দেখা যায়নি। নিয়মিত পর্যবেক্ষণ ও পরিমিত সেচ বজায় রাখুন।"},
            {"en": "Maintain balanced balanced N-P-K fertilizer according to soil test recommendations.", "bn": "সুষম সার প্রয়োগ অব্যাহত রাখুন।"}
        ]
    },
    "other": {
        "id": "crop_unclassified",
        "name": {"en": "Unclassified symptom or background", "bn": "অনির্ধারিত লক্ষণ বা পটভূমি"},
        "category": "nutrient",
        "crop": "any",
        "guidance": [
            {"en": "The image features could not be matched with high certainty to trained disease patterns.", "bn": "ছবির বৈশিষ্ট্য কোনো পরিচিত রোগের সাথে নিশ্চিতভাবে মেলেনি।"},
            {"en": "Take a clear, well-lit photo focusing solely on a single leaf blade without glare.", "bn": "দিনের আলোতে ছায়া বা ঝলকানি ছাড়া একক পাতার স্পষ্ট ছবি আবার তুলুন।"}
        ]
    },
    # Potato classes (PlantVillage)
    "Potato with Early Blight": {
        "id": "potato_early_blight",
        "name": {"en": "Early blight (Alternaria solani)", "bn": "আগাম ধসা রোগ (আর্লি ব্লাইট)"},
        "category": "fungal",
        "crop": "potato",
        "guidance": [
            {"en": "Look for concentric brown rings on older lower leaves.", "bn": "নিচের দিকের পুরোনো পাতায় বৃত্তাকার বাদামি দাগ পর্যবেক্ষণ করুন।"},
            {"en": "Avoid overhead sprinkler irrigation; keep foliage dry.", "bn": "পাতার ওপর সরাসরি পানি ছিটানো এড়িয়ে চলুন।"},
            {"en": "Remove severely infected lower leaves and dispose away from the field.", "bn": "মারাত্মক আক্রান্ত পাতা ছিঁড়ে দূরে মাটির নিচে পুঁতে ফেলুন।"}
        ]
    },
    "Potato with Late Blight": {
        "id": "potato_late_blight",
        "name": {"en": "Late blight (Phytophthora infestans)", "bn": "নাবি ধসা রোগ (লেট ব্লাইট)"},
        "category": "fungal",
        "crop": "potato",
        "guidance": [
            {"en": "Critical alert: Late blight spreads rapidly under cold, foggy, high-humidity weather.", "bn": "সতর্কতা: কুয়াশাচ্ছন্ন ও আর্দ্র আবহাওয়ায় নাবি ধসা দ্রুত মহামারি রূপ নিতে পারে।"},
            {"en": "Check leaf margins and undersides for water-soaked dark lesions with white mold.", "bn": "পাতার কিনারে জলছাপ বাদামি দাগ ও নিচের অংশে সাদা পাউডার আছে কিনা দেখুন।"},
            {"en": "Urgent: Consult your Upazila Agriculture Officer (UAO) for preventative fungicide spray.", "bn": "জরুরি: প্রতিরোধমূলক অনুমোদিত ছত্রাকনাশক স্প্রে করার জন্য নিকটস্থ কৃষি অফিসে যোগাযোগ করুন।"}
        ]
    },
    "Healthy Potato Plant": {
        "id": "potato_healthy",
        "name": {"en": "Healthy potato foliage", "bn": "সুস্থ আলু পাতা"},
        "category": "healthy",
        "crop": "potato",
        "guidance": [
            {"en": "Foliage appears vigorous and free of blight lesions.", "bn": "গাছ সতেজ এবং ধসার কোনো দাগ পাওয়া যায়নি।"},
            {"en": "Keep alert during winter fog spells.", "bn": "শীতের কুয়াশার সময় নিয়মিত জমির নজরদারি রাখুন।"}
        ]
    },
    # Tomato classes (PlantVillage)
    "Tomato with Early Blight": {
        "id": "tomato_early_blight",
        "name": {"en": "Tomato early blight", "bn": "টমেটোর আগাম ধসা"},
        "category": "fungal",
        "crop": "tomato",
        "guidance": [
            {"en": "Prune affected bottom leaves to improve air circulation.", "bn": "বাতাস চলাচলের সুবিধার্থে নিচের আক্রান্ত পাতা কেটে ফেলুন।"},
            {"en": "Mulch the soil surface around plants to prevent splash dispersal.", "bn": "মাটিতে মালচিং ব্যবহার করুন যাতে সেচের পানি পাতায় ছিটকে না ওঠে।"}
        ]
    },
    "Tomato with Late Blight": {
        "id": "tomato_late_blight",
        "name": {"en": "Tomato late blight", "bn": "টমেটোর নাবি ধসা"},
        "category": "fungal",
        "crop": "tomato",
        "guidance": [
            {"en": "Remove infected leaves immediately under dry conditions.", "bn": "শুষ্ক আবহাওয়ায় দ্রুত আক্রান্ত অংশ অপসারণ করুন।"},
            {"en": "Seek advice on copper or systemic fungicides from extension officers.", "bn": "উপযুক্ত ছত্রাকনাশকের জন্য উপসহকারী কর্মকর্তার সহায়তা নিন।"}
        ]
    },
    "Tomato Yellow Leaf Curl Virus": {
        "id": "tomato_leaf_curl",
        "name": {"en": "Tomato yellow leaf curl virus (TYLCV)", "bn": "টমেটোর পাতা কোঁকড়ানো ভাইরাস (লিফ কার্ল)"},
        "category": "pest",
        "crop": "tomato",
        "guidance": [
            {"en": "Transmitted by whiteflies (Bemisia tabaci). Control whitefly populations.", "bn": "এই রোগটি সাদা মাছি পোকার মাধ্যমে ছড়ায়। সাদা মাছি দমনে হলুদ ফাঁদ ব্যবহার করুন।"},
            {"en": "Uproot and bury severely stunted and yellowed plants to protect neighbors.", "bn": "মারাত্মক হলুদ ও কোঁকড়ানো গাছ তুলে নষ্ট করে ফেলুন।"}
        ]
    },
    "Healthy Tomato Plant": {
        "id": "tomato_healthy",
        "name": {"en": "Healthy tomato foliage", "bn": "সুস্থ টমেটো পাতা"},
        "category": "healthy",
        "crop": "tomato",
        "guidance": [
            {"en": "Plant shows healthy chlorophyll and leaf structure.", "bn": "পাতা সুস্থ ও স্বাভাবিক।"},
            {"en": "Continue routine watering and staking.", "bn": "সময়মতো সেচ ও খুঁটি দেওয়া অব্যাহত রাখুন।"}
        ]
    },
    # Corn / Maize classes (PlantVillage)
    "Corn (Maize) with Common Rust": {
        "id": "maize_rust",
        "name": {"en": "Maize common rust (Puccinia sorghi)", "bn": "ভুট্টার মরিচা রোগ (কমন রাস্ট)"},
        "category": "fungal",
        "crop": "maize",
        "guidance": [
            {"en": "Brown to reddish pustules appear on upper and lower leaf surfaces.", "bn": "পাতার দুই পিঠেই লালচে-বাদামি গুঁড়া দাগ লক্ষ্য করুন।"},
            {"en": "Avoid excessive plant density; promote field sunlight and airflow.", "bn": "গাছের ঘনত্ব বেশি হলে বাতাস ও রোদের চলাচলের ব্যবস্থা করুন।"}
        ]
    },
    "Healthy Corn (Maize) Plant": {
        "id": "maize_healthy",
        "name": {"en": "Healthy maize foliage", "bn": "সুস্থ ভুট্টা পাতা"},
        "category": "healthy",
        "crop": "maize",
        "guidance": [
            {"en": "No rust or leaf blight spots detected.", "bn": "পাতা সম্পূর্ণ সুস্থ।"}
        ]
    }
}

def to_localized_text(val: Any) -> LocalizedText:
    if isinstance(val, LocalizedText):
        return val
    if isinstance(val, dict):
        return LocalizedText(en=str(val.get("en", "")), bn=str(val.get("bn", "")))
    return LocalizedText(en=str(val), bn=str(val))

class ModelSession:
    def __init__(self, model_id: str, model_path: Path, config_path: Optional[Path] = None):
        self.model_id = model_id
        self.model_path = model_path
        self.config_path = config_path
        self.session: Optional[ort.InferenceSession] = None
        self.labels: Dict[int, str] = {}
        self.input_name: str = "input"
        self.output_name: str = "logits"
        self._load()

    def _load(self):
        if not self.model_path.exists():
            logger.warning(f"Model path does not exist: {self.model_path}")
            return
        logger.info(f"Loading ONNX session from {self.model_path}")
        self.session = ort.InferenceSession(
            str(self.model_path),
            providers=["CPUExecutionProvider"]
        )
        inputs = self.session.get_inputs()
        outputs = self.session.get_outputs()
        if inputs:
            self.input_name = inputs[0].name
        if outputs:
            self.output_name = outputs[0].name

        if self.config_path and self.config_path.exists():
            with open(self.config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    if "classes" in data and isinstance(data["classes"], list):
                        self.labels = {i: c for i, c in enumerate(data["classes"])}
                    elif "id2label" in data and isinstance(data["id2label"], dict):
                        self.labels = {int(k): v for k, v in data["id2label"].items()}
                    elif "names" in data:
                        if isinstance(data["names"], dict):
                            self.labels = {int(k): v for k, v in data["names"].items()}
                        elif isinstance(data["names"], list):
                            self.labels = {i: c for i, c in enumerate(data["names"])}
                elif isinstance(data, list):
                    self.labels = {i: c for i, c in enumerate(data)}

    def is_ready(self) -> bool:
        return self.session is not None

CROP_TO_PLANTVILLAGE_PREFIX = {
    "potato": ["potato"],
    "tomato": ["tomato"],
    "maize": ["corn_(maize)"],
    "corn": ["corn_(maize)"],
    "pepper": ["pepper,_bell"],
    "chili": ["pepper,_bell"],
    "bell_pepper": ["pepper,_bell"],
    "apple": ["apple"],
    "grape": ["grape"],
    "peach": ["peach"],
    "cherry": ["cherry_(including_sour)"],
    "strawberry": ["strawberry"],
    "orange": ["orange"],
    "citrus": ["orange"],
    "soybean": ["soybean"],
    "squash": ["squash"],
    "blueberry": ["blueberry"],
    "raspberry": ["raspberry"],
}

def format_condition_details(raw_name: str, selected_crop: str = "") -> Dict[str, Any]:
    """Provides human-readable English, Bengali translations, categories, and agronomic guidance."""
    if raw_name in CONDITION_MAP:
        return CONDITION_MAP[raw_name]

    if "___" in raw_name:
        crop_part, disease_part = raw_name.split("___", 1)
        crop_clean = crop_part.replace("_", " ").replace("(including sour)", "").replace("(maize)", "").replace(", bell", "").strip().title()
        disease_clean = disease_part.replace("_", " ").strip()
        is_healthy = "healthy" in disease_part.lower()

        crop_bn_map = {
            "Apple": "আপেল", "Corn": "ভুট্টা", "Grape": "আঙুর", "Peach": "পিচ",
            "Pepper": "মরিচ", "Potato": "আলু", "Tomato": "টমেটো", "Cherry": "চেরি",
            "Blueberry": "ব্লুবেরি", "Orange": "কমলা", "Raspberry": "রাস্পবেরি",
            "Soybean": "সয়াবিন", "Squash": "মিষ্টি কুমড়া", "Strawberry": "স্ট্রবেরি"
        }
        crop_bn = crop_bn_map.get(crop_clean, crop_clean)

        if is_healthy:
            name_en = f"Healthy {crop_clean} Foliage"
            name_bn = f"সুস্থ {crop_bn} পাতা"
            category = "healthy"
            guidance = [
                {"en": f"No active disease symptoms detected on {crop_clean.lower()} foliage.", "bn": f"{crop_bn} পাতায় কোনো সক্রিয় রোগের লক্ষণ নেই।"},
                {"en": "Continue routine scout monitoring and balanced irrigation.", "bn": "নিয়মিত পর্যবেক্ষণ ও পরিমিত সেচ বজায় রাখুন।"}
            ]
        else:
            name_en = f"{crop_clean} — {disease_clean}"
            disease_bn_map = {
                "Early blight": "আগাম ধসা (আর্লি ব্লাইট)",
                "Late blight": "নাবি ধসা (লেট ব্লাইট)",
                "Bacterial spot": "ব্যাকটেরিয়াজনিত পাতার দাগ",
                "Common rust": "সাধারণ মরিচা রোগ",
                "Northern Leaf Blight": "নর্দার্ন লিফ ব্লাইট (পাতা ঝলসানো)",
                "Cercospora leaf spot Gray leaf spot": "সারকোস্পোরা পাতা দাগ",
                "Apple scab": "স্ক্যাব রোগ",
                "Black rot": "কালো পচন (ব্ল্যাক রট)",
                "Cedar apple rust": "সিডার মরিচা রোগ",
                "Powdery mildew": "পাউডারি মিলডিউ",
                "Esca (Black Measles)": "এসকা (কালো মিসলস) রোগ",
                "Leaf blight (Isariopsis Leaf Spot)": "পাতা পোড়া রোগ",
                "Haunglongbing (Citrus greening)": "সাইট্রাস গ্রিনিং (HLB)",
                "Leaf Mold": "লিফ মোল্ড",
                "Septoria leaf spot": "সেপটোরিয়া পাতার দাগ",
                "Spider mites Two-spotted spider mite": "লাল মাকড় (স্পাইডার মাইট)",
                "Target Spot": "টার্গেট স্পট",
                "Tomato Yellow Leaf Curl Virus": "পাতা কোঁকড়ানো ভাইরাস (TYLCV)",
                "Tomato mosaic virus": "মোজাইক ভাইরাস",
                "Leaf scorch": "পাতা ঝলসানো রোগ"
            }
            name_bn = f"{crop_bn}-এর {disease_bn_map.get(disease_clean, disease_clean)}"

            if "virus" in disease_part.lower() or "curl" in disease_part.lower() or "mosaic" in disease_part.lower():
                category = "viral"
                guidance = [
                    {"en": "Viral disease vector control is essential. Check for whiteflies or aphids.", "bn": "ভাইরাস রোগ বাহক পোকা (সাদা মাছি বা জাবপোকা) দমনে নজর দিন।"},
                    {"en": "Rogue out and destroy severely stunted or deformed plants.", "bn": "মারাত্মক আক্রান্ত গাছ দ্রুত জমি থেকে তুলে নষ্ট করে ফেলুন।"}
                ]
            elif "bacterial" in disease_part.lower() or "haunglongbing" in disease_part.lower():
                category = "bacterial"
                guidance = [
                    {"en": "Avoid overhead watering to minimize splash transmission between leaves.", "bn": "পাতার ওপর পানি ছিটানো এড়িয়ে চলুন যাতে জীবাণু না ছড়ায়।"},
                    {"en": "Consult an authorized DAE agriculture officer before applying copper bactericide.", "bn": "অনুমোদিত কপার ব্যাকটেরিসাইড ব্যবহারের আগে স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।"}
                ]
            elif "mite" in disease_part.lower():
                category = "pest"
                guidance = [
                    {"en": "Spider mite webbing and stippling detected. Inspect undersides of leaves.", "bn": "পাতার নিচের অংশে মাকড় ও সূক্ষ্ম জাল আছে কিনা আতশ কাচ দিয়ে পরীক্ষা করুন।"},
                    {"en": "Apply registered miticide or neem oil extract under dry conditions.", "bn": "প্রয়োজনে নিম তেলের নির্যাস বা অনুমোদিত মাকড়নাশক ব্যবহার করুন।"}
                ]
            else:
                category = "fungal"
                guidance = [
                    {"en": f"Symptoms consistent with fungal {disease_clean}. Remove heavily infected foliage.", "bn": "ছত্রাকজনিত লক্ষণ শনাক্ত হয়েছে। মারাত্মক আক্রান্ত পাতা অপসারণ করুন।"},
                    {"en": "Seek advice from your Upazila Agriculture Officer (UAO) for recommended fungicide.", "bn": "উপযুক্ত ছত্রাকনাশকের মাত্রা ও স্প্রে বিধির জন্য উপজেলা কৃষি অফিসে যোগাযোগ করুন।"}
                ]

        return {
            "id": f"cond_{raw_name.replace('___', '_').replace(' ', '_').lower()}",
            "name": {"en": name_en, "bn": name_bn},
            "category": category,
            "crop": crop_clean.lower(),
            "guidance": guidance
        }

    return {
        "id": f"cond_{raw_name.lower().replace(' ', '_')}",
        "name": {"en": raw_name, "bn": f"{raw_name} (সম্ভাব্য)"},
        "category": "fungal",
        "crop": selected_crop or "any",
        "guidance": [
            {"en": f"Symptoms match {raw_name}. Monitor leaf progression daily.", "bn": f"লক্ষণগুলো {raw_name}-এর সাথে মিলেছে। প্রতিদিন পাতা পর্যবেক্ষণ করুন।"},
            {"en": "Confirm with local DAE agriculture officer before applying treatments.", "bn": "কোনো কীটনাশক ব্যবহারের আগে স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।"}
        ]
    }

CROP_TO_PLANTVILLAGE_PREFIX = {
    "potato": ["potato"],
    "tomato": ["tomato"],
    "maize": ["corn_(maize)"],
    "corn": ["corn_(maize)"],
    "pepper": ["pepper,_bell"],
    "chili": ["pepper,_bell"],
    "bell_pepper": ["pepper,_bell"],
    "apple": ["apple"],
    "grape": ["grape"],
    "peach": ["peach"],
    "cherry": ["cherry_(including_sour)"],
    "strawberry": ["strawberry"],
    "orange": ["orange"],
    "citrus": ["orange"],
    "soybean": ["soybean"],
    "squash": ["squash"],
    "blueberry": ["blueberry"],
    "raspberry": ["raspberry"],
}

def format_condition_details(raw_name: str, selected_crop: str = "") -> Dict[str, Any]:
    """Provides human-readable English, Bengali translations, categories, and agronomic guidance."""
    if raw_name in CONDITION_MAP:
        return CONDITION_MAP[raw_name]

    if "___" in raw_name:
        crop_part, disease_part = raw_name.split("___", 1)
        crop_clean = crop_part.replace("_", " ").replace("(including sour)", "").replace("(maize)", "").replace(", bell", "").strip().title()
        disease_clean = disease_part.replace("_", " ").strip()
        is_healthy = "healthy" in disease_part.lower()

        crop_bn_map = {
            "Apple": "আপেল", "Corn": "ভুট্টা", "Grape": "আঙুর", "Peach": "পিচ",
            "Pepper": "মরিচ", "Potato": "আলু", "Tomato": "টমেটো", "Cherry": "চেরি",
            "Blueberry": "ব্লুবেরি", "Orange": "কমলা", "Raspberry": "রাস্পবেরি",
            "Soybean": "সয়াবিন", "Squash": "মিষ্টি কুমড়া", "Strawberry": "স্ট্রবেরি"
        }
        crop_bn = crop_bn_map.get(crop_clean, crop_clean)

        if is_healthy:
            name_en = f"Healthy {crop_clean} Foliage"
            name_bn = f"সুস্থ {crop_bn} পাতা"
            category = "healthy"
            guidance = [
                {"en": f"No active disease symptoms detected on {crop_clean.lower()} foliage.", "bn": f"{crop_bn} পাতায় কোনো সক্রিয় রোগের লক্ষণ নেই।"},
                {"en": "Continue routine scout monitoring and balanced irrigation.", "bn": "নিয়মিত পর্যবেক্ষণ ও পরিমিত সেচ বজায় রাখুন।"}
            ]
        else:
            name_en = f"{crop_clean} — {disease_clean}"
            disease_bn_map = {
                "Early blight": "আগাম ধসা (আর্লি ব্লাইট)",
                "Late blight": "নাবি ধসা (লেট ব্লাইট)",
                "Bacterial spot": "ব্যাকটেরিয়াজনিত পাতার দাগ",
                "Common rust": "সাধারণ মরিচা রোগ",
                "Northern Leaf Blight": "নর্দার্ন লিফ ব্লাইট (পাতা ঝলসানো)",
                "Cercospora leaf spot Gray leaf spot": "সারকোস্পোরা পাতা দাগ",
                "Apple scab": "স্ক্যাব রোগ",
                "Black rot": "কালো পচন (ব্ল্যাক রট)",
                "Cedar apple rust": "সিডার মরিচা রোগ",
                "Powdery mildew": "পাউডারি মিলডিউ",
                "Esca (Black Measles)": "এসকা (কালো মিসলস) রোগ",
                "Leaf blight (Isariopsis Leaf Spot)": "পাতা পোড়া রোগ",
                "Haunglongbing (Citrus greening)": "সাইট্রাস গ্রিনিং (HLB)",
                "Leaf Mold": "লিফ মোল্ড",
                "Septoria leaf spot": "সেপটোরিয়া পাতার দাগ",
                "Spider mites Two-spotted spider mite": "লাল মাকড় (স্পাইডার মাইট)",
                "Target Spot": "টার্গেট স্পট",
                "Tomato Yellow Leaf Curl Virus": "পাতা কোঁকড়ানো ভাইরাস (TYLCV)",
                "Tomato mosaic virus": "মোজাইক ভাইরাস",
                "Leaf scorch": "পাতা ঝলসানো রোগ"
            }
            name_bn = f"{crop_bn}-এর {disease_bn_map.get(disease_clean, disease_clean)}"

            if "virus" in disease_part.lower() or "curl" in disease_part.lower() or "mosaic" in disease_part.lower():
                category = "viral"
                guidance = [
                    {"en": "Viral disease vector control is essential. Check for whiteflies or aphids.", "bn": "ভাইরাস রোগ বাহক পোকা (সাদা মাছি বা জাবপোকা) দমনে নজর দিন।"},
                    {"en": "Rogue out and destroy severely stunted or deformed plants.", "bn": "মারাত্মক আক্রান্ত গাছ দ্রুত জমি থেকে তুলে নষ্ট করে ফেলুন।"}
                ]
            elif "bacterial" in disease_part.lower() or "haunglongbing" in disease_part.lower():
                category = "bacterial"
                guidance = [
                    {"en": "Avoid overhead watering to minimize splash transmission between leaves.", "bn": "পাতার ওপর পানি ছিটানো এড়িয়ে চলুন যাতে জীবাণু না ছড়ায়।"},
                    {"en": "Consult an authorized DAE agriculture officer before applying copper bactericide.", "bn": "অনুমোদিত কপার ব্যাকটেরিসাইড ব্যবহারের আগে স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।"}
                ]
            elif "mite" in disease_part.lower():
                category = "pest"
                guidance = [
                    {"en": "Spider mite webbing and stippling detected. Inspect undersides of leaves.", "bn": "পাতার নিচের অংশে মাকড় ও সূক্ষ্ম জাল আছে কিনা আতশ কাচ দিয়ে পরীক্ষা করুন।"},
                    {"en": "Apply registered miticide or neem oil extract under dry conditions.", "bn": "প্রয়োজনে নিম তেলের নির্যাস বা অনুমোদিত মাকড়নাশক ব্যবহার করুন।"}
                ]
            else:
                category = "fungal"
                guidance = [
                    {"en": f"Symptoms consistent with fungal {disease_clean}. Remove heavily infected foliage.", "bn": f"ছত্রাকজনিত লক্ষণ শনাক্ত হয়েছে। মারাত্মক আক্রান্ত পাতা অপসারণ করুন।"},
                    {"en": "Seek advice from your Upazila Agriculture Officer (UAO) for recommended fungicide.", "bn": "উপযুক্ত ছত্রাকনাশকের মাত্রা ও স্প্রে বিধির জন্য উপজেলা কৃষি অফিসে যোগাযোগ করুন।"}
                ]

        return {
            "id": f"cond_{raw_name.replace('___', '_').replace(' ', '_').lower()}",
            "name": {"en": name_en, "bn": name_bn},
            "category": category,
            "crop": crop_clean.lower(),
            "guidance": guidance
        }

    return {
        "id": f"cond_{raw_name.lower().replace(' ', '_')}",
        "name": {"en": raw_name, "bn": f"{raw_name} (সম্ভাব্য)"},
        "category": "fungal",
        "crop": selected_crop or "any",
        "guidance": [
            {"en": f"Symptoms match {raw_name}. Monitor leaf progression daily.", "bn": f"লক্ষণগুলো {raw_name}-এর সাথে মিলেছে। প্রতিদিন পাতা পর্যবেক্ষণ করুন।"},
            {"en": "Confirm with local DAE agriculture officer before applying treatments.", "bn": "কোনো কীটনাশক ব্যবহারের আগে স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।"}
        ]
    }

class InferenceEngine:
    def __init__(self):
        self.models: Dict[str, ModelSession] = {}
        self.active_models: Dict[str, str] = {
            "rice": "rice_mobilenetv3",
            "potato": "plantvillage_efficientnetv2",
            "tomato": "plantvillage_efficientnetv2",
            "maize": "plantvillage_efficientnetv2",
            "corn": "plantvillage_efficientnetv2",
            "apple": "plantvillage_efficientnetv2",
            "grape": "plantvillage_efficientnetv2",
            "pepper": "plantvillage_efficientnetv2",
            "chili": "plantvillage_efficientnetv2",
            "general": "plantvillage_efficientnetv2",
        }
        self._initialize_default_models()

    def _initialize_default_models(self):
        # 1. Pretrained EfficientNetV2-S PlantVillage (38 Classes)
        eff_path = settings.MODELS_DIR / "efficientnet_v2_s_best.onnx"
        eff_cfg = settings.MODELS_DIR / "classes.json"
        if eff_path.exists():
            self.models["plantvillage_efficientnetv2"] = ModelSession(
                "plantvillage_efficientnetv2", eff_path, eff_cfg
            )
            logger.info("Registered plantvillage_efficientnetv2 (38 classes, EfficientNetV2-S)")

        # 2. Rice Leaf MobileNetV3 (Paddy Doctor / Bangladesh)
        rice_path = settings.MODELS_DIR / "rice_mobilenetv3.onnx"
        rice_cfg = settings.MODELS_DIR / "rice_labels.json"
        if rice_path.exists():
            self.models["rice_mobilenetv3"] = ModelSession(
                "rice_mobilenetv3", rice_path, rice_cfg
            )
            logger.info("Registered rice_mobilenetv3")

        # 3. Baseline PlantVillage MobileNetV2
        pv_path = settings.MODELS_DIR / "mobilenetv2_plantvillage.onnx"
        pv_cfg = settings.MODELS_DIR / "config.json"
        if pv_path.exists():
            self.models["plantvillage_mobilenetv2"] = ModelSession(
                "plantvillage_mobilenetv2", pv_path, pv_cfg
            )

    def register_model_from_files(
        self,
        model_id: str,
        model_path: Path,
        config_path: Optional[Path] = None,
        classes: Optional[List[str]] = None
    ) -> ModelSession:
        """Dynamically load and register a newly uploaded ONNX model."""
        session = ModelSession(model_id, model_path, config_path)
        if not session.is_ready():
            raise ValueError(f"Failed to initialize ONNX runtime session for {model_id}")

        if not session.labels and classes:
            session.labels = {i: c for i, c in enumerate(classes)}

        self.models[model_id] = session
        logger.info(f"Dynamically registered model: {model_id} with {len(session.labels)} classes.")
        return session

    def test_model(self, model_id: str, image_bytes: bytes) -> Dict[str, Any]:
        """Test inference directly against a specific model with latency benchmarking."""
        session = self.models.get(model_id)
        if not session or not session.is_ready():
            raise ValueError(f"Model {model_id} is not loaded or ready.")

        import io
        import time
        t0 = time.perf_counter()
        image = Image.open(io.BytesIO(image_bytes))
        tensor = self.preprocess_image(image)

        if not session.session:
            raise ValueError("ONNX session not available.")

        raw_outputs = session.session.run([session.output_name], {session.input_name: tensor})
        logits = raw_outputs[0]

        exp_logits = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
        probs = exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)
        probs_flat = probs[0]

        top_indices = np.argsort(probs_flat)[::-1][:min(5, len(probs_flat))]
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)

        top_class_idx = int(top_indices[0])
        top_class_name = session.labels.get(top_class_idx, f"Class_{top_class_idx}")
        top_confidence = round(float(probs_flat[top_class_idx]), 4)

        top_predictions = [
            {
                "className": session.labels.get(int(idx), f"Class_{idx}"),
                "probability": round(float(probs_flat[int(idx)]), 4)
            }
            for idx in top_indices
        ]

        return {
            "modelId": model_id,
            "latencyMs": latency_ms,
            "topClass": top_class_name,
            "confidence": top_confidence,
            "topPredictions": top_predictions
        }

    def remove_model(self, model_id: str) -> bool:
        """Remove a dynamically registered model and re-route any active crop mappings."""
        if model_id in self.models:
            del self.models[model_id]
            for crop, mapped in list(self.active_models.items()):
                if mapped == model_id:
                    self.active_models[crop] = "plantvillage_mobilenetv2"
            logger.info(f"Model {model_id} removed from inference engine.")
            return True
        return False

    def preprocess_image(self, image: Image.Image, target_size=(224, 224)) -> np.ndarray:
        """Standard ImageNet preprocessing: resize, center-crop, normalize (mean, std)."""
        image = image.convert("RGB")
        w, h = image.size
        # Center crop to square
        min_dim = min(w, h)
        left = (w - min_dim) // 2
        top = (h - min_dim) // 2
        image = image.crop((left, top, left + min_dim, top + min_dim))
        image = image.resize(target_size, Image.Resampling.BILINEAR)

        arr = np.array(image, dtype=np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        arr = (arr - mean) / std
        # HWC -> CHW -> NCHW
        arr = np.transpose(arr, (2, 0, 1))
        arr = np.expand_dims(arr, axis=0)
        return arr.astype(np.float32)

    def predict(
        self,
        image_path: Path,
        crop: str,
        farm_id: Optional[str] = None
    ) -> CropAnalysisResultOut:
        # Determine model
        model_id = self.active_models.get(crop.lower(), self.active_models["general"])
        model_session = self.models.get(model_id)

        if not model_session or not model_session.is_ready() or model_session.session is None:
            # Fallback to first available ready model
            for m_id, sess in self.models.items():
                if sess.is_ready() and sess.session is not None:
                    model_id = m_id
                    model_session = sess
                    break

        if not model_session or not model_session.is_ready() or model_session.session is None:
            raise RuntimeError(f"ML Model session for {model_id} is not loaded.")

        # Open and preprocess image
        with Image.open(image_path) as img:
            input_tensor = self.preprocess_image(img)

        # Run ONNX inference
        outputs = model_session.session.run(
            None,
            {model_session.input_name: input_tensor}
        )
        logits = outputs[0][0]
        # Softmax
        exp_logits = np.exp(logits - np.max(logits))
        global_probs = exp_logits / np.sum(exp_logits)

        crop_lower = crop.lower()
        is_cross_mismatch = False
        is_unsupported_crop = False
        mismatch_note = ""

        if model_id == "plantvillage_efficientnetv2":
            prefixes = CROP_TO_PLANTVILLAGE_PREFIX.get(crop_lower)
            if prefixes:
                crop_indices = [
                    i for i, name in model_session.labels.items()
                    if any(name.lower().startswith(p) for p in prefixes)
                ]
                global_top_idx = int(np.argmax(global_probs))
                global_top_name = model_session.labels.get(global_top_idx, f"Class_{global_top_idx}")
                global_top_prob = float(global_probs[global_top_idx])

                if global_top_idx in crop_indices:
                    top_idx = global_top_idx
                    top_class_name = global_top_name
                    top_prob = global_top_prob
                    sorted_crop = sorted(crop_indices, key=lambda idx: global_probs[idx], reverse=True)
                    alt_indices = [idx for idx in sorted_crop if idx != top_idx][:2]
                else:
                    if global_top_prob >= 0.60:
                        is_cross_mismatch = True
                        top_idx = global_top_idx
                        top_class_name = global_top_name
                        top_prob = global_top_prob
                        clean_mismatch = format_condition_details(global_top_name)["name"]["en"]
                        mismatch_note = f"Symptoms strongly match {clean_mismatch} ({round(global_top_prob*100, 1)}%), which is a different crop species from selected {crop.title()}."
                        alt_indices = [idx for idx in np.argsort(global_probs)[::-1] if idx != top_idx][:2]
                    else:
                        sorted_crop = sorted(crop_indices, key=lambda idx: global_probs[idx], reverse=True)
                        top_idx = int(sorted_crop[0])
                        top_class_name = model_session.labels.get(top_idx, f"Class_{top_idx}")
                        top_prob = float(global_probs[top_idx])
                        alt_indices = sorted_crop[1:3]
            else:
                if crop_lower not in ["general", "any"]:
                    is_unsupported_crop = True
                top_indices = np.argsort(global_probs)[::-1]
                top_idx = int(top_indices[0])
                top_class_name = model_session.labels.get(top_idx, f"Class_{top_idx}")
                top_prob = float(global_probs[top_idx])
                alt_indices = list(top_indices[1:3])
        else:
            top_indices = np.argsort(global_probs)[::-1]
            top_idx = int(top_indices[0])
            top_class_name = model_session.labels.get(top_idx, f"Class_{top_idx}")
            top_prob = float(global_probs[top_idx])
            alt_indices = list(top_indices[1:3])

        # Resolve condition details from knowledge base
        cond_info = format_condition_details(top_class_name, crop)

        is_low_conf = (top_prob < 0.40) or (top_class_name == "other") or is_cross_mismatch or is_unsupported_crop
        
        # Build alternatives
        alternatives = []
        for alt_idx in alt_indices:
            alt_name = model_session.labels.get(int(alt_idx), f"Class_{alt_idx}")
            alt_info = format_condition_details(alt_name, crop)
            alternatives.append(
                AlternativePrediction(
                    condition=CropConditionSchema(
                        id=alt_info["id"],
                        name=to_localized_text(alt_info.get("name", alt_name)),
                        category=alt_info["category"]
                    ),
                    sampleConfidence=round(float(global_probs[int(alt_idx)]), 2)
                )
            )

        # Supported classes for the model
        supported = []
        for cname in list(model_session.labels.values())[:10]:
            c_info = format_condition_details(cname, crop)
            supported.append(LocalizedText(en=c_info["name"]["en"], bn=c_info["name"]["bn"]))

        if is_cross_mismatch:
            safety = (
                f"Notice: {mismatch_note} Please verify leaf identity before applying treatments. "
                "Not an agronomic prescription. Always consult an authorized Department of Agricultural Extension (DAE) officer."
            )
        elif is_unsupported_crop:
            safety = (
                f"Notice: '{crop.title()}' is not in the PlantVillage 38-class benchmark dataset. "
                "Showing nearest visual patterns. Not an agronomic prescription. Consult your local DAE agriculture officer."
            )
        else:
            safety = (
                "Model inference result generated using self-hosted pretrained convolutional neural network. "
                "Not an agronomic or chemical prescription. Always consult an authorized Department of Agricultural Extension (DAE) "
                "officer before applying pesticides or fertilizers."
            )

        if model_id == "plantvillage_efficientnetv2":
            meta_name = "plantvillage_efficientnetv2"
            meta_ver = "1.0.0-onnx"
            meta_license = "MIT"
            meta_dataset = "PlantVillage Benchmark Dataset (54,306 images across 38 classes, 14 crops)"
        elif model_id == "rice_mobilenetv3":
            meta_name = "rice_mobilenetv3"
            meta_ver = "1.0.0-onnx"
            meta_license = "CC-BY 4.0"
            meta_dataset = "Paddy Doctor Rice Disease Research Benchmark"
        else:
            meta_name = model_id
            meta_ver = "1.0.0-onnx"
            meta_license = "Open Source"
            meta_dataset = "Agricultural Field Research Benchmark"

        return CropAnalysisResultOut(
            id=f"scan_{uuid.uuid4().hex[:12]}",
            crop=crop,
            condition=CropConditionSchema(
                id=cond_info["id"],
                name=to_localized_text(cond_info.get("name", top_class_name)),
                category=cond_info["category"]
            ),
            sampleConfidence=round(top_prob, 2),
            alternatives=alternatives,
            severity="none" if cond_info["category"] == "healthy" else "moderate" if top_prob > 0.70 else "mild",
            guidance=[to_localized_text(g) for g in cond_info.get("guidance", [])],
            supportedClasses=supported,
            model=ModelMetadataOut(
                name=meta_name,
                version=meta_ver,
                mode="api",
                license=meta_license,
                dataset=meta_dataset
            ),
            analyzedAt=datetime.now(timezone.utc).isoformat(),
            isDemo=False,
            safetyNotice=safety,
            lowConfidence=is_low_conf
        )

# Global engine singleton
inference_engine = InferenceEngine()
