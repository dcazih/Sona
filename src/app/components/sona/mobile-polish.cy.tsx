import {ToastContainer} from '@/app/observers/toast-container'
import {toast} from 'react-toastify'
import {LikeButton} from '@/app/components/fullscreen/like-button'
import {usePlayerStore} from '@/store/player.store'
import {ArtworkImage} from '@/app/components/artwork-image'
import type {ISong} from '@/types/responses/song'
import 'react-toastify/dist/ReactToastify.css'
import '@/sona-mobile.css'
import '@/sona-toast.css'

describe('Mobile interaction details',()=>{
 beforeEach(()=>{cy.viewport(390,844);toast.dismiss();cy.mockCoverArt()})
 it('expires ordinary notices after five seconds and login notices after two',()=>{
  cy.mount(<ToastContainer/>)
  cy.then(()=>{toast.info('Five seconds');toast.info('Login notice',{autoClose:2000})})
  cy.contains('Login notice').should('be.visible')
  cy.wait(2600)
  cy.contains('Login notice').should('not.exist')
  cy.contains('Five seconds').should('be.visible')
  cy.wait(3000)
  cy.contains('Five seconds').should('not.exist')
 })
 it('expands red fill inside the heart and uses a directly tappable native switch',()=>{
  cy.intercept('**/rest/star*',{body:{'subsonic-response':{status:'ok'}}})
  cy.fixture('songs/random').then((songs:ISong[])=>{
   usePlayerStore.getState().actions.setSongList([{...songs[0],starred:undefined}],0)
   cy.mount(<LikeButton/>)
  })
  cy.get('input[aria-label="Favorite current song"]').should('have.attr','switch','').click()
  cy.get('.sona-heart-glyph').should('have.class','is-filled')
  cy.get('.sona-heart-fill').should('have.css','clip-path','circle(75% at 50% 50%)')
 })
 it('fades newly loaded tab artwork, keeps player artwork immediate and colors empty covers',()=>{
  cy.mount(<><div><ArtworkImage alt="Tab cover"/></div><div className="sona-player"><ArtworkImage alt="Player cover"/></div></>)
  cy.get('.sona-artwork-shell').first().should($shell=>expect(getComputedStyle($shell[0]).backgroundImage).to.contain('radial-gradient'))
  cy.mount(<><ArtworkImage src="/test-cover.png" alt="Tab cover"/><div className="sona-player"><ArtworkImage src="/test-cover.png" alt="Player cover"/></div></>)
  cy.get('[alt="Tab cover"]').should('have.css','transition-duration','0.24s')
  cy.get('[alt="Player cover"]').should('have.css','transition-duration','0s')
 })
})
