import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const primary = import.meta.env.VITE_PRIMARY_COLOR || '#005844'
document.documentElement.style.setProperty('--primary', primary)

function hexLuminance(hex) {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
    return [parseInt(full.slice(0,2),16), parseInt(full.slice(2,4),16), parseInt(full.slice(4,6),16)]
        .map(c => { const s = c/255; return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4) })
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
}
document.documentElement.style.setProperty('--btn-text', hexLuminance(primary) > 0.179 ? '#000000' : '#ffffff')

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
)
