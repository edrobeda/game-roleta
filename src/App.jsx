import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import api from './services/api'
import Cadastro from './pages/Cadastro'
import Manager  from './pages/Manager'
import Entrega  from './pages/Entrega'

const POLL_MS = 60_000

const tela = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    background: '#005844',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textAlign: 'center',
    padding: '2rem',
    gap: '1rem',
}

const MOTIVO_MSG = {
    agendado:             { titulo: 'Evento ainda não iniciado',  sub: 'O evento ainda não começou. Volte mais tarde.' },
    encerrado:            { titulo: 'Evento encerrado',           sub: 'Este evento já foi encerrado. Obrigado pela participação!' },
    evento_nao_encontrado:{ titulo: 'Evento não encontrado',      sub: 'Nenhum evento vinculado a esta chave.' },
}

function TelaCarregando() {
    return (
        <div style={tela}>
            <div style={{ fontSize: '3rem' }}>⏳</div>
            <p style={{ fontSize: '1.2rem', opacity: 0.85 }}>Verificando disponibilidade...</p>
        </div>
    )
}

function TelaRevogada() {
    return (
        <div style={tela}>
            <div style={{ fontSize: '3rem' }}>🔒</div>
            <h2 style={{ margin: 0 }}>Acesso encerrado</h2>
            <p style={{ opacity: 0.8, maxWidth: 320 }}>
                A sessão foi revogada. Entre em contato com o organizador do evento.
            </p>
        </div>
    )
}

function TelaInativa({ motivo }) {
    const msg = MOTIVO_MSG[motivo] ?? { titulo: 'Jogo indisponível', sub: 'Este jogo não está disponível no momento.' }
    return (
        <div style={tela}>
            <div style={{ fontSize: '3rem' }}>⛔</div>
            <h2 style={{ margin: 0 }}>{msg.titulo}</h2>
            <p style={{ opacity: 0.8, maxWidth: 340 }}>{msg.sub}</p>
        </div>
    )
}

function TelaErro({ onRetry }) {
    return (
        <div style={tela}>
            <div style={{ fontSize: '3rem' }}>📡</div>
            <h2 style={{ margin: 0 }}>Sem conexão</h2>
            <p style={{ opacity: 0.8, maxWidth: 320 }}>Não foi possível conectar ao servidor.</p>
            <button
                onClick={onRetry}
                style={{
                    marginTop: '0.5rem', padding: '0.7rem 2rem',
                    background: '#B7C922', color: '#005844',
                    border: 'none', borderRadius: 8,
                    fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                }}
            >
                Tentar novamente
            </button>
        </div>
    )
}

export default function App() {
    const [status, setStatus] = useState('carregando') // carregando | ativo | inativo | revogado | erro
    const [motivo, setMotivo] = useState(null)

    const verificarStatus = useCallback(async () => {
        try {
            const { data } = await api.get('/api/game/status')
            setStatus(data.ativo ? 'ativo' : 'inativo')
            setMotivo(data.motivo)
        } catch (err) {
            if (err.response?.status === 401) {
                setStatus('revogado')
            } else {
                setStatus(prev => prev === 'carregando' ? 'erro' : prev)
            }
        }
    }, [])

    useEffect(() => {
        verificarStatus()
        const id = setInterval(verificarStatus, POLL_MS)
        return () => clearInterval(id)
    }, [verificarStatus])

    if (status === 'carregando') return <TelaCarregando />
    if (status === 'revogado')   return <TelaRevogada />
    if (status === 'inativo')    return <TelaInativa motivo={motivo} />
    if (status === 'erro')       return <TelaErro onRetry={verificarStatus} />

    return (
        <Routes>
            <Route path='/'         element={<Navigate to='/cadastro' replace />} />
            <Route path='/cadastro' element={<Cadastro />} />
            <Route path='/manager'  element={<Manager />} />
            <Route path='/entrega'  element={<Entrega />} />
        </Routes>
    )
}
