'use client'

import { useEffect, useRef, useState } from 'react'

interface Track {
  name: string
  artists: { name: string }[]
  album: { name: string; images: { url: string }[] }
  duration_ms: number
  uri: string
}

interface PlayerState {
  is_playing: boolean
  progress_ms: number
  item: Track | null
}

async function control(action: 'play' | 'pause' | 'next' | 'previous') {
  await fetch('/api/spotify/player/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
}

interface Props {
  views: readonly string[]
  active: string
  onViewChange: (view: string) => void
}

export default function NowPlaying({ views, active, onViewChange }: Props) {
  const [state, setState] = useState<PlayerState | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = async () => {
    const res = await fetch('/api/spotify/player')
    if (res.status === 401) { window.location.href = '/login'; return }
    if (!res.ok) return
    const data = await res.json()
    setState(data)
  }

  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, 3000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const handleControl = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    if (action === 'play' || action === 'pause') {
      setState(prev => prev ? { ...prev, is_playing: action === 'play' } : prev)
    }
    await control(action)
    setTimeout(poll, 400)
  }

  const [displayProgress, setDisplayProgress] = useState(0)
  const progressRef = useRef({ pct: 0, duration: 1, playing: false })

  useEffect(() => {
    if (!state?.item) { progressRef.current.pct = 0; setDisplayProgress(0); return }
    const pct = (state.progress_ms / state.item.duration_ms) * 100
    progressRef.current.pct = pct
    progressRef.current.duration = state.item.duration_ms
    progressRef.current.playing = state.is_playing
    setDisplayProgress(pct)
  }, [state])

  useEffect(() => {
    const id = setInterval(() => {
      if (!progressRef.current.playing) return
      progressRef.current.pct = Math.min(100, progressRef.current.pct + (500 / progressRef.current.duration) * 100)
      setDisplayProgress(progressRef.current.pct)
    }, 500)
    return () => clearInterval(id)
  }, [])

  const track = state?.item
  const albumArt = track?.album.images.at(-1)?.url
  const activeIndex = views.indexOf(active)

  return (
    <div className="h-16 shrink-0 bg-white flex items-stretch shadow-[inset_0_1px_0_0_var(--color-gray-200),inset_0_2px_0_0_white]">

      {/* Left: album art + track info */}
      <div className="flex-1 flex items-center px-4 gap-3 min-w-0">
        <div className="w-10 h-10 shrink-0 bg-gray-100 rounded overflow-hidden">
          {albumArt && <img src={albumArt} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="min-w-0">
          {track ? (
            <>
              <p className="text-sm font-medium text-black truncate">{track.name}</p>
              <p className="text-xs text-gray-400 truncate">
                {track.artists.map(a => a.name).join(', ')}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-300">Nothing playing</p>
          )}
        </div>
      </div>

      {/* Center: progress bar + media controls */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleControl('previous')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 border border-gray-300 shadow-md text-gray-500 hover:text-black transition-all active:shadow-inner active:scale-[0.97] active:bg-gray-200"
            aria-label="Previous"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 19V5M16.4005 6.07961L10.5617 10.7506C10.0279 11.1777 9.76097 11.3912 9.66433 11.6492C9.5796 11.8754 9.5796 12.1246 9.66433 12.3508C9.76097 12.6088 10.0279 12.8223 10.5617 13.2494L16.4005 17.9204C17.2327 18.5861 17.6487 18.919 17.9989 18.9194C18.3035 18.9197 18.5916 18.7812 18.7815 18.5432C19 18.2695 19 17.7367 19 16.671V7.329C19 6.2633 19 5.73045 18.7815 5.45677C18.5916 5.21876 18.3035 5.0803 17.9989 5.08063C17.6487 5.081 17.2327 5.41387 16.4005 6.07961Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button
            onClick={() => handleControl(state?.is_playing ? 'pause' : 'play')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 border border-gray-300 shadow-md text-gray-500 hover:text-black transition-all active:shadow-inner active:scale-[0.97] active:bg-gray-200"
            aria-label={state?.is_playing ? 'Pause' : 'Play'}
          >
            {state?.is_playing ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 20V4M16 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'translateX(1px)' }}>
                <path d="M5 4.98951C5 4.01835 5 3.53277 5.20249 3.2651C5.37889 3.03191 5.64852 2.88761 5.9404 2.87018C6.27544 2.85017 6.67946 3.11953 7.48752 3.65823L18.0031 10.6686C18.6708 11.1137 19.0046 11.3363 19.1209 11.6168C19.2227 11.8621 19.2227 12.1377 19.1209 12.383C19.0046 12.6635 18.6708 12.886 18.0031 13.3312L7.48752 20.3415C6.67946 20.8802 6.27544 21.1496 5.9404 21.1296C5.64852 21.1122 5.37889 20.9679 5.20249 20.7347C5 20.467 5 19.9814 5 19.0103V4.98951Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

          <button
            onClick={() => handleControl('next')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 border border-gray-300 shadow-md text-gray-500 hover:text-black transition-all active:shadow-inner active:scale-[0.97] active:bg-gray-200"
            aria-label="Next"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 5V19M7.59951 17.9204L13.4383 13.2494C13.9721 12.8223 14.239 12.6088 14.3357 12.3508C14.4204 12.1246 14.4204 11.8754 14.3357 11.6492C14.239 11.3912 13.9721 11.1777 13.4383 10.7506L7.59951 6.07961C6.76734 5.41387 6.35125 5.081 6.00108 5.08063C5.69654 5.0803 5.40845 5.21876 5.21846 5.45677C5 5.73045 5 6.2633 5 7.329V16.671C5 17.7367 5 18.2695 5.21846 18.5432C5.40845 18.7812 5.69654 18.9197 6.00108 18.9194C6.35125 18.919 6.76734 18.5861 7.59951 17.9204Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="w-48 h-1 bg-gray-200 rounded-full border border-gray-200 shadow-inner overflow-hidden">
          <div
            className="h-full bg-gray-400 rounded-full"
            style={{ width: `${displayProgress}%`, transition: 'width 0.5s linear' }}
          />
        </div>
      </div>

      {/* Right: view nav */}
      <div className="flex-1 flex items-center justify-end px-4">
        <div className="relative flex items-center bg-gray-200 rounded-full p-1 border border-gray-200 shadow-inner">
          <div
            className="absolute left-1 top-1 bottom-1 w-12 bg-gray-100 rounded-full shadow-sm transition-transform duration-200 ease-in-out"
            style={{ transform: `translateX(${activeIndex * 48}px)` }}
          />
          {views.map(view => (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={`relative z-10 w-12 h-9 flex items-center justify-center rounded-full transition-colors duration-200
                ${active === view ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
              aria-label={view}
            >
              {view === 'Search' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {view === 'Tags' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 11L13.4059 3.40589C12.887 2.88703 12.6276 2.6276 12.3249 2.44208C12.0564 2.27759 11.7638 2.15638 11.4577 2.08289C11.1124 2 10.7455 2 10.0118 2L6 2M3 8.7L3 10.6745C3 11.1637 3 11.4083 3.05526 11.6385C3.10425 11.8425 3.18506 12.0376 3.29472 12.2166C3.4184 12.4184 3.59136 12.5914 3.93726 12.9373L11.7373 20.7373C12.5293 21.5293 12.9253 21.9253 13.382 22.0737C13.7837 22.2042 14.2163 22.2042 14.618 22.0737C15.0747 21.9253 15.4707 21.5293 16.2627 20.7373L18.7373 18.2627C19.5293 17.4707 19.9253 17.0747 20.0737 16.618C20.2042 16.2163 20.2042 15.7837 20.0737 15.382C19.9253 14.9253 19.5293 14.5293 18.7373 13.7373L11.4373 6.43726C11.0914 6.09136 10.9184 5.9184 10.7166 5.79472C10.5376 5.68506 10.3425 5.60425 10.1385 5.55526C9.90829 5.5 9.6637 5.5 9.17452 5.5H6.2C5.0799 5.5 4.51984 5.5 4.09202 5.71799C3.7157 5.90973 3.40973 6.21569 3.21799 6.59202C3 7.01984 3 7.57989 3 8.7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {view === 'Deploy' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.4995 13.5001L20.9995 3.00005M10.6271 13.8281L13.2552 20.5861C13.4867 21.1815 13.6025 21.4791 13.7693 21.566C13.9139 21.6414 14.0862 21.6415 14.2308 21.5663C14.3977 21.4796 14.5139 21.1821 14.7461 20.587L21.3364 3.69925C21.5461 3.16207 21.6509 2.89348 21.5935 2.72185C21.5437 2.5728 21.4268 2.45583 21.2777 2.40604C21.1061 2.34871 20.8375 2.45352 20.3003 2.66315L3.41258 9.25349C2.8175 9.48572 2.51997 9.60183 2.43326 9.76873C2.35809 9.91342 2.35819 10.0857 2.43353 10.2303C2.52043 10.3971 2.81811 10.5128 3.41345 10.7444L10.1715 13.3725C10.2923 13.4195 10.3527 13.443 10.4036 13.4793C10.4487 13.5114 10.4881 13.5509 10.5203 13.596C10.5566 13.6468 10.5801 13.7073 10.6271 13.8281Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
