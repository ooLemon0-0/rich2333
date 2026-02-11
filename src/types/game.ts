export type RoomStatus = 'waiting' | 'playing' | 'finished'

export interface GameState {
  turnPlayerId: string | null
  round: number
  boardSize: number
}
