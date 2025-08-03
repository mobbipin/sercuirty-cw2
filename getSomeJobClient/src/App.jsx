
import { Outlet } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Navbar/>
      <Outlet/>
    </AuthProvider>
  )
}

export default App
