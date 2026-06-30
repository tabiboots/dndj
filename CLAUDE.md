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

## Tagging System (not yet built)

### Schema
```sql
songs     (spotify_id TEXT PK, name TEXT, artist TEXT, album_art_url TEXT, duration_ms INT)
tags      (id UUID PK, user_id UUID, name TEXT, color INT)  -- color = palette index 0–11
song_tags (song_id TEXT → songs.spotify_id, tag_id UUID → tags.id, user_id UUID)
          UNIQUE (song_id, tag_id, user_id)
```

### RLS
- `songs` — authenticated read + upsert (public Spotify cache, no ownership)
- `tags` — user sees/modifies only their own rows
- `song_tags` — user sees/modifies only their own rows

### Design decisions
- Tags are personal per user, not shared
- Tags form a reusable library (create once, apply to many songs)
- Colors are a fixed palette of 12 swatches, stored as an integer index
- Song metadata is cached in Supabase so tagged song lists don't require Spotify API calls
- Tagging is accessible from two surfaces: search results and playlist drill view
- **Hover** right edge of a song chip → quick-add popover (filterable tag list, toggle only)
- **Click** a song chip → detail panel opens on the right half of the main content area (full tag management: apply/remove tags, create new tags with name + color)
- Both the hover popover and detail panel need a search/filter input — users can have dozens of tags
- Detail panel is view-local; it closes when the user searches or navigates
- Selected song state lives at `app/page.tsx` level so both SearchView and BrowseState can open the panel
- A dedicated Tags view (browse by tag) is planned but not part of this phase

### Build order
1. Supabase migration (tables + RLS policies)
2. Tag API routes (CRUD for `tags`, toggle `song_tags`, upsert `songs`)
3. Hover popover on song chips (filterable, toggle)
4. Detail panel (split layout at page level, create/delete tags)
5. Tags view (later)

## Key Files
- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/server.ts` — server Supabase client (async cookies)
- `proxy.ts` — session refresh + route protection for `/dashboard`
- `app/auth/callback/route.ts` — exchanges `?code=` for session after Spotify OAuth
- `app/auth/signout/route.ts` — POST to sign out, clears session
- `app/login/page.tsx` — Spotify sign-in button
- `app/dashboard/page.tsx` — protected page with debug panel + Spotify connection card
- `app/api/debug/spotify-token/route.ts` — dev-only: confirms token presence without exposing value
