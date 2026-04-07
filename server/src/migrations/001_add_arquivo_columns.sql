ALTER TABLE receipts
    ADD COLUMN IF NOT EXISTS arquivo_data     BYTEA,
    ADD COLUMN IF NOT EXISTS arquivo_mimetype VARCHAR(100);
