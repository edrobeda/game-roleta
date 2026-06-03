const express = require('express')
const router = express.Router()
const pool = require('../db/connection')

// GET /api/premios — prêmios ativos que ainda não atingiram o limite
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.id, p.nome, p.subnome, p.chance
            FROM premios p
            LEFT JOIN (
                SELECT premio_id, COUNT(*) AS sorteados
                FROM partidas
                WHERE premio_id IS NOT NULL
                GROUP BY premio_id
            ) s ON s.premio_id = p.id
            WHERE p.ativo = true
              AND (p.quantidade IS NULL OR COALESCE(s.sorteados, 0) < p.quantidade)
            ORDER BY p.id
        `)
        res.json(result.rows)
    } catch (err) {
        console.error('Erro ao buscar prêmios:', err.message)
        res.status(500).json({ erro: 'Erro interno.' })
    }
})

module.exports = router
