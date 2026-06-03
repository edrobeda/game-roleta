const express = require('express')
const router = express.Router()
const pool = require('../db/connection')

// GET /api/quiz — retorna 3 perguntas aleatórias ativas
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, pergunta, primeira, segunda, terceira, quarta, ultima_resposta, correta
             FROM quiz
             WHERE ativo = true
             ORDER BY RANDOM()
             LIMIT 3`
        )

        const perguntas = result.rows.map((q) => {
            const respostas = []
            if (q.primeira)        respostas.push({ texto: q.primeira,        correta: q.correta === 1 })
            if (q.segunda)         respostas.push({ texto: q.segunda,         correta: q.correta === 2 })
            if (q.terceira)        respostas.push({ texto: q.terceira,        correta: q.correta === 3 })
            if (q.quarta)          respostas.push({ texto: q.quarta,          correta: q.correta === 4 })
            if (q.ultima_resposta) respostas.push({ texto: q.ultima_resposta, correta: q.correta === 5 })
            return { id: q.id, pergunta: q.pergunta, respostas }
        })

        res.json(perguntas)
    } catch (err) {
        console.error('Erro ao buscar quiz:', err.message)
        res.status(500).json({ erro: 'Erro interno.' })
    }
})

module.exports = router
