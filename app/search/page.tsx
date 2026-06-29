'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueue, type QueueTrack } from '@/lib/hooks/useQueue'

interface Track {
  id: string
  uri: string
  name: string
  artists: { name: string }[]
  album: { name: string; images: { url: string }[] }
  duration_ms: number
}

function msToMinSec(ms: number) {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0')
  return `${m}:${s}`
}

function toQueueTrack(t: Track): QueueTrack {
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: t.artists.map(a => a.name),
    album: t.album.name,
    duration_ms: t.duration_ms,
  }
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [deployStatus, setDeployStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [deployError, setDeployError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { tracks: queue, add, remove, clear, isQueued, ready, getPlaylistId, setPlaylistId } = useQueue()

  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < 2) {
      setTracks([])
      setStatus('idle')
      return
    }

    const debounce = setTimeout(async () => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      setStatus('loading')
      setError(null)

      try {
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(trimmed)}&type=track&limit=10`,
          { signal: abortRef.current.signal }
        )
        const data = await res.json()

        if (res.status === 401) { window.location.href = '/login'; return }
        if (res.status === 429) {
          setError(`Rate limited — wait ${data.retryAfter ?? '?'}s`)
          setStatus('error')
          return
        }
        if (!res.ok) {
          setError(data.error ?? 'search failed')
          setStatus('error')
          return
        }

        setTracks(data.tracks?.items ?? [])
        setStatus('idle')
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError('network error')
        setStatus('error')
      }
    }, 300)

    return () => clearTimeout(debounce)
  }, [query])

  const deploy = async () => {
    if (queue.length === 0) return
    setDeployStatus('loading')
    setDeployError(null)

    const res = await fetch('/api/spotify/queue/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uris: queue.map(t => t.uri),
        playlistId: getPlaylistId(),
      }),
    })

    const data = await res.json()

    if (res.status === 401) { window.location.href = '/login'; return }
    if (!res.ok) {
      setDeployError(data.error ?? 'deploy failed')
      setDeployStatus('error')
      return
    }

    if (data.playlistId) setPlaylistId(data.playlistId)
    setDeployStatus('done')
    setTimeout(() => setDeployStatus('idle'), 3000)
  }

  return (
    <main className="p-8 flex gap-8 max-w-4xl">

      {/* Search column */}
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search tracks..."
          className="w-full border px-3 py-2 rounded text-sm"
          autoFocus
        />

        {status === 'loading' && <p className="text-xs text-gray-400 mt-2">searching...</p>}
        {status === 'error' && <p className="text-xs text-red-500 mt-2">{error}</p>}

        {tracks.length > 0 && (
          <ul className="mt-3 text-sm divide-y">
            {tracks.map(track => {
              const queued = isQueued(track.id)
              return (
                <li
                  key={track.id}
                  className={`py-2 flex items-center justify-between gap-2 cursor-pointer ${queued ? 'opacity-40' : 'hover:bg-gray-50'}`}
                  onClick={() => queued ? remove(track.id) : add(toQueueTrack(track))}
                >
                  <div className="min-w-0">
                    <span className="font-medium">{track.name}</span>
                    {' — '}
                    <span className="text-gray-500">{track.artists.map(a => a.name).join(', ')}</span>
                    {' · '}
                    <span className="text-gray-400 text-xs">{track.album.name}</span>
                  </div>
                  <span className="text-gray-400 text-xs shrink-0">{msToMinSec(track.duration_ms)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Queue column */}
      {ready && (
        <div className="w-64 shrink-0 border-l pl-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Queue ({queue.length})</h2>
            {queue.length > 0 && (
              <button onClick={clear} className="text-xs text-gray-400 hover:text-gray-700">clear</button>
            )}
          </div>

          {queue.length === 0 && (
            <p className="text-xs text-gray-400">Click a track to add it</p>
          )}

          <ul className="text-xs space-y-2">
            {queue.map((t, i) => (
              <li key={t.id} className="flex items-start justify-between gap-1">
                <span className="text-gray-300 shrink-0">{i + 1}.</span>
                <span className="flex-1 min-w-0">
                  <span className="font-medium block truncate">{t.name}</span>
                  <span className="text-gray-400 truncate block">{t.artists.join(', ')}</span>
                </span>
                <button onClick={() => remove(t.id)} className="text-gray-300 hover:text-red-400 shrink-0">×</button>
              </li>
            ))}
          </ul>

          {queue.length > 0 && (
            <button
              onClick={deploy}
              disabled={deployStatus === 'loading'}
              className="mt-4 w-full bg-[#1DB954] hover:bg-[#1aa34a] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded"
            >
              {deployStatus === 'loading' ? 'deploying...' : deployStatus === 'done' ? '✓ playing' : 'deploy to spotify'}
            </button>
          )}

          {deployStatus === 'error' && (
            <p className="text-xs text-red-500 mt-2">{deployError}</p>
          )}
        </div>
      )}
    </main>
  )
}
