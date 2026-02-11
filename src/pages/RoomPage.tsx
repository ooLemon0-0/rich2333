import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { PlayerList } from '../components/room/PlayerList'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { PageShell } from '../components/ui/PageShell'
import { buildInviteLink } from '../lib/roomLink'
import { heartbeat, joinRoom, setReady, startGame, subscribeRoom, type RoomDoc, type RoomPlayer } from '../lib/room'

export function RoomPage() {
  const { roomId = '' } = useParams()
  const { uid, isLoading } = useAuth()
  const navigate = useNavigate()
  const [room, setRoom] = useState<RoomDoc | null>(null)
  const [roomNotFound, setRoomNotFound] = useState(false)
  const [joinName, setJoinName] = useState(() => localStorage.getItem('rich.player-name') ?? '')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [joining, setJoining] = useState(false)
  const joinedRef = useRef(false)

  useEffect(() => {
    if (!roomId) {
      return
    }

    const unsubscribe = subscribeRoom(roomId, (nextRoom) => {
      setRoom(nextRoom)
      setRoomNotFound(nextRoom === null)
      if (nextRoom === null) {
        joinedRef.current = false
      }
    })

    return () => {
      unsubscribe()
    }
  }, [roomId])

  const players = useMemo<RoomPlayer[]>(() => Object.values(room?.players ?? {}), [room])
  const currentPlayer = uid ? room?.players?.[uid] ?? null : null
  const isHost = Boolean(uid && room && room.hostUid === uid)
  const inviteLink = roomId ? buildInviteLink(roomId) : ''
  const readyCount = players.filter((player) => player.ready).length
  const everyoneReady = players.length > 0 && players.every((player) => player.ready)
  const canStart = Boolean(isHost && room?.status === 'lobby' && everyoneReady)

  useEffect(() => {
    if (!roomId || !uid || !room || joinedRef.current) {
      return
    }

    if (room.players?.[uid]) {
      joinedRef.current = true
      return
    }

    const trimmedName = joinName.trim()
    if (!trimmedName) {
      return
    }

    setJoining(true)
    void joinRoom(roomId, uid, trimmedName)
      .then(() => {
        localStorage.setItem('rich.player-name', trimmedName)
        joinedRef.current = true
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        setErrorMessage(message === 'ROOM_NOT_FOUND' ? '房间不存在，请检查邀请链接。' : `加入失败：${message}`)
      })
      .finally(() => setJoining(false))
  }, [roomId, uid, room, joinName])

  useEffect(() => {
    if (!roomId || !uid || !room?.players?.[uid]) {
      return
    }

    return heartbeat(roomId, uid)
  }, [roomId, uid, room])

  useEffect(() => {
    if (room?.status === 'playing' && roomId) {
      navigate(`/game/${roomId}`)
    }
  }, [room?.status, roomId, navigate])

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!roomId || !uid) {
      setErrorMessage('登录状态未就绪，请稍后重试。')
      return
    }

    const trimmedName = joinName.trim()
    if (!trimmedName) {
      setErrorMessage('请输入名字后加入房间。')
      return
    }

    setJoining(true)
    setErrorMessage(null)
    try {
      await joinRoom(roomId, uid, trimmedName)
      localStorage.setItem('rich.player-name', trimmedName)
      joinedRef.current = true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setErrorMessage(message === 'ROOM_NOT_FOUND' ? '房间不存在，请检查邀请链接。' : `加入失败：${message}`)
    } finally {
      setJoining(false)
    }
  }

  async function handleToggleReady() {
    if (!roomId || !uid || !currentPlayer) {
      return
    }

    try {
      await setReady(roomId, uid, !currentPlayer.ready)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setErrorMessage(`更新准备状态失败：${message}`)
    }
  }

  async function handleStartGame() {
    if (!roomId || !uid || !room || !isHost) {
      return
    }

    if (!canStart) {
      setErrorMessage('需要全员准备后才可开始。')
      return
    }

    try {
      await startGame(roomId, uid)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setErrorMessage(`开始游戏失败：${message}`)
    }
  }

  async function handleCopyLink() {
    if (!inviteLink) {
      return
    }

    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setErrorMessage('复制失败，请手动复制链接。')
    }
  }

  if (!roomId) {
    return <PageShell title="房间页" subtitle="房间 ID 无效。">无效房间</PageShell>
  }

  if (roomNotFound) {
    return (
      <PageShell title={`房间 ${roomId}`} subtitle="未找到房间">
        <Card>
          <p>房间不存在，可能已失效或房间号输入错误。</p>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </Card>
      </PageShell>
    )
  }

  if (!room) {
    return (
      <PageShell title={`房间 ${roomId}`} subtitle="加载中">
        <Card>
          <p className="muted">正在同步房间数据，请稍候...</p>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={`房间 ${roomId}`}
      subtitle={`状态：${room.status}，玩家 ${players.length} 人，已准备 ${readyCount} 人`}
      rightAction={
        <Button variant="ghost" onClick={() => navigate('/')}>
          返回首页
        </Button>
      }
    >
      <Card>
        <h2>邀请链接</h2>
        <div className="inline-actions">
          <Input readOnly value={inviteLink} />
          <Button onClick={handleCopyLink} variant="secondary">
            {copied ? '已复制' : '复制链接'}
          </Button>
        </div>
      </Card>

      {!currentPlayer ? (
        <Card>
          <h2>加入房间</h2>
          <form className="form-stack" onSubmit={handleJoin}>
            <label className="field">
              <span>名字</span>
              <Input
                value={joinName}
                onChange={(event) => {
                  setJoinName(event.target.value)
                  setErrorMessage(null)
                }}
                placeholder="输入名字后加入"
                maxLength={20}
              />
            </label>
            <Button type="submit" disabled={isLoading || !uid || joining}>
              {joining ? '加入中...' : '加入房间'}
            </Button>
          </form>
        </Card>
      ) : (
        <>
          <Card>
            <h2>玩家列表</h2>
            <PlayerList
              players={players}
              hostUid={room.hostUid}
              currentUid={uid}
            />
          </Card>

          <Card>
            <h2>房间操作</h2>
            <div className="inline-actions">
              <Button onClick={handleToggleReady} variant="secondary">
                {currentPlayer.ready ? '取消准备' : '准备'}
              </Button>
              {isHost ? (
                <Button onClick={handleStartGame} disabled={!canStart}>
                  开始游戏
                </Button>
              ) : null}
            </div>
          </Card>
        </>
      )}

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
    </PageShell>
  )
}
