import { rankDiscoverOnceDaily, recordGenreListen, SONA_DISCOVER_CATEGORIES } from './search-discovery'
import type { Albums } from '@/types/responses/album'
import type { ISong } from '@/types/responses/song'

const profile = 'cypress-discovery-priority-test'
const album = (genre: string): Albums =>
  ({ id: genre, name: genre, genre, playCount: 10 } as Albums)

describe('Sona daily Search discovery order', () => {
  beforeEach(() => {
    localStorage.removeItem('sona-discover-daily-v4:' + profile)
    localStorage.removeItem('sona-genre-play-history-v2:' + profile)
  })
  afterEach(() => {
    localStorage.removeItem('sona-discover-daily-v4:' + profile)
    localStorage.removeItem('sona-genre-play-history-v2:' + profile)
  })

  it('keeps every category exactly once while prioritizing listened genres over generic shelves', () => {
    const ranked = rankDiscoverOnceDaily(profile, [album('Hip-Hop'), album('Jazz')], [], [])
    expect(ranked).to.have.length(SONA_DISCOVER_CATEGORIES.length)
    expect(new Set(ranked.map(category => category.id)).size).to.equal(ranked.length)
    expect(ranked[0].title).to.equal('Hip-Hop')
    expect(ranked[1].title).to.equal('Jazz')
    expect(ranked.findIndex(category => category.title === 'Charts')).to.be.greaterThan(1)
    expect(ranked.findIndex(category => category.title === 'Hits')).to.be.greaterThan(1)
  })

  it('puts related exploration after favorite genres, before the remaining editorial cards', () => {
    const ranked = rankDiscoverOnceDaily(profile, [album('Jazz')], [], [])
    expect(ranked[0].title).to.equal('Jazz')
    expect(ranked.findIndex(category => category.title === 'Blues'))
      .to.be.greaterThan(0)
      .and.lessThan(ranked.findIndex(category => category.title === 'Charts'))
  })

  it('does not reorder the grid mid-day when another listening event is recorded', () => {
    const first = rankDiscoverOnceDaily(profile, [album('Hip-Hop')], [], [])
    recordGenreListen(profile, { id: 'track-1', genre: 'Rock', genres: [{ name: 'Rock' }] } as ISong)
    const second = rankDiscoverOnceDaily(profile, [album('Hip-Hop')], [], [])
    expect(second.map(category => category.id)).to.deep.equal(first.map(category => category.id))
  })
})
