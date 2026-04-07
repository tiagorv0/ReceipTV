CREATE INDEX IF NOT EXISTS idx_receipts_user_id
  ON receipts (user_id);

CREATE INDEX IF NOT EXISTS idx_receipts_user_date
  ON receipts (user_id, data_pagamento);
