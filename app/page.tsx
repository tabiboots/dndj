'use client'

import { useState } from 'react'
import NowPlaying from './components/NowPlaying'
import SearchView from './components/SearchView'

const VIEWS = ['Search', 'Tags', 'Deploy'] as const
type View = typeof VIEWS[number]

export default function Home() {
  const [active, setActive] = useState<View>('Search')

  return (
    <div className="h-screen flex flex-col">

      {/* View */}
      <div className="flex-1 overflow-hidden">
        {active === 'Search' && <SearchView />}
      </div>

      <NowPlaying views={VIEWS} active={active} onViewChange={v => setActive(v as View)} />

    </div>
  )
}
