import type { ISong } from '@/types/responses/song'
import { SonaMobileFeatured } from './mobile-featured'
import '@/sona-mobile.css'

describe('Featured music native scrolling', () => {
  it('swipes between cards, reaches a finite end, and restores its position', () => {
    cy.viewport(390, 844)
    cy.mockCoverArt()
    cy.fixture('songs/random').then((songs: ISong[]) => {
      const mount = () => cy.mount(<SonaMobileFeatured songs={songs} />)
      mount()
      cy.get('.sona-music-rail--featured').as('rail')
      cy.get('@rail').realSwipe('toLeft', { x: 280, y: 70, length: 220, step: 20 })
      cy.get('@rail').should(($rail) => {
        expect($rail[0].scrollLeft).to.be.greaterThan(100)
        expect($rail[0].ownerDocument.scrollingElement?.scrollTop).to.equal(0)
      })
      cy.get('@rail').scrollTo('right')
      cy.get('button[aria-label="Next featured song"]').should('be.disabled')
      cy.get('@rail').then(($rail) => {
        const end = $rail[0].scrollLeft
        mount()
        cy.get('.sona-music-rail--featured').should(($restored) => {
          expect($restored[0].scrollLeft).to.be.closeTo(end, 1)
        })
      })
      cy.get('.sona-music-rail--featured').scrollTo('left')
      cy.get('button[aria-label="Previous featured song"]').should('be.disabled')
    })
  })
})
