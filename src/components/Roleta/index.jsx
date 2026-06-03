import { useRef, useState, useMemo } from 'react'
import { CHANCE_PESOS } from '../../constants/chances'
import styles from './Roleta.module.css'

const CORES = ['#005844', '#488B53', '#58A561', '#006742', '#DC785A', '#B7C922', '#5C5B60', '#C3630A', '#AC0C17']
const DURACAO_SPIN = 9 // segundos

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5)
}

function peso(p) {
    return CHANCE_PESOS[p.chance] ?? p.chance
}

function sortearVencedor(premios) {
    const total = premios.reduce((acc, p) => acc + peso(p), 0)
    const rand = Math.random() * total
    let acumulado = 0
    for (let i = 0; i < premios.length; i++) {
        acumulado += peso(premios[i])
        if (rand <= acumulado) return i
    }
    return premios.length - 1
}

function gerarGradiente(n, cores) {
    const partes = Array.from({ length: n }, (_, i) => {
        const ini = ((i / n) * 100).toFixed(2)
        const fim = (((i + 1) / n) * 100).toFixed(2)
        // linha branca fina entre setores
        return `${cores[i % cores.length]} ${ini}% calc(${fim}% - 0.4%), white calc(${fim}% - 0.4%) ${fim}%`
    })
    return `conic-gradient(${partes.join(', ')})`
}

export default function Roleta({ premios, onPremioSorteado, onGirar }) {
    const wheelRef = useRef(null)
    const [girando, setGirando] = useState(false)
    const cores = useMemo(() => shuffle(CORES), [])
    const gradiente = useMemo(() => gerarGradiente(premios.length, cores), [premios.length, cores])
    const sectorAngle = premios.length > 0 ? 360 / premios.length : 0

    if (premios.length === 0) {
        return <div style={{ color: 'white', textAlign: 'center', paddingTop: '40vh', fontSize: '2.2vh' }}>Carregando prêmios...</div>
    }

    // R em vw — 70% do raio do círculo (círculo = 90vw → raio = 45vw)
    const labelRadius = 31

    function girar() {
        if (girando || !wheelRef.current) return
        setGirando(true)
        if (onGirar) onGirar()

        const indexVencedor = sortearVencedor(premios)
        // 8 voltas completas + posicionar setor vencedor sob o ponteiro (topo)
        const angulo = 8 * 360 + (indexVencedor + 0.5) * sectorAngle

        wheelRef.current.style.transition = `transform ${DURACAO_SPIN}s cubic-bezier(0.05, 0.05, 0.05, 0.95)`
        wheelRef.current.style.transform = `translate(-50%, -50%) rotate(${angulo}deg)`

        setTimeout(() => {
            onPremioSorteado(premios[indexVencedor])
        }, DURACAO_SPIN * 1000 + 600)
    }

    return (
        <div className={styles.roletaPlace}>
            {/* Ponteiro */}
            <div className={styles.ponteiro} />

            {/* Roda */}
            <div
                ref={wheelRef}
                className={styles.circle}
                style={{ background: gradiente }}
            >
                {premios.map((premio, i) => {
                    const rad = (sectorAngle * (i + 0.5)) * (Math.PI / 180)
                    const x = Math.sin(rad) * labelRadius
                    const y = -Math.cos(rad) * labelRadius
                    const rotTexto = sectorAngle * (i + 0.5)

                    return (
                        <div
                            key={i}
                            className={styles.setorLabel}
                            style={{
                                left: `calc(50% + ${x}vw)`,
                                top: `calc(50% + ${y}vw)`,
                                transform: `translate(-50%, -50%) rotate(${rotTexto}deg)`,
                            }}
                        >
                            <span className={styles.labelNome}>{premio.nome}</span>
                            {premio.subnome && (
                                <span className={styles.labelSub}>{premio.subnome}</span>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Centro decorativo */}
            <div className={styles.centro} />

            {/* Botão */}
            <div className={styles.botaoArea}>
                <button
                    className={styles.btnGirar}
                    onClick={girar}
                    disabled={girando}
                >
                    {girando ? 'GIRANDO...' : 'GIRAR'}
                </button>
            </div>
        </div>
    )
}
