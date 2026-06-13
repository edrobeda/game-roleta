const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const { Pool } = require('pg')

// Conexão separada para o banco do manager (basic_auth_keys + eventos)
const managerPool = new Pool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432'),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MANAGER_DB_NAME || 'mydb',
    ssl: false,
})

function calcStatus(evento, now = new Date()) {
    const inicio = new Date(evento.data_inicio)
    const fim    = new Date(evento.data_fim)
    if (now < inicio) return 'agendado'
    if (now > fim)    return 'encerrado'
    return 'ativo'
}

// GET /api/game/status
// Requer Authorization: Basic base64(:token)
// Valida a chave e retorna se o evento vinculado está ativo.
router.get('/', async (req, res) => {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Basic ')) {
        return res.status(401).json({ erro: 'Autenticação necessária' })
    }

    const decoded  = Buffer.from(header.split(' ')[1], 'base64').toString('utf8')
    const colonIdx = decoded.indexOf(':')
    const rawToken = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : decoded

    if (!rawToken) return res.status(401).json({ erro: 'Credenciais inválidas' })

    const hash = crypto.createHash('sha256').update(rawToken).digest('hex')

    try {
        const keyResult = await managerPool.query(
            'SELECT id, evento_id FROM basic_auth_keys WHERE token_hash = $1 AND ativo = true',
            [hash]
        )
        if (keyResult.rowCount === 0) {
            return res.status(401).json({ erro: 'Chave de API inválida ou inativa' })
        }

        const key = keyResult.rows[0]

        if (!key.evento_id) {
            return res.json({ ativo: true, motivo: null, evento: null })
        }

        const evResult = await managerPool.query(
            'SELECT id, nome, data_inicio, data_fim FROM eventos WHERE id = $1',
            [key.evento_id]
        )
        if (evResult.rowCount === 0) {
            return res.json({ ativo: false, motivo: 'evento_nao_encontrado', evento: null })
        }

        const evento = evResult.rows[0]
        const status = calcStatus(evento)
        const ativo  = status === 'ativo'

        res.json({
            ativo,
            motivo: ativo ? null : status,
            evento: {
                id:          evento.id,
                nome:        evento.nome,
                status,
                data_inicio: evento.data_inicio,
                data_fim:    evento.data_fim,
            },
        })
    } catch (err) {
        res.status(500).json({ erro: err.message })
    }
})

module.exports = router
