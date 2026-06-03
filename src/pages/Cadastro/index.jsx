import { useState, useEffect, useCallback } from 'react'
import { QRCode } from 'react-qr-code'
import api from '../../services/api'
import styles from './Cadastro.module.css'

const STORAGE_KEY = 'gr_cpf'
const POLL_MS     = 10000

const PERFIS = [
    'Agrônomo', 'Criador/Proprietário de Animais', 'Estudante de Veterinária',
    'Lojista', 'Tratador de Cavalos', 'Veterinário de Equinos', 'Zootecnista', 'Outros',
]

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

function cpfParcial(cpf) {
    const d = cpf.replace(/\D/g, '')
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.***-**`
}

function dataFormatada(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

// ─── Tela de Cadastro ─────────────────────────────────────────
function FormCadastro({ onCadastrado }) {
    const [form, setForm] = useState({ nome: '', cpf: '', telefone: '', email: '', perfil: '' })
    const [verificando, setVerificando] = useState(false)
    const [erro, setErro] = useState('')
    const [carregando, setCarregando] = useState(false)

    function handleChange(e) {
        const { name, value } = e.target
        setForm(prev => ({
            ...prev,
            [name]: name === 'cpf' ? formatarCpf(value) : name === 'telefone' ? formatarTel(value) : value,
        }))
    }

    async function handleCpfBlur() {
        const limpo = form.cpf.replace(/\D/g, '')
        if (limpo.length !== 11) return
        setErro('')
        setVerificando(true)
        try {
            await api.get(`/api/cliente/status/${limpo}`)
            // CPF já cadastrado → vai direto pro status
            localStorage.setItem(STORAGE_KEY, limpo)
            onCadastrado(limpo)
        } catch (err) {
            if (err.response?.status !== 404) {
                setErro(err.response?.data?.erro || 'Erro ao verificar CPF.')
            }
            // 404 = CPF novo, continua no form normalmente
        } finally {
            setVerificando(false)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setErro('')
        setCarregando(true)
        try {
            await api.post('/api/cliente', form)
            const limpo = form.cpf.replace(/\D/g, '')
            localStorage.setItem(STORAGE_KEY, limpo)
            onCadastrado(limpo)
        } catch (err) {
            setErro(err.response?.data?.erro || 'Erro ao realizar cadastro.')
        } finally {
            setCarregando(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.titulo}>Participar</h1>
                <p className={styles.subtitulo}>Preencha seus dados para participar</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.campo}>
                        <label htmlFor='cpf'>CPF *</label>
                        <input id='cpf' name='cpf' type='text' value={form.cpf}
                            onChange={handleChange} onBlur={handleCpfBlur}
                            placeholder='000.000.000-00' required autoComplete='off' />
                        {verificando && <span className={styles.verificando}>Verificando...</span>}
                    </div>
                    <div className={styles.campo}>
                        <label htmlFor='nome'>Nome completo *</label>
                        <input id='nome' name='nome' type='text' value={form.nome}
                            onChange={handleChange} required autoComplete='off' />
                    </div>
                    <div className={styles.campo}>
                        <label htmlFor='telefone'>Telefone *</label>
                        <input id='telefone' name='telefone' type='tel' value={form.telefone}
                            onChange={handleChange} placeholder='(00) 00000-0000' required autoComplete='off' />
                    </div>
                    <div className={styles.campo}>
                        <label htmlFor='email'>E-mail <span className={styles.opcional}>(opcional)</span></label>
                        <input id='email' name='email' type='email' value={form.email}
                            onChange={handleChange} autoComplete='off' />
                    </div>
                    <div className={styles.campo}>
                        <label htmlFor='perfil'>Perfil <span className={styles.opcional}>(opcional)</span></label>
                        <select id='perfil' name='perfil' value={form.perfil} onChange={handleChange}>
                            <option value=''>Selecione...</option>
                            {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    {erro && <p className={styles.erro}>{erro}</p>}

                    <button type='submit' className={styles.botao} disabled={carregando}>
                        {carregando ? 'Aguarde...' : 'CADASTRAR'}
                    </button>
                </form>
            </div>
        </div>
    )
}

// ─── Tela de Status ───────────────────────────────────────────
function TelaStatus({ cpf, onSair }) {
    const [dados, setDados] = useState(null)
    const [erro, setErro] = useState('')

    const buscarStatus = useCallback(async () => {
        try {
            const { data } = await api.get(`/api/cliente/status/${cpf}`)
            setDados(data)
            setErro('')
        } catch (err) {
            setErro(err.response?.data?.erro || 'Erro ao buscar status.')
        }
    }, [cpf])

    useEffect(() => {
        buscarStatus()
        const intervalo = setInterval(buscarStatus, POLL_MS)
        return () => clearInterval(intervalo)
    }, [buscarStatus])

    if (!dados && erro) return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.statusIcone}>⚠️</div>
                <p className={styles.erro}>{erro}</p>
                <button className={styles.botaoSecundario} onClick={buscarStatus}>Tentar novamente</button>
                <button className={styles.botaoSecundario} onClick={onSair} style={{ marginTop: '0.5vh' }}>
                    Sair
                </button>
            </div>
        </div>
    )

    if (!dados) return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.statusIcone}>⏳</div>
                <p className={styles.subtitulo}>Carregando status...</p>
            </div>
        </div>
    )

    const { cliente, partida } = dados
    const status = partida?.status ?? 'cadastrado'

    return (
        <div className={styles.container}>
            <div className={styles.card}>

                {/* ── Sem partida: aguardando ── */}
                {status === 'cadastrado' && (
                    <>
                        <div className={styles.statusIcone}>⏳</div>
                        <h2 className={styles.statusTitulo}>Cadastro confirmado!</h2>
                        <p className={styles.statusMsg}>
                            Aguarde sua vez no quiosque do evento.
                        </p>
                        <div className={styles.cpfDestaque}>{cpfParcial(cliente.cpf)}</div>
                        <p className={styles.statusDica}>
                            Apresente este CPF no quiosque para jogar.
                        </p>
                    </>
                )}

                {/* ── Jogou, sem prêmio (falhou no quiz) ── */}
                {status === 'jogando' && (
                    <>
                        <div className={styles.statusIcone}>🎮</div>
                        <h2 className={styles.statusTitulo}>Participação registrada</h2>
                        <p className={styles.statusMsg}>
                            Você participou do jogo em {dataFormatada(partida.jogado_em)}.
                        </p>
                        <p className={styles.statusDica}>
                            Obrigado por participar!
                        </p>
                    </>
                )}

                {/* ── Prêmio disponível ── */}
                {status === 'premio_disponivel' && (
                    <>
                        <div className={styles.statusIcone}>🎉</div>
                        <h2 className={styles.statusTitulo}>Você ganhou!</h2>
                        <p className={styles.premioNome}>{partida.premio_nome ?? '—'}</p>
                        {partida.premio_sub && (
                            <p className={styles.premioSub}>{partida.premio_sub}</p>
                        )}
                        {partida.codigo ? (
                            <>
                                <div className={styles.codigoBox}>
                                    <span className={styles.codigoLabel}>Código</span>
                                    <span className={styles.codigo}>{partida.codigo}</span>
                                </div>
                                <div className={styles.qrBox}>
                                    <QRCode value={partida.codigo} size={180} />
                                </div>
                            </>
                        ) : (
                            <p className={styles.statusDica}>Código sendo gerado...</p>
                        )}
                        <p className={styles.statusDica}>
                            Apresente este QR Code ou código no balcão de retirada.
                        </p>
                    </>
                )}

                {/* ── Prêmio entregue ── */}
                {status === 'premio_entregue' && (
                    <>
                        <div className={styles.statusIcone}>✅</div>
                        <h2 className={styles.statusTitulo}>Prêmio entregue!</h2>
                        <p className={styles.premioNome}>{partida.premio_nome}</p>
                        {partida.premio_sub && (
                            <p className={styles.premioSub}>{partida.premio_sub}</p>
                        )}
                        <div className={styles.entregaInfo}>
                            <span>Entregue em: <strong>{dataFormatada(partida.entregue_em)}</strong></span>
                        </div>
                    </>
                )}

                <div className={styles.nomeCliente}>{cliente.nome}</div>
                <button className={styles.botaoSecundario} onClick={onSair}>
                    Não sou eu
                </button>
            </div>
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────
export default function Cadastro() {
    const [cpf, setCpf] = useState(() => localStorage.getItem(STORAGE_KEY) || '')

    function handleCadastrado(cpfNovo) { setCpf(cpfNovo) }

    function handleSair() {
        localStorage.removeItem(STORAGE_KEY)
        setCpf('')
    }

    if (cpf) return <TelaStatus cpf={cpf} onSair={handleSair} />
    return <FormCadastro onCadastrado={handleCadastrado} />
}
