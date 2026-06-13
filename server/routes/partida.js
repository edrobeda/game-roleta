const express = require('express')
const router = express.Router()
const pool = require('../db/connection')

const TENANT_ID = parseInt(process.env.TENANT_ID || '2')

// GET /api/partida/status/:clienteId — status da partida do cliente
router.get('/status/:clienteId', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.id, p.status, p.codigo, p.premio_id, p.params,
                    pr.nome AS premio_nome, pr.subnome AS premio_sub
             FROM partidas p
             LEFT JOIN premios pr ON pr.id = p.premio_id
             WHERE p.cliente_id = $1 AND p.tenant_id = $2
             LIMIT 1`,
            [req.params.clienteId, TENANT_ID]
        )
        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Sem partida registrada.' })
        }
        res.json(result.rows[0])
    } catch (err) {
        res.status(500).json({ erro: err.message })
    }
})

module.exports = router
