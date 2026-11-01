import { Profiler } from 'react'
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
    cy.mount(<div className="sona-app-shell"><Player /><SonaMobileNowPlaying /></div>)
  })
}

describe('Mobile player sheet motion', () => {
  beforeEach(() => {
    cy.viewport(390, 844)
    cy.mockCoverArt()
    cy.mockSongStream()
  })

  it('grows on press and morphs to/from the actual mini-player bounds', () => {
    mountPlayer()
    cy.get('.sona-player-track').realMouseDown()
    cy.get('.sona-player').should(($mini) => {
      expect(parseFloat(getComputedStyle($mini[0]).scale)).to.be.greaterThan(1.01)
    })
    cy.get('.sona-player-track').realMouseUp()
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'open')
      .should(($sheet) => {
        const bounds = $sheet[0].getBoundingClientRect()
        expect(bounds.top).to.equal(0)
        expect(bounds.width).to.be.closeTo(390, 1)
        expect(bounds.height).to.be.closeTo(844, 1)
        expect(getComputedStyle($sheet[0]).borderTopLeftRadius).to.equal('0px')
      })
    cy.get('[aria-label="Minimize Now Playing"]').click()
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'closed').then(($sheet) => {
      cy.get('.sona-player').should(($mini) => {
        const closed = $sheet[0].getBoundingClientRect()
        const mini = $mini[0].getBoundingClientRect()
        expect(closed.left).to.be.closeTo(mini.left, 1)
        expect(closed.top).to.be.closeTo(mini.top, 1)
        expect(closed.width).to.be.closeTo(mini.width, 1)
        expect(closed.height).to.be.closeTo(mini.height, 1)
        expect(getComputedStyle($sheet[0]).opacity).to.equal('0')
      })
    })
  })

  it('follows a long drag, rounds early, restores the notch, and avoids React renders per move', () => {
    let renders = 0
    cy.mount(<div className="sona-app-shell">
      <div className="sona-player" data-mobile-active="true" />
      <Profiler id="sheet" onRender={() => { renders++ }}><SonaMobileNowPlaying /></Profiler>
    </div>)
    cy.then(() => usePlayerStore.getState().fullscreen.setIsFullscreen(true))
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'open')
    cy.get('.sona-now-overlay').then(($sheet) => {
      // Deterministic held-pointer frames; the real touch release is covered below.
      cy.stub($sheet[0], 'setPointerCapture')
    }).trigger('pointerdown', { eventConstructor: 'PointerEvent', pointerId: 1, isPrimary: true, button: 0, clientX: 180, clientY: 60 })
    cy.get('.sona-now-overlay').trigger('pointermove', { eventConstructor: 'PointerEvent', pointerId: 1, clientX: 180, clientY: 84 })
    cy.get('.sona-now-overlay').should(($sheet) => {
      expect($sheet[0].getBoundingClientRect().top).to.be.closeTo(24, 2)
      expect(parseFloat(getComputedStyle($sheet[0]).borderTopLeftRadius)).to.be.greaterThan(18)
      expect($sheet[0].ownerDocument.documentElement.dataset.sonaNotchOwner).not.to.equal('player')
    })
    cy.then(() => {
      const before = renders
      cy.get('.sona-now-overlay').trigger('pointermove', { eventConstructor: 'PointerEvent', pointerId: 1, clientX: 180, clientY: 650 })
      cy.get('.sona-now-overlay').should(($sheet) => {
        expect($sheet[0].getBoundingClientRect().top).to.be.greaterThan(500)
        expect(renders).to.equal(before)
      })
    })
    cy.get('.sona-now-overlay').trigger('pointerup', { eventConstructor: 'PointerEvent', pointerId: 1, clientX: 180, clientY: 650, force: true })
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'closed')
  })

  it('dismisses with a real touch swipe and reopens with square full-screen corners', () => {
    mountPlayer()
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'open')
    cy.get('.sona-now-overlay').realSwipe('toBottom', { x: 180, y: 120, length: 500, step: 20 })
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'closed')
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'open')
      .should('have.css', 'border-top-left-radius', '0px')
  })
})
