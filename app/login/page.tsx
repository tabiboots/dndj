'use client'

import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleLogin = async () => {
    const supabase = createClient()

    const scopes = [
      'user-read-currently-playing',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-modify-private',
      'playlist-modify-public',
    ].join(' ')

    // skipBrowserRedirect lets us inspect the URL before following it
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        scopes,
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { show_dialog: 'true' },
        skipBrowserRedirect: true,
      },
    })

    if (error || !data.url) {
      console.error('OAuth URL generation failed:', error)
      return
    }

    const oauthUrl = new URL(data.url)
    console.log('OAuth URL scope param:', oauthUrl.searchParams.get('scope'))
    console.log('Full OAuth URL:', data.url)

    // Now follow the redirect
    window.location.href = data.url
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">dndj</h1>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 text-sm px-4 py-2 rounded">
          {decodeURIComponent(error)}
        </div>
      )}

      <button
        onClick={handleLogin}
        className="bg-[#1DB954] hover:bg-[#1aa34a] text-white font-semibold px-8 py-3 rounded-full transition-colors"
      >
        Sign in with Spotify
      </button>
    </main>
  )
}
