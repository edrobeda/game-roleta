import { useRef, useCallback, useEffect } from 'react'

const SONS = {
    roleta:       '/sounds/sfx_roleta.mp3',
    fail:         '/sounds/sfx_fail.mp3',
    sucessoQuiz:  '/sounds/sfx_sucesso_quiz.mp3',
    sucessoRoleta:'/sounds/sfx_sucesso_roleta.mp3',
    botao:        '/sounds/sfx_botao.mp3',
    selecao:      '/sounds/sfx_selecao.mp3',
}

export default function useSom() {
    const currentRef = useRef(null)
    const cacheRef   = useRef({})

    useEffect(() => {
        const cache = {}
        Object.entries(SONS).forEach(([key, src]) => {
            const a = new Audio(src)
            a.preload = 'auto'
            cache[key] = a
        })
        cacheRef.current = cache
    }, [])

    const play = useCallback((nome) => {
        const audio = cacheRef.current[nome]
        if (!audio) return
        if (currentRef.current) {
            currentRef.current.pause()
            currentRef.current.currentTime = 0
        }
        audio.currentTime = 0
        audio.play().catch(() => {})
        currentRef.current = audio
    }, [])

    const stop = useCallback(() => {
        if (currentRef.current) {
            currentRef.current.pause()
            currentRef.current.currentTime = 0
        }
    }, [])

    return { play, stop }
}
