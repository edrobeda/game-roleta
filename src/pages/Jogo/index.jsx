import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import Roleta from '../../components/Roleta'
import ModalPremio from '../../components/ModalPremio'
import useSom from '../../hooks/useSom'
import styles from './Jogo.module.css'

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5)
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

// ─── Etapa 2: Validação de CPF ou telefone ───────────────────
function TelaApresentacao({ onValidado, playBotao }) {
    const [valor, setValor]           = useState('')
    const [tipo, setTipo]             = useState('cpf') // 'cpf' | 'tel'
    const [erro, setErro]             = useState('')
    const [carregando, setCarregando] = useState(false)

    // telefone: 10 dígitos (sem 9) ou começa com '('
    function detectarTipo(v) {
        const d = v.replace(/\D/g, '')
        if (v.startsWith('(') || d.length === 10) return 'tel'
        return 'cpf'
    }

    function aplicarMascara(v) {
        const t = detectarTipo(v)
        const d = v.replace(/\D/g, '')
        if (t === 'tel') return d.slice(0, 11)
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
        return d.slice(0, 11)
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }

    function handleChange(e) {
        const novo = e.target.value
        setTipo(detectarTipo(novo))
        setValor(aplicarMascara(novo))
    }

    async function handleContinuar() {
        setErro('')
        if (!valor) return
        playBotao()

        // Modo desenvolvimento — CPF 555
        if (valor.replace(/\D/g, '') === '55555555555') {
            onValidado({ id: null, nome: 'Dev Teste' })
            return
        }

        setCarregando(true)
        try {
            const payload = tipo === 'tel' ? { telefone: valor } : { cpf: valor }
            const { data } = await api.post('/api/cliente/validar', payload)
            onValidado(data)
        } catch (err) {
            setErro(err.response?.data?.erro || 'Erro ao validar.')
        } finally {
            setCarregando(false)
        }
    }

    return (
        <div className={`${styles.tela} ${styles.telaApresentacao}`}>
            <div className={styles.overlay}>
                <p className={styles.textoApresentacao}>Insira o CPF ou telefone cadastrado</p>
                <div className={styles.formArea}>
                    <input
                        className={styles.inputGame}
                        type='text'
                        placeholder={tipo === 'tel' ? 'Telefone' : 'CPF'}
                        value={valor}
                        onChange={handleChange}
                        autoComplete='off'
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
                <p className={styles.avisoTexto}>
                    O cadastro deve ser feito via página de cadastramento
                </p>
            </div>
        </div>
    )
}

// ─── Etapa 3: Quiz ────────────────────────────────────────────
function TelaQuiz({ perguntas, onFinalizar, playSelecao, playBotao, modoTeste }) {
    const [indice, setIndice] = useState(0)
    const [acertos, setAcertos] = useState(0)
    const [respostaSelecionada, setRespostaSelecionada] = useState(null)
    const [respostasEmbaralhadas, setRespostasEmbaralhadas] = useState([])

    useEffect(() => {
        if (perguntas[indice]) {
            const embaralhadas = shuffle(perguntas[indice].respostas)
            setRespostasEmbaralhadas(embaralhadas)
            setRespostaSelecionada(modoTeste ? (embaralhadas.find(r => r.correta) ?? null) : null)
        }
    }, [indice, perguntas, modoTeste])

    function handleProxima() {
        if (respostaSelecionada === null) return
        playBotao()

        const novosAcertos = respostaSelecionada.correta ? acertos + 1 : acertos

        if (indice < perguntas.length - 1) {
            setAcertos(novosAcertos)
            setIndice(indice + 1)
        } else {
            onFinalizar(novosAcertos)
        }
    }

    if (!perguntas.length || !respostasEmbaralhadas.length) return null

    const pergunta = perguntas[indice]

    return (
        <div className={`${styles.tela} ${styles.telaQuiz}`}>
            <div className={styles.overlay}>
                <div className={styles.questionArea}>
                    <p className={styles.numeroPergunta}>
                        {indice + 1}/{perguntas.length}
                    </p>
                    <p className={styles.textoPergunta}>{pergunta.pergunta}</p>
                </div>
                <div className={styles.respostasArea}>
                    {respostasEmbaralhadas.map((resp, k) => (
                        <label
                            key={k}
                            className={`${styles.linhaResposta} ${respostaSelecionada === resp ? styles.selecionada : ''}`}
                            onClick={() => { playSelecao(); setRespostaSelecionada(resp) }}
                        >
                            <input
                                type='radio'
                                name='resposta'
                                checked={respostaSelecionada === resp}
                                onChange={() => setRespostaSelecionada(resp)}
                            />
                            <span>{resp.texto}</span>
                        </label>
                    ))}
                </div>
                <div className={styles.botaoArea}>
                    <button
                        className={styles.btnGame}
                        onClick={handleProxima}
                        disabled={respostaSelecionada === null}
                    >
                        {indice < perguntas.length - 1 ? 'PRÓXIMA' : 'FINALIZAR'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Etapa 4: Sucesso no quiz ─────────────────────────────────
function TelaSucesso({ onAvancar, playBotao }) {
    return (
        <div className={`${styles.tela} ${styles.telaSucesso}`}>
            <div className={styles.overlay}>
                <div className={styles.textoResultado}>
                    <h2>Parabéns!</h2>
                    <p>Você acertou as perguntas.<br />Hora de girar a roleta!</p>
                </div>
                <div className={styles.botaoArea}>
                    <button className={styles.btnGame} onClick={() => { playBotao(); onAvancar() }}>
                        GIRAR ROLETA
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Etapa 5: Roleta ──────────────────────────────────────────
function TelaRoleta({ premios, clienteId, partidaId, onEncerrar, play, stop }) {
    const [premioGanho, setPremioGanho] = useState(null)

    async function handlePremioSorteado(premio) {
        stop()
        play('sucessoRoleta')
        setPremioGanho(premio)

        if (partidaId) {
            try {
                await api.patch(`/api/partida/${partidaId}/premio`, { premioId: premio.id })
            } catch (_) {}
        }
    }

    return (
        <div className={`${styles.tela} ${styles.telaRoleta}`}>
            <Roleta
                premios={premios}
                onPremioSorteado={handlePremioSorteado}
                onGirar={() => play('roleta')}
            />
            {premioGanho && (
                <ModalPremio
                    premio={premioGanho}
                    onFechar={onEncerrar}
                />
            )}
        </div>
    )
}

// ─── Etapa 6: Falha ───────────────────────────────────────────
function TelaFalha({ onEncerrar, playBotao }) {
    return (
        <div className={`${styles.tela} ${styles.telaFalha}`}>
            <div className={styles.overlay}>
                <div className={styles.textoResultado}>
                    <h2>Não foi dessa vez!</h2>
                    <p>Tente novamente na próxima oportunidade.</p>
                </div>
                <div className={styles.botaoArea}>
                    <button className={`${styles.btnGame} ${styles.btnBranco}`} onClick={() => { playBotao(); onEncerrar() }}>
                        ENCERRAR
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────
export default function Jogo() {
    const { play, stop } = useSom()

    const [etapa, setEtapa] = useState(1)
    const [clienteId, setClienteId] = useState(null)
    const [partidaId, setPartidaId] = useState(null)
    const [perguntas, setPerguntas] = useState([])
    const [premios, setPremios] = useState([])
    const [erroInicial, setErroInicial] = useState('')

    // Volta ao estado inicial sem sair da página — modo quiosque
    const resetJogo = useCallback(() => {
        stop()
        setEtapa(1)
        setClienteId(null)
        setPartidaId(null)
        setPerguntas([])
        setPremios([])
        setErroInicial('')
    }, [stop])

    async function carregarDadosJogo() {
        try {
            const [resQuiz, resPremios] = await Promise.all([
                api.get('/api/quiz'),
                api.get('/api/premios'),
            ])
            setPerguntas(resQuiz.data)
            setPremios(resPremios.data)
        } catch {
            setErroInicial('Erro ao carregar dados do jogo. Reiniciando...')
            setTimeout(resetJogo, 3000)
        }
    }

    function handleClienteValidado(cliente) {
        setClienteId(cliente.id)
        carregarDadosJogo()
        setEtapa(3)
    }

    async function handleQuizFinalizado(totalAcertos) {
        if (clienteId !== null) {
            try {
                const { data } = await api.post('/api/partida', {
                    clienteId,
                    quizAcertos: totalAcertos,
                    premioId: null,
                })
                setPartidaId(data.id)
            } catch (_) {}
        }

        if (totalAcertos === perguntas.length) {
            play('sucessoQuiz')
            setEtapa(4)
        } else {
            play('fail')
            setEtapa(6)
        }
    }

    return (
        <div className={styles.gameContent}>
            {erroInicial && (
                <div className={styles.erroGlobal}>
                    <p>{erroInicial}</p>
                </div>
            )}

            {etapa === 1 && (
                <TelaStart
                    onAvancar={() => setEtapa(2)}
                    playBotao={() => play('botao')}
                />
            )}
            {etapa === 2 && (
                <TelaApresentacao
                    onValidado={handleClienteValidado}
                    playBotao={() => play('botao')}
                />
            )}
            {etapa === 3 && perguntas.length === 0 && (
                <div className={`${styles.tela} ${styles.telaQuiz}`}>
                    <div className={styles.overlay}>
                        <p style={{ color: 'white', fontSize: '2.2vh' }}>Carregando perguntas...</p>
                    </div>
                </div>
            )}
            {etapa === 3 && perguntas.length > 0 && (
                <TelaQuiz
                    perguntas={perguntas}
                    onFinalizar={handleQuizFinalizado}
                    playSelecao={() => play('selecao')}
                    playBotao={() => play('botao')}
                    modoTeste={clienteId === null}
                />
            )}
            {etapa === 4 && (
                <TelaSucesso
                    onAvancar={() => setEtapa(5)}
                    playBotao={() => play('botao')}
                />
            )}
            {etapa === 5 && (
                <TelaRoleta
                    premios={premios}
                    clienteId={clienteId}
                    partidaId={partidaId}
                    onEncerrar={resetJogo}
                    play={play}
                    stop={stop}
                />
            )}
            {etapa === 6 && (
                <TelaFalha
                    onEncerrar={resetJogo}
                    playBotao={() => play('botao')}
                />
            )}
        </div>
    )
}
