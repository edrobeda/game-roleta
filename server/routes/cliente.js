const express = require('express')
const router = express.Router()
const pool = require('../db/connection')

// POST /api/cliente — cadastrar novo cliente
router.post('/', async (req, res) => {
    const { nome, cpf, email, telefone, perfil } = req.body

    if (!nome || !cpf) {
        return res.status(400).json({ erro: 'Nome e CPF são obrigatórios.' })
    }

    const cpfLimpo = cpf.replace(/\D/g, '')
    if (cpfLimpo.length !== 11) {
        return res.status(400).json({ erro: 'CPF inválido.' })
    }

    try {
        const existente = await pool.query('SELECT id FROM clientes WHERE cpf = $1', [cpfLimpo])
        if (existente.rows.length > 0) {
            return res.status(409).json({ erro: 'CPF já cadastrado.' })
        }

        const result = await pool.query(
            'INSERT INTO clientes (nome, cpf, email, telefone, perfil) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [nome, cpfLimpo, email || null, telefone || null, perfil || null]
        )
        res.status(201).json({ id: result.rows[0].id })
    } catch (err) {
        console.error('Erro ao cadastrar cliente:', err.message)
        res.status(500).json({ erro: 'Erro interno.' })
    }
})

// POST /api/cliente/validar — verifica CPF existe e ainda não jogou
router.post('/validar', async (req, res) => {
    const { cpf } = req.body
    if (!cpf) return res.status(400).json({ erro: 'CPF obrigatório.' })

    const cpfLimpo = cpf.replace(/\D/g, '')

    try {
        const result = await pool.query(
            `SELECT c.id, c.nome, COUNT(p.id) AS partidas
             FROM clientes c
             LEFT JOIN partidas p ON p.cliente_id = c.id
             WHERE c.cpf = $1
             GROUP BY c.id, c.nome`,
            [cpfLimpo]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'CPF não cadastrado.' })
        }

        const cliente = result.rows[0]
        if (parseInt(cliente.partidas) > 0) {
            return res.status(403).json({ erro: 'Você já participou do jogo.' })
        }

        res.json({ id: cliente.id, nome: cliente.nome })
    } catch (err) {
        console.error('Erro ao validar CPF:', err.message)
        res.status(500).json({ erro: 'Erro interno.' })
    }
})

// GET /api/cliente/status/:cpf — carteira de status do participante
router.get('/status/:cpf', async (req, res) => {
    const cpfLimpo = req.params.cpf.replace(/\D/g, '')

    try {
        const result = await pool.query(
            `SELECT
                c.id, c.nome, c.cpf,
                p.id          AS partida_id,
                p.status,
                p.codigo,
                p.quiz_acertos,
                p.jogado_em,
                p.entregue_em,
                p.operador,
                pr.nome       AS premio_nome,
                pr.subnome    AS premio_sub
             FROM clientes c
             LEFT JOIN partidas p  ON p.cliente_id = c.id
             LEFT JOIN premios  pr ON pr.id = p.premio_id
             WHERE c.cpf = $1
             LIMIT 1`,
            [cpfLimpo]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'CPF não encontrado.' })
        }

        const row = result.rows[0]

        res.json({
            cliente: {
                id:   row.id,
                nome: row.nome,
                cpf:  row.cpf,
            },
            partida: row.partida_id ? {
                status:       row.status,
                codigo:       row.codigo,
                quiz_acertos: row.quiz_acertos,
                jogado_em:    row.jogado_em,
                entregue_em:  row.entregue_em,
                operador:     row.operador,
                premio_nome:  row.premio_nome,
                premio_sub:   row.premio_sub,
            } : null,
        })
    } catch (err) {
        console.error('Erro ao buscar status:', err.message)
        res.status(500).json({ erro: 'Erro interno.' })
    }
})

module.exports = router
