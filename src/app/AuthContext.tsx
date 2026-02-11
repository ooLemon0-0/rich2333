import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initAnonymousAuth } from '../lib/auth'

interface AuthContextValue {
  uid: string | null
  uidShort: string | null
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextValue>({
  uid: null,
  uidShort: null,
  isLoading: true,
  error: null,
})

function formatUidTail(uid: string | null): string | null {
  if (!uid) {
    return null
  }

  return uid.slice(-6)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false

    async function bootstrapAuth() {
      try {
        const result = await initAnonymousAuth()
        if (!disposed) {
          setUid(result.uid)
        }
      } catch (err) {
        if (!disposed) {
          const message = err instanceof Error ? err.message : String(err)
          setError(message)
        }
      } finally {
        if (!disposed) {
          setIsLoading(false)
        }
      }
    }

    bootstrapAuth()

    return () => {
      disposed = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      uid,
      uidShort: formatUidTail(uid),
      isLoading,
      error,
    }),
    [uid, isLoading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
