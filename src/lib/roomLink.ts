export function buildInviteLink(roomId: string): string {
  if (typeof window === 'undefined') {
    return `/room/${roomId}`
  }

  return `${window.location.origin}/room/${roomId}`
}

export function normalizeRoomId(raw: string): string {
  return raw.trim().toLowerCase()
}

export function parseRoomIdFromInput(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    return ''
  }

  try {
    const url = new URL(trimmed)
    const matched = url.pathname.match(/\/room\/([a-z0-9_-]+)/i)
    return matched?.[1]?.toLowerCase() ?? ''
  } catch {
    return normalizeRoomId(trimmed)
  }
}
