import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: { session } } = await supabase.auth.getSession()
  const spotifyToken = session?.provider_token

  // Example Spotify API call using the provider token
  let spotifyProfile: { display_name?: string; id?: string } | null = null
  if (spotifyToken) {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${spotifyToken}` },
      cache: 'no-store',
    })
    if (res.ok) spotifyProfile = await res.json()
  }

  return (
    <main className="min-h-screen p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Debug panel — dev only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="border border-dashed border-yellow-400 bg-yellow-50 rounded-lg p-4 text-sm font-mono">
          <p className="font-bold text-yellow-700 mb-2">⚡ Debug Panel (dev only)</p>
          <p>User ID: {user.id}</p>
          <p>Email: {user.email}</p>
          <p>Provider token present: {spotifyToken ? '✅ yes' : '❌ no'}</p>
          <p>Spotify profile loaded: {spotifyProfile ? '✅ yes' : '❌ no'}</p>
          {spotifyProfile && (
            <p>Spotify display name: {spotifyProfile.display_name}</p>
          )}
          <p className="mt-2 text-xs text-yellow-600">
            Token value never rendered — server-side only
          </p>
        </div>
      )}

      {/* Spotify connection card */}
      <div className="border rounded-lg p-4 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${spotifyProfile ? 'bg-green-500' : 'bg-red-400'}`} />
        <div>
          <p className="font-semibold">
            {spotifyProfile ? `Connected as ${spotifyProfile.display_name}` : 'Spotify not connected'}
          </p>
          <p className="text-sm text-gray-500">
            {spotifyProfile ? `@${spotifyProfile.id}` : 'Sign out and sign in again to reconnect'}
          </p>
        </div>
      </div>

      <LogoutButton />
    </main>
  )
}

function LogoutButton() {
  return (
    <form action="/auth/signout" method="POST">
      <button
        type="submit"
        className="text-sm text-gray-500 hover:text-gray-800 underline"
      >
        Sign out
      </button>
    </form>
  )
}
