# AgriPilot BD — Computer Vision Model Integration & Provenance Guide

This document specifies the pretrained computer vision models, inference runtime, dataset provenance, preprocessing pipelines, and future model replacement procedures for AgriPilot BD.

---

## 1. Deployed Model Baseline

AgriPilot BD deploys a modular, self-hosted, CPU-optimized **ONNX Runtime** inference engine. No paid commercial AI APIs (OpenAI, Gemini, Anthropic) are used for inference.

### Checkpoint A: Rice Leaf Disease Model (`rice_mobilenetv3`)
- **Model Identifier:** `rice_mobilenetv3`
- **Framework & Format:** ONNX Runtime (`.onnx`)
- **Base Architecture:** MobileNetV3-Large-100
- **Model File Size:** 16.3 MB
- **Source Repository:** Hugging Face (`Raiyan465/kom-bish-rice-leaf`)
- **License:** Creative Commons Attribution 4.0 International (CC-BY 4.0)
- **Training Dataset:** 
  - Paddy Doctor Benchmark Dataset (*Paddy Disease Classification*, Kaggle / arXiv:2205.11108)
  - Mendeley Rice Leaf Disease Research Datasets (10.17632/kx9rx8p2mz.1, 10.17632/sjkptpgv79.2, 10.17632/znsxdctwtt.1)
- **Supported Classes:**
  1. `bacterial_leaf_blight` — পাতা পোড়া রোগ (ব্যাকটেরিয়াল লিফ ব্লাইট, *Xanthomonas oryzae*)
  2. `blast` — ব্লাস্ট রোগ (লিফ ব্লাস্ট, *Magnaporthe oryzae*)
  3. `healthy` — সুস্থ পাতা
  4. `other` — অনির্ধারিত বা মিশ্র লক্ষণ
- **Input Dimensions:** `[1, 3, 224, 224]` (NCHW float32)
- **Normalization:** ImageNet standard (Mean: `[0.485, 0.456, 0.406]`, Std: `[0.229, 0.224, 0.225]`)
- **Measured CPU Latency:** ~35–55 ms per leaf scan on modern standard CPU.

---

### Checkpoint B: Multi-Crop PlantVillage Model (`plantvillage_mobilenetv2`)
- **Model Identifier:** `plantvillage_mobilenetv2`
- **Framework & Format:** ONNX Runtime INT8 Quantized (`.onnx`)
- **Base Architecture:** MobileNetV2-1.0-224
- **Model File Size:** 2.56 MB (Ultra-lightweight)
- **Source Repository:** Hugging Face (`onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX`)
- **License:** Apache-2.0
- **Training Dataset:** PlantVillage Benchmark Dataset (38 classes, 54,306 images)
- **Supported Crops & Primary Classes:**
  - **Potato:** Early Blight (*Alternaria solani*), Late Blight (*Phytophthora infestans*), Healthy Potato Foliage
  - **Tomato:** Early Blight, Late Blight, Bacterial Spot, Septoria Leaf Spot, Leaf Mold, Tomato Yellow Leaf Curl Virus (TYLCV), Tomato Mosaic Virus, Healthy Tomato Foliage
  - **Corn / Maize:** Common Rust (*Puccinia sorghi*), Northern Leaf Blight, Gray Leaf Spot, Healthy Foliage
  - **Bell Pepper:** Bacterial Spot, Healthy Foliage
- **Input Dimensions:** `[1, 3, 224, 224]` (NCHW float32)
- **Measured CPU Latency:** ~25–40 ms on modern standard CPU.

---

### Checkpoint C: Pretrained EfficientNetV2 PlantVillage Multi-Crop Model (`plantvillage_efficientnetv2`)
- **Model Identifier:** `plantvillage_efficientnetv2`
- **Framework & Format:** ONNX Runtime (`.onnx` with separate `.onnx.data` tensor weights)
- **Model Files:**
  - `efficientnet_v2_s_best.onnx` (1.39 MB graph definition)
  - `efficientnet_v2_s_best.onnx.data` (80.6 MB external tensor weights)
  - `classes.json` (Exact 38-class labels mapping)
- **Base Architecture:** EfficientNetV2-S (21.5 million parameters)
- **Source Repository:** Hugging Face (`BiernyVR/crop-disease-classifier`)
- **Source URL:** https://huggingface.co/BiernyVR/crop-disease-classifier
- **License:** MIT License
- **Training Dataset:** PlantVillage Benchmark Dataset (54,306 color photographs across 38 classes)
- **Verified Evaluation Metrics:**
  - **Validation Accuracy:** **99.89%**
  - **Macro F1 Score:** **~0.999**
- **Input Dimensions:** `[1, 3, 224, 224]` (NCHW float32)
- **Output Tensor:** `logits: [1, 38]`
- **Measured CPU Latency:** ~55–85 ms per inference scan on standard CPU.
- **14 Supported Crop Species (38 Exact Classes):**
  1. **Apple (4 classes):** Apple Scab, Black Rot, Cedar Apple Rust, Healthy
  2. **Blueberry (1 class):** Healthy
  3. **Cherry (2 classes):** Powdery Mildew, Healthy
  4. **Corn / Maize (4 classes):** Gray Leaf Spot (*Cercospora*), Common Rust, Northern Leaf Blight, Healthy
  5. **Grape (4 classes):** Black Rot, Esca (Black Measles), Leaf Blight (*Isariopsis* Leaf Spot), Healthy
  6. **Orange / Citrus (1 class):** Huanglongbing (Citrus Greening)
  7. **Peach (2 classes):** Bacterial Spot, Healthy
  8. **Pepper / Bell / Chili (2 classes):** Bacterial Spot, Healthy
  9. **Potato (3 classes):** Early Blight (*Alternaria solani*), Late Blight (*Phytophthora infestans*), Healthy
  10. **Raspberry (1 class):** Healthy
  11. **Soybean (1 class):** Healthy
  12. **Squash (1 class):** Powdery Mildew
  13. **Strawberry (2 classes):** Leaf Scorch, Healthy
  14. **Tomato (10 classes):** Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites (Two-spotted Spider Mite), Target Spot, Tomato Yellow Leaf Curl Virus (TYLCV), Tomato Mosaic Virus, Healthy
- **Crop-Aware Filtering & Safety:**
  - Dynamic routing maps 10 non-rice crops directly to `plantvillage_efficientnetv2`.
  - When a user selects a crop (e.g., Potato), the system scores all 38 classes globally. If the highest predicted class belongs to a different crop with $\ge 60\%$ confidence, a cross-crop mismatch warning is triggered, setting `lowConfidence = True` and advising visual confirmation.
  - If a user uploads an unsupported crop outside the 14 PlantVillage species (e.g. Wheat), the engine reports the nearest visual patterns while safely flagging `lowConfidence = True`.
- **Preserved Rice Model:**
  - `rice_mobilenetv3` remains the dedicated model for rice crops (*Oryza sativa*), retaining specific Bangladeshi disease classes (Bacterial Leaf Blight, Leaf Blast).

---

## 2. Admin Access Control & User Transparency Model

To ensure enterprise-grade security and field accessibility:

1. **User Visibility (View-Only Mode):**
   - Ordinary farmers and guests can view all model names, architectures, tensor shapes, parameters (21.5M), accuracy benchmarks (99.89%), licenses, and the full list of 38 classes.
   - Live test benchmarking is accessible so users can evaluate model latency and predictions on sample leaf photos.

2. **Admin-Only Model Management (Edit Access):**
   - Uploading new ONNX checkpoints (`POST /api/v1/models/upload`), remapping active crop routes (`POST /api/v1/models/{id}/activate`), and deleting models (`DELETE /api/v1/models/{id}`) strictly require administrator authorization.
   - Protected endpoints require a valid JWT token signed with `role: "admin"`.
   - Default test credentials configured:
     - **Admin Username:** `polash` (or `polash@ankur.ag`)
     - **Admin Password:** `2002`
   - In the frontend (`/app/models`), non-admin attempts to upload, remap, or delete present an intuitive Admin Sign-In modal with quick-fill support. Upon authentication, an admin badge appears, and all controls unlock seamlessly.
   - Core baseline checkpoints (`rice_mobilenetv3`, `plantvillage_mobilenetv2`, `plantvillage_efficientnetv2`) are protected against accidental deletion by any user.

---

## 2. Preprocessing & Post-Processing Pipeline

The backend implements safe, deterministic image transformation via `InferenceEngine` (`backend/app/services/inference_service.py`):

1. **Validation:** Checks MIME type (`image/jpeg`, `image/png`, `image/webp`), enforces 8 MB size cap, and verifies PIL image integrity (preventing decompression bombs or corrupt headers).
2. **Color Mode:** Converts RGBA, grayscale, or palette images into standard 3-channel RGB.
3. **Aspect Ratio Preservation:** Center-crops the image to square before resizing to `(224, 224)` via bilinear interpolation.
4. **Channel Normalization:** Translates pixel values to `[0.0, 1.0]` and applies standard ImageNet mean/standard deviation scaling:
   $$\text{pixel}_{\text{norm}} = \frac{\frac{\text{pixel}}{255.0} - \text{mean}}{\text{std}}$$
5. **Logit Evaluation & Softmax:** Computes normalized class probabilities:
   $$P(C_i) = \frac{e^{z_i - \max(z)}}{\sum_j e^{z_j - \max(z)}}$$
6. **Low-Confidence Safeguard:** If the maximum class probability is below 0.40 ($40\%$) or class is `other`, flags `lowConfidence = True`. The application explicitly warns the user that symptoms are uncertain and prompts daylight re-inspection rather than inventing a diagnosis.
7. **Safety Notice Enforcement:** Every prediction response includes mandatory non-prescriptive wording directing the farmer to consult an authorized Department of Agricultural Extension (DAE) Sub-Assistant Agriculture Officer (SAAO) prior to applying chemical fungicides or pesticides.

---

## 3. Future Model Replacement (Architectural Requirement)

The platform is designed for research extensibility. When your proprietary Bangladesh field dataset or fine-tuned model becomes available, you can deploy it without modifying the frontend.

### Procedure to Register and Activate a New Model:

1. **Export Checkpoint to ONNX:**
   ```python
   import torch
   # Example: Exporting your PyTorch model to ONNX
   dummy_input = torch.randn(1, 3, 224, 224)
   torch.onnx.export(
       your_model,
       dummy_input,
       "backend/models_weights/your_custom_model.onnx",
       input_names=["input"],
       output_names=["logits"],
       dynamic_axes={"input": {0: "batch_size"}, "logits": {0: "batch_size"}},
       opset_version=17
   )
   ```

2. **Place Artifacts in Models Directory:**
   Copy the `.onnx` weights and a `labels.json` metadata file into `backend/models_weights/`.

3. **Register in `InferenceEngine` (`backend/app/services/inference_service.py`):**
   ```python
   self.models["custom_bangladesh_rice_v2"] = ModelSession(
       "custom_bangladesh_rice_v2",
       settings.MODELS_DIR / "your_custom_model.onnx",
       settings.MODELS_DIR / "labels.json"
   )
   ```

4. **Activate Model Dynamically via API:**
   Call the authenticated admin endpoint:
   ```http
   POST /api/v1/models/custom_bangladesh_rice_v2/activate?crop=rice
   Authorization: Bearer <ADMIN_TOKEN>
   ```
   The backend switches the active model for `rice` instantly. The frontend continues to query `POST /api/v1/crop-scans` and automatically receives predictions from your newly trained model with updated version metadata.
