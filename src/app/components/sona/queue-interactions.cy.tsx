import {mount} from 'cypress/react'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {createMemoryRouter,RouterProvider} from 'react-router-dom'
import { Player } from '@/app/components/player/player'
import { SonaMobileNavigation } from './mobile-navigation'
import { SonaMobileNowPlaying } from './mobile-now-playing'
import { usePlayerStore } from '@/store/player.store'
import { usePlaybackHistory } from './playback-history'
import { useSonaDock } from './dock-state'
import type { ISong } from '@/types/responses/song'
import '@/sona-mobile.css'
function render(){
 cy.fixture('songs/random').then((songs:ISong[])=>{
  usePlaybackHistory.setState({autoplay:false})
  usePlayerStore.getState().actions.setSongList(songs,0)
  usePlayerStore.getState().actions.setPlayingState(false)
  usePlayerStore.getState().fullscreen.setIsFullscreen(false)
  useSonaDock.setState({selected:0,compact:false,returnRoute:'/'})
  mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={createMemoryRouter([{path:"/",element:<div className="sona-app-shell"><Player/><SonaMobileNowPlaying/><SonaMobileNavigation/></div>}])}/></QueryClientProvider>)
 })
 cy.get('.sona-player-track').click()
 cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
}
describe('Player queue and history',()=>{
 beforeEach(()=>{cy.viewport(390,844);cy.mockCoverArt();cy.mockSongStream()})
 it('shrinks the same cover into a compact header, retains queue on reopening, and resets to its middle snap',()=>{
  render()
  cy.get('.sona-now-song-info [aria-label="More song options"]').should('exist')
  cy.get('[aria-label="Show song queue"]').click()
  cy.get('.sona-now-overlay').should('have.attr','data-view','queue')
  cy.get('.sona-view-art-flight').should('exist')
  cy.get('.sona-view-art-flight').should('not.exist')
  cy.get('.sona-queue-current-cover').should($cover=>expect($cover[0].getBoundingClientRect().width).to.equal(74))
  cy.get('.sona-queue-scroller').should($scroll=>{
   const middle=$scroll[0].querySelector<HTMLElement>('.sona-queue-middle')!
   expect($scroll[0].scrollTop).to.be.closeTo(middle.offsetTop,2)
  })
  cy.get('.sona-now-overlay').screenshot('queue-middle-reference')
  cy.get('.sona-queue-scroller').then($scroll=>{
   const middle=$scroll[0].querySelector<HTMLElement>('.sona-queue-middle')!
   cy.wrap($scroll).scrollTo(0,middle.offsetTop+middle.offsetHeight,{duration:300})
  })
  cy.get('.sona-queue-scroller').should('have.attr','data-snap','list').should($scroll=>{
   const cover=$scroll[0].querySelector('.sona-queue-current-cover')!.getBoundingClientRect()
   expect(cover.bottom).to.be.at.most($scroll[0].getBoundingClientRect().top+6)
  })
  cy.get('.sona-queue-scroller').scrollTo('top',{duration:300})
  cy.get('.sona-queue-scroller').should('have.attr','data-snap','history')
  cy.get('[aria-label="Minimize Now Playing"]').click()
  cy.get('.sona-now-overlay').should('have.attr','data-phase','closed')
  cy.get('.sona-player-track').click()
  cy.get('.sona-now-overlay').should('have.attr','data-phase','open').should('have.attr','data-view','queue')
  cy.get('.sona-queue-scroller').should($scroll=>expect($scroll[0].scrollTop).to.be.closeTo($scroll[0].querySelector<HTMLElement>('.sona-queue-middle')!.offsetTop,2))
 })
 it('opens the song options menu above the full player',()=>{
  render()
  cy.get('.sona-now-song-info [aria-label="More song options"]').click()
  cy.get('[role="menu"]').should('be.visible').should($menu=>{
   expect(Number(getComputedStyle($menu[0]).zIndex)).to.be.greaterThan(250)
  })
  cy.get('[role="menuitem"]').first().should('be.visible')
 })
 it('uses the compact header in Lyrics and restores the large artwork on return',()=>{
  render()
  cy.get('[aria-label="Show lyrics"]').click()
  cy.get('.sona-now-overlay').should('have.attr','data-view','lyrics')
  cy.get('.sona-view-art-flight').should('not.exist')
  cy.get('.sona-queue-current-header').should('be.visible')
  cy.get('.sona-now-art-area').should('not.be.visible')
  cy.get('[aria-label="Show lyrics"]').click()
  cy.get('.sona-now-overlay').should('have.attr','data-view','playing')
  cy.get('.sona-view-art-flight').should('not.exist')
  cy.get('.sona-now-art-area').should('be.visible')
 })
 it('shows a frosted row following the finger and moves neighboring queue rows',()=>{
  render();cy.get('[aria-label="Show song queue"]').click()
  cy.get('.sona-view-art-flight').should('not.exist')
  cy.get('.sona-queue-upcoming .sona-queue-grip').first().then($grip=>{
   cy.stub($grip[0],'setPointerCapture')
   const rect=$grip[0].getBoundingClientRect(),x=rect.left+10,y=rect.top+10
   cy.wrap($grip).trigger('pointerdown',{eventConstructor:'PointerEvent',pointerId:77,isPrimary:true,button:0,clientX:x,clientY:y,force:true})
   cy.wrap($grip).trigger('pointermove',{eventConstructor:'PointerEvent',pointerId:77,isPrimary:true,clientX:x,clientY:y+80,force:true})
   cy.get('.sona-queue-drag-flight').should($flight=>{
    expect(getComputedStyle($flight[0]).backdropFilter).to.contain('blur(25px)')
    expect(new DOMMatrixReadOnly(getComputedStyle($flight[0]).transform).f).to.be.closeTo(80,1)
   })
   cy.get('.is-queue-shifting').should($rows=>expect([...$rows].some(row=>/translateY\(-[\d.]+px\)/.test(row.style.transform))).to.equal(true))
   cy.wrap($grip).trigger('pointerup',{eventConstructor:'PointerEvent',pointerId:77,isPrimary:true,clientX:x,clientY:y+80,force:true})
   cy.get('.sona-queue-drag-flight').should('not.exist')
  })
 })
})
