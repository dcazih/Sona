import { useState } from 'react'
import { flushSync } from 'react-dom'
import { ArtworkImage } from './artwork-image'
import '@/sona-mobile.css'

function Harness({ id }: { id: string }) {
  const [visible, setVisible] = useState(true)
  const [size, setSize] = useState(300)
  return <>
    <button onClick={() => {
      flushSync(() => setVisible(false))
      flushSync(() => setVisible(true))
      document.documentElement.dataset.noteAtRemount = String(Boolean(document.querySelector('.sona-artwork-note-fallback')))
    }}>Remount image</button>
    <button onClick={() => setSize(700)}>Open album</button>
    <div style={{ width: 200, height: 200 }}>{visible && <ArtworkImage src={'/rest/getCoverArt?id=' + id + '&size=' + size} alt="Cover" />}</div>
  </>
}

describe('Artwork reuse across routes and cover sizes', () => {
  it('never inserts a loading note when remounting a decoded image', () => {
    cy.intercept('**/rest/getCoverArt*', { fixture: 'coverArt.jpeg' })
    cy.mount(<Harness id="remount-cover" />)
    cy.get('img').should('have.class', 'is-loaded')
    cy.contains('button', 'Remount image').click()
    cy.get('html').should('have.attr', 'data-note-at-remount', 'false')
    cy.get('.sona-artwork-note-fallback').should('not.exist')
  })

  it('keeps the loaded cover visible while its larger album image downloads', () => {
    cy.intercept('**/rest/getCoverArt*size=300', { fixture: 'coverArt.jpeg' })
    cy.intercept('**/rest/getCoverArt*size=700', { fixture: 'coverArt.jpeg', delay: 800 }).as('large')
    cy.mount(<Harness id="upgrade-cover" />)
    cy.get('img').should('have.class', 'is-loaded')
    cy.contains('button', 'Open album').click()
    cy.get('img').should('have.attr', 'src').and('include', 'size=300')
    cy.get('.sona-artwork-note-fallback').should('not.exist')
    cy.wait('@large')
    cy.get('img').should('have.attr', 'src').and('include', 'size=700')
    cy.get('.sona-artwork-note-fallback').should('not.exist')
  })
})
