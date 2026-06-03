import { useRef, useCallback } from 'react'

const SONS = {
    roleta:       '/sounds/sfx_roleta.mp3',
    fail:         '/sounds/sfx_fail.mp3',
    sucessoQuiz:  '/sounds/sfx_sucesso_quiz.mp3',
    sucessoRoleta:'/sounds/sfx_sucesso_roleta.mp3',
    botao:        '/sounds/sfx_botao.mp3',
    selecao:      '/sounds/sfx_selecao.mp3',
}

export default function useSom() {
    const audioRef = useRef(null)

    const play = useCallback((nome) => {
        const src = SONS[nome]
        if (!src) return
        if (audioRef.current) {
            audioRef.current.pause()
        }
        audioRef.current = new Audio(src)
        audioRef.current.play().catch(() => {}) // ignora bloqueio de autoplay
    }, [])

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
        }
    }, [])

    return { play, stop }
}
