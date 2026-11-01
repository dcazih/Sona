import { mount } from 'cypress/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AlphabetRail, SonaDownloadsList, SonaSongsList } from './mobile-section-pages'
import '@/sona-mobile.css'
import '@/sona-sections.css'

function IndexedPage() {
  return <>
    <header className="sona-header" style={{position:'fixed',top:0,height:60}}>Library</header>
    <div id="scroll-viewport" style={{height:500,overflowY:'auto'}}>
      {['A','M','Z'].map(letter=><section id={'letter-'+letter} key={letter} style={{height:500,paddingTop:16}}><h2>{letter}</h2></section>)}
    </div>
    <AlphabetRail letters={['A','M','Z']} prefix="letter-"/>
  </>
}

describe('Library refinements',()=>{
  beforeEach(()=>{cy.viewport(390,844);cy.mockCoverArt()})

  it('keeps A–Z pinned and scrubs through letters without scrolling the document',()=>{
    cy.mount(<IndexedPage/> )
    let top=0
    cy.get('.sona-section-alphabet').then($rail=>{top=$rail[0].getBoundingClientRect().top})
    cy.get('#scroll-viewport').scrollTo(0,250)
    cy.get('.sona-section-alphabet').should($rail=>{
      expect($rail[0].parentElement?.tagName).to.equal('BODY')
      expect($rail[0].getBoundingClientRect().top).to.equal(top)
      expect(getComputedStyle($rail[0]).touchAction).to.equal('none')
    }).then($rail=>{
      const rail=$rail[0]
      cy.stub(rail,'setPointerCapture')
      const bounds=rail.getBoundingClientRect()
      cy.wrap(rail).trigger('pointerdown',{eventConstructor:'PointerEvent',pointerId:1,clientY:bounds.top+5})
        .trigger('pointermove',{eventConstructor:'PointerEvent',pointerId:1,clientY:bounds.bottom-5})
        .trigger('pointerup',{eventConstructor:'PointerEvent',pointerId:1})
    })
    cy.get('[aria-label="Jump to Z"]').should('have.attr','aria-pressed','true')
    cy.get('#letter-Z').should($section=>expect($section[0].getBoundingClientRect().top).to.be.closeTo(84,2))
    cy.window().its('scrollY').should('equal',0)
  })

  it('uses compact genre-sized Downloaded rows and retains category icons',()=>{
    cy.mount(<SonaDownloadsList/> )
    cy.get('.sona-section-download-links a').should('have.length',4).first().should($row=>{
      expect($row[0].getBoundingClientRect().height).to.equal(59)
      expect(getComputedStyle($row[0]).fontSize).to.equal('16px')
    }).find('svg').first().should('have.attr','width','24')
  })

  it('marks explicit song titles without adding durations',()=>{
    cy.intercept('**/rest/search3*',{body:{'subsonic-response':{status:'ok',searchResult3:{song:[
      {id:'explicit-1',title:'Explicit song',artist:'Artist',duration:160,explicitStatus:'explicit'},
      {id:'clean-1',title:'Clean song',artist:'Artist',duration:160,explicitStatus:'clean'},
    ]}}}})
    const router=createMemoryRouter([{path:'/',element:<SonaSongsList/>}])
    mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router}/></QueryClientProvider>)
    cy.contains('strong','Explicit song').find('[aria-label="Explicit"]').should('have.text','E')
    cy.contains('strong','Clean song').find('[aria-label="Explicit"]').should('not.exist')
    cy.get('.sona-section-song-row').should('not.contain','2:40')
  })
})
