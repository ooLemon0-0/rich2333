import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../app/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PageShell } from '../components/ui/PageShell'
import { parseRoomIdFromInput } from '../lib/roomLink'
import { createRoom } from '../lib/room'

const PLAYER_NAME_KEY = 'rich.player-name'

export function HomePage() {
  const navigate = useNavigate()
  const { uid, isLoading } = useAuth()
  const [name, setName] = useState(() => localStorage.getItem(PLAYER_NAME_KEY) ?? '')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trimmedName = name.trim()

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!trimmedName) {
      setErrorMessage('请先输入名字，再创建房间。')
      return
    }

    if (!uid) {
      setErrorMessage('登录状态未就绪，请稍后再试。')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    localStorage.setItem(PLAYER_NAME_KEY, trimmedName)

    try {
      const roomId = await createRoom(uid, trimmedName)
      navigate(`/room/${roomId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setErrorMessage(`创建房间失败：${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedRoomId = parseRoomIdFromInput(joinRoomId)
    if (!normalizedRoomId) {
      setErrorMessage('请输入房间号或邀请链接。')
      return
    }

    if (trimmedName) {
      localStorage.setItem(PLAYER_NAME_KEY, trimmedName)
    }
    navigate(`/room/${normalizedRoomId}`)
  }

  return (
    <PageShell title="多人纯前端大富翁 v0.1" subtitle="创建房间并分享邀请链接，朋友打开链接即可加入。">
      <div className="grid">
        <Card>
          <h2>1) 创建房间</h2>
          <p className="muted">你将成为房主，创建后自动进入房间页。</p>
          <form className="form-stack" onSubmit={handleCreateRoom}>
            <label className="field">
              <span>名字</span>
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setErrorMessage(null)
                }}
                placeholder="例如：小明"
                maxLength={20}
              />
            </label>
            <Button type="submit" fullWidth disabled={isLoading || !uid || isSubmitting}>
              创建房间
            </Button>
          </form>
        </Card>

        <Card>
          <h2>2) 加入房间</h2>
          <p className="muted">输入房间号，或直接打开朋友发来的邀请链接。</p>
          <form className="form-stack" onSubmit={handleJoinRoom}>
            <label className="field">
              <span>房间号</span>
              <Input
                value={joinRoomId}
                onChange={(event) => {
                  setJoinRoomId(event.target.value)
                  setErrorMessage(null)
                }}
                placeholder="例如：a1b2c3"
                maxLength={20}
              />
            </label>
            <Button type="submit" variant="secondary" fullWidth>
              进入房间
            </Button>
          </form>
        </Card>
      </div>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      <p className="muted">
        {isLoading ? '匿名登录初始化中...' : uid ? 'Firestore 实时多人已启用。' : '匿名登录失败，请检查配置。'}
      </p>
    </PageShell>
  )
}
