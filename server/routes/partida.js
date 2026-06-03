const express = require('express')
const router = express.Router()
const pool = require('../db/connection')

// Gera código único no formato EVT-NNNNN-XXXX
function gerarCodigo() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem I, O, 0, 1 (ambíguos)
    const num = String(Math.floor(10000 + Math.random() * 90000))
    const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    return `EVT-${num}-${suffix}`
}

// POST /api/partida — registra partida (ao final do quiz)
router.post('/', async (req, res) => {
    const { clienteId, quizAcertos, premioId } = req.body

    if (!clienteId || quizAcertos === undefined) {
        return res.status(400).json({ erro: 'clienteId e quizAcertos são obrigatórios.' })
    }

    try {
        const jaJogou = await pool.query('SELECT id FROM partidas WHERE cliente_id = $1', [clienteId])
        if (jaJogou.rows.length > 0) {
            return res.status(403).json({ erro: 'Partida já registrada para este cliente.' })
        }

        const result = await pool.query(
            `INSERT INTO partidas (cliente_id, quiz_acertos, premio_id, status)
             VALUES ($1, $2, $3, 'jogando')
             RETURNING id`,
            [clienteId, quizAcertos, premioId || null]
        )

        res.status(201).json({ id: result.rows[0].id })
    } catch (err) {
        console.error('Erro ao registrar partida:', err.message)
        res.status(500).json({ erro: 'Erro interno.' })
    }
})

// PATCH /api/partida/:id/premio — registra prêmio + gera código + atualiza status
router.patch('/:id/premio', async (req, res) => {
    const { id } = req.params
    const { premioId } = req.body

    if (!premioId) return res.status(400).json({ erro: 'premioId obrigatório.' })

    // tenta gerar código único (retry em caso rarissimo de colisão)
    let codigo = null
    for (let i = 0; i < 5; i++) {
        const tentativa = gerarCodigo()
        const existe = await pool.query('SELECT id FROM partidas WHERE codigo = $1', [tentativa])
        if (existe.rows.length === 0) { codigo = tentativa; break }
    }
    if (!codigo) return res.status(500).json({ erro: 'Erro ao gerar código único.' })

    try {
        await pool.query(
            `UPDATE partidas
             SET premio_id = $1, codigo = $2, status = 'premio_disponivel', jogado_em = NOW()
             WHERE id = $3`,
            [premioId, codigo, id]
        )

        // desativa prêmio se atingiu limite
        const { rows } = await pool.query(`
            SELECT p.quantidade, COUNT(pa.id) AS sorteados
            FROM premios p
            LEFT JOIN partidas pa ON pa.premio_id = p.id
            WHERE p.id = $1
            GROUP BY p.id, p.quantidade
        `, [premioId])

        if (rows[0]?.quantidade && parseInt(rows[0].sorteados) >= parseInt(rows[0].quantidade)) {
            await pool.query('UPDATE premios SET ativo = false WHERE id = $1', [premioId])
        }

        res.json({ ok: true, codigo })
    } catch (err) {
        console.error('Erro ao atualizar prêmio:', err.message)
        res.status(500).json({ erro: 'Erro interno.' })
    }
})

module.exports = router
