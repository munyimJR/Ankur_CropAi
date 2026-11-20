# AgriPilot BD — Deployment & Operational Guide

This document covers local development, Docker deployment, production database configuration, and environment setup for AgriPilot BD.

---

## 1. System Architecture

```mermaid
flowchart TD
    User["Farmer / Admin Browser"] -->|Vite / React SPA Port 5173| Frontend["Frontend UI (React + TS + Tailwind)"]
    Frontend -->|JWT Auth Bearer / REST API| Backend["FastAPI Backend Service (Port 8000)"]
    
    subgraph "FastAPI Backend Service"
        AuthRouter["Auth & Profile Router"]
        FarmRouter["Farms & Crop Cycles Router"]
        VisionRouter["Crop Guardian Vision Router"]
        WeatherRouter["Weather & Risk Router"]
        AdvisorRouter["Farm Advisor Router"]
        ModelRegistry["Model Registry & Provenance"]
        
        VisionRouter --> ONNX["ONNX Runtime Engine (CPU / GPU)"]
        WeatherRouter --> OpenMeteo["Open-Meteo Weather API"]
    end
    
    Backend -->|SQLAlchemy / psycopg| Database[("PostgreSQL 16 + PostGIS / SQLite")]
    Backend -->|Local / Object Storage| FileStorage[("Uploads Directory / S3 Bucket")]
```

---

## 2. Quick Start: Local Development

### Prerequisites
- Node.js 20+ and npm
- Python 3.11+ (Python 3.12 / 3.13 supported)

### Step 1: Start the FastAPI Backend
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at:
- **API Base:** `http://127.0.0.1:8000/api/v1`
- **Interactive OpenAPI Documentation (Swagger):** `http://127.0.0.1:8000/docs`
- **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`
- **Health Check:** `http://127.0.0.1:8000/health`

### Step 2: Start the React Frontend
In a new terminal window:
```bash
# In the root project directory:
npm install
npm run dev
```
The frontend is available at `http://127.0.0.1:5173/`. 
Vite is preconfigured to proxy `/api` requests to `http://127.0.0.1:8000`.

---

## 3. Docker & Docker Compose Deployment

To run the complete production stack (PostgreSQL 16 with PostGIS extension + containerized FastAPI backend):

```bash
# Build and start services
docker-compose up --build -d

# Check service logs
docker-compose logs -f api

# Verify database health
docker-compose ps
```

The database initializes automatically with `database/schema.sql`, applying table structures, spatial indexes, and Row-Level Security policies.

---

## 4. Supabase & Production PostgreSQL Setup

If deploying to Supabase or managed PostgreSQL:

1. Connect to your Supabase project dashboard or execute `psql` against your database URL.
2. Run the migration script located at `database/schema.sql`.
3. In your server environment or `.env` file, configure `DATABASE_URL`:
   ```bash
   DATABASE_URL="postgresql+psycopg://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```
4. Row-Level Security (RLS) policies defined in `database/schema.sql` isolate user farms, boundaries, crop scans, and observations automatically.

---

## 5. Automated Test Suites

### Backend Unit & Integration Tests (pytest)
```bash
# Run all backend tests with verbose output:
$env:PYTHONPATH="backend"; python -m pytest backend/tests -v
```
Test suite coverage:
- `test_auth.py`: User registration, password hashing, JWT creation, `/me` profile retrieval, duplicate prevention.
- `test_farms.py`: Multi-tenant farm CRUD, coordinate resolution, crop cycle initialization.
- `test_inference.py`: Image validation, ONNX Runtime inference execution, model provenance, and low-confidence flags.
- `test_weather.py`: Open-Meteo live retrieval and agricultural risk calculation (Heavy rain, heat stress, fungal favorability, dry spell).
- `test_advisory.py`: Deterministic bilingual knowledge retrieval with citations.
- `test_models.py`: Model registry discovery and metadata inspection.

### Frontend Unit & Component Tests (vitest)
```bash
npm test
```
Verifies storage persistence, authentication tokens, image upload limits, scenario projections, and Bengali translation topic matching.

### Frontend Production Build
```bash
npm run build
```
Type-checks with strict TypeScript (`tsc -b`) and builds production bundles into `dist/`.
