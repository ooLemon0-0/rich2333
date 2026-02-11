import { customAlphabet } from 'nanoid'
import type { GameState, Player, Room } from '../types'

const ROOM_STORAGE_PREFIX = 'rich.room.'
const CURRENT_PLAYER_PREFIX = 'rich.current-player.'
const createShortId = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 6)

function roomKey(roomId: string) {
  return `${ROOM_STORAGE_PREFIX}${roomId}`
}

function currentPlayerKey(roomId: string) {
  return `${CURRENT_PLAYER_PREFIX}${roomId}`
}

function createDefaultGameState(hostPlayerId: string): GameState {
  return {
    turnPlayerId: hostPlayerId,
    round: 1,
    boardSize: 16,
  }
}

function createPlayer(nickname: string): Player {
  return {
    id: `p_${createShortId()}`,
    nickname,
    isReady: false,
    balance: 2000,
    position: 0,
    joinedAt: Date.now(),
  }
}

function safeParseRoom(raw: string | null): Room | null {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as Room
  } catch {
    return null
  }
}

export function loadRoom(roomId: string): Room | null {
  return safeParseRoom(localStorage.getItem(roomKey(roomId)))
}

export function saveRoom(room: Room): Room {
  const nextRoom: Room = {
    ...room,
    updatedAt: Date.now(),
  }
  localStorage.setItem(roomKey(room.id), JSON.stringify(nextRoom))
  return nextRoom
}

export function createRoom(roomId: string, nickname: string): { room: Room; player: Player } {
  const hostPlayer = createPlayer(nickname)
  const room: Room = {
    id: roomId,
    hostPlayerId: hostPlayer.id,
    status: 'waiting',
    players: [hostPlayer],
    game: createDefaultGameState(hostPlayer.id),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const savedRoom = saveRoom(room)
  setCurrentPlayerId(roomId, hostPlayer.id)
  return { room: savedRoom, player: hostPlayer }
}

export function joinRoom(roomId: string, nickname: string): { room: Room; player: Player } | null {
  const room = loadRoom(roomId)
  if (!room) {
    return null
  }

  const exists = room.players.find((player) => player.nickname === nickname.trim())
  if (exists) {
    setCurrentPlayerId(roomId, exists.id)
    return { room, player: exists }
  }

  const newPlayer = createPlayer(nickname)
  const nextRoom: Room = {
    ...room,
    players: [...room.players, newPlayer],
  }

  const savedRoom = saveRoom(nextRoom)
  setCurrentPlayerId(roomId, newPlayer.id)
  return { room: savedRoom, player: newPlayer }
}

export function setReady(roomId: string, playerId: string, ready: boolean): Room | null {
  const room = loadRoom(roomId)
  if (!room) {
    return null
  }

  const nextPlayers = room.players.map((player) =>
    player.id === playerId ? { ...player, isReady: ready } : player,
  )
  return saveRoom({ ...room, players: nextPlayers })
}

export function startGame(roomId: string): Room | null {
  const room = loadRoom(roomId)
  if (!room) {
    return null
  }

  return saveRoom({ ...room, status: 'playing' })
}

export function canStartGame(room: Room): boolean {
  if (room.players.length < 2) {
    return false
  }

  return room.players.every((player) => player.isReady)
}

export function getCurrentPlayerId(roomId: string): string | null {
  return localStorage.getItem(currentPlayerKey(roomId))
}

export function setCurrentPlayerId(roomId: string, playerId: string): void {
  localStorage.setItem(currentPlayerKey(roomId), playerId)
}
