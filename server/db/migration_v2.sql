-- migration_v2.sql — executar UMA vez no banco
-- Compatível com IF NOT EXISTS / IF EXISTS para ser idempotente

-- ── clientes ──────────────────────────────────────────────────
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
ALTER TABLE clientes ALTER COLUMN email    DROP NOT NULL;
ALTER TABLE clientes ALTER COLUMN perfil   DROP NOT NULL;

-- ── premios ───────────────────────────────────────────────────
ALTER TABLE premios ADD COLUMN IF NOT EXISTS quantidade INTEGER;
ALTER TABLE premios DROP CONSTRAINT IF EXISTS premios_chance_check;
ALTER TABLE premios ADD CONSTRAINT premios_chance_check CHECK (chance BETWEEN 1 AND 6);

-- ── quiz ──────────────────────────────────────────────────────
ALTER TABLE quiz ADD COLUMN IF NOT EXISTS ultima_resposta TEXT;
ALTER TABLE quiz ALTER COLUMN terceira DROP NOT NULL;
ALTER TABLE quiz ALTER COLUMN quarta   DROP NOT NULL;
ALTER TABLE quiz DROP CONSTRAINT IF EXISTS quiz_correta_check;
ALTER TABLE quiz ADD CONSTRAINT quiz_correta_check CHECK (correta BETWEEN 1 AND 5);

-- ── partidas ──────────────────────────────────────────────────
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS status      VARCHAR(30) DEFAULT 'jogando';
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS codigo      VARCHAR(20);
ALTER TABLE partidas DROP CONSTRAINT IF EXISTS partidas_codigo_key;
ALTER TABLE partidas ADD CONSTRAINT partidas_codigo_key UNIQUE (codigo);
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS entregue_em TIMESTAMP;
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS operador    VARCHAR(255);
-- email_enviado já existe no schema original; linha abaixo é segura de rodar mesmo assim
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS email_enviado BOOLEAN DEFAULT FALSE;
