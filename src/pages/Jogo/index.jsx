import { useState, useCallback } from 'react'
import api from '../../services/api'
import Roleta from '../../components/Roleta'
import ModalPremio from '../../components/ModalPremio'
import useSom from '../../hooks/useSom'
import styles from './Jogo.module.css'

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

// ─── Etapa 1: Start ───────────────────────────────────────────
function TelaStart({ onAvancar, playBotao }) {
    return (
        <div className={`${styles.tela} ${styles.telaStart}`}>
            <div className={styles.overlay}>
                <div className={styles.logoArea}>
                    <h1 className={styles.logoTexto}>Game Roleta</h1>
                </div>
                <p className={styles.textoInicio}>
                    Participe do nosso sorteio e<br />concorra a prêmios incríveis!
                </p>
                <div className={styles.botaoArea}>
                    <button className={styles.btnGame} onClick={() => { playBotao(); onAvancar() }}>
                        VAMOS LÁ
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Etapa 2: Identificação por CPF ──────────────────────────
function TelaIdentificacao({ onValidado, onNaoEncontrado, playBotao }) {
    const [cpf, setCpf]               = useState('')
    const [erro, setErro]             = useState('')
    const [carregando, setCarregando] = useState(false)

    async function handleContinuar() {
        setErro('')
        const limpo = cpf.replace(/\D/g, '')
        if (!limpo) return
        playBotao()

        // Modo dev
        if (limpo === '55555555555') {
            onValidado({ id: null, nome: 'Dev Teste' })
            return
        }

        setCarregando(true)
        try {
            const { data } = await api.post('/api/cliente/validar', { cpf })
            onValidado(data)
        } catch (err) {
            const status = err.response?.status
            if (status === 404) {
                // Não cadastrado → vai para o form com CPF preenchido
                onNaoEncontrado(cpf)
            } else {
                setErro(err.response?.data?.erro || 'Erro ao validar.')
            }
        } finally {
            setCarregando(false)
        }
    }

    return (
        <div className={`${styles.tela} ${styles.telaApresentacao}`}>
            <div className={styles.overlay}>
                <p className={styles.textoApresentacao}>Insira seu CPF para começar</p>
                <div className={styles.formArea}>
                    <input
                        className={styles.inputGame}
                        type='text'
                        placeholder='000.000.000-00'
                        value={cpf}
                        onChange={e => setCpf(formatarCpf(e.target.value))}
                        autoComplete='off'
                        inputMode='numeric'
                    />
                </div>
                {erro && <p className={styles.erroTexto}>{erro}</p>}
                <div className={styles.botaoArea}>
                    <button
                        className={styles.btnGame}
                        onClick={handleContinuar}
                        disabled={carregando}
                    >
                        {carregando ? 'Verificando...' : 'CONTINUAR'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Etapa 3: Cadastro (CPF não encontrado) ───────────────────
function TelaCadastro({ cpfInicial, onCadastrado, playBotao }) {
    const [form, setForm] = useState({
        nome: '', cpf: cpfInicial || '', telefone: '', email: '', perfil: '',
    })
    const [erro, setErro]             = useState('')
    const [carregando, setCarregando] = useState(false)

    function handleChange(e) {
        const { name, value } = e.target
        setForm(prev => ({
            ...prev,
            [name]: name === 'cpf'      ? formatarCpf(value)
                  : name === 'telefone' ? formatarTel(value)
                  : value,
        }))
    }

    async function handleSubmit() {
        if (!form.nome || !form.cpf || !form.telefone) {
            setErro('Nome, CPF e telefone são obrigatórios.')
            return
        }
        setErro('')
        playBotao()
        setCarregando(true)
        try {
            const { data } = await api.post('/api/cliente', form)
            onCadastrado({ id: data.id, nome: form.nome })
        } catch (err) {
            setErro(err.response?.data?.erro || 'Erro ao cadastrar.')
        } finally {
            setCarregando(false)
        }
    }

    return (
        <div className={`${styles.tela} ${styles.telaApresentacao}`}>
            <div className={styles.overlay}>
                <p className={styles.textoApresentacao}>Preencha seus dados para participar</p>
                <div className={styles.formArea} style={{ gap: '1.2vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <input className={styles.inputGame} name='nome' placeholder='Nome completo *'
                        value={form.nome} onChange={handleChange} autoComplete='off' />
                    <input className={styles.inputGame} name='cpf' placeholder='CPF *'
                        value={form.cpf} onChange={handleChange} autoComplete='off' inputMode='numeric' />
                    <input className={styles.inputGame} name='telefone' placeholder='Telefone *'
                        value={form.telefone} onChange={handleChange} autoComplete='off' inputMode='tel' />
                    <input className={styles.inputGame} name='email' placeholder='E-mail (opcional)'
                        value={form.email} onChange={handleChange} autoComplete='off' inputMode='email' />
                    <select
                        className={styles.inputGame}
                        name='perfil'
                        value={form.perfil}
                        onChange={handleChange}
                        style={{ background: 'rgba(0,0,0,0.3)', color: form.perfil ? 'white' : 'rgba(255,255,255,0.5)' }}
                    >
                        <option value=''>Perfil (opcional)</option>
                        {PERFIS.map(p => <option key={p} value={p} style={{ color: '#000' }}>{p}</option>)}
                    </select>
                </div>
                {erro && <p className={styles.erroTexto}>{erro}</p>}
                <div className={styles.botaoArea}>
                    <button className={styles.btnGame} onClick={handleSubmit} disabled={carregando}>
                        {carregando ? 'Cadastrando...' : 'CADASTRAR'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Etapa 4: Palpite ─────────────────────────────────────────
function TelaPalpite({ nomeParticipante, onEnviar, playBotao, modoTeste }) {
    const [resposta, setResposta] = useState(modoTeste ? '42' : '')
    const [enviando, setEnviando] = useState(false)
    const [erro, setErro]         = useState('')

    async function handleEnviar() {
        if (!resposta.trim()) { setErro('Informe seu palpite.'); return }
        setErro('')
        playBotao()
        setEnviando(true)
        try {
            await onEnviar(resposta.trim())
        } catch (e) {
            setErro(e.message || 'Erro ao enviar palpite.')
            setEnviando(false)
        }
    }

    return (
        <div className={`${styles.tela} ${styles.telaQuiz}`}>
            <div className={styles.overlay}>
                <div className={styles.questionArea}>
                    <p className={styles.numeroPergunta}>Seu palpite</p>
                    <p className={styles.textoPergunta}>
                        Olá, {nomeParticipante}!<br />
                        Quantas células você vê no recipiente?
                    </p>
                    <div style={{
                        width: '100%', minHeight: '18vh', background: 'rgba(255,255,255,0.1)',
                        borderRadius: '1vh', marginBottom: '2vh', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.8vh' }}>
                            [imagem do recipiente]
                        </span>
                    </div>
                </div>
                <div className={styles.formArea}>
                    <input
                        className={styles.inputGame}
                        type='number'
                        inputMode='numeric'
                        placeholder='Digite seu palpite...'
                        value={resposta}
                        onChange={e => setResposta(e.target.value)}
                        autoComplete='off'
                    />
                </div>
                {erro && <p className={styles.erroTexto}>{erro}</p>}
                <div className={styles.botaoArea}>
                    <button className={styles.btnGame} onClick={handleEnviar} disabled={enviando}>
                        {enviando ? 'Enviando...' : 'CONFIRMAR PALPITE'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Etapa 5: Roleta (somente exibição) ──────────────────────
function TelaRoleta({ premios, premioForcado, onEncerrar, play, stop }) {
    const [premioExibido, setPremioExibido] = useState(null)

    function handlePremioSorteado(premio) {
        stop()
        play('sucessoRoleta')
        setPremioExibido(premio)
    }

    return (
        <div className={`${styles.tela} ${styles.telaRoleta}`}>
            <Roleta
                premios={premios}
                onPremioSorteado={handlePremioSorteado}
                onGirar={() => play('roleta')}
                premioForcado={premioForcado}
            />
            {premioExibido && (
                <ModalPremio premio={premioExibido} onFechar={onEncerrar} />
            )}
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────
export default function Jogo() {
    const { play, stop } = useSom()

    // etapas: 1=start 2=identificacao 3=cadastro 4=palpite 5=roleta
    const [etapa, setEtapa]                 = useState(1)
    const [clienteId, setClienteId]         = useState(null)
    const [nomeCliente, setNomeCliente]     = useState('')
    const [cpfPendente, setCpfPendente]     = useState('')
    const [premioForcado, setPremioForcado] = useState(null)
    const [premios, setPremios]             = useState([])
    const [modoTeste, setModoTeste]         = useState(false)

    const resetJogo = useCallback(() => {
        stop()
        setEtapa(1)
        setClienteId(null)
        setNomeCliente('')
        setCpfPendente('')
        setPremioForcado(null)
        setPremios([])
        setModoTeste(false)
    }, [stop])

    async function carregarPremios() {
        const { data } = await api.get('/api/premios')
        setPremios(data)
    }

    function avancarParaPalpite(cliente) {
        setClienteId(cliente.id)
        setNomeCliente(cliente.nome)
        setModoTeste(cliente.id === null)
        carregarPremios().catch(() => {})
        setEtapa(4)
    }

    function handleValidado(cliente) {
        avancarParaPalpite(cliente)
    }

    function handleNaoEncontrado(cpf) {
        setCpfPendente(cpf)
        setEtapa(3)
    }

    function handleCadastrado(cliente) {
        avancarParaPalpite(cliente)
    }

    async function handlePalpiteEnviado(resposta) {
        if (clienteId === null) {
            // Modo dev — usa primeiro prêmio disponível
            setPremioForcado(premios[0] ?? { id: 0, nome: 'Dev Prêmio', subnome: null })
            play('sucessoQuiz')
            setEtapa(5)
            return
        }

        const { data } = await api.post('/api/palpite', { clienteId, palpite: resposta })
        setPremioForcado({ id: data.premioId, nome: data.premioNome, subnome: data.premioSub })
        play('sucessoQuiz')
        setEtapa(5)
    }

    return (
        <div className={styles.gameContent}>
            {etapa === 1 && (
                <TelaStart
                    onAvancar={() => setEtapa(2)}
                    playBotao={() => play('botao')}
                />
            )}
            {etapa === 2 && (
                <TelaIdentificacao
                    onValidado={handleValidado}
                    onNaoEncontrado={handleNaoEncontrado}
                    playBotao={() => play('botao')}
                />
            )}
            {etapa === 3 && (
                <TelaCadastro
                    cpfInicial={cpfPendente}
                    onCadastrado={handleCadastrado}
                    playBotao={() => play('botao')}
                />
            )}
            {etapa === 4 && premios.length === 0 && (
                <div className={`${styles.tela} ${styles.telaQuiz}`}>
                    <div className={styles.overlay}>
                        <p style={{ color: 'white', fontSize: '2.2vh' }}>Carregando...</p>
                    </div>
                </div>
            )}
            {etapa === 4 && premios.length > 0 && (
                <TelaPalpite
                    nomeParticipante={nomeCliente}
                    onEnviar={handlePalpiteEnviado}
                    playBotao={() => play('botao')}
                    modoTeste={modoTeste}
                />
            )}
            {etapa === 5 && (
                <TelaRoleta
                    premios={premios}
                    premioForcado={premioForcado}
                    onEncerrar={resetJogo}
                    play={play}
                    stop={stop}
                />
            )}
        </div>
    )
}
