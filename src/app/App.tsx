import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { AppRoutes } from './routes'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
