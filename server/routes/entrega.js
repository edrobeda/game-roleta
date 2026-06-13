const express = require('express')
const router  = express.Router()
const pool    = require('../db/connection')

const TENANT_ID = parseInt(process.env.TENANT_ID || '2')

function auth(req, res, next) {
    if (req.headers['x-entrega-token'] !== process.env.ENTREGA_PASS) {
        return res.status(401).json({ erro: 'Não autorizado.' })
    }
    next()
}

// POST /api/entrega/auth
router.post('/auth', (req, res) => {
    if (req.body.senha !== process.env.ENTREGA_PASS) {
        return res.status(401).json({ erro: 'Senha incorreta.' })
    }
    res.json({ token: process.env.ENTREGA_PASS })
})

// GET /api/entrega/:codigo
router.get('/:codigo', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                p.id AS partida_id, p.status, p.codigo, p.params,
                TO_CHAR(p.jogado_em,   'DD/MM/YYYY HH24:MI') AS jogado_em,
                TO_CHAR(p.entregue_em, 'DD/MM/YYYY HH24:MI') AS entregue_em,
                p.operador,
                c.nome, c.cpf,
                pr.nome    AS premio_nome,
                pr.subnome AS premio_sub
            FROM partidas p
            JOIN clientes c  ON c.id  = p.cliente_id
            JOIN premios  pr ON pr.id = p.premio_id
            WHERE p.codigo = $1 AND p.tenant_id = $2
        `, [req.params.codigo.trim().toUpperCase(), TENANT_ID])

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Código não encontrado.' })
        }
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ erro: err.message })
    }
})

// POST /api/entrega/:codigo/confirmar
router.post('/:codigo/confirmar', auth, async (req, res) => {
    const { operador } = req.body
    try {
        const { rows } = await pool.query(
            'SELECT id, status FROM partidas WHERE codigo = $1 AND tenant_id = $2',
            [req.params.codigo.trim().toUpperCase(), TENANT_ID]
        )
        if (rows.length === 0)           return res.status(404).json({ erro: 'Código não encontrado.' })
        if (rows[0].status === 'premio_entregue') {
            return res.status(409).json({ erro: 'Prêmio já foi entregue.' })
        }
        await pool.query(
            `UPDATE partidas SET status = 'premio_entregue', entregue_em = NOW(), operador = $1 WHERE id = $2`,
            [operador || 'operador', rows[0].id]
        )
        res.json({ ok: true })
    } catch (err) {
        res.status(500).json({ erro: err.message })
    }
})

module.exports = router
