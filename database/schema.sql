-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT,                   -- Relacionamento com usuário
  nome          VARCHAR(255),          -- Nome da pessoa ou empresa
  valor         DECIMAL(12,2) NOT NULL,
  data_pagamento DATE NOT NULL,
  banco         VARCHAR(50) NOT NULL,
  tipo_pagamento VARCHAR(30),          -- PIX, TED, DOC, BOLETO
  descricao     TEXT,
  arquivo_data  LONGBLOB,
  arquivo_mimetype VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
