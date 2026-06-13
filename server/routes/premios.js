const express = require('express')
const router = express.Router()
const pool = require('../db/connection')

const TENANT_ID = parseInt(process.env.TENANT_ID || '2')

// GET /api/premios — prêmios ativos que ainda não atingiram o limite
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.id, p.nome, p.subnome, p.chance
            FROM premios p
            LEFT JOIN (
                SELECT premio_id, COUNT(*) AS sorteados
                FROM partidas
                WHERE premio_id IS NOT NULL AND tenant_id = $1
                GROUP BY premio_id
            ) s ON s.premio_id = p.id
            WHERE p.ativo = true AND p.tenant_id = $1
              AND (p.quantidade IS NULL OR COALESCE(s.sorteados, 0) < p.quantidade)
            ORDER BY p.id
        `, [TENANT_ID])
        res.json(result.rows)
    } catch (err) {
        console.error('Erro ao buscar prêmios:', err.message)
        res.status(500).json({ erro: 'Erro interno.' })
    }
})

module.exports = router
