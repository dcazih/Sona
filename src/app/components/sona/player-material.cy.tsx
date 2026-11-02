import {useSonaDock} from './dock-state'
import {getDockBounds} from './dock-bounds'
import {SonaMobileNavigation} from './mobile-navigation'
import { Player } from '@/app/components/player/player'
import { usePlayerStore } from '@/store/player.store'
import type { ISong } from '@/types/responses/song'
import { SonaMobileNowPlaying } from './mobile-now-playing'
import '@/sona-mobile.css'

function mountPlayer() {
  cy.fixture('songs/random').then((songs: ISong[]) => {
    usePlayerStore.getState().actions.setSongList(songs, 0)
    usePlayerStore.getState().actions.setPlayingState(false)
    usePlayerStore.getState().fullscreen.setIsFullscreen(false)
    cy.mount(<div className="sona-app-shell"><Player /><SonaMobileNowPlaying /><SonaMobileNavigation/></div>)
  })
}


it('keeps the dragged sheet opaque, reaches dock material early and blocks presses until settled',()=>{
 cy.viewport(390,844)
 useSonaDock.setState({selected:0,compact:false,returnRoute:'/'})
 cy.mockCoverArt()
 mountPlayer()
 cy.get('.sona-player-track').click()
 cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
 cy.get('.sona-now-overlay').then($sheet=>cy.stub($sheet[0],'setPointerCapture'))
 cy.get('.sona-now-drag-handle').trigger('pointerdown',{eventConstructor:'PointerEvent',pointerId:81,isPrimary:true,button:0,clientX:180,clientY:25})
 cy.get('.sona-now-drag-handle').trigger('pointermove',{eventConstructor:'PointerEvent',pointerId:81,isPrimary:true,clientX:180,clientY:135})
 cy.get('.sona-now-overlay').should($sheet=>{
  expect(Number(getComputedStyle($sheet[0]).opacity)).to.equal(1)
  expect(Number(getComputedStyle($sheet[0].querySelector('.sona-now-background')!).opacity)).to.be.lessThan(.05)
  expect(getComputedStyle($sheet[0]).backgroundColor).to.equal(getComputedStyle($sheet[0].ownerDocument.querySelector('.sona-player')!).backgroundColor)
 })
 cy.get('.sona-now-drag-handle').trigger('pointerup',{eventConstructor:'PointerEvent',pointerId:81,isPrimary:true,clientX:180,clientY:700})
 cy.get('.sona-now-overlay').should('have.attr','data-phase','closing').then($sheet=>{
  const shape=$sheet[0].getAnimations().find(a=>(a.effect as KeyframeEffect).getKeyframes().some(frame=>frame.transform))!
  shape.pause();shape.currentTime=200
 })
 cy.get('[aria-label="Search"]').click({force:true})
 cy.get('html').should('have.attr','data-sona-player-settling','true')
 cy.get('[aria-label="Search"]').should('exist')
 cy.get('.sona-now-overlay').then($sheet=>$sheet[0].getAnimations().forEach(a=>a.finish()))
 cy.get('.sona-now-overlay').should('have.attr','data-phase','landing').then($sheet=>$sheet[0].getAnimations().forEach(a=>a.finish()))
 cy.get('html').should('not.have.attr','data-sona-player-settling')
})
