import { customAlphabet } from 'nanoid'
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type FieldValue,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

type FirestoreTime = FieldValue | Date | null

export type RoomStatus = 'lobby' | 'playing' | 'ended'

export interface RoomPlayer {
  uid: string
  name: string
  ready: boolean
  joinedAt: FirestoreTime
  lastSeenAt: FirestoreTime
}

export interface RoomGame {
  boardSize: number
  positions: Record<string, number>
  lastRoll?: {
    uid: string
    dice: number
    at: FirestoreTime
  }
}

export interface RoomDoc {
  createdAt: FirestoreTime
  updatedAt: FirestoreTime
  status: RoomStatus
  hostUid: string
  version: number
  players: Record<string, RoomPlayer>
  turn: {
    order: string[]
    index: number
  }
  game: RoomGame
}

const createRoomId = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 6)
const HEARTBEAT_MS = 15000
const DEFAULT_BOARD_SIZE = 24

function roomRef(roomId: string) {
  return doc(db, 'rooms', roomId)
}

function createPlayer(uid: string, name: string): RoomPlayer {
  const now = serverTimestamp()
  return {
    uid,
    name,
    ready: false,
    joinedAt: now,
    lastSeenAt: now,
  }
}

function normalizeTurnOrder(order: string[] | undefined, players: Record<string, RoomPlayer>): string[] {
  const baseOrder = (order ?? []).filter((uid) => Boolean(players[uid]))
  const known = new Set(baseOrder)
  for (const uid of Object.keys(players)) {
    if (!known.has(uid)) {
      baseOrder.push(uid)
      known.add(uid)
    }
  }
  return baseOrder
}

export async function createRoom(uid: string, name: string): Promise<string> {
  const roomId = createRoomId()
  const player = createPlayer(uid, name.trim())
  const initialRoom: RoomDoc = {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: 'lobby',
    hostUid: uid,
    version: 1,
    players: {
      [uid]: player,
    },
    turn: {
      order: [uid],
      index: 0,
    },
    game: {
      boardSize: DEFAULT_BOARD_SIZE,
      positions: {
        [uid]: 0,
      },
    },
  }

  await setDoc(roomRef(roomId), initialRoom)
  return roomId
}

export async function joinRoom(roomId: string, uid: string, name: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = roomRef(roomId)
    const snapshot = await tx.get(ref)

    if (!snapshot.exists()) {
      throw new Error('ROOM_NOT_FOUND')
    }

    const data = snapshot.data() as RoomDoc
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('EMPTY_NAME')
    }

    const existing = data.players?.[uid]
    const nextOrder = data.turn?.order ?? []

    tx.update(ref, {
      [`players.${uid}`]: {
        uid,
        name: existing?.name ?? trimmedName,
        ready: existing?.ready ?? false,
        joinedAt: existing?.joinedAt ?? serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      },
      turn: {
        order: existing ? nextOrder : [...nextOrder, uid],
        index: data.turn?.index ?? 0,
      },
      [`game.positions.${uid}`]: data.game?.positions?.[uid] ?? 0,
      updatedAt: serverTimestamp(),
      version: (data.version ?? 0) + 1,
    })
  })
}

export async function setReady(roomId: string, uid: string, ready: boolean): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = roomRef(roomId)
    const snapshot = await tx.get(ref)

    if (!snapshot.exists()) {
      throw new Error('ROOM_NOT_FOUND')
    }

    const data = snapshot.data() as RoomDoc
    if (!data.players?.[uid]) {
      throw new Error('PLAYER_NOT_IN_ROOM')
    }

    tx.update(ref, {
      [`players.${uid}.ready`]: ready,
      [`players.${uid}.lastSeenAt`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: (data.version ?? 0) + 1,
    })
  })
}

export async function startGame(roomId: string, hostUid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = roomRef(roomId)
    const snapshot = await tx.get(ref)

    if (!snapshot.exists()) {
      throw new Error('ROOM_NOT_FOUND')
    }

    const data = snapshot.data() as RoomDoc
    if (data.hostUid !== hostUid) {
      throw new Error('ONLY_HOST_CAN_START')
    }

    const players = Object.values(data.players ?? {})
    const everyoneReady = players.length > 0 && players.every((player) => player.ready)
    if (!everyoneReady) {
      throw new Error('NOT_ALL_READY')
    }

    const order = normalizeTurnOrder(data.turn?.order, data.players ?? {})
    const index = order.length === 0 ? 0 : (data.turn?.index ?? 0) % order.length
    const positions: Record<string, number> = {}
    for (const player of players) {
      positions[player.uid] = data.game?.positions?.[player.uid] ?? 0
    }

    tx.update(ref, {
      status: 'playing',
      turn: {
        order,
        index,
      },
      game: {
        boardSize: data.game?.boardSize ?? DEFAULT_BOARD_SIZE,
        positions,
      },
      updatedAt: serverTimestamp(),
      version: (data.version ?? 0) + 1,
    })
  })
}

export async function rollDice(roomId: string, uid: string): Promise<number> {
  const dice = Math.floor(Math.random() * 6) + 1

  await runTransaction(db, async (tx) => {
    const ref = roomRef(roomId)
    const snapshot = await tx.get(ref)

    if (!snapshot.exists()) {
      throw new Error('ROOM_NOT_FOUND')
    }

    const data = snapshot.data() as RoomDoc
    if (data.status !== 'playing') {
      throw new Error('ROOM_NOT_PLAYING')
    }

    const players = data.players ?? {}
    if (!players[uid]) {
      throw new Error('PLAYER_NOT_IN_ROOM')
    }

    const order = normalizeTurnOrder(data.turn?.order, players)
    if (order.length === 0) {
      throw new Error('NO_ACTIVE_PLAYERS')
    }

    const currentIndex = (data.turn?.index ?? 0) % order.length
    const currentTurnUid = order[currentIndex]
    if (currentTurnUid !== uid) {
      throw new Error('NOT_YOUR_TURN')
    }

    const boardSize = data.game?.boardSize ?? DEFAULT_BOARD_SIZE
    const currentPos = data.game?.positions?.[uid] ?? 0
    const nextPos = (currentPos + dice) % boardSize
    const nextIndex = (currentIndex + 1) % order.length

    tx.update(ref, {
      game: {
        boardSize,
        positions: {
          ...(data.game?.positions ?? {}),
          [uid]: nextPos,
        },
        lastRoll: {
          uid,
          dice,
          at: serverTimestamp(),
        },
      },
      turn: {
        order,
        index: nextIndex,
      },
      [`players.${uid}.lastSeenAt`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: (data.version ?? 0) + 1,
    })
  })

  return dice
}

export function subscribeRoom(roomId: string, cb: (room: RoomDoc | null) => void): Unsubscribe {
  return onSnapshot(roomRef(roomId), (snapshot) => {
    if (!snapshot.exists()) {
      cb(null)
      return
    }

    cb(snapshot.data() as RoomDoc)
  })
}

export function heartbeat(roomId: string, uid: string): () => void {
  let stopped = false
  let timer: number | undefined

  const tick = async () => {
    if (stopped) {
      return
    }

    try {
      await runTransaction(db, async (tx) => {
        const ref = roomRef(roomId)
        const snapshot = await tx.get(ref)
        if (!snapshot.exists()) {
          return
        }

        const data = snapshot.data() as RoomDoc
        if (!data.players?.[uid]) {
          return
        }

        tx.update(ref, {
          [`players.${uid}.lastSeenAt`]: serverTimestamp(),
          updatedAt: serverTimestamp(),
          version: (data.version ?? 0) + 1,
        })
      })
    } catch {
      // Keep heartbeat best-effort to avoid breaking room UI.
    }
  }

  void tick()
  timer = window.setInterval(() => {
    void tick()
  }, HEARTBEAT_MS)

  return () => {
    stopped = true
    if (timer !== undefined) {
      window.clearInterval(timer)
    }
  }
}
