import type { RoomPlayer } from '../../lib/room'

interface PlayerListProps {
  players: RoomPlayer[]
  hostUid: string
  currentUid: string | null
}

export function PlayerList({ players, hostUid, currentUid }: PlayerListProps) {
  if (players.length === 0) {
    return <p className="muted">房间内暂无玩家。</p>
  }

  return (
    <ul className="player-list">
      {players.map((player) => {
        const isHost = player.uid === hostUid
        const isSelf = player.uid === currentUid

        return (
          <li key={player.uid} className="player-item">
            <div>
              <span className="player-name">{player.name}</span>
              {isHost ? <span className="tag">房主</span> : null}
              {isSelf ? <span className="tag tag-self">你</span> : null}
            </div>
            <span className={player.ready ? 'ready ready-on' : 'ready ready-off'}>
              {player.ready ? '已准备' : '未准备'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
