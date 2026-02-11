import { Navigate, Route, Routes } from 'react-router-dom'
import { GamePage } from '../pages/GamePage'
import { HomePage } from '../pages/HomePage'
import { RoomPage } from '../pages/RoomPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
      <Route path="/game/:roomId" element={<GamePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
