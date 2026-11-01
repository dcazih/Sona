import '@/sona-mobile.css'
import '@/sona-sections.css'
import { mount } from 'cypress/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { router } from './router'

// Exercise the real lazy application shell, not only eagerly mounted pages.
describe('Cold application routes', () => {
  beforeEach(() => {
    cy.viewport(390, 844)
    cy.mockCoverArt()
    cy.intercept('**/rest/**', { body: { 'subsonic-response': {
      status: 'ok', searchResult3: { song: [{ id: 'song-1', title: 'Cold Route Song', artist: 'Artist', duration: 120 }] },
      internetRadioStations: { internetRadioStation: [] }, playlists: { playlist: [] }, genres: { genre: [] }, starred2: {},
      playlist: { id: 'playlist-1', name: 'Cold Route Playlist', entry: [{ id: 'song-1', title: 'Cold Route Song', artist: 'Artist', duration: 120 }], songCount: 1 },
    } } })
  })

  for (const [path, title] of [
    ['/library/songs', 'Songs'],
    ['/library/playlists/playlist-1', 'Cold Route Playlist'],
  ]) {
    it(`opens ${path} through the real lazy shell`, () => {
      const routes = router.routes.map(route => ({ ...route, loader: () => null }))
      const testRouter = createMemoryRouter(routes, { initialEntries: [path] })
      mount(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RouterProvider router={testRouter} future={{ v7_startTransition: true }} />
      </QueryClientProvider>)
      cy.get('.sona-app-shell').should('exist')
      cy.contains('h1', title).should('exist')
      cy.get('.sona-section-back').should($button=>{expect($button[0].getBoundingClientRect().width).to.equal(32);expect($button[0].getBoundingClientRect().height).to.equal(32)})
      cy.contains('strong', 'Cold Route Song').should('exist')
      cy.contains('Unexpected Application Error').should('not.exist')
      cy.contains('Unhandled Error').should('not.exist')
    })
  }
  it('opens mobile Podcasts without a configured podcast service',()=>{
    const routes=router.routes.map(route=>({...route,loader:()=>null}))
    const testRouter=createMemoryRouter(routes,{initialEntries:['/library/podcasts']})
    mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={testRouter} future={{v7_startTransition:true}}/></QueryClientProvider>)
    cy.contains('Still working on this one…').should('be.visible')
  })

  it('puts Add Radio in the top bar and opens the existing radio form',()=>{
    const routes=router.routes.map(route=>({...route,loader:()=>null}))
    const testRouter=createMemoryRouter(routes,{initialEntries:['/library/radios']})
    mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={testRouter} future={{v7_startTransition:true}}/></QueryClientProvider>)
    cy.get('.sona-header [aria-label="Add radio"]').should('be.visible').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('.sona-header-page-title').should('have.text','Radio')
  })

 it('places the request iframe beneath a translucent overlapping toolbar',()=>{
  cy.intercept('https://profiles.hippocampus-polaris.ts.net/**',{body:'<html><body>Requests</body></html>',headers:{'content-type':'text/html'}})
  const routes=router.routes.map(route=>({...route,loader:()=>null}))
  const testRouter=createMemoryRouter(routes,{initialEntries:['/mobile-request']})
  mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={testRouter}/></QueryClientProvider>)
  cy.get('.sona-persistent-requests.is-active iframe').should($frame=>{
   const top=$frame[0].getBoundingClientRect().top,header=$frame[0].ownerDocument.querySelector('.sona-header')!
   expect(top).to.equal(0)
   expect(header.getBoundingClientRect().bottom).to.be.greaterThan(top)
   expect(getComputedStyle(header).backdropFilter).to.contain('blur(22px)')
  })
 })

 it('loads a matching artist skeleton, one top back button, centered reordered controls and closed info',()=>{
  cy.intercept('**/rest/getArtist?*',{delay:300,body:{'subsonic-response':{status:'ok',artist:{id:'artist-ui',name:'Artist UI',coverArt:'art',albumCount:1,album:[{id:'a',name:'Album',songCount:1}]}}}})
  cy.intercept('**/rest/getArtistInfo?*',{body:{'subsonic-response':{status:'ok',artistInfo:{biography:'A biography',similarArtist:[]}}}})
  cy.intercept('**/rest/getTopSongs?*',{body:{'subsonic-response':{status:'ok',topSongs:{song:[]}}}})
  const routes=router.routes.map(route=>({...route,loader:()=>null}))
  const testRouter=createMemoryRouter(routes,{initialEntries:['/library/artists/artist-ui']})
  mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={testRouter}/></QueryClientProvider>)
  cy.get('.sona-artist-loading .sona-mobile-artist-art').should('exist')
  cy.get('.sona-mobile-artist-copy h1').should('have.text','Artist UI')
  cy.get('.sona-header [aria-label="Back to music"]').should('have.length',1).should($button=>expect($button[0].getBoundingClientRect().width).to.equal(32))
  cy.get('.sona-section-back').should('not.exist')
  cy.get('#artist-biography').should('not.exist')
  cy.get('.sona-artist-heart').should($heart=>{
   const doc=$heart[0].ownerDocument,heart=$heart[0].getBoundingClientRect(),play=doc.querySelector('.sona-artist-play')!.getBoundingClientRect(),shuffle=doc.querySelector('.sona-artist-shuffle')!.getBoundingClientRect()
   expect(heart.left).to.be.lessThan(shuffle.left);expect(shuffle.left).to.be.lessThan(play.left)
  })
  cy.get('.sona-artist-info').click()
  cy.get('#artist-biography h3').should('have.css','font-size','18px')
  cy.get('.sona-artist-page').find('[data-testid="sticky-header"]').should('not.exist')
  cy.get('.sona-header').should('have.css','backdrop-filter','blur(22px)')
  cy.get('#main-scroll-area').should($area=>expect($area[0].getBoundingClientRect().top).to.equal(0))
 })

})
