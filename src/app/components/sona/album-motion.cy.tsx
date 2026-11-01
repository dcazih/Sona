import { Route, Routes, useNavigate } from 'react-router-dom'
import type { ISong } from '@/types/responses/song'
import Album from '@/app/pages/albums/album'
import type { SingleAlbum } from '@/types/responses/album'
import { AlbumGridCard } from '@/app/components/albums/album-grid-card'
import { closeSonaAlbumToCover } from './album-morph'
import '@/sona-mobile.css'

function withAlbum(run: (album: SingleAlbum) => void) {
  cy.fixture('albums/album').then((album: SingleAlbum) => {
    cy.fixture('songs/random').then((songs: ISong[]) => run({ ...album, song: songs }))
  })
}

function Back({ id }: { id: string }) {
  const navigate = useNavigate()
  return <button onClick={() => closeSonaAlbumToCover(navigate, id)}>Back to albums</button>
}

function App({ album }: { album: SingleAlbum }) {
  return <div className="sona-app-shell">
    <header className="sona-header sona-header-album-view" />
    <div id="main-scroll-area"><div id="scroll-viewport"><div>
      <Routes>
        <Route path="/" element={<div style={{ width: 160, paddingTop: 100 }}><AlbumGridCard album={album} /></div>} />
        <Route path="/library/albums/:albumId" element={<><Back id={album.id} /><Album /></>} />
      </Routes>
    </div></div></div>
  </div>
}

describe('Mobile album loading and navigation', () => {
  beforeEach(() => {
    cy.viewport(390, 844)
    cy.mockCoverArt()
    cy.intercept('**/rest/getArtist*', { body: { 'subsonic-response': { status: 'ok', artist: { album: [] } } } })
    cy.intercept('**/rest/getAlbumList*', { body: { 'subsonic-response': { status: 'ok', albumList2: { album: [] } } } })
  })

  it('matches cover and action geometry while loading and mounts only the mobile album', () => {
    withAlbum((album) => {
      cy.intercept('**/rest/getAlbum?*', {
        delay: 700, body: { 'subsonic-response': { status: 'ok', album } },
      }).as('album')
      cy.mount(<App album={album} />, { routerProps: { initialEntries: ['/library/albums/' + album.id] } })
      let actionsTop = 0
      cy.get('.sona-album-loading .sona-mobile-album-actions').then(($actions) => { actionsTop = $actions[0].getBoundingClientRect().top })
      cy.get('.sona-album-loading .sona-mobile-album-cover').then(($cover) => {
        const bounds = $cover[0].getBoundingClientRect()
        cy.wait('@album')
        cy.get('.sona-album-loading').should('not.exist')
        cy.get('.sona-mobile-album-cover').should(($loaded) => {
          const final = $loaded[0].getBoundingClientRect()
          expect(final.top).to.be.closeTo(bounds.top, 1)
          expect(final.left).to.be.closeTo(bounds.left, 1)
          expect(final.width).to.be.closeTo(bounds.width, 1)
          expect(final.height).to.be.closeTo(bounds.height, 1)
        })
      })
      cy.get('.sona-mobile-album-actions').should(($actions) => {
        expect($actions[0].getBoundingClientRect().top).to.be.closeTo(actionsTop, 1)
      })
      cy.get('.sona-album-song-row').should('have.length', album.song.length)
      cy.get('#image-header-container').should('not.exist')
      cy.get('[role="table"]').should('not.exist')
    })
  })

  it('opens immediately behind a transform-only cover and removes every transition layer on back', () => {
    withAlbum((album) => {
      cy.intercept('**/rest/getAlbum?*', { body: { 'subsonic-response': { status: 'ok', album } } })
      cy.mount(<App album={album} />)
      cy.get('[data-testid="card-image-link"]').click()
      cy.get('.sona-mobile-album-hero').should('exist')
      cy.get('.sona-album-morph-artwork').should('not.exist')
      cy.get('button').contains('Back to albums').click()
      cy.get('[data-testid="card-image-link"]').should('exist')
      cy.get('.sona-album-morph-artwork').should('not.exist')
      cy.get('html').should('not.have.attr', 'data-sona-album-morph')
    })
  })
  it('keeps the desktop album artwork and song table available', () => {
    cy.viewport(1280, 900)
    cy.intercept('**/rest/getAlbumInfo2*', { body: { 'subsonic-response': { status: 'ok', albumInfo: {} } } })
    withAlbum((album) => {
      cy.intercept('**/rest/getAlbum?*', { body: { 'subsonic-response': { status: 'ok', album } } })
      cy.mount(<App album={album} />, { routerProps: { initialEntries: ['/library/albums/' + album.id] } })
      cy.get('#image-header-container').should('exist')
      cy.get('[role="table"]').should('exist')
      cy.get('.sona-mobile-album-hero').should('not.exist')
    })
  })

})
