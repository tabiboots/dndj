@AGENTS.md

## Stack
- Next.js 16.2.9, App Router, React 19, TypeScript 5 strict, Tailwind 4
- Auth: Supabase Auth with Spotify as OAuth provider (`@supabase/supabase-js`, `@supabase/ssr`)
- Session: httpOnly cookies managed by `@supabase/ssr`, refreshed in `proxy.ts`
- Hosting: Vercel

## Next.js 16 Breaking Changes (critical)
- `middleware.ts` is deprecated → use `proxy.ts`, export named `proxy` (not `middleware`)
- `cookies()` from `next/headers` is fully async — always `await cookies()`
- `proxy.ts` runs Node.js runtime only (no edge)

## Auth Architecture
- Spotify Client ID/Secret live in **Supabase Dashboard > Auth > Providers**, NOT in `.env.local`
- `.env.local` only needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `session.provider_token` = Spotify access token — server-side only, expires 1hr
- `session.provider_refresh_token` = Spotify refresh token — NEVER send to client
- All Spotify API calls go through server-side code (Server Components or Route Handlers)

## Key Files
- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/server.ts` — server Supabase client (async cookies)
- `proxy.ts` — session refresh + route protection for `/dashboard`
- `app/auth/callback/route.ts` — exchanges `?code=` for session after Spotify OAuth
- `app/auth/signout/route.ts` — POST to sign out, clears session
- `app/login/page.tsx` — Spotify sign-in button
- `app/dashboard/page.tsx` — protected page with debug panel + Spotify connection card
- `app/api/debug/spotify-token/route.ts` — dev-only: confirms token presence without exposing value
