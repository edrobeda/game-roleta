import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QRCode } from 'react-qr-code'
import api from '../../services/api'
import styles from './Cadastro.module.css'

const TITLE   = import.meta.env.VITE_GAME_TITLE   || 'Game Roleta'
const POLL_MS = 10_000

function formatarCpf(v) {
    return v.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatarTel(v) {
    return v.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

// ─── Validação de CPF (dígitos verificadores) ─────────────
function validarCpf(cpf) {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
    const calcDigito = (base) => {
        let soma = 0
        for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i)
        const resto = (soma * 10) % 11
        return resto === 10 ? 0 : resto
    }
    const d1 = calcDigito(cpf.slice(0, 9))
    const d2 = calcDigito(cpf.slice(0, 9) + d1)
    return cpf === cpf.slice(0, 9) + String(d1) + String(d2)
}

// ─── Layout compartilhado ─────────────────────────────────
function Layout({ children }) {
    return (
        <div className={styles.layout}>
            <main className={styles.main}>
                <div className={styles.inner}>{children}</div>
            </main>
        </div>
    )
}

// ─── Tela 0: Boas-vindas ──────────────────────────────────
function TelaBoasVindas({ onAvancar }) {
    return (
        <div className={styles.telaHome}>
            <h1 className={styles.welcomeTitle}>QUIZ {TITLE.toUpperCase()}</h1>
            <p className={styles.welcomeSub}>Participe e concorra a prêmios</p>
            <button className={`${styles.botao} ${styles.welcomeBtn}`} onClick={onAvancar}>
                QUERO PARTICIPAR
            </button>
        </div>
    )
}

// ─── Tela 1: Identificação por CPF ────────────────────────
function TelaIdentificacao({ onEncontrado, onNaoEncontrado, foreign }) {
    const [cpf, setCpf]           = useState('')
    const [buscando, setBuscando] = useState(false)
    const [erro, setErro]         = useState('')

    async function handleContinuar(e) {
        e.preventDefault()
        let documento
        if (foreign) {
            documento = cpf.trim()
            if (!documento) { setErro('Documento obrigatório.'); return }
        } else {
            documento = cpf.replace(/\D/g, '')
            if (!validarCpf(documento)) { setErro('CPF inválido.'); return }
        }
        setErro('')
        setBuscando(true)
        try {
            const { data } = await api.get(`/api/cliente/status/${encodeURIComponent(documento)}`)
            onEncontrado(data)
        } catch (err) {
            if (err.response?.status === 404) {
                onNaoEncontrado(foreign ? documento : cpf)
            } else {
                setErro(err.response?.data?.erro || 'Erro ao verificar.')
            }
        } finally {
            setBuscando(false)
        }
    }

    return (
        <Layout>
            <h1 className={styles.titulo}>Vamos lá!</h1>
            <p className={styles.subtitulo}>Digite seu {foreign ? 'documento' : 'CPF'} para continuar</p>
            <form onSubmit={handleContinuar} className={styles.form}>
                <div className={styles.campo}>
                    <label htmlFor='cpf'>{foreign ? 'Documento' : 'CPF'}</label>
                    <input
                        id='cpf' type='text' value={cpf}
                        onChange={e => setCpf(foreign ? e.target.value : formatarCpf(e.target.value))}
                        placeholder={foreign ? 'Documento' : '000.000.000-00'} autoComplete='off'
                        inputMode={foreign ? 'text' : 'numeric'} autoFocus
                    />
                </div>
                {erro && <p className={styles.erro}>{erro}</p>}
                <button type='submit' className={styles.botao} disabled={buscando}>
                    {buscando ? 'Verificando...' : 'CONTINUAR'}
                </button>
            </form>
        </Layout>
    )
}

// ─── Tela 2: Cadastro ─────────────────────────────────────
function TelaCadastro({ cpfInicial, onCadastrado, foreign }) {
    const [form, setForm]             = useState({ nome: '', cpf: cpfInicial || '', telefone: '', email: '' })
    const [lgpd, setLgpd]             = useState(false)
    const [aceitaMarketing, setMarketing] = useState(false)
    const [erro, setErro]             = useState('')
    const [carregando, setCarregando] = useState(false)

    function handleChange(e) {
        const { name, value } = e.target
        setForm(prev => ({
            ...prev,
            [name]: foreign
                ? value
                : name === 'cpf' ? formatarCpf(value) : name === 'telefone' ? formatarTel(value) : value,
        }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!form.nome || !form.cpf || !form.telefone || !form.email) {
            setErro(foreign ? 'Nome, documento, telefone e e-mail são obrigatórios.' : 'Nome, CPF, telefone e e-mail são obrigatórios.')
            return
        }
        const documento = foreign ? form.cpf.trim() : form.cpf.replace(/\D/g, '')
        if (!foreign && !validarCpf(documento)) {
            setErro('CPF inválido.')
            return
        }
        if (!lgpd) {
            setErro('Você precisa aceitar a Política de Privacidade para continuar.')
            return
        }
        setErro('')
        setCarregando(true)
        const nomeFinal = form.nome.toUpperCase() + (foreign ? ' (Estrangeiro)' : '')
        try {
            const { data } = await api.post('/api/cliente', {
                ...form,
                cpf: documento,
                nome: nomeFinal,
                aceita_marketing: aceitaMarketing,
                foreign,
            })
            onCadastrado({ cliente: { id: data.id, nome: nomeFinal, cpf: documento }, partida: null })
        } catch (err) {
            setErro(err.response?.data?.erro || 'Erro ao cadastrar.')
        } finally {
            setCarregando(false)
        }
    }

    return (
        <Layout>
            <p className={styles.subtitulo}>Preencha seus dados para participar</p>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.campo}>
                    <label>{foreign ? 'Documento *' : 'CPF *'}</label>
                    <input name='cpf' value={form.cpf} onChange={handleChange}
                        placeholder={foreign ? 'Documento' : '000.000.000-00'}
                        inputMode={foreign ? 'text' : 'numeric'} autoComplete='off' />
                </div>
                <div className={styles.campo}>
                    <label>Nome completo *</label>
                    <input name='nome' value={form.nome} onChange={handleChange} autoComplete='off' style={{ textTransform: 'uppercase' }} />
                </div>
                <div className={styles.campo}>
                    <label>Telefone *</label>
                    <input name='telefone' value={form.telefone} onChange={handleChange}
                        placeholder={foreign ? 'Telefone' : '(00) 00000-0000'} inputMode={foreign ? 'text' : 'tel'} autoComplete='off' />
                </div>
                <div className={styles.campo}>
                    <label>E-mail *</label>
                    <input name='email' type='email' value={form.email} onChange={handleChange} autoComplete='off' />
                </div>
                <label className={styles.checkLgpd}>
                    <input type='checkbox' checked={lgpd} onChange={e => setLgpd(e.target.checked)} />
                    <span>
                        Li e aceito a{' '}
                        <a href='/lgpd' target='_blank' rel='noopener noreferrer'>Política de Privacidade</a>
                    </span>
                </label>
                <label className={styles.checkLgpd}>
                    <input type='checkbox' checked={aceitaMarketing} onChange={e => setMarketing(e.target.checked)} />
                    <span>Aceito receber informações e notícias seguindo as normas LGPD.</span>
                </label>
                {erro && <p className={styles.erro}>{erro}</p>}
                <button type='submit' className={styles.botao} disabled={carregando}>
                    {carregando ? 'Cadastrando...' : 'CADASTRAR'}
                </button>
            </form>
        </Layout>
    )
}

// ─── Tela 3: Status com polling ───────────────────────────
function TelaStatus({ cpf, nomeInicial, partidaInicial }) {
    const [partida, setPartida] = useState(partidaInicial)
    const [nome, setNome]       = useState(nomeInicial)

    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const { data } = await api.get(`/api/cliente/status/${encodeURIComponent(cpf)}`)
                setPartida(data.partida)
                setNome(data.cliente.nome)
            } catch {}
        }, POLL_MS)
        return () => clearInterval(id)
    }, [cpf])

    function reiniciar() { window.location.reload() }

    if (!partida || partida.status === 'aguardando') {
        return (
            <Layout>
                <div className={styles.statusWrap}>
                    <div className={styles.checkCircle}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <h2 className={styles.statusTitulo}>Cadastro realizado!</h2>
                    <p className={styles.statusMsg}>Insira seu CPF no totem para participar</p>
                    <div className={styles.cpfDestaque}>
                        {cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                    </div>
                    <p className={styles.statusDica}>Esta tela atualiza automaticamente.</p>
                    <div className={styles.nomeCliente}>{nome}</div>
                    <button className={styles.botaoSecundario} onClick={reiniciar}>Novo cadastro</button>
                </div>
            </Layout>
        )
    }

    if (partida.status === 'sem_premio') {
        return (
            <Layout>
                <div className={styles.statusWrap}>
                    <div className={styles.statusIcon}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                    </div>
                    <h2 className={styles.statusTitulo}>Não foi dessa vez!</h2>
                    <p className={styles.statusMsg}>
                        Você acertou <strong>{partida.quiz_acertos}</strong> de 3 perguntas.
                    </p>
                    <p className={styles.statusDica}>São necessários 3 acertos para concorrer a um prêmio.</p>
                    <div className={styles.nomeCliente}>{nome}</div>
                    <button className={styles.botaoSecundario} onClick={reiniciar}>Novo cadastro</button>
                </div>
            </Layout>
        )
    }

    if (partida.status === 'premio_disponivel') {
        return (
            <Layout>
                <div className={styles.statusWrap}>
                    <p className={styles.voceGanhou}>Você ganhou</p>
                    <p className={styles.premioNome}>{partida.premio_nome}</p>
                    {partida.premio_sub && <p className={styles.premioSub}>{partida.premio_sub}</p>}
                    {partida.codigo && (
                        <>
                            <div className={styles.codigoBox}>
                                <span className={styles.codigoLabel}>Código</span>
                                <span className={styles.codigo}>{partida.codigo}</span>
                            </div>
                            <div className={styles.qrBox}>
                                <QRCode value={partida.codigo} size={180} />
                            </div>
                        </>
                    )}
                    <p className={styles.statusDica}>Apresente este código no balcão de retirada.</p>
                    <div className={styles.nomeCliente}>{nome}</div>
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className={styles.statusWrap}>
                <div className={styles.checkCircle}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
                <h2 className={styles.statusTitulo}>Prêmio entregue!</h2>
                <p className={styles.premioNome}>{partida.premio_nome}</p>
                {partida.premio_sub && <p className={styles.premioSub}>{partida.premio_sub}</p>}
                <p className={styles.statusMsg}>Obrigado pela participação!</p>
                <div className={styles.nomeCliente}>{nome}</div>
                <button className={styles.botaoSecundario} onClick={reiniciar}>Novo cadastro</button>
            </div>
        </Layout>
    )
}

// ─── Página principal ─────────────────────────────────────
export default function Cadastro() {
    const [searchParams]           = useSearchParams()
    const foreign                  = searchParams.get('cad') === 'foreign'
    const [tela, setTela]          = useState('boasvindas')
    const [cpfPendente, setCpf]    = useState('')
    const [statusDados, setStatus] = useState(null)

    function handleEncontrado(dados) {
        setStatus(dados)
        setCpf(dados.cliente.cpf)
        setTela('status')
    }

    function handleNaoEncontrado(cpf) {
        setCpf(cpf)
        setTela('cadastro')
    }

    function handleCadastrado(dados) {
        setStatus(dados)
        setCpf(dados.cliente.cpf)
        setTela('status')
    }

    if (tela === 'boasvindas')    return <TelaBoasVindas onAvancar={() => setTela('identificacao')} />
    if (tela === 'identificacao') return <TelaIdentificacao onEncontrado={handleEncontrado} onNaoEncontrado={handleNaoEncontrado} foreign={foreign} />
    if (tela === 'cadastro')      return <TelaCadastro cpfInicial={cpfPendente} onCadastrado={handleCadastrado} foreign={foreign} />
    if (tela === 'status')        return <TelaStatus cpf={statusDados.cliente.cpf} nomeInicial={statusDados.cliente.nome} partidaInicial={statusDados.partida} />
    return null
}
