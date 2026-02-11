import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { auth } from './firebase'

function waitForInitialUser(timeoutMs = 4000): Promise<User | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      unsubscribe()
      resolve(auth.currentUser)
    }, timeoutMs)

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      window.clearTimeout(timer)
      unsubscribe()
      resolve(user)
    })
  })
}

export async function initAnonymousAuth(): Promise<{ uid: string }> {
  try {
    if (auth.currentUser?.uid) {
      return { uid: auth.currentUser.uid }
    }

    const restoredUser = await waitForInitialUser()
    if (restoredUser?.uid) {
      return { uid: restoredUser.uid }
    }

    const credential = await signInAnonymously(auth)
    const uid = credential.user?.uid

    if (!uid) {
      throw new Error('匿名登录成功但未拿到 uid。')
    }

    return { uid }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`匿名登录失败，请检查 Firebase Auth 配置（${message}）`)
  }
}
