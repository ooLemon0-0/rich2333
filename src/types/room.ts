import type { GameState, RoomStatus } from './game'
import type { Player } from './player'

export interface Room {
  id: string
  hostPlayerId: string
  status: RoomStatus
  players: Player[]
  game: GameState
  createdAt: number
  updatedAt: number
}
