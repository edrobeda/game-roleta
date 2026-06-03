const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: false,
})

pool.on('error', (err) => {
    console.error('Erro inesperado no pool do PostgreSQL:', err)
})

module.exports = pool
