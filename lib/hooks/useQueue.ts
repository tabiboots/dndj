'use client'

import { useEffect, useState } from 'react'

export interface QueueTrack {
  id: string
  uri: string
  name: string
  artists: string[]
  album: string
  duration_ms: number
}

const STORAGE_KEY = 'dndj:queue'
const PLAYLIST_ID_KEY = 'dndj:playlist_id'

export function useQueue() {
  const [tracks, setTracks] = useState<QueueTrack[]>([])
  const [ready, setReady] = useState(false)

  // Hydrate from localStorage once on mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setTracks(JSON.parse(stored))
    } catch {
      // corrupted storage — start fresh
      localStorage.removeItem(STORAGE_KEY)
    }
    setReady(true)
  }, [])

  // Persist to localStorage on every change
  useEffect(() => {
    if (!ready) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks))
  }, [tracks, ready])

  const add = (track: QueueTrack) => {
    setTracks(prev =>
      prev.find(t => t.id === track.id) ? prev : [...prev, track]
    )
  }

  const remove = (id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id))
  }

  const clear = () => {
    setTracks([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const isQueued = (id: string) => tracks.some(t => t.id === id)

  // Stored so we can overwrite the same playlist on next deploy
  const getPlaylistId = () => localStorage.getItem(PLAYLIST_ID_KEY)
  const setPlaylistId = (id: string) => localStorage.setItem(PLAYLIST_ID_KEY, id)

  return { tracks, add, remove, clear, isQueued, ready, getPlaylistId, setPlaylistId }
}
