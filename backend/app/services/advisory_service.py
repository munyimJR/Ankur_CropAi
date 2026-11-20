import uuid
from typing import List, Dict, Any
from app.schemas.advisory import AdvisorReplyOut

ADVISORY_KNOWLEDGE: List[Dict[str, Any]] = [
    {
        "id": "water_awd",
        "keywords": ["water", "irrigation", "irrigat", "awd", "drain", "pani", "sech", "পানি", "সেচ", "নিষ্কাশন"],
        "title": {
            "en": "Water management & Alternate Wetting and Drying (AWD)",
            "bn": "পরিমিত সেচ ও এডব্লিউডি (AWD) পদ্ধতি"
        },
        "body": {
            "en": "Paddy does not require continuous deep ponding. BRRI research demonstrates that the Alternate Wetting and Drying (AWD) method can save 25–30% of irrigation water and diesel costs without yield loss.",
            "bn": "ধান চাষে জমিতে সবসময় পানি জমিয়ে রাখার প্রয়োজন নেই। ব্রি (BRRI)-এর গবেষণায় প্রমাণিত যে এডব্লিউডি (পর্যায়ক্রমে ভেজানো ও শুকানো) পদ্ধতিতে ফলন না কমিয়েও ২৫–৩০% সেচের পানি সাশ্রয় হয়।"
        },
        "bullets": {
            "en": [
                "Install a perforated 30 cm PVC pipe into the soil; irrigate only when the water level inside drops to 15 cm below ground.",
                "Keep a continuous 2–3 cm water layer during flowering and grain-filling to prevent unfilled grains (chita).",
                "Drain the field completely 10–12 days prior to expected harvest."
            ],
            "bn": [
                "মাটিতে ৩০ সেমি ছিদ্রযুক্ত প্লাস্টিক পাইপ বসান; পাইপের ভেতরে পানির স্তর মাটির ১৫ সেমি নিচে নামলে পুনরায় সেচ দিন।",
                "ফুল ফোটা ও দানা বাঁধার সংবেদনশীল সময়ে জমিতে ২–৩ সেমি পানি ধরে রাখুন যাতে চিটা না হয়।",
                "ফসল কাটার ১০–১২ দিন আগে জমির পানি পুরোপুরি নিষ্কাশন করুন।"
            ]
        },
        "caution": {
            "en": "During flowering (anthesis), moisture stress causes severe grain sterility. Do not let soil crack dry during this stage.",
            "bn": "ফুল ফোটার সময় পানির ঘাটতি হলে ধানে প্রচুর চিটা হতে পারে। এ সময় জমি শুকিয়ে ফাটতে দেবেন না।"
        },
        "follow_ups": {
            "en": [
                "How do I install an AWD perforated pipe?",
                "When should I stop watering before harvest?"
            ],
            "bn": [
                "এডব্লিউডি পাইপ কীভাবে বসাব?",
                "ফসল কাটার কত আগে সেচ বন্ধ করব?"
            ]
        },
        "sources": [
            "Bangladesh Rice Research Institute (BRRI) Factsheet: Water Management",
            "Department of Agricultural Extension (DAE) Field Agronomy Handbook"
        ]
    },
    {
        "id": "fertilizer_management",
        "keywords": ["fertilizer", "urea", "tsp", "mop", "dap", "zinc", "sar", "ইউরিয়া", "টিএসপি", "এমওপি", "সার", "ড্যাপ"],
        "title": {
            "en": "Balanced fertilizer application principles",
            "bn": "সুষম সার প্রয়োগের মূল নিয়মাবলী"
        },
        "body": {
            "en": "Applying excessive urea causes vegetative overgrowth, crop lodging, and increased vulnerability to blast and bacterial blight. Balance Nitrogen with Phosphorus (TSP/DAP), Potassium (MoP), Sulphur (Gypsum), and Zinc.",
            "bn": "অতিরিক্ত ইউরিয়া দিলে গাছ অতিরিক্ত বাড়ন্ত ও দুর্বল হয়ে হেলে পড়ে এবং ব্লাস্ট ও পাতা পোড়া রোগ বাড়ে। নাইট্রোজেনের সাথে টিএসপি/ড্যাপ, পটাশ (এমওপি), জিপসাম ও জিংক সুষম মাত্রায় ব্যবহার করুন।"
        },
        "bullets": {
            "en": [
                "Apply all TSP, MoP (half/full), Gypsum, and Zinc as basal dose during final land preparation.",
                "Split Urea into 3 equal top-dressings: 15–20 days after transplanting (DAT), mid-tillering, and panicle initiation.",
                "Do not apply urea top-dressing when dew or rain droplets are standing on leaves."
            ],
            "bn": [
                "জমি তৈরির শেষ চাষে সবটুকু টিএসপি/ড্যাপ, অর্ধেক এমওপি, জিপসাম ও দস্তা সার প্রয়োগ করুন।",
                "ইউরিয়া সমান ৩ কিস্তিতে দিন: চারা রোপণের ১৫-২০ দিন পর (কুশি গজানোর শুরুতে), কাইচ থোড় আসার ৫-৭ দিন আগে।",
                "পাতায় শিশির বা বৃষ্টির পানি থাকা অবস্থায় ইউরিয়া ছিটাবেন না।"
            ]
        },
        "caution": {
            "en": "Excessive urea softens plant cell walls, attracting brown planthoppers (BPH) and leaf blast.",
            "bn": "মাত্রাতিরিক্ত ইউরিয়া ব্যবহারে গাছের কোষ নরম হয় এবং বাদামি ঘাসফড়িং ও ব্লাস্টের আক্রমণ বেড়ে যায়।"
        },
        "follow_ups": {
            "en": [
                "What are the symptoms of zinc deficiency?",
                "How does potash help against diseases?"
            ],
            "bn": [
                "জিংক বা দস্তার ঘাটতির লক্ষণ কী?",
                "পটাশ সার কীভাবে রোগ প্রতিরোধে সাহায্য করে?"
            ]
        },
        "sources": [
            "Fertilizer Recommendation Guide (FRG 2018), BARC",
            "BRRI Rice Production Manual"
        ]
    },
    {
        "id": "pest_bph",
        "keywords": ["pest", "bph", "hopper", "insect", "hispa", "worm", "poka", "পোকা", "কারেন্ট পোকা", "লেদা", "মাজরা", "ঘাসফড়িং"],
        "title": {
            "en": "Integrated Pest Management (IPM)",
            "bn": "সমন্বিত বালাই দমন ও পোকা নিয়ন্ত্রণ"
        },
        "body": {
            "en": "Regular field scouting is essential. Indiscriminate chemical spraying kills natural beneficial predators like spiders, damselflies, and mirid bugs, causing brown planthopper (BPH / current poka) resurgence.",
            "bn": "নিয়মিত জমি পরিদর্শন অত্যন্ত জরুরি। নির্বিচারে কীটনাশক দিলে মাকড়সা, ড্যামসেলফ্লাইসহ উপকারী বন্ধু পোকা মারা যায়, ফলে কারেন্ট পোকা বা বাদামি ঘাসফড়িংয়ের আক্রমণ বিধ্বংসী রূপ নেয়।"
        },
        "bullets": {
            "en": [
                "Inspect the base of plant hills near water level for planthopper nymphs and adults.",
                "Open alleys (lighting paths every 10–12 rows) to allow sunlight and wind to penetrate.",
                "Use perching (bamboo sticks) to encourage predatory birds for stem borer control."
            ],
            "bn": [
                "ধানের গোড়ায় পানির কাছাকাছি অংশে কারেন্ট পোকা বা হপার আছে কিনা পরীক্ষা করুন।",
                "প্রতি ১০-১২ সারি পর পর ১টি সারি ফাঁকা (আলো-বাতাস চলাচলের জন্য) রাখুন।",
                "মাজরা পোকার মথ ও পোকা খাওয়ার জন্য জমিতে ডালপালা পুঁতে পার্চিং করুন।"
            ]
        },
        "caution": {
            "en": "Never spray synthetic pyrethroids against BPH as it induces resurgence.",
            "bn": "হপার বা কারেন্ট পোকার আক্রমণে সিনথেটিক পাইরেথ্রয়েড জাতীয় কীটনাশক ছিটাবেন না, এতে পোকার বংশবৃদ্ধি আরও বেড়ে যায়।"
        },
        "follow_ups": {
            "en": [
                "How do I recognize hopperburn?",
                "What natural predators live in paddy fields?"
            ],
            "bn": [
                "হপারবার্ন কীভাবে চিনব?",
                "ধানের জমিতে উপকারী বন্ধু পোকা কোনগুলো?"
            ]
        },
        "sources": [
            "DAE Integrated Pest Management (IPM) Manual",
            "BRRI Entomology Division Guidelines"
        ]
    }
]

class AdvisoryService:
    def answer(self, query: str, lang: str = "en", crop: str = "rice") -> AdvisorReplyOut:
        q_lower = query.lower()
        matched = None

        for item in ADVISORY_KNOWLEDGE:
            for kw in item["keywords"]:
                if kw in q_lower:
                    matched = item
                    break
            if matched:
                break

        if not matched:
            matched = ADVISORY_KNOWLEDGE[0]

        is_bn = (lang == "bn")
        title = matched["title"]["bn"] if is_bn else matched["title"]["en"]
        body = matched["body"]["bn"] if is_bn else matched["body"]["en"]
        bullets = matched["bullets"]["bn"] if is_bn else matched["bullets"]["en"]
        caution = matched["caution"]["bn"] if is_bn else matched["caution"]["en"]
        follow_ups = matched["follow_ups"]["bn"] if is_bn else matched["follow_ups"]["en"]

        return AdvisorReplyOut(
            id=f"adv_{uuid.uuid4().hex[:8]}",
            topic=matched["id"],
            title=title,
            body=body,
            bullets=bullets,
            caution=caution,
            followUps=follow_ups,
            kind="general",
            sourceCitations=matched["sources"]
        )

advisory_service = AdvisoryService()
