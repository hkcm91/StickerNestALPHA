-- Add revision column for conflict detection on table/custom data sources
ALTER TABLE data_sources ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_data_sources_revision ON data_sources(id, revision);
