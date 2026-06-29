import Link from 'next/link'

const routes = [
  { href: '/search', label: 'Search', description: 'Search Spotify tracks and build a queue' },
  { href: '/dashboard', label: 'Dashboard', description: 'Session status and Spotify connection' },
  { href: '/login', label: 'Login', description: 'Sign in with Spotify' },
  ...(process.env.NODE_ENV === 'development'
    ? [{ href: '/api/debug/spotify-token', label: 'Debug: Token', description: 'Inspect current Spotify token and scopes' }]
    : []),
]

export default function Home() {
  return (
    <main className="p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">dndj</h1>
      <ul className="space-y-3">
        {routes.map(r => (
          <li key={r.href}>
            <Link href={r.href} className="flex flex-col hover:underline">
              <span className="font-medium">{r.label}</span>
              <span className="text-sm text-gray-400">{r.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
