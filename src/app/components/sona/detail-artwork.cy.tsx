import { mount } from 'cypress/react'
import { useDetailArtwork } from '@/app/hooks/use-detail-artwork'
import { useMobileDetailReveal } from '@/app/hooks/use-mobile-detail-reveal'
import { ArtworkImage } from '@/app/components/artwork-image'
import '@/sona-mobile.css'
function Detail({src}:{src:string}){
 const ready=useDetailArtwork(src)
 const black=useMobileDetailReveal(src,!ready)
 return black?<div data-black/>:!ready?<div data-skeleton/>:<ArtworkImage src={src} alt="Decoded hero"/>
}
it('keeps the page gated until its actual hero artwork is decoded, then reuses it immediately',()=>{
 const src='/test-detail-decode.png'
 cy.intercept('GET',src,{fixture:'coverArt.jpeg',delay:1800}).as('hero')
 mount(<Detail src={src}/>)
 cy.get('[data-black]').should('exist')
 cy.get('[data-skeleton]',{timeout:1600}).should('exist')
 cy.wait('@hero')
 cy.get('img[alt="Decoded hero"]').should('have.class','is-loaded')
 cy.get('.sona-artwork-note-fallback').should('not.exist')
 mount(<Detail src={src}/>)
 cy.get('[data-black],[data-skeleton],.sona-artwork-note-fallback').should('not.exist')
})
