const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/premios', require('./routes/premios'))
app.use('/api/quiz', require('./routes/quiz'))
app.use('/api/cliente', require('./routes/cliente'))
app.use('/api/partida', require('./routes/partida'))
app.use('/api/manager', require('./routes/manager'))
// app.use('/api/email', require('./routes/email'))          // Fase 6

app.get('/api/health', async (req, res) => {
    const pool = require('./db/connection')
    try {
        await pool.query('SELECT 1')
        res.json({ status: 'ok', db: 'conectado' })
    } catch (err) {
        res.status(500).json({ status: 'erro', db: err.message })
    }
})

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
})
