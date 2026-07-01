const express = require('express')
const router = express.Router()
const pool = require('../db/connection')

const TENANT_ID = parseInt(process.env.TENANT_ID || '2')

// Validação de CPF (dígitos verificadores) — usada apenas para cadastros nacionais
function validarCpf(cpf) {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
    const calcDigito = (base) => {
        let soma = 0
        for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i)
        const resto = (soma * 10) % 11
        return resto === 10 ? 0 : resto
    }
    const d1 = calcDigito(cpf.slice(0, 9))
    const d2 = calcDigito(cpf.slice(0, 9) + d1)
    return cpf === cpf.slice(0, 9) + String(d1) + String(d2)
}

// Gera as formas possíveis de um CPF/documento digitado para casar com o valor salvo
// (CPF nacional é salvo só com dígitos; documento estrangeiro é salvo como digitado, com trim)
function candidatosDocumento(v) {
    const raw = (v || '').trim()
    const soDigitos = raw.replace(/\D/g, '')
    const candidatos = new Set()
    if (raw) {
        candidatos.add(raw)
        candidatos.add(raw.toUpperCase())
    }
    if (soDigitos) candidatos.add(soDigitos)
    return [...candidatos]
}

// POST /api/cliente — cadastrar novo participante
router.post('/', async (req, res) => {
    const { nome, cpf, telefone, email, perfil, aceita_marketing, foreign } = req.body

    if (!nome || !cpf || !email || !email.trim()) {
        return res.status(400).json({ erro: foreign ? 'Nome, documento e e-mail são obrigatórios.' : 'Nome, CPF e e-mail são obrigatórios.' })
    }

    let documento
    if (foreign) {
        documento = cpf.trim()
        if (!documento) {
            return res.status(400).json({ erro: 'Documento obrigatório.' })
        }
    } else {
        documento = cpf.replace(/\D/g, '')
        if (!validarCpf(documento)) {
            return res.status(400).json({ erro: 'CPF inválido.' })
        }
    }

    const telefoneSalvo = foreign
        ? (telefone ? telefone.trim() : null)
        : (telefone && telefone.replace(/\D/g, '') !== '' ? telefone.replace(/\D/g, '') : null)

    try {
        const existente = await pool.query(
            'SELECT id FROM clientes WHERE cpf = $1 AND tenant_id = $2',
            [documento, TENANT_ID]
        )
        if (existente.rows.length > 0) {
            return res.status(409).json({ erro: foreign ? 'Documento já cadastrado.' : 'CPF já cadastrado.' })
        }

        const dupEmail = await pool.query(
            'SELECT id FROM clientes WHERE email = $1 AND tenant_id = $2',
            [email.trim(), TENANT_ID]
        )
        if (dupEmail.rows.length > 0) {
            return res.status(409).json({ erro: 'E-mail já cadastrado neste jogo.' })
        }

        if (telefoneSalvo) {
            const dupTel = await pool.query(
                'SELECT id FROM clientes WHERE telefone = $1 AND tenant_id = $2',
                [telefoneSalvo, TENANT_ID]
            )
            if (dupTel.rows.length > 0) {
                return res.status(409).json({ erro: 'Telefone já cadastrado neste jogo.' })
            }
        }

        const result = await pool.query(
            `INSERT INTO clientes (nome, cpf, email, perfil, telefone, tenant_id, aceita_marketing)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [nome, documento, email || null, perfil || '', telefoneSalvo, TENANT_ID, aceita_marketing === true]
        )
        res.status(201).json({ id: result.rows[0].id })
    } catch (err) {
        if (err.code === '23505') {
            if (err.constraint?.includes('email')) return res.status(409).json({ erro: 'E-mail já cadastrado em outro jogo.' })
            if (err.constraint?.includes('telefone')) return res.status(409).json({ erro: 'Telefone já cadastrado em outro jogo.' })
        }
        console.error('Erro ao cadastrar:', err.message)
        res.status(500).json({ erro: 'Erro interno.' })
    }
})

// POST /api/cliente/validar — verifica CPF ou telefone existe e ainda não fez palpite
router.post('/validar', async (req, res) => {
    const { cpf, telefone } = req.body

    if (!cpf && !telefone) {
        return res.status(400).json({ erro: 'CPF ou telefone obrigatório.' })
    }

    let query, param

    if (cpf) {
        const candidatos = candidatosDocumento(cpf)
        if (candidatos.length === 0) {
            return res.status(400).json({ erro: 'CPF inválido.' })
        }
        query = `SELECT c.id, c.nome,
                        (SELECT COUNT(*) FROM partidas p WHERE p.cliente_id = c.id AND p.tenant_id = $2) AS partidas
                 FROM clientes c
                 WHERE c.cpf = ANY($1::text[]) AND c.tenant_id = $2`
        param = candidatos
    } else {
        const telLimpo = telefone.replace(/\D/g, '')
        if (telLimpo.length < 10) {
            return res.status(400).json({ erro: 'Telefone inválido.' })
        }
        query = `SELECT c.id, c.nome,
                        (SELECT COUNT(*) FROM partidas p WHERE p.cliente_id = c.id AND p.tenant_id = $2) AS partidas
                 FROM clientes c
                 WHERE c.telefone = $1 AND c.tenant_id = $2`
        param = telLimpo
    }

    try {
        const result = await pool.query(query, [param, TENANT_ID])

        if (result.rows.length === 0) {
            const campo = cpf ? 'CPF' : 'Telefone'
            return res.status(404).json({ erro: `${campo} não cadastrado.` })
        }

        const cliente = result.rows[0]
        if (parseInt(cliente.partidas) > 0) {
            return res.status(403).json({ erro: 'Você já participou do jogo.' })
        }

        res.json({ id: cliente.id, nome: cliente.nome })
    } catch (err) {
        console.error('Erro ao validar:', err.message)
        res.status(500).json({ erro: 'Erro interno.' })
    }
})

// GET /api/cliente/status/:cpf — carteira de status do participante
router.get('/status/:cpf', async (req, res) => {
    const candidatos = candidatosDocumento(req.params.cpf)
    if (candidatos.length === 0) {
        return res.status(404).json({ erro: 'CPF não encontrado.' })
    }

    try {
        const result = await pool.query(
            `SELECT
                c.id, c.nome, c.cpf,
                p.id          AS partida_id,
                p.status,
                p.codigo,
                p.quiz_acertos,
                p.params,
                p.jogado_em,
                p.entregue_em,
                p.operador,
                pr.nome       AS premio_nome,
                pr.subnome    AS premio_sub
             FROM clientes c
             LEFT JOIN partidas p  ON p.cliente_id = c.id AND p.tenant_id = $2
             LEFT JOIN premios  pr ON pr.id = p.premio_id
             WHERE c.cpf = ANY($1::text[]) AND c.tenant_id = $2
             LIMIT 1`,
            [candidatos, TENANT_ID]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'CPF não encontrado.' })
        }

        const row = result.rows[0]

        res.json({
            cliente: { id: row.id, nome: row.nome, cpf: row.cpf },
            partida: row.partida_id ? {
                status:        row.status,
                codigo:        row.codigo,
                quiz_acertos:  row.quiz_acertos,
                jogado_em:     row.jogado_em,
                entregue_em:   row.entregue_em,
                operador:      row.operador,
                premio_nome:   row.premio_nome,
                premio_sub:    row.premio_sub,
                params:        row.params,
            } : null,
        })
    } catch (err) {
        console.error('Erro ao buscar status:', err.message)
        res.status(500).json({ erro: 'Erro interno.' })
    }
})

module.exports = router
