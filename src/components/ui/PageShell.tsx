import type { ReactNode } from 'react'
import { useAuth } from '../../app/AuthContext'

interface PageShellProps {
  title: string
  subtitle?: string
  rightAction?: ReactNode
  children: ReactNode
}

export function PageShell({ title, subtitle, rightAction, children }: PageShellProps) {
  const { uidShort, isLoading, error } = useAuth()

  const authText = isLoading
    ? 'Logging in (anon)...'
    : error
      ? 'Anon login failed'
      : `Logged in (anon): ${uidShort ?? '------'}`

  return (
    <main className="page-shell">
      <p className="auth-indicator">{authText}</p>
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
        {rightAction ? <div>{rightAction}</div> : null}
      </header>
      {children}
    </main>
  )
}
