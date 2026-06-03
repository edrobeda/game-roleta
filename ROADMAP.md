# Roadmap — game-roleta (React + PostgreSQL)

## Stack

- **Frontend:** React + Vite (Node 25 para dev/build)
- **Backend:** Node.js + Express (API REST) — porta 5174
- **Banco:** PostgreSQL (`postgresql.eventifylab.com:15432/mydb`)
- **Rotas atuais:** `/cadastro` · `/jogo` · `/manager`

---

## Arquitetura de telas

| Tela | Rota | Local de uso | Descrição |
|---|---|---|---|
| Cadastro / Status | `/cadastro` | Celular do usuário | Cadastro + carteira de status do participante |
| Jogo (Quiz + Roleta) | `/jogo` | Quiosque do evento | Fluxo completo: busca → quiz → roleta |
| Entrega | `/entrega` | Balcão de retirada | Leitura de código/QR, confirmação e entrega |
| Gerenciamento | `/manager` | Backoffice (admin) | Cadastros, prêmios, quiz, estatísticas |

---

## Fase 1 — Setup Base ✅

- [x] Estrutura de pastas, dependências, backend Express, PostgreSQL, `.env`
- [x] Tabelas iniciais: `clientes`, `premios`, `quiz`, `partidas`

---

## Fase 2 — Fluxo Principal (Jogo) ✅

- [x] `/jogo` — state machine com 6 etapas (Start → CPF → Quiz → Sucesso → Roleta → Falha)
- [x] Modo quiosque: ao encerrar (ganhou ou perdeu) volta ao estado inicial sem sair da página
- [x] CPF `55555555555` bypassa validação e pré-seleciona respostas corretas (modo dev)

---

## Fase 3 — Componentes ✅

- [x] `<Roleta />` — conic-gradient + sorteio ponderado por `CHANCE_PESOS` (escala não-linear)
- [x] `<ModalPremio />` — exibe prêmio, auto-fecha em 8s
- [x] `useSom` — hook de áudio (6 SFX extraídos do projeto WordPress original)
- [x] CSS 100% em `vh`/`vw` — sem `px` em layout, escala para qualquer tablet

---

## Fase 4 — API & Banco (concluída parcialmente) ✅

- [x] `GET /api/premios` — ativos, filtrado por limite de quantidade
- [x] `GET /api/quiz` — 3 perguntas aleatórias, suporte a `ultima_resposta`
- [x] `POST /api/cliente` — cadastro
- [x] `POST /api/cliente/validar` — valida CPF e checa se já jogou
- [x] `POST/PATCH /api/partida` — registra partida e prêmio sorteado
- [x] Auto-desativa prêmio ao atingir limite de quantidade

---

## Fase 5 — Manager (Admin) ✅

- [x] `/manager` — login JWT (admin / @game26), sessão 8h
- [x] Dashboard: stats (cadastros, jogaram, prêmios entregues, quiz completo)
- [x] Aba **Clientes** — tabela completa com resultado e prêmio
- [x] Aba **Prêmios** — CRUD + info box de % reais por nível + campo limite
- [x] Aba **Quiz** — CRUD com A/B obrigatórios, C/D/E opcionais, última resposta
- [x] 6 níveis de chance: Raríssimo · Muito Baixa · Baixa · Média · Alta · Super Alta

---

## Fase 6 — Cadastro como Carteira de Status 🔜

> A tela `/cadastro` deixa de ser só um formulário e vira a **carteira digital** do participante.
> Mesma URL — antes do jogo mostra confirmação, depois mostra prêmio + código + QR Code.

### 6.1 — Banco de dados

- [ ] Adicionar `telefone` em `clientes` (substitui ou complementa `email`)
- [ ] Adicionar `codigo` em `partidas` — código único gerado após o sorteio (ex: `EVT-83472-ABCD`)
- [ ] Adicionar `status` em `partidas` — enum: `jogando` · `premio_disponivel` · `premio_entregue`
- [ ] Adicionar `entregue_em` e `operador` em `partidas` — preenchidos na entrega

### 6.2 — Backend

- [ ] `GET /api/cliente/status/:cpf` — retorna status atual + dados do prêmio se houver
- [ ] Geração de `codigo` único na hora do sorteio (`EVT-XXXXX-XXXX`)
- [ ] `POST /api/entrega/confirmar` — valida código/QR, marca como entregue, salva operador

### 6.3 — Tela de Cadastro/Status (celular)

- [ ] Formulário adiciona campo `telefone`
- [ ] Após cadastro: não redireciona — vira **tela de status** na mesma URL
- [ ] Status **"Cadastrado / não jogou"** → mensagem de espera
- [ ] Status **"Prêmio disponível"** → nome do prêmio + código único + QR Code
- [ ] Status **"Prêmio entregue"** → confirmação com data/hora da entrega
- [ ] Polling leve (a cada 10s) para atualizar status automaticamente

---

## Fase 7 — Tela de Entrega 🔜

> Página separada para o balcão de retirada. Sem autenticação pesada — acesso por URL interna.

- [ ] `/entrega` — campo para digitar código ou câmera para ler QR Code
- [ ] Exibe: nome, CPF parcial (XXX.XXX.***-**), prêmio, status, horário do sorteio
- [ ] Botões: **Entregar** / **Cancelar**
- [ ] Ao confirmar: atualiza status → `premio_entregue`, salva `entregue_em` e `operador`
- [ ] Proteger por senha simples (mesma do manager ou separada)

---

## Fase 8 — Jogo: busca por telefone/código 🔜

> O quiosque atualmente busca apenas por CPF. Ampliar para aceitar também telefone ou código.

- [ ] Etapa 2 do jogo aceita: CPF · telefone · código de cadastro
- [ ] Feedback visual diferente por tipo de entrada (máscara automática)

---

## Fase 9 — Email 🔜

- [ ] Nodemailer com SMTP `smtp.titan.email`
- [ ] Email disparado após sorteio com código único e QR Code
- [ ] Endpoint `POST /api/email/resultado/:cpf`
- [ ] Envio em massa para pendentes via Manager

---

## Fase 10 — Assets & Visual Final 🔜

- [ ] Logos e imagens customizadas por evento (substituir placeholders)
- [ ] Animações refinadas: `fadeIn`, `slideInDown`, `pulse`
- [ ] Versão responsiva do Manager para tablet

---

## Decisões técnicas registradas

| Decisão | Motivo |
|---|---|
| CSS 100% vh/vw no jogo | Tablet vertical, resolução variável |
| Modo quiosque em `/jogo` | Tablet fica preso na tela, nunca navega para fora |
| CPF 55555555555 = dev bypass | Teste rápido sem consumir banco |
| `CHANCE_PESOS` não-linear | Raríssimo forçadamente raro (peso 0.2 vs 10 do Super Alta) |
| JWT 8h no manager | Sessão de evento, não precisa de refresh token |
| `ultima_resposta` separada no quiz | Suporte a "Todas as anteriores" sem quebrar a lógica de embaralhamento |
