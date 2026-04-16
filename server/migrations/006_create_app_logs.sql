-- Executar manualmente no painel SQL do Supabase (não pelo sistema de migrations da app)

CREATE TABLE IF NOT EXISTS app_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level       VARCHAR(10)  NOT NULL,
  message     TEXT         NOT NULL,
  metadata    JSONB        DEFAULT '{}',
  service     VARCHAR(50)  DEFAULT 'receiptv-api',
  user_id     INTEGER,
  request_id  VARCHAR(36),
  source      VARCHAR(100),
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_app_logs_level      ON app_logs (level);
CREATE INDEX idx_app_logs_created_at ON app_logs (created_at DESC);
CREATE INDEX idx_app_logs_user_id    ON app_logs (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_app_logs_source     ON app_logs (source);
