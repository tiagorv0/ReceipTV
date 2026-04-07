-- Migration 005: Normaliza username e email para lowercase em todos os registros existentes
-- Verificar duplicatas antes de executar (não deve haver, mas é uma salvaguarda):
-- SELECT LOWER(username), COUNT(*) FROM users GROUP BY LOWER(username) HAVING COUNT(*) > 1;
-- SELECT LOWER(email), COUNT(*) FROM users GROUP BY LOWER(email) HAVING COUNT(*) > 1;

UPDATE users
SET
    username = LOWER(username),
    email    = LOWER(email)
WHERE username <> LOWER(username)
   OR email    <> LOWER(email);
