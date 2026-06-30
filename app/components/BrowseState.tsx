'use client'

import { useEffect, useRef, useState } from 'react'
import SongSearchResults, { type Track } from './SongSearchResults'

interface Playlist {
  id: string
  name: string
  images: { url: string }[]
  tracks: { href: string; total: number } | null
  owner: { display_name: string }
}

function Section({ label }: { label: string }) {
  return <p className="px-3 pt-5 pb-2 text-xl font-bold text-black">{label}</p>
}

function PlaylistGrid({ playlists, onSelect }: { playlists: Playlist[]; onSelect: (p: Playlist) => void }) {
  return (
    <div className="grid grid-cols-5 gap-3 px-3">
      {playlists.map(p => {
        const img = p.images[0]?.url
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="flex flex-col rounded-xl bg-gray-100 border border-gray-300 shadow-md text-left transition-all active:shadow-inner active:scale-[0.97] active:bg-gray-200 overflow-hidden"
          >
            <div className="w-full aspect-square bg-gray-200 border-b border-gray-200 shadow-inner">
              {img && <img src={img} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="p-2 min-w-0">
              <p className="text-xs font-bold text-black truncate text-center">{p.name}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function extractSpotifyUserId(input: string): string {
  // Handle full URLs like https://open.spotify.com/user/username
  const match = input.match(/spotify\.com\/user\/([^/?]+)/)
  return match ? match[1] : input.trim()
}

export default function BrowseState() {
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([])
  const [userInput, setUserInput] = useState('')
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([])
  const [userStatus, setUserStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [userError, setUserError] = useState<string | null>(null)

  const [drillPlaylist, setDrillPlaylist] = useState<Playlist | null>(null)
  const [drillTracks, setDrillTracks] = useState<Track[]>([])
  const [drillStatus, setDrillStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const userAbortRef = useRef<AbortController | null>(null)

  // Fetch own playlists on mount
  useEffect(() => {
    fetch('/api/spotify/playlists')
      .then(r => r.json())
      .then(data => setMyPlaylists(data.items ?? []))
      .catch(() => {})
  }, [])

  // Fetch tracks when drilling into a playlist
  useEffect(() => {
    if (!drillPlaylist) return
    setDrillStatus('loading')
    setDrillTracks([])
    fetch(`/api/spotify/playlists/${drillPlaylist.id}/tracks`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) { setDrillStatus('error'); return }
        const tracks: Track[] = (data.items ?? [])
          .map((entry: { item: Track | null }) => entry.item)
          .filter((t: Track | null): t is Track => t !== null && !!t.id)
        setDrillTracks(tracks)
        setDrillStatus('idle')
      })
      .catch(() => setDrillStatus('error'))
  }, [drillPlaylist])

  const searchUser = async (userId: string) => {
    userAbortRef.current?.abort()
    userAbortRef.current = new AbortController()
    setUserStatus('loading')
    setUserError(null)
    setUserPlaylists([])
    try {
      const res = await fetch(`/api/spotify/playlists?userId=${encodeURIComponent(userId)}`, {
        signal: userAbortRef.current.signal,
      })
      const data = await res.json()
      if (!res.ok) { setUserError(data.error ?? 'not found'); setUserStatus('error'); return }
      setUserPlaylists(data.items ?? [])
      setUserStatus('idle')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setUserError('network error')
      setUserStatus('error')
    }
  }

  // Drill-in view
  if (drillPlaylist) {
    const img = drillPlaylist.images[0]?.url
    return (
      <div className="flex-1 flex flex-col min-h-0">

        {/* Playlist header */}
        <div className="shrink-0 p-4 flex gap-4 items-center shadow-[inset_0_-1px_0_0_var(--color-gray-200),inset_0_-2px_0_0_white]">
          <button
            onClick={() => { setDrillPlaylist(null); setDrillTracks([]) }}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 border border-gray-300 shadow-md text-gray-500 hover:text-black transition-all active:shadow-inner active:scale-[0.97] active:bg-gray-200"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="w-16 h-16 shrink-0 rounded-xl bg-gray-200 border border-gray-200 shadow-inner overflow-hidden">
            {img && <img src={img} alt="" className="w-full h-full object-cover" />}
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-black truncate">{drillPlaylist.name}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{drillPlaylist.owner.display_name}</p>
          </div>
        </div>

        {/* Track list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {drillStatus === 'loading' && <p className="text-xs text-gray-400 p-3">loading tracks...</p>}
          {drillStatus === 'error' && <p className="text-xs text-red-400 p-3">failed to load</p>}
          <SongSearchResults tracks={drillTracks} />
        </div>

      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-4">

      {/* Your Playlists */}
      {myPlaylists.length > 0 && (
        <>
          <Section label="Your Playlists" />
          <PlaylistGrid playlists={myPlaylists} onSelect={setDrillPlaylist} />
        </>
      )}

      {/* Browse a User */}
      <Section label="Browse a User" />
      <div className="px-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-200 border border-gray-200 shadow-inner">
          <svg className="shrink-0 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && userInput.trim()) {
                searchUser(extractSpotifyUserId(userInput))
              }
            }}
            placeholder="Spotify username or profile URL"
            className="flex-1 bg-transparent text-sm outline-none text-black placeholder:text-gray-400"
          />
          {userInput.trim() && (
            <button
              onClick={() => searchUser(extractSpotifyUserId(userInput))}
              className="shrink-0 text-gray-400 hover:text-black transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        {userStatus === 'loading' && <p className="text-xs text-gray-400 mt-2">searching...</p>}
        {userStatus === 'error' && <p className="text-xs text-red-400 mt-2">{userError}</p>}
      </div>

      {userPlaylists.length > 0 && (
        <div className="mt-2">
          <PlaylistGrid playlists={userPlaylists} onSelect={setDrillPlaylist} />
        </div>
      )}

    </div>
  )
}
