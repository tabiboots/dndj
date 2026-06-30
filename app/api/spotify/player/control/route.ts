import { spotifyFetch, SpotifyError } from '@/lib/spotify/fetch'
import { NextResponse, type NextRequest } from 'next/server'

const ACTIONS = {
  play:     { method: 'PUT',  path: '/v1/me/player/play' },
  pause:    { method: 'PUT',  path: '/v1/me/player/pause' },
  next:     { method: 'POST', path: '/v1/me/player/next' },
  previous: { method: 'POST', path: '/v1/me/player/previous' },
} as const

type Action = keyof typeof ACTIONS

export async function POST(request: NextRequest) {
  const { action } = await request.json() as { action: Action }

  if (!action || !(action in ACTIONS)) {
    return NextResponse.json(
      { error: `invalid action. allowed: ${Object.keys(ACTIONS).join(', ')}` },
      { status: 400 }
    )
  }

  const { method, path } = ACTIONS[action]

  try {
    await spotifyFetch(path, { method })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof SpotifyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ error: 'internal server error' }, { status: 500 })
  }
}
