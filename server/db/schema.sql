-- Clientes cadastrados no evento
CREATE TABLE IF NOT EXISTS clientes (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(255) NOT NULL,
    cpf         VARCHAR(14)  NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL,
    perfil      VARCHAR(100) NOT NULL,
    criado_em   TIMESTAMP DEFAULT NOW()
);

-- Prêmios disponíveis na roleta
-- chance: 1=baixa, 2=media, 3=alta (quanto maior, mais provável)
CREATE TABLE IF NOT EXISTS premios (
    id      SERIAL PRIMARY KEY,
    nome    VARCHAR(255) NOT NULL,
    subnome VARCHAR(255),
    chance  INTEGER NOT NULL DEFAULT 1 CHECK (chance BETWEEN 1 AND 3),
    ativo   BOOLEAN DEFAULT TRUE
);

-- Perguntas do quiz
CREATE TABLE IF NOT EXISTS quiz (
    id        SERIAL PRIMARY KEY,
    pergunta  TEXT NOT NULL,
    primeira  TEXT NOT NULL,
    segunda   TEXT NOT NULL,
    terceira  TEXT NOT NULL,
    quarta    TEXT NOT NULL,
    correta   INTEGER NOT NULL CHECK (correta BETWEEN 1 AND 4),
    ativo     BOOLEAN DEFAULT TRUE
);

-- Registro de cada partida jogada
CREATE TABLE IF NOT EXISTS partidas (
    id             SERIAL PRIMARY KEY,
    cliente_id     INTEGER NOT NULL REFERENCES clientes(id),
    quiz_acertos   INTEGER NOT NULL DEFAULT 0,
    premio_id      INTEGER REFERENCES premios(id),
    email_enviado  BOOLEAN DEFAULT FALSE,
    jogado_em      TIMESTAMP DEFAULT NOW()
);
