import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import Roleta from '../../components/Roleta'
import ModalPremio from '../../components/ModalPremio'
import useSom from '../../hooks/useSom'
import styles from './Jogo.module.css'

const TITLE = import.meta.env.VITE_GAME_TITLE || 'Game Roleta'

function formatarCpf(v) {
    return v.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

// ─── Etapa 1: Start ───────────────────────────────────────────
function TelaStart({ onAvancar, playBotao }) {
    return (
        <div className={`${styles.tela} ${styles.telaStart}`}>
            <div className={styles.overlay}>
                <div className={styles.logoArea}>
                    <h1 className={styles.logoTexto}>{TITLE}</h1>
                </div>
                <p className={styles.textoInicio}>Quiz + Roleta de prêmios!</p>
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
function TelaIdentificacao({ onValidado, playBotao }) {
    const [cpf, setCpf]               = useState('')
    const [erro, setErro]             = useState('')
    const [carregando, setCarregando] = useState(false)

    async function handleContinuar() {
        setErro('')
        const limpo = cpf.replace(/\D/g, '')
        if (limpo.length !== 11) { setErro('CPF inválido.'); return }
        playBotao()

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
            if (status === 403) {
                setErro('Este CPF já participou.')
            } else if (status === 404) {
                setErro('CPF não cadastrado. Faça o cadastro primeiro.')
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
                        autoFocus
                    />
                </div>
                {erro && <p className={styles.erroTexto}>{erro}</p>}
                <div className={styles.botaoArea}>
                    <button className={styles.btnGame} onClick={handleContinuar} disabled={carregando}>
                        {carregando ? 'Verificando...' : 'CONTINUAR'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Etapa 3: Quiz (uma pergunta por vez) ─────────────────────
function TelaQuiz({ nomeParticipante, clienteId, onConcluido, playBotao, modoTeste }) {
    const [perguntas, setPerguntas]     = useState([])
    const [indice, setIndice]           = useState(0)
    const [selecionado, setSelecionado] = useState(null)
    const [respostas, setRespostas]     = useState([])
    const [carregando, setCarregando]   = useState(true)
    const [enviando, setEnviando]       = useState(false)
    const [erro, setErro]               = useState('')

    useEffect(() => {
        api.get('/api/quiz')
            .then(({ data }) => { setPerguntas(data); setCarregando(false) })
            .catch(() => { setErro('Erro ao carregar perguntas.'); setCarregando(false) })
    }, [])

    function handleProxima() {
        if (selecionado === null) { setErro('Selecione uma resposta.'); return }
        setErro('')
        playBotao()

        const novasRespostas = [...respostas, { quizId: perguntas[indice].id, respostaIndex: selecionado }]
        setRespostas(novasRespostas)
        setSelecionado(null)

        if (indice + 1 < perguntas.length) {
            setIndice(i => i + 1)
        } else {
            enviar(novasRespostas)
        }
    }

    async function enviar(lista) {
        setEnviando(true)
        try {
            if (modoTeste) {
                const { data: premiosData } = await api.get('/api/premios')
                onConcluido({ premios: premiosData, premioId: premiosData[0]?.id, premioNome: premiosData[0]?.nome, premioSub: premiosData[0]?.subnome, codigo: 'DEV-00000-TEST' })
                return
            }
            const { data } = await api.post('/api/quiz/responder', { clienteId, respostas: lista })
            onConcluido(data)
        } catch (err) {
            setErro(err.response?.data?.erro || 'Erro ao enviar respostas.')
            setEnviando(false)
        }
    }

    if (carregando) {
        return (
            <div className={`${styles.tela} ${styles.telaQuiz}`}>
                <div className={styles.overlay}>
                    <p style={{ color: 'white', fontSize: '2vh' }}>Carregando perguntas...</p>
                </div>
            </div>
        )
    }

    if (perguntas.length === 0) {
        return (
            <div className={`${styles.tela} ${styles.telaQuiz}`}>
                <div className={styles.overlay}>
                    <p className={styles.erroTexto}>Nenhuma pergunta cadastrada.</p>
                </div>
            </div>
        )
    }

    const pergunta = perguntas[indice]

    return (
        <div className={`${styles.tela} ${styles.telaQuiz}`}>
            <div className={styles.overlay}>
                <div className={styles.questionArea}>
                    <p className={styles.numeroPergunta}>
                        Pergunta {indice + 1} de {perguntas.length} — {nomeParticipante}
                    </p>
                    <p className={styles.textoPergunta}>{pergunta.pergunta}</p>
                </div>
                <div className={styles.respostasArea}>
                    {pergunta.respostas.map((r, i) => (
                        <label
                            key={i}
                            className={`${styles.linhaResposta} ${selecionado === i ? styles.selecionada : ''}`}
                            onClick={() => setSelecionado(i)}
                        >
                            <input type='radio' name='resposta' checked={selecionado === i} onChange={() => setSelecionado(i)} />
                            {r.texto}
                        </label>
                    ))}
                </div>
                {erro && <p className={styles.erroTexto}>{erro}</p>}
                <div className={styles.botaoArea}>
                    <button className={styles.btnGame} onClick={handleProxima} disabled={enviando}>
                        {enviando ? 'Enviando...' : indice + 1 < perguntas.length ? 'PRÓXIMA' : 'FINALIZAR'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Etapa 4: Roleta ──────────────────────────────────────────
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

    const [etapa, setEtapa]             = useState(1)
    const [clienteId, setClienteId]     = useState(null)
    const [nomeCliente, setNomeCliente] = useState('')
    const [premioForcado, setPremio]    = useState(null)
    const [premios, setPremios]         = useState([])
    const [modoTeste, setModoTeste]     = useState(false)

    const resetJogo = useCallback(() => {
        stop()
        setEtapa(1)
        setClienteId(null)
        setNomeCliente('')
        setPremio(null)
        setPremios([])
        setModoTeste(false)
    }, [stop])

    function handleValidado(cliente) {
        setClienteId(cliente.id)
        setNomeCliente(cliente.nome)
        setModoTeste(cliente.id === null)
        setEtapa(3)
    }

    function handleQuizConcluido(data) {
        setPremios(data.premios || [])
        setPremio({ id: data.premioId, nome: data.premioNome, subnome: data.premioSub })
        setEtapa(4)
    }

    return (
        <div className={styles.gameContent}>
            {etapa === 1 && (
                <TelaStart onAvancar={() => setEtapa(2)} playBotao={() => play('botao')} />
            )}
            {etapa === 2 && (
                <TelaIdentificacao onValidado={handleValidado} playBotao={() => play('botao')} />
            )}
            {etapa === 3 && clienteId !== undefined && (
                <TelaQuiz
                    nomeParticipante={nomeCliente}
                    clienteId={clienteId}
                    onConcluido={handleQuizConcluido}
                    playBotao={() => play('botao')}
                    modoTeste={modoTeste}
                />
            )}
            {etapa === 4 && (
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
