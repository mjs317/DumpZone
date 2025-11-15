'use client'

let cachedClientId: string | null = null

const STORAGE_KEY = 'dumpzone-client-id'

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getClientId() {
  if (typeof window === 'undefined') {
    return null
  }

  if (cachedClientId) return cachedClientId

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) {
      cachedClientId = existing
      return cachedClientId
    }
    const newId = generateId()
    window.localStorage.setItem(STORAGE_KEY, newId)
    cachedClientId = newId
    return cachedClientId
  } catch {
    // Fallback if localStorage is unavailable
    cachedClientId = cachedClientId || generateId()
    return cachedClientId
  }
}

