'use client'

export interface Track {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string; images: { url: string }[] }
  duration_ms: number
  uri: string
}

function msToMinSec(ms: number) {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0')
  return `${m}:${s}`
}

interface Props {
  tracks: Track[]
  onSelect?: (track: Track) => void
}

export default function SongSearchResults({ tracks, onSelect }: Props) {
  if (tracks.length === 0) return null

  return (
    <ul className="flex flex-col gap-2 p-3 text-sm">
      {tracks.map((track, i) => {
        const thumb = track.album.images.at(-1)?.url
        return (
          <li
            key={`${i}-${track.id}`}
            onClick={() => onSelect?.(track)}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-100 border border-gray-300 shadow-md transition-all
              ${onSelect
                ? 'cursor-pointer active:shadow-inner active:scale-[0.97] active:bg-gray-200'
                : ''
              }`}
          >
            {/* Album art — inset treatment */}
            <div className="w-9 h-9 shrink-0 rounded bg-gray-200 border border-gray-200 shadow-inner overflow-hidden">
              {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" />}
            </div>

            {/* Track + artist */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-black truncate leading-tight">{track.name}</p>
              <p className="text-xs text-gray-400 truncate">{track.artists.map(a => a.name).join(', ')}</p>
            </div>

            {/* Duration */}
            <span className="text-xs text-gray-400 shrink-0 tabular-nums">{msToMinSec(track.duration_ms)}</span>

            {/* Add-to-queue affordance */}
            {onSelect && (
              <svg className="shrink-0 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </li>
        )
      })}
    </ul>
  )
}
