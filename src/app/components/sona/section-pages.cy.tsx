import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mount } from 'cypress/react'
import type { ReactNode } from 'react'
import SonaMobileFavorites from './mobile-favorites'
import { MainRoutes } from '@/app/layout/main'
import type { ISong } from '@/types/responses/song'
import { SonaAlbumsList, SonaPlaylistDetail, SonaSongsList } from './mobile-section-pages'
import '@/sona-mobile.css'
import '@/sona-sections.css'

function mountPage(element: ReactNode, path: string, entry = path) {
  const router = createMemoryRouter([{ id: 'playlist', path, element }], { initialEntries: [entry] })
  return mount(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <RouterProvider router={router} />
  </QueryClientProvider>)
}

const songs = [{ id: 'song-1', title: 'A Song', artist: 'Artist', artistId: 'artist-1', coverArt: 'cover-1', duration: 160 }] as ISong[]

describe('Mobile Songs, playlists and empty album filters', () => {
  beforeEach(() => { cy.viewport(390, 844); cy.mockCoverArt() })

  it('renders Songs and opens its row options without a route crash', () => {
    cy.intercept('**/rest/search3*', { body: { 'subsonic-response': { status: 'ok', searchResult3: { song: songs } } } })
    mountPage(<SonaSongsList />, '/library/songs')
    cy.contains('strong', 'A Song').should('exist')
    cy.get('[aria-label="Options for A Song"]').click()
    cy.contains('button', 'Play Next').should('be.visible')
    cy.contains('button', 'Add to Queue').should('be.visible')
  })

  it('renders playlist tracks and opens their options without a route crash', () => {
    cy.intercept('**/rest/getPlaylist*', { body: { 'subsonic-response': { status: 'ok', playlist: {
      id: 'playlist-1', name: 'My Playlist', owner: 'me', entry: songs, songCount: songs.length,
    } } } })
    mountPage(<SonaPlaylistDetail />, '/library/playlists/:playlistId', '/library/playlists/playlist-1')
    cy.contains('h1', 'My Playlist').should('exist')
    cy.contains('strong', 'A Song').should('exist')
    cy.get('[aria-label="Options for A Song"]').click()
    cy.contains('button', 'Song Info').should('be.visible')
  })
  it('shows only Nothing here. for an empty album filter', () => {
    cy.intercept('**/rest/getAlbumList2*', { body: { 'subsonic-response': { status: 'ok', albumList2: { album: [] } } } })
    cy.window().then(win => win.localStorage.setItem('sona-section-settings:/library/albums', JSON.stringify({ filter: 'favorites', sort: 'title', view: 'grid' })))
    cy.then(() => mountPage(<SonaAlbumsList />, '/library/albums'))
    cy.get('.sona-section-empty').should('have.text', 'Nothing here.')
    cy.get('.sona-section-album-grid').should('not.exist')
  })

  it('always resets an album route to the top, even after leaving it scrolled', () => {
    const router = createMemoryRouter([{ element: <div style={{ height: 600 }}><MainRoutes /></div>, children: [
      { path: '/', element: <div>Home</div> },
      { path: '/library/albums/scroll-test', element: <div style={{ height: 2400 }}>Album</div> },
    ] }], { initialEntries: ['/library/albums/scroll-test'] })
    mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>)
    cy.get('#scroll-viewport').scrollTo(0, 550).should('have.prop', 'scrollTop', 550)
    cy.then(() => router.navigate('/'))
    cy.contains('Home').should('exist')
    cy.then(() => router.navigate('/library/albums/scroll-test'))
    cy.get('#scroll-viewport').should('have.prop', 'scrollTop', 0)
  })

  it('keeps See More section title, source ordering and normal filtering',()=>{
    cy.intercept('**/rest/getAlbumList2*',{body:{'subsonic-response':{status:'ok',albumList2:{album:[
      {id:'recent-first',name:'Recently heard',artist:'Artist',created:'2020-01-01'},
      {id:'recent-second',name:'Newer but heard earlier',artist:'Artist',created:'2026-01-01'},
    ]}}}}).as('section')
    mountPage(<SonaAlbumsList/>,'/library/albums','/library/albums?filter=recent&section=Recently%20Played')
    cy.contains('h1','Recently Played').should('be.visible')
    cy.wait('@section').its('request.url').should('include','type=recent')
    cy.get('.sona-section-album-tile strong').first().should('have.text','Recently heard')
  })

  it('renders Favorites with only a title, album-style controls and tracks',()=>{
    cy.intercept('**/rest/getStarred2*',{body:{'subsonic-response':{status:'ok',starred2:{song:songs}}}})
    mountPage(<SonaMobileFavorites/>,'/library/favorites')
    cy.contains('h1','Favorites').should('be.visible')
    cy.get('[aria-label="Shuffle favorites"]').should('exist')
    cy.get('[aria-label="Play favorites"]').click()
    cy.get('[aria-label="Download favorites"]').should('be.visible')
    cy.get('.sona-album-song-row').should('have.length',1)
    cy.get('.sona-mobile-album-cover,.sona-mobile-album-details,.sona-album-songs-heading,.sona-album-song-duration').should('not.exist')
    cy.get('.sona-mobile-album-actions button').should('have.length',3)
  })

})
