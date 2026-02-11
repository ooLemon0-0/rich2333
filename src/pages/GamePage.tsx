import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageShell } from '../components/ui/PageShell'
import { rollDice, subscribeRoom, type RoomDoc } from '../lib/room'

export function GamePage() {
  const { roomId = '' } = useParams()
  const { uid } = useAuth()
  const navigate = useNavigate()
  const [room, setRoom] = useState<RoomDoc | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) {
      return
    }

    const unsubscribe = subscribeRoom(roomId, (nextRoom) => {
      setRoom(nextRoom)
      setNotFound(nextRoom === null)
    })
    return () => unsubscribe()
  }, [roomId])

  const boardSize = room?.game?.boardSize ?? 24
  const cells = useMemo(() => Array.from({ length: boardSize }, (_, index) => index), [boardSize])
  const currentTurnUid =
    room && room.turn.order.length > 0
      ? room.turn.order[room.turn.index % room.turn.order.length]
      : null
  const currentTurnName = currentTurnUid ? room?.players?.[currentTurnUid]?.name ?? currentTurnUid : '待定'
  const lastRollPlayerName = room?.game.lastRoll?.uid
    ? room.players?.[room.game.lastRoll.uid]?.name ?? room.game.lastRoll.uid
    : null
  const isMyTurn = Boolean(uid && currentTurnUid && uid === currentTurnUid)

  const playersByCell = useMemo(() => {
    const grouped: Record<number, string[]> = {}
    if (!room) {
      return grouped
    }

    for (const [playerUid, player] of Object.entries(room.players ?? {})) {
      const pos = room.game.positions?.[playerUid] ?? 0
      if (!grouped[pos]) {
        grouped[pos] = []
      }
      grouped[pos].push(player.name)
    }

    return grouped
  }, [room])

  async function handleRollDice() {
    if (!roomId || !uid || !isMyTurn || rolling) {
      return
    }

    setRolling(true)
    setErrorMessage(null)
    try {
      await rollDice(roomId, uid)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message === 'NOT_YOUR_TURN') {
        setErrorMessage('还没轮到你。')
      } else {
        setErrorMessage(`掷骰失败：${message}`)
      }
    } finally {
      setRolling(false)
    }
  }

  if (!roomId) {
    return <PageShell title="游戏页" subtitle="房间 ID 无效。">无效房间</PageShell>
  }

  if (notFound) {
    return (
      <PageShell title="游戏页" subtitle="未找到房间数据">
        <Card>
          <p>当前设备未找到房间数据，请返回首页重新创建或加入房间。</p>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </Card>
      </PageShell>
    )
  }

  if (!room) {
    return (
      <PageShell title="游戏页" subtitle="加载中">
        <Card>
          <p className="muted">正在同步房间数据...</p>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={`游戏中：房间 ${roomId}`}
      subtitle={`状态：${room.status}（v0.1 回合 + 掷骰 + 移动）`}
      rightAction={
        <Button variant="ghost" onClick={() => navigate(`/room/${roomId}`)}>
          返回房间
        </Button>
      }
    >
      <Card>
        <h2>基础信息</h2>
        <p className="muted">
          玩家数：{Object.keys(room.players ?? {}).length}，当前回合：{currentTurnName}
        </p>
        <p className="muted">
          最近一次掷骰：
          {room.game.lastRoll ? `${lastRollPlayerName} 掷出了 ${room.game.lastRoll.dice}` : '暂无'}
        </p>
        <div className="inline-actions">
          <Button onClick={handleRollDice} disabled={!isMyTurn || rolling || room.status !== 'playing'}>
            {rolling ? 'Rolling...' : 'Roll Dice'}
          </Button>
          {!isMyTurn ? <span className="muted">仅当前回合玩家可操作</span> : null}
        </div>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </Card>

      <Card>
        <h2>棋盘（0 - {boardSize - 1}）</h2>
        <div className="board-grid">
          {cells.map((cell) => (
            <div key={cell} className="board-cell">
              <span className="board-cell-id">{cell}</span>
              <div className="board-markers">
                {(playersByCell[cell] ?? []).map((name) => (
                  <span key={`${cell}-${name}`} className="board-marker" title={name}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  )
}
