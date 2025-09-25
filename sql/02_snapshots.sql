-- Tablas para snapshots persistentes del dashboard
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  filters_json JSON NOT NULL,
  kpis_json JSON NOT NULL,
  distribution_json JSON NOT NULL
);
