-- =============================================================================
-- AgriPilot BD Production Database Schema (PostgreSQL + PostGIS + RLS)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- -----------------------------------------------------------------------------
-- 1. USERS & PROFILES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin', 'extension_officer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(32),
    district_id VARCHAR(64) NOT NULL DEFAULT 'bogura',
    area_unit VARCHAR(16) NOT NULL DEFAULT 'acre' CHECK (area_unit IN ('acre', 'bigha', 'hectare')),
    weather_alerts BOOLEAN NOT NULL DEFAULT true,
    simulate_errors BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- -----------------------------------------------------------------------------
-- 2. FARMS & BOUNDARIES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farms (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    name_bn VARCHAR(120),
    crop VARCHAR(32) NOT NULL DEFAULT 'rice',
    district_id VARCHAR(64) NOT NULL DEFAULT 'bogura',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
    area_acres DOUBLE PRECISION NOT NULL CHECK (area_acres > 0 AND area_acres <= 5000),
    planting_date DATE NOT NULL,
    notes TEXT,
    sample BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS farm_boundaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id VARCHAR(64) UNIQUE NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    boundary_geom GEOMETRY(Polygon, 4326) NOT NULL,
    boundary_geojson TEXT NOT NULL,
    area_sqm DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_farms_district ON farms(district_id);
CREATE INDEX IF NOT EXISTS idx_farms_geom ON farms USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_farm_boundaries_geom ON farm_boundaries USING GIST(boundary_geom);

-- -----------------------------------------------------------------------------
-- 3. CROP CYCLES & SEASONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crop_cycles (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    season VARCHAR(32) NOT NULL DEFAULT 'aman' CHECK (season IN ('aus', 'aman', 'boro', 'rabi', 'kharif1', 'kharif2', 'yearRound')),
    crop VARCHAR(32) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    expected_yield_tons DOUBLE PRECISION,
    actual_yield_tons DOUBLE PRECISION,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'planned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_crop_cycles_farm ON crop_cycles(farm_id);

-- -----------------------------------------------------------------------------
-- 4. FIELD OBSERVATIONS & ACTIVITY LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_observations (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    kind VARCHAR(32) NOT NULL DEFAULT 'note' CHECK (kind IN ('satellite', 'scan', 'note', 'weather', 'task')),
    title_en VARCHAR(200) NOT NULL,
    title_bn VARCHAR(200) NOT NULL,
    detail_en TEXT,
    detail_bn TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farm_id VARCHAR(64) REFERENCES farms(id) ON DELETE SET NULL,
    kind VARCHAR(32) NOT NULL DEFAULT 'farm',
    text_en VARCHAR(255) NOT NULL,
    text_bn VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_observations_farm ON field_observations(farm_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);

-- -----------------------------------------------------------------------------
-- 5. CROP GUARDIAN & AI PREDICTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crop_scans (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    farm_id VARCHAR(64) REFERENCES farms(id) ON DELETE SET NULL,
    crop VARCHAR(32) NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_size_bytes INTEGER,
    predicted_class VARCHAR(120) NOT NULL,
    predicted_class_bn VARCHAR(120) NOT NULL,
    condition_id VARCHAR(64) NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN ('healthy', 'fungal', 'bacterial', 'pest', 'nutrient')),
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    severity VARCHAR(32) NOT NULL DEFAULT 'mild' CHECK (severity IN ('none', 'mild', 'moderate', 'high')),
    guidance_json JSONB NOT NULL,
    alternatives_json JSONB NOT NULL,
    supported_classes_json JSONB NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(32) NOT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    safety_notice TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS scan_feedbacks (
    id VARCHAR(64) PRIMARY KEY,
    scan_id VARCHAR(64) NOT NULL REFERENCES crop_scans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_accurate BOOLEAN NOT NULL,
    farmer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_crop_scans_farm ON crop_scans(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_scans_user ON crop_scans(user_id);

-- -----------------------------------------------------------------------------
-- 6. MODEL REGISTRY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registered_models (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    version VARCHAR(32) NOT NULL,
    crop_type VARCHAR(64) NOT NULL,
    framework VARCHAR(32) NOT NULL DEFAULT 'onnx',
    artifact_path VARCHAR(255) NOT NULL,
    input_shape VARCHAR(64) NOT NULL DEFAULT '1,3,224,224',
    supported_classes_json JSONB NOT NULL,
    provenance_json JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- -----------------------------------------------------------------------------
-- 7. WEATHER & CLIMATE ALERTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    temp_c DOUBLE PRECISION NOT NULL,
    feels_like_c DOUBLE PRECISION NOT NULL,
    humidity INTEGER NOT NULL,
    wind_kph DOUBLE PRECISION NOT NULL,
    rain_mm_24h DOUBLE PRECISION NOT NULL,
    condition VARCHAR(32) NOT NULL,
    raw_json JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS climate_alerts (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    risk_type VARCHAR(32) NOT NULL CHECK (risk_type IN ('heavyRain', 'heat', 'fungal', 'dry')),
    risk_level VARCHAR(16) NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high')),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    message_en VARCHAR(255) NOT NULL,
    message_bn VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_weather_snapshots_farm ON weather_snapshots(farm_id);
CREATE INDEX IF NOT EXISTS idx_climate_alerts_farm ON climate_alerts(farm_id);

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_feedbacks ENABLE ROW LEVEL SECURITY;

-- Profiles: Users manage own profile
CREATE POLICY profiles_owner_policy ON profiles
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Farms: Users manage own farms
CREATE POLICY farms_owner_policy ON farms
    FOR ALL USING (auth.uid() = user_id OR sample = true)
    WITH CHECK (auth.uid() = user_id);

-- Farm boundaries: Protected by parent farm ownership
CREATE POLICY farm_boundaries_owner_policy ON farm_boundaries
    FOR ALL USING (
        EXISTS (SELECT 1 FROM farms WHERE farms.id = farm_boundaries.farm_id AND farms.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM farms WHERE farms.id = farm_boundaries.farm_id AND farms.user_id = auth.uid())
    );

-- Field observations: Protected by farm owner
CREATE POLICY observations_owner_policy ON field_observations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Crop scans: Owner can read scans; anyone authenticated can insert
CREATE POLICY crop_scans_owner_policy ON crop_scans
    FOR ALL USING (user_id IS NULL OR auth.uid() = user_id)
    WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
