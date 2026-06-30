'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import SongSearchResults, { type Track } from './SongSearchResults'
import BrowseState from './BrowseState'

export default function SearchView() {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'loading-more' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({ query, tracks, total, offset, status })
  useEffect(() => { stateRef.current = { query, tracks, total, offset, status } })

  const fetchPage = useCallback(async (q: string, off: number, replace: boolean) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setStatus(replace ? 'loading' : 'loading-more')
    setError(null)

    try {
      const res = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(q)}&type=track&limit=10&offset=${off}`,
        { signal: abortRef.current.signal }
      )
      const data = await res.json()

      if (res.status === 401) { window.location.href = '/login'; return }
      if (res.status === 429) { setError(`Rate limited — wait ${data.retryAfter ?? '?'}s`); setStatus('error'); return }
      if (!res.ok) { setError(data.error ?? 'search failed'); setStatus('error'); return }

      const items: Track[] = data.tracks?.items ?? []
      setTracks(prev => {
        if (replace) return items
        const seen = new Set(prev.map(t => t.id))
        return [...prev, ...items.filter(t => !seen.has(t.id))]
      })
      setTotal(data.tracks?.total ?? 0)
      setOffset(off + 10)
      setStatus('idle')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError('network error')
      setStatus('error')
    }
  }, [])

  // Reset and fetch first page on query change
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setTracks([])
      setTotal(0)
      setOffset(0)
      setStatus('idle')
      return
    }
    const t = setTimeout(() => fetchPage(trimmed, 0, true), 300)
    return () => clearTimeout(t)
  }, [query, fetchPage])

  // Load next page when sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return
      const { query, tracks, total, offset, status } = stateRef.current
      const trimmed = query.trim()
      if (trimmed.length < 2 || tracks.length >= total || status !== 'idle') return
      fetchPage(trimmed, offset, false)
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchPage])

  // After each page loads, re-check if sentinel is still visible and keep fetching
  useEffect(() => {
    if (status !== 'idle') return
    const el = sentinelRef.current
    if (!el) return
    const { query, tracks, total, offset } = stateRef.current
    const trimmed = query.trim()
    if (trimmed.length < 2 || tracks.length === 0 || tracks.length >= total) return
    const rect = el.getBoundingClientRect()
    if (rect.top <= window.innerHeight) {
      fetchPage(trimmed, offset, false)
    }
  }, [status, fetchPage])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 shadow-[inset_0_-1px_0_0_var(--color-gray-200),inset_0_-2px_0_0_white]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-200 border border-gray-200 shadow-inner">
          <svg className="shrink-0 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tracks..."
            className="flex-1 bg-transparent text-sm outline-none text-black placeholder:text-gray-400"
            autoFocus
          />
        </div>
      </div>

      {query.trim().length < 2 ? (
        <BrowseState />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {status === 'loading' && <p className="text-xs text-gray-400 p-3">searching...</p>}
          {status === 'error' && <p className="text-xs text-red-400 p-3">{error}</p>}

          <SongSearchResults tracks={tracks} />

          <div ref={sentinelRef} className="h-4" />

          {status === 'loading-more' && (
            <p className="text-xs text-gray-400 text-center py-2">loading more...</p>
          )}
        </div>
      )}
    </div>
  )
}
