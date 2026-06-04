const express    = require('express')
const router     = express.Router()
const nodemailer = require('nodemailer')
const QRCode     = require('qrcode')
const jwt        = require('jsonwebtoken')
const pool       = require('../db/connection')

const SECRET = process.env.JWT_SECRET

function auth(req, res, next) {
    const token = req.headers['x-manager-token']
    if (!token) return res.status(401).json({ erro: 'Não autorizado.' })
    try { jwt.verify(token, SECRET); next() }
    catch { res.status(401).json({ erro: 'Token inválido ou expirado.' }) }
}

const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT),
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

// POST /api/email/enviar/:clienteId
router.post('/enviar/:clienteId', auth, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT c.nome, c.email,
                   p.codigo, p.status,
                   TO_CHAR(p.jogado_em, 'DD/MM/YYYY HH24:MI') AS jogado_em,
                   pr.nome AS premio_nome, pr.subnome AS premio_sub
            FROM clientes c
            JOIN partidas p  ON p.cliente_id = c.id
            JOIN premios  pr ON pr.id = p.premio_id
            WHERE c.id = $1
        `, [req.params.clienteId])

        if (rows.length === 0)  return res.status(404).json({ erro: 'Cliente não encontrado.' })
        const { nome, email, codigo, premio_nome, premio_sub, jogado_em } = rows[0]

        if (!email)  return res.status(400).json({ erro: 'Cliente sem e-mail cadastrado.' })
        if (!codigo) return res.status(400).json({ erro: 'Cliente sem prêmio sorteado.' })

        const premioCompleto = premio_sub ? `${premio_nome} — ${premio_sub}` : premio_nome
        const qrDataUrl = await QRCode.toDataURL(codigo, { width: 200, margin: 2 })
        const qrBase64  = qrDataUrl.replace(/^data:image\/png;base64,/, '')

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:30px 0">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)">
        <tr><td style="background:#005844;padding:28px 32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:900">Game Roleta</h1>
          <p style="margin:8px 0 0;color:#B7C922;font-size:13px;text-transform:uppercase;letter-spacing:.1em">Parabéns!</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;font-size:16px;color:#333">Olá, <strong>${nome}</strong>!</p>
          <p style="margin:0 0 24px;font-size:15px;color:#555">Você foi sorteado e ganhou um prêmio incrível:</p>
          <div style="background:#f0f7f4;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px">
            <p style="margin:0;font-size:22px;font-weight:800;color:#005844">${premioCompleto}</p>
          </div>
          <p style="margin:0 0 8px;font-size:14px;color:#666;text-align:center">Apresente o código ou QR Code abaixo no balcão de retirada:</p>
          <div style="background:#005844;border-radius:8px;padding:16px;text-align:center;margin:0 0 16px">
            <p style="margin:0 0 4px;font-size:11px;color:#B7C922;text-transform:uppercase;letter-spacing:.1em">Código</p>
            <p style="margin:0;font-size:24px;font-weight:800;color:#fff;letter-spacing:.12em;font-family:monospace">${codigo}</p>
          </div>
          <div style="text-align:center;margin:0 0 24px">
            <img src="cid:qrcode@game" alt="QR Code" width="160" style="border:4px solid #e0e0e0;border-radius:8px">
          </div>
          <p style="margin:0;font-size:12px;color:#aaa;text-align:center">Sorteado em: ${jogado_em}</p>
        </td></tr>
        <tr><td style="background:#f8f8f8;padding:16px 32px;text-align:center;border-top:1px solid #eee">
          <p style="margin:0;font-size:12px;color:#aaa">Game Roleta — Este e-mail foi gerado automaticamente.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

        await transporter.sendMail({
            from:        `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
            to:          email,
            subject:     `Você ganhou! ${premioCompleto} 🎉`,
            html,
            attachments: [{
                filename: 'qrcode.png',
                content:  qrBase64,
                encoding: 'base64',
                cid:      'qrcode@game',
            }],
        })

        // marcar email como enviado
        await pool.query(
            'UPDATE partidas SET email_enviado = true WHERE cliente_id = $1',
            [req.params.clienteId]
        )

        res.json({ ok: true })
    } catch (err) {
        console.error('Erro ao enviar email:', err.message)
        res.status(500).json({ erro: err.message })
    }
})

module.exports = router
