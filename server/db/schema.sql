-- schema.sql — white-label (banco isolado por tenant)
-- Cada game tem seu próprio banco; tenant_id sempre = 1

CREATE TABLE IF NOT EXISTS clientes (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(255) NOT NULL,
    cpf         VARCHAR(14)  NOT NULL,
    email       VARCHAR(255),
    telefone    VARCHAR(20),
    perfil      VARCHAR(100),
    tenant_id   INTEGER NOT NULL DEFAULT 1,
    criado_em   TIMESTAMP DEFAULT NOW(),
    UNIQUE (cpf, tenant_id)
);

CREATE TABLE IF NOT EXISTS premios (
    id         SERIAL PRIMARY KEY,
    nome       VARCHAR(255) NOT NULL,
    subnome    VARCHAR(255),
    chance     INTEGER NOT NULL DEFAULT 1 CHECK (chance BETWEEN 1 AND 6),
    quantidade INTEGER,
    ativo      BOOLEAN DEFAULT TRUE,
    tenant_id  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS quiz (
    id              SERIAL PRIMARY KEY,
    pergunta        TEXT    NOT NULL,
    primeira        TEXT    NOT NULL,
    segunda         TEXT    NOT NULL,
    terceira        TEXT,
    quarta          TEXT,
    ultima_resposta TEXT,
    correta         INTEGER NOT NULL CHECK (correta BETWEEN 1 AND 5),
    ativo           BOOLEAN DEFAULT TRUE,
    tenant_id       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS partidas (
    id             SERIAL PRIMARY KEY,
    cliente_id     INTEGER NOT NULL REFERENCES clientes(id),
    quiz_acertos   INTEGER,
    premio_id      INTEGER REFERENCES premios(id),
    status         VARCHAR(30)  DEFAULT 'aguardando',
    codigo         VARCHAR(20)  UNIQUE,
    email_enviado  BOOLEAN      DEFAULT FALSE,
    jogado_em      TIMESTAMP    DEFAULT NOW(),
    entregue_em    TIMESTAMP,
    operador       VARCHAR(255),
    params         JSONB,
    tenant_id      INTEGER NOT NULL DEFAULT 1
);
