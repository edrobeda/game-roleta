// Pesos reais usados no sorteio — escala não-linear
// Raríssimo é forçadamente muito baixo independente do número de prêmios
export const CHANCE_PESOS = {
    1: 0.2,  // Raríssimo   — ~1-2% mesmo com poucos prêmios
    2: 1,    // Muito Baixa
    3: 2,    // Baixa
    4: 4,    // Média
    5: 7,    // Alta
    6: 10,   // Super Alta
}

export const CHANCE_LABEL = {
    1: 'Raríssimo',
    2: 'Muito Baixa',
    3: 'Baixa',
    4: 'Média',
    5: 'Alta',
    6: 'Super Alta',
}

export const CHANCE_OPTIONS = [
    { value: '1', label: 'Raríssimo'   },
    { value: '2', label: 'Muito Baixa' },
    { value: '3', label: 'Baixa'       },
    { value: '4', label: 'Média'       },
    { value: '5', label: 'Alta'        },
    { value: '6', label: 'Super Alta'  },
]
