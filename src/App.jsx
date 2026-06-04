import { Routes, Route, Navigate } from 'react-router-dom'
import Cadastro from './pages/Cadastro'
import Jogo     from './pages/Jogo'
import Manager  from './pages/Manager'
import Entrega  from './pages/Entrega'

function App() {
    return (
        <Routes>
            <Route path='/'         element={<Navigate to='/cadastro' replace />} />
            <Route path='/cadastro' element={<Cadastro />} />
            <Route path='/jogo'     element={<Jogo />} />
            <Route path='/manager'  element={<Manager />} />
            <Route path='/entrega'  element={<Entrega />} />
        </Routes>
    )
}

export default App
