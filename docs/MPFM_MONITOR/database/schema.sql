-- ============================================================================
-- SGM-FM (Sistema de Gestão de Medição Fiscal Multifásica)
-- Schema Completo - Estado da Arte
-- Baseado nos PRDs: Ingestão Excel, Pipeline PDF, Validação Cruzada
-- ============================================================================
-- Versão: 2.0
-- Data: 2026-01-30
-- Banco: SQLite
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ============================================================================
-- SEÇÃO 1: METADADOS E CONFIGURAÇÃO
-- ============================================================================

-- Instalação (FPSO, Plataforma)
CREATE TABLE IF NOT EXISTS installation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    cnpj TEXT,
    basin TEXT,
    field TEXT,
    operator TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cadastro Mestre de Assets (dim_asset_registry)
CREATE TABLE IF NOT EXISTS asset_registry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    installation_id INTEGER REFERENCES installation(id),
    asset_tag TEXT NOT NULL,
    asset_type TEXT,
    fluid_type TEXT,
    description TEXT,
    location TEXT,
    bank TEXT,
    stream TEXT,
    cabinet TEXT,
    flow_computer TEXT,
    serial_number TEXT,
    manufacturer TEXT,
    model TEXT,
    is_fiscal BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE,
    effective_to DATE,
    registry_version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(installation_id, asset_tag, registry_version)
);

-- Seções/Streams
CREATE TABLE IF NOT EXISTS section (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    installation_id INTEGER REFERENCES installation(id),
    name TEXT NOT NULL,
    fluid_type TEXT,
    section_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(installation_id, name)
);

-- Mapeamento de variáveis canônicas
CREATE TABLE IF NOT EXISTS variable_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variable_raw TEXT NOT NULL,
    variable_code TEXT NOT NULL,
    unit_expected TEXT,
    description TEXT,
    UNIQUE(variable_raw, variable_code)
);

-- Tolerâncias de validação
CREATE TABLE IF NOT EXISTS validation_tolerance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    installation_id INTEGER REFERENCES installation(id),
    variable_code TEXT NOT NULL,
    tolerance_abs REAL,
    tolerance_pct REAL,
    comparison_type TEXT DEFAULT 'MAX',
    unit TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(installation_id, variable_code)
);

-- Limites operacionais
CREATE TABLE IF NOT EXISTS operational_limit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    installation_id INTEGER REFERENCES installation(id),
    parameter TEXT NOT NULL,
    warning_value REAL,
    critical_value REAL,
    unit TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(installation_id, parameter)
);

-- ============================================================================
-- SEÇÃO 2: RASTREABILIDADE DE ARQUIVOS
-- ============================================================================

-- Pacotes/Lotes (ZIP batch)
CREATE TABLE IF NOT EXISTS batch_package (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_name TEXT,
    package_hash TEXT NOT NULL UNIQUE,
    file_count INTEGER,
    upload_source TEXT,
    ingestion_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'PENDING',
    notes TEXT
);

-- Arquivos individuais (staging)
CREATE TABLE IF NOT EXISTS staged_file (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER REFERENCES batch_package(id),
    file_name TEXT NOT NULL,
    file_path TEXT,
    file_hash TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT NOT NULL,
    mime_type TEXT,
    report_date DATE,
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    asset_tag TEXT,
    field_name TEXT,
    parse_status TEXT DEFAULT 'PENDING',
    parse_errors TEXT,
    records_extracted INTEGER DEFAULT 0,
    quality_flags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_hash)
);

-- Manifesto de lote diário
CREATE TABLE IF NOT EXISTS batch_manifest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER REFERENCES batch_package(id),
    asset_tag TEXT NOT NULL,
    report_date DATE NOT NULL,
    expected_hourly INTEGER DEFAULT 24,
    found_hourly INTEGER DEFAULT 0,
    found_daily INTEGER DEFAULT 0,
    found_calibration INTEGER DEFAULT 0,
    quality_flag TEXT,
    reconciliation_status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, asset_tag, report_date)
);

-- ============================================================================
-- SEÇÃO 3: DADOS DIÁRIOS - EXCEL
-- ============================================================================

-- Relatórios (dim_report)
CREATE TABLE IF NOT EXISTS report (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    installation_id INTEGER REFERENCES installation(id),
    staged_file_id INTEGER REFERENCES staged_file(id),
    report_date DATE NOT NULL,
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    report_generated_at TIMESTAMP,
    field_name TEXT,
    file_type TEXT,
    source_file_name TEXT,
    source_file_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(installation_id, report_date, file_type)
);

-- Medições diárias (fact_daily_kpi)
CREATE TABLE IF NOT EXISTS daily_measurement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER REFERENCES report(id),
    asset_id INTEGER REFERENCES asset_registry(id),
    section_id INTEGER REFERENCES section(id),
    file_type TEXT NOT NULL,
    block_type TEXT NOT NULL,
    run_id TEXT,
    variable_code TEXT NOT NULL,
    variable_raw TEXT,
    unit TEXT,
    value REAL,
    source_sheet TEXT,
    source_cell TEXT,
    quality_flags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_measurement_report ON daily_measurement(report_id);
CREATE INDEX IF NOT EXISTS idx_daily_measurement_asset ON daily_measurement(asset_id);
CREATE INDEX IF NOT EXISTS idx_daily_measurement_variable ON daily_measurement(variable_code);

-- Balanço de gás
CREATE TABLE IF NOT EXISTS gas_balance_line (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER REFERENCES report(id),
    asset_id INTEGER REFERENCES asset_registry(id),
    line_order INTEGER,
    line_sign TEXT NOT NULL,
    line_description TEXT NOT NULL,
    flowrate_unit TEXT,
    flowrate_value REAL,
    pd_unit TEXT,
    pd_value REAL,
    source_cell TEXT,
    quality_flags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, line_sign, line_description)
);

-- ============================================================================
-- SEÇÃO 4: DADOS MPFM PDF
-- ============================================================================

-- Produção MPFM Horária
CREATE TABLE IF NOT EXISTS mpfm_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staged_file_id INTEGER REFERENCES staged_file(id),
    asset_id INTEGER REFERENCES asset_registry(id),
    report_date DATE NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    hour_of_day INTEGER,
    uncorr_mass_gas REAL, uncorr_mass_oil REAL, uncorr_mass_hc REAL,
    uncorr_mass_water REAL, uncorr_mass_total REAL,
    corr_mass_gas REAL, corr_mass_oil REAL, corr_mass_hc REAL,
    corr_mass_water REAL, corr_mass_total REAL,
    pvt_ref_mass_gas REAL, pvt_ref_mass_oil REAL, pvt_ref_mass_hc REAL,
    pvt_ref_mass_water REAL, pvt_ref_mass_total REAL,
    pvt_ref_vol_gas_sm3 REAL, pvt_ref_vol_oil_sm3 REAL,
    pvt_ref_vol_gas_sm3_20c REAL, pvt_ref_vol_oil_sm3_20c REAL,
    avg_pressure_kpa REAL, avg_temperature_c REAL,
    avg_density_gas REAL, avg_density_oil REAL, avg_density_water REAL,
    quality_flags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, period_start)
);

-- Produção MPFM Diária
CREATE TABLE IF NOT EXISTS mpfm_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staged_file_id INTEGER REFERENCES staged_file(id),
    asset_id INTEGER REFERENCES asset_registry(id),
    report_date DATE NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    uncorr_mass_gas REAL, uncorr_mass_oil REAL, uncorr_mass_hc REAL,
    uncorr_mass_water REAL, uncorr_mass_total REAL,
    corr_mass_gas REAL, corr_mass_oil REAL, corr_mass_hc REAL,
    corr_mass_water REAL, corr_mass_total REAL,
    pvt_ref_mass_gas REAL, pvt_ref_mass_oil REAL, pvt_ref_mass_hc REAL,
    pvt_ref_mass_water REAL, pvt_ref_mass_total REAL,
    pvt_ref_vol_gas_sm3 REAL, pvt_ref_vol_oil_sm3 REAL,
    pvt_ref_vol_gas_sm3_20c REAL, pvt_ref_vol_oil_sm3_20c REAL,
    pvt_ref_mass_gas_20c REAL, pvt_ref_mass_oil_20c REAL,
    avg_pressure_kpa REAL, avg_temperature_c REAL,
    avg_density_gas REAL, avg_density_oil REAL, avg_density_water REAL,
    quality_flags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, report_date)
);

-- Reconciliação Hourly vs Daily
CREATE TABLE IF NOT EXISTS reconciliation_result (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER REFERENCES asset_registry(id),
    mpfm_daily_id INTEGER REFERENCES mpfm_daily(id),
    report_date DATE NOT NULL,
    sum_hourly_uncorr_gas REAL, sum_hourly_uncorr_oil REAL, sum_hourly_uncorr_hc REAL,
    sum_hourly_corr_gas REAL, sum_hourly_corr_oil REAL, sum_hourly_corr_hc REAL,
    sum_hourly_pvt_gas REAL, sum_hourly_pvt_oil REAL,
    delta_uncorr_gas_abs REAL, delta_uncorr_gas_pct REAL,
    delta_uncorr_oil_abs REAL, delta_uncorr_oil_pct REAL,
    delta_uncorr_hc_abs REAL, delta_uncorr_hc_pct REAL,
    delta_corr_hc_abs REAL, delta_corr_hc_pct REAL,
    status TEXT NOT NULL,
    failed_metrics TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, report_date)
);

-- ============================================================================
-- SEÇÃO 5: CALIBRAÇÃO PVT
-- ============================================================================

CREATE TABLE IF NOT EXISTS pvt_calibration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staged_file_id INTEGER REFERENCES staged_file(id),
    asset_id INTEGER REFERENCES asset_registry(id),
    calibration_no INTEGER NOT NULL,
    selected_mpfm TEXT,
    calibration_started TIMESTAMP,
    calibration_ended TIMESTAMP,
    status TEXT,
    avg_pressure_mpfm_kpa REAL, avg_temperature_mpfm_c REAL,
    avg_density_oil_mpfm REAL, avg_density_gas_mpfm REAL, avg_density_water_mpfm REAL,
    avg_pressure_sep_kpa REAL, avg_temperature_sep_c REAL,
    avg_density_oil_sep REAL, avg_density_gas_sep REAL, avg_density_water_sep REAL,
    accum_mass_oil_mpfm REAL, accum_mass_gas_mpfm REAL,
    accum_mass_water_mpfm REAL, accum_mass_hc_mpfm REAL,
    accum_mass_oil_sep REAL, accum_mass_gas_sep REAL,
    accum_mass_water_sep REAL, accum_mass_hc_sep REAL,
    k_factor_oil_used REAL, k_factor_gas_used REAL,
    k_factor_water_used REAL, k_factor_hc_used REAL,
    k_factor_oil_new REAL, k_factor_gas_new REAL,
    k_factor_water_new REAL, k_factor_hc_new REAL,
    water_new_factor_flag TEXT,
    k_factor_outlier_flag TEXT,
    pvt_ref_vol_oil_sm3 REAL, pvt_ref_vol_gas_sm3 REAL,
    quality_flags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(calibration_no, asset_id)
);

-- ============================================================================
-- SEÇÃO 6: VALIDAÇÃO CRUZADA
-- ============================================================================

-- Fatos de medição normalizados (modelo canônico)
CREATE TABLE IF NOT EXISTS measurement_fact (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staged_file_id INTEGER REFERENCES staged_file(id),
    asset_id INTEGER REFERENCES asset_registry(id),
    source_type TEXT NOT NULL,
    source_file TEXT,
    date_ref DATE NOT NULL,
    time_window TEXT NOT NULL,
    variable_code TEXT NOT NULL,
    value_num REAL,
    unit TEXT,
    confidence_flags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_measurement_fact_key 
ON measurement_fact(asset_id, variable_code, date_ref, time_window);

-- Resultados da validação cruzada
CREATE TABLE IF NOT EXISTS cross_validation_result (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER REFERENCES asset_registry(id),
    date_ref DATE NOT NULL,
    time_window TEXT NOT NULL,
    variable_code TEXT NOT NULL,
    value_excel REAL, value_xml REAL, value_pdf REAL, value_txt REAL,
    sources_available TEXT,
    sources_count INTEGER,
    classification TEXT NOT NULL,
    max_deviation_abs REAL,
    max_deviation_pct REAL,
    tolerance_applied REAL,
    comparison_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, date_ref, time_window, variable_code)
);

-- Histórico de inconsistências
CREATE TABLE IF NOT EXISTS inconsistency_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER REFERENCES asset_registry(id),
    variable_code TEXT NOT NULL,
    first_occurrence DATE NOT NULL,
    last_occurrence DATE NOT NULL,
    consecutive_days INTEGER DEFAULT 1,
    status TEXT DEFAULT 'ACTIVE',
    escalated_to_nc_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SEÇÃO 7: MONITORAMENTO E CALIBRAÇÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS monitoring_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    installation_id INTEGER REFERENCES installation(id),
    report_date DATE NOT NULL,
    topside_asset_id INTEGER, subsea_asset_id INTEGER, separator_asset_id INTEGER,
    topside_mass_oil REAL, topside_mass_gas REAL, topside_mass_water REAL,
    topside_mass_hc REAL, topside_mass_total REAL,
    subsea_mass_oil REAL, subsea_mass_gas REAL, subsea_mass_water REAL,
    subsea_mass_hc REAL, subsea_mass_total REAL,
    separator_mass_oil REAL, separator_mass_gas REAL, separator_mass_water REAL,
    separator_mass_hc REAL, separator_mass_total REAL,
    balance_hc_top_sub_pct REAL, balance_total_top_sub_pct REAL,
    balance_hc_top_sep_pct REAL, balance_hc_sub_sep_pct REAL,
    limit_hc_pct REAL DEFAULT 10.0, limit_total_pct REAL DEFAULT 7.0,
    status_top_sub TEXT, status_top_sep TEXT, status_sub_sep TEXT, overall_status TEXT,
    consecutive_days_hc INTEGER DEFAULT 0, consecutive_days_total INTEGER DEFAULT 0,
    action_required BOOLEAN DEFAULT FALSE, action_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(installation_id, report_date)
);

CREATE TABLE IF NOT EXISTS calibration_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pvt_calibration_id INTEGER REFERENCES pvt_calibration(id),
    asset_id INTEGER REFERENCES asset_registry(id),
    calibration_date DATE NOT NULL,
    calibration_no INTEGER,
    work_order TEXT,
    period_start TIMESTAMP, period_end TIMESTAMP,
    effective_duration_h REAL,
    pvt_report_id TEXT, pvt_sampling_date DATE, pvt_software TEXT,
    oil_density_std REAL, gas_density_std REAL, water_density_std REAL,
    rgo_std REAL, water_salinity REAL,
    total_24h_mpfm_oil REAL, total_24h_mpfm_gas REAL,
    total_24h_mpfm_water REAL, total_24h_mpfm_hc REAL,
    total_24h_sep_oil REAL, total_24h_sep_gas REAL,
    total_24h_sep_water REAL, total_24h_sep_hc REAL,
    k_oil_calculated REAL, k_gas_calculated REAL,
    k_water_calculated REAL, k_hc_calculated REAL,
    k_oil_applied REAL, k_gas_applied REAL,
    k_water_applied REAL, k_hc_applied REAL,
    k_min REAL DEFAULT 0.80, k_max REAL DEFAULT 1.20,
    k_oil_status TEXT, k_gas_status TEXT, k_water_status TEXT, k_hc_status TEXT,
    deviation_hc_pct REAL, deviation_total_pct REAL, envelope_status TEXT,
    calibration_responsible TEXT, review_responsible TEXT, approval_status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, calibration_date, calibration_no)
);

-- ============================================================================
-- SEÇÃO 8: NÃO-CONFORMIDADES
-- ============================================================================

CREATE TABLE IF NOT EXISTS nonconformance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    installation_id INTEGER REFERENCES installation(id),
    asset_id INTEGER REFERENCES asset_registry(id),
    unique_event_id TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'IN_INVESTIGATION',
    origin_type TEXT,
    origin_id INTEGER,
    occurrence_datetime TIMESTAMP NOT NULL,
    detection_datetime TIMESTAMP,
    report_datetime TIMESTAMP,
    variable_affected TEXT,
    deviation_description TEXT,
    deadline_partial DATE,
    deadline_final DATE,
    deadline_repair DATE,
    responsible_name TEXT,
    responsible_contact TEXT,
    resolution_date DATE,
    resolution_description TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SEÇÃO 9: ALERTAS E AUDITORIA
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER REFERENCES report(id),
    asset_id INTEGER REFERENCES asset_registry(id),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    parameter TEXT,
    current_value REAL,
    limit_value REAL,
    unit TEXT,
    message TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    action TEXT NOT NULL,
    old_values TEXT,
    new_values TEXT,
    user_id TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SEÇÃO 10: XML ANP
-- ============================================================================

CREATE TABLE IF NOT EXISTS xml_production (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staged_file_id INTEGER REFERENCES staged_file(id),
    asset_id INTEGER REFERENCES asset_registry(id),
    xml_type TEXT NOT NULL,
    cod_instalacao TEXT,
    cod_tag TEXT,
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    flow_duration_min REAL,
    gross_volume_observed REAL, gross_volume_corrected REAL,
    net_volume REAL, corrected_volume REAL,
    totalizer_start REAL, totalizer_end REAL,
    bsw_percent REAL, relative_density REAL,
    static_pressure REAL, temperature REAL, differential_pressure REAL,
    ctl REAL, cpl REAL, ctpl REAL, meter_factor REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS xml_alarm_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staged_file_id INTEGER REFERENCES staged_file(id),
    asset_id INTEGER REFERENCES asset_registry(id),
    record_type TEXT NOT NULL,
    occurrence_datetime TIMESTAMP NOT NULL,
    parameter TEXT,
    value TEXT,
    original_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SEÇÃO 11: VIEWS
-- ============================================================================

CREATE VIEW IF NOT EXISTS v_daily_production_summary AS
SELECT 
    r.report_date, ar.asset_tag, ar.fluid_type, s.name as section_name,
    dm.block_type, dm.variable_code, SUM(dm.value) as total_value, dm.unit
FROM report r
JOIN daily_measurement dm ON r.id = dm.report_id
JOIN asset_registry ar ON dm.asset_id = ar.id
LEFT JOIN section s ON dm.section_id = s.id
WHERE dm.value IS NOT NULL
GROUP BY r.report_date, ar.asset_tag, ar.fluid_type, s.name, dm.block_type, dm.variable_code, dm.unit;

CREATE VIEW IF NOT EXISTS v_cross_validation_status AS
SELECT 
    date_ref, ar.asset_tag, variable_code, classification,
    sources_count, max_deviation_pct,
    CASE WHEN classification = 'INCONSISTENTE' THEN '❌'
         WHEN classification = 'ACEITAVEL' THEN '⚠️'
         WHEN classification = 'CONSISTENTE' THEN '✅' ELSE '❓' END as status_icon
FROM cross_validation_result cv
JOIN asset_registry ar ON cv.asset_id = ar.id;

CREATE VIEW IF NOT EXISTS v_active_alerts AS
SELECT a.*, ar.asset_tag, ar.fluid_type
FROM alert a LEFT JOIN asset_registry ar ON a.asset_id = ar.id
WHERE a.acknowledged = FALSE
ORDER BY CASE a.severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END;

CREATE VIEW IF NOT EXISTS v_import_status AS
SELECT DATE(created_at) as import_date, file_type, COUNT(*) as total_files,
    SUM(CASE WHEN parse_status = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
    SUM(records_extracted) as total_records
FROM staged_file GROUP BY DATE(created_at), file_type;

CREATE VIEW IF NOT EXISTS v_active_inconsistencies AS
SELECT ih.*, ar.asset_tag,
    CASE WHEN ih.consecutive_days >= 10 THEN 'DESENQUADRAMENTO'
         WHEN ih.consecutive_days >= 5 THEN 'ATENÇÃO' ELSE 'MONITORANDO' END as alert_level
FROM inconsistency_history ih
JOIN asset_registry ar ON ih.asset_id = ar.id
WHERE ih.status = 'ACTIVE';

CREATE VIEW IF NOT EXISTS v_gas_balance_check AS
SELECT r.report_date,
    SUM(CASE WHEN gb.line_sign = '+' THEN gb.pd_value ELSE 0 END) as total_entrada,
    SUM(CASE WHEN gb.line_sign = '-' THEN gb.pd_value ELSE 0 END) as total_saida,
    MAX(CASE WHEN gb.line_sign = 'TOTAL' THEN gb.pd_value END) as total_declarado,
    (SUM(CASE WHEN gb.line_sign = '+' THEN gb.pd_value ELSE 0 END) - 
     SUM(CASE WHEN gb.line_sign = '-' THEN gb.pd_value ELSE 0 END)) as total_calculado
FROM gas_balance_line gb
JOIN report r ON gb.report_id = r.id
GROUP BY r.report_date;

-- ============================================================================
-- SEÇÃO 12: DADOS INICIAIS
-- ============================================================================

INSERT OR IGNORE INTO installation (name, code, cnpj, basin, field, operator)
VALUES ('FPSO Bacalhau', '38480', '04028583', 'Santos', 'Bacalhau', 'Equinor Brasil');

INSERT OR IGNORE INTO validation_tolerance (installation_id, variable_code, tolerance_abs, tolerance_pct, unit, description)
SELECT id, 'mass_hc', 0.01, 0.5, 't', 'Massa HC' FROM installation WHERE name = 'FPSO Bacalhau'
UNION ALL SELECT id, 'mass_total', 0.01, 0.5, 't', 'Massa Total' FROM installation WHERE name = 'FPSO Bacalhau'
UNION ALL SELECT id, 'volume_std', 0.1, 0.1, 'Sm³', 'Volume padrão' FROM installation WHERE name = 'FPSO Bacalhau'
UNION ALL SELECT id, 'energy', 1.0, 1.0, 'GJ', 'Energia' FROM installation WHERE name = 'FPSO Bacalhau'
UNION ALL SELECT id, 'flow_time', 0, 0, 'min', 'Tempo de fluxo (exato)' FROM installation WHERE name = 'FPSO Bacalhau';

INSERT OR IGNORE INTO operational_limit (installation_id, parameter, warning_value, critical_value, unit, description)
SELECT id, 'BSW', 30.0, 50.0, '%', 'Basic Sediment & Water' FROM installation WHERE name = 'FPSO Bacalhau'
UNION ALL SELECT id, 'BALANCE_HC', 7.0, 10.0, '%', 'Balanço HC' FROM installation WHERE name = 'FPSO Bacalhau'
UNION ALL SELECT id, 'BALANCE_TOTAL', 5.0, 7.0, '%', 'Balanço Total' FROM installation WHERE name = 'FPSO Bacalhau'
UNION ALL SELECT id, 'K_FACTOR_MIN', 0.80, 0.70, '', 'K-Factor mínimo' FROM installation WHERE name = 'FPSO Bacalhau'
UNION ALL SELECT id, 'K_FACTOR_MAX', 1.20, 1.30, '', 'K-Factor máximo' FROM installation WHERE name = 'FPSO Bacalhau'
UNION ALL SELECT id, 'GAS_BALANCE', 1.0, 2.0, '%', 'Balanço de gás' FROM installation WHERE name = 'FPSO Bacalhau'
UNION ALL SELECT id, 'RECONCILIATION', 0.05, 0.10, '%', 'Reconciliação Hourly vs Daily' FROM installation WHERE name = 'FPSO Bacalhau';

INSERT OR IGNORE INTO variable_mapping (variable_raw, variable_code, unit_expected, description) VALUES
('Gross volume', 'gross_volume_m3', 'm³', 'Volume bruto'),
('Gross standard volume', 'gross_std_volume_sm3', 'Sm³', 'Volume bruto padrão'),
('Standard volume', 'std_volume_sm3', 'Sm³', 'Volume padrão'),
('Net Standard volume', 'net_std_volume_sm3', 'Sm³', 'Volume líquido padrão'),
('Mass', 'mass_t', 't', 'Massa'),
('Energy', 'energy_gj', 'GJ', 'Energia'),
('Heating value', 'heating_value_mj_sm3', 'MJ/Sm³', 'Poder calorífico'),
('Flow time', 'flow_time_min', 'min', 'Tempo de fluxo'),
('Pressure', 'pressure_kpag', 'kPa g', 'Pressão manométrica'),
('Temperature', 'temperature_c', '°C', 'Temperatura'),
('Differential pressure', 'dp_kpa', 'kPa', 'Pressão diferencial'),
('Line density', 'line_density_kg_m3', 'kg/m³', 'Densidade de linha'),
('Standard density', 'std_density_kg_sm3', 'kg/Sm³', 'Densidade padrão'),
('K-Factor', 'k_factor_pls_m3', 'pls/m³', 'K-Factor'),
('Meter Factor', 'meter_factor', '', 'Meter Factor'),
('CTL', 'ctl', '', 'Correção de temperatura'),
('CPL', 'cpl', '', 'Correção de pressão'),
('BS&W analyzer', 'bsw_pctvol', '%vol', 'BSW'),
('MPFM uncorrected mass', 'mpfm_uncorr_mass_t', 't', 'Massa não corrigida'),
('MPFM corrected mass', 'mpfm_corr_mass_t', 't', 'Massa corrigida'),
('PVT reference mass', 'pvt_ref_mass_t', 't', 'Massa referência PVT'),
('PVT reference volume', 'pvt_ref_vol_sm3', 'Sm³', 'Volume referência PVT');
