import {createMemoryRouter,RouterProvider,useLocation} from 'react-router-dom'
import {mount} from 'cypress/react'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {SonaMobileNavigation} from './mobile-navigation'
import {useSonaDock} from './dock-state'
import {useSonaSearch} from './search-state'
import {usePlayerStore} from '@/store/player.store'
import {Player} from '@/app/components/player/player'
import {SonaMobileNowPlaying} from './mobile-now-playing'
import type {ISong} from '@/types/responses/song'
import '@/sona-mobile.css'

function Screen(){
 const location=useLocation()
 return <div className="sona-app-shell"><div id="main-scroll-area"><div id="scroll-viewport" style={{height:700,overflow:'auto'}}><div style={{height:2400}}>Page {location.pathname}</div></div></div>
 <div className="sona-player" data-mobile-active="true" style={{position:'fixed'}}>Playing</div><SonaMobileNavigation/></div>
}
function setup(path='/'){
 const router=createMemoryRouter([{path:'*',element:<Screen/>}],{initialEntries:[path]})
 mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router}/></QueryClientProvider>);return router
}
function geometry(){
 cy.get('.sona-player').should($mini=>{
  const mini=$mini[0].getBoundingClientRect(),doc=$mini[0].ownerDocument
  const nav=doc.querySelector('.sona-bottom-nav')!.getBoundingClientRect()
  const search=doc.querySelector('.sona-search-morph')!.getBoundingClientRect()
  expect(mini.left).to.be.greaterThan(nav.right)
  expect(mini.right).to.be.lessThan(search.left)
  expect(mini.bottom).to.be.closeTo(nav.bottom,1)
  expect(mini.height).to.be.closeTo(search.height,1)
 })
}
describe('Coordinated mobile dock',()=>{
 beforeEach(()=>{
  cy.viewport(390,844)
  useSonaDock.setState({selected:0,compact:false,returnRoute:'/'})
  useSonaSearch.getState().reset()
  usePlayerStore.setState(state=>({fullscreen:{...state.fullscreen,isFullscreen:false}}))
 })
 it('keeps the originating tab through nested pages and returns there from search',()=>{
  const router=setup()
  cy.get('[aria-label="New"]').click()
  cy.get('[aria-label="New"]').should('have.attr','aria-current','page')
  cy.then(()=>router.navigate('/library/playlists/example'))
  cy.get('[aria-label="New"]').should('have.attr','aria-current','page')
  cy.get('[aria-label="Library"]').should('not.have.attr','aria-current')
  cy.get('[aria-label="Search"]').click()
  cy.get('[aria-label="Return to New"]').should('be.visible').click()
  cy.contains('Page /library/playlists/example').should('exist')
  cy.get('[aria-label="New"]').should('have.attr','aria-current','page')
 })
 it('compacts on downward scroll, preserves it through full player, and reverses on upward scroll',()=>{
  setup()
  cy.get('#scroll-viewport').scrollTo(0,120)
  cy.get('html').should('have.attr','data-sona-dock','compact')
  geometry()
  cy.then(()=>usePlayerStore.setState(state=>({fullscreen:{...state.fullscreen,isFullscreen:true}})))
  cy.get('#scroll-viewport').scrollTo(0,160)
  cy.then(()=>usePlayerStore.setState(state=>({fullscreen:{...state.fullscreen,isFullscreen:false}})))
  cy.get('html').should('have.attr','data-sona-dock','compact')
  cy.get('#scroll-viewport').scrollTo(0,110)
  cy.get('html').should('have.attr','data-sona-dock','normal')
  cy.get('#scroll-viewport').scrollTo(0,150)
  cy.get('[aria-label="Expand Sona navigation"]').click()
  cy.get('html').should('have.attr','data-sona-dock','normal')
 })
 it('really expands the persistent search surface, keeps mini until focus, and returns search below mini',()=>{
  setup('/mobile-library')
  cy.get('#scroll-viewport').scrollTo(0,150)
  geometry()
  cy.get('.sona-search-morph').then($el=>{
   const element=$el[0]
   cy.get('[aria-label="Search"]').click()
   cy.get('.sona-search-morph').should($expanded=>expect($expanded[0]).to.equal(element))
  })
  cy.get('[aria-label="Return to Library"]').should('be.visible')
  cy.get('.sona-search-morph').should($el=>expect($el[0].getBoundingClientRect().width).to.be.closeTo(302,1))
  cy.get('.sona-player').should('have.css','opacity','1')
  cy.get('input').focus()
  cy.get('.sona-player').should('have.css','opacity','0')
  cy.get('input').type('test').blur()
  cy.get('.sona-player').should('have.css','opacity','1').should($mini=>{
   const bar=$mini[0].ownerDocument.querySelector('.sona-search-morph')!.getBoundingClientRect()
   expect($mini[0].getBoundingClientRect().bottom).to.be.lessThan(bar.top)
  })
 })
 it('slides the highlight continuously and commits a tab only on release',()=>{
  setup()
  cy.get('.sona-bottom-nav').trigger('pointerdown',{pointerId:1,isPrimary:true,pointerType:'touch',clientX:47,clientY:800})
   .trigger('pointermove',{pointerId:1,isPrimary:true,pointerType:'touch',clientX:180,clientY:800})
  cy.get('[aria-label="Sona"]').should('have.attr','aria-current','page')
  cy.get('.sona-nav-highlight').should($el=>expect(getComputedStyle($el[0]).transform).not.to.equal('matrix(1, 0, 0, 1, 0, 0)'))
  cy.get('.sona-bottom-nav').trigger('pointerup',{pointerId:1,isPrimary:true,pointerType:'touch',clientX:180,clientY:800})
  cy.get('[aria-label="Request"]').should('have.attr','aria-current','page')
 })
 it('uses matching live width transitions rather than replacing the circle',()=>{
  setup()
  cy.get('.sona-search-morph').then($el=>{
   const search=$el[0],nav=search.ownerDocument.querySelector('.sona-bottom-nav')!
   expect(search.getBoundingClientRect().width).to.equal(64)
   ;(search.querySelector('button') as HTMLButtonElement).click()
   cy.then(()=>new Cypress.Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))).then(()=>{
    const transitions=search.getAnimations().filter(animation=>(animation as CSSTransition).transitionProperty==='width')
    const navTransition=nav.getAnimations().find(animation=>(animation as CSSTransition).transitionProperty==='width')!
    expect(transitions).to.have.length(1)
    expect(navTransition).to.exist
    expect(transitions[0].effect!.getTiming().duration).to.equal(navTransition.effect!.getTiming().duration)
    transitions[0].pause();navTransition.pause()
    transitions[0].currentTime=120;navTransition.currentTime=120
    const width=search.getBoundingClientRect().width
    expect(width).to.be.greaterThan(64).and.lessThan(302)
    transitions[0].finish();navTransition.finish()
   })
  })
 })
 it('tracks keyboard mounting without moving page content, then restores below mini',()=>{
  setup('/mobile-search')
  cy.window().then(win=>{
   const viewport=win.visualViewport!
   Object.defineProperty(viewport,'height',{configurable:true,get:()=>500})
   cy.get('input').focus()
   cy.then(()=>viewport.dispatchEvent(new Event('resize')))
   cy.get('html').should('have.attr','data-sona-keyboard-moving','false')
   cy.get('.sona-search-morph').should('have.css','opacity','1').should($bar=>{
    expect($bar[0].getBoundingClientRect().bottom).to.be.closeTo(496,1)
   })
   cy.get('#scroll-viewport').should('have.prop','scrollTop',0)
   cy.then(()=>{Object.defineProperty(viewport,'height',{configurable:true,get:()=>650});viewport.dispatchEvent(new Event('resize'))})
   cy.get('html').should('have.attr','data-sona-keyboard-moving','true')
   cy.then(()=>{Object.defineProperty(viewport,'height',{configurable:true,get:()=>844});viewport.dispatchEvent(new Event('resize'))})
   cy.get('html').should('have.attr','data-sona-keyboard-moving','false')
   cy.get('.sona-search-morph').should('have.css','opacity','1')
   cy.get('.sona-player').should('have.css','opacity','1').should($mini=>{
    expect($mini[0].getBoundingClientRect().bottom).to.be.lessThan($mini[0].ownerDocument.querySelector('.sona-search-morph')!.getBoundingClientRect().top)
   })
  })
 })
 it('morphs the real full player back into the compact mini-player',()=>{
  cy.mockCoverArt();cy.mockSongStream()
  cy.fixture('songs/random').then((songs:ISong[])=>{
   usePlayerStore.getState().actions.setSongList(songs,0)
   usePlayerStore.getState().actions.setPlayingState(false)
   const router=createMemoryRouter([{path:'*',element:<div className="sona-app-shell"><div id="main-scroll-area"><div id="scroll-viewport" style={{height:700,overflow:'auto'}}><div style={{height:2400}}>Home</div></div></div><Player/><SonaMobileNowPlaying/><SonaMobileNavigation/></div>}])
   mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router}/></QueryClientProvider>)
   cy.get('#scroll-viewport').scrollTo(0,150)
   geometry()
   cy.get('.sona-player-track').click()
   cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
   cy.get('[aria-label="Minimize Now Playing"]').click()
   cy.get('.sona-now-overlay').should('have.attr','data-phase','closed').should($sheet=>{
    const mini=$sheet[0].ownerDocument.querySelector('.sona-player')!.getBoundingClientRect(),sheet=$sheet[0].getBoundingClientRect()
    expect(sheet.left).to.be.closeTo(mini.left,1);expect(sheet.width).to.be.closeTo(mini.width,1)
   })
   cy.get('html').should('have.attr','data-sona-dock','compact')
   geometry()
  })
 })

 it('switches tabs with a real horizontal touch gesture',()=>{
  setup()
  cy.get('.sona-bottom-nav').realSwipe('toRight',{x:45,y:30,length:210,step:12})
  cy.get('[aria-label="Library"]').should('have.attr','aria-current','page')
  cy.contains('Page /mobile-library').should('exist')
 })

})
