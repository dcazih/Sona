import { useEffect, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import type { ISong } from '@/types/responses/song'
import Album from '@/app/pages/albums/album'
import type { SingleAlbum } from '@/types/responses/album'
import { AlbumGridCard } from '@/app/components/albums/album-grid-card'
import { closeSonaAlbumToCover, openSonaAlbumFromCover } from './album-morph'
import '@/sona-mobile.css'

function withAlbum(run: (album: SingleAlbum) => void) {
  cy.fixture('albums/album').then((album: SingleAlbum) => {
    cy.fixture('songs/random').then((songs: ISong[]) => run({ ...album, song: songs.map((song,index)=>({...song,explicitStatus:index===0?'explicit':'clean'})) }))
  })
}

function Back({ id }: { id: string }) {
  const navigate = useNavigate()
  return <button onClick={() => closeSonaAlbumToCover(navigate, id)}>Back to albums</button>
}

function App({ album }: { album: SingleAlbum }) {
  return <div className="sona-app-shell">
    <header className="sona-header sona-header-album-view" />
    <div id="main-scroll-area"><div id="scroll-viewport"><div>
      <Routes>
        <Route path="/" element={<div style={{ width: 160, paddingTop: 100 }}><AlbumGridCard album={album} /></div>} />
        <Route path="/library/albums/:albumId" element={<><Back id={album.id} /><Album /></>} />
      </Routes>
    </div></div></div>
  </div>
}

function DelayedCover() {
  const [ready,setReady]=useState(false)
  useEffect(()=>{const timer=setTimeout(()=>setReady(true),180);return()=>clearTimeout(timer)},[])
  return ready?<div className="sona-album-page"><div className="sona-mobile-album-cover" style={{position:'fixed',top:120,left:60,width:260,height:260,borderRadius:13}}/></div>:null
}
function DelayedRoute() {
  const [opened,setOpened]=useState(false)
  return opened?<DelayedCover/>:<button onClick={event=>openSonaAlbumFromCover(event,()=>setOpened(true),'delayed-cover')}>
    <img src="/rest/getCoverArt?id=delayed-cover" alt="Delayed album" style={{width:100,height:100,borderRadius:3}}/>
  </button>
}

describe('Mobile album loading and navigation', () => {
  beforeEach(() => {
    cy.viewport(390, 844)
    cy.mockCoverArt()
    cy.intercept('**/rest/getArtist*', { body: { 'subsonic-response': { status: 'ok', artist: { album: [] } } } })
    cy.intercept('**/rest/getAlbumList*', { body: { 'subsonic-response': { status: 'ok', albumList2: { album: [] } } } })
  })

  it('matches cover and action geometry while loading and mounts only the mobile album', () => {
    withAlbum((album) => {
      cy.intercept('**/rest/getAlbum?*', {
        delay: 700, body: { 'subsonic-response': { status: 'ok', album } },
      }).as('album')
      cy.mount(<App album={album} />, { routerProps: { initialEntries: ['/library/albums/' + album.id] } })
      let actionsTop = 0
      cy.get('.sona-album-loading .sona-mobile-album-actions').then(($actions) => { actionsTop = $actions[0].getBoundingClientRect().top })
      cy.get('.sona-album-loading .sona-mobile-album-cover').then(($cover) => {
        const bounds = $cover[0].getBoundingClientRect()
        cy.wait('@album')
        cy.get('.sona-album-loading').should('not.exist')
        cy.get('.sona-mobile-album-cover').should(($loaded) => {
          const final = $loaded[0].getBoundingClientRect()
          expect(final.top).to.be.closeTo(bounds.top, 1)
          expect(final.left).to.be.closeTo(bounds.left, 1)
          expect(final.width).to.be.closeTo(bounds.width, 1)
          expect(final.height).to.be.closeTo(bounds.height, 1)
        })
      })
      cy.get('.sona-mobile-album-actions').should(($actions) => {
        expect($actions[0].getBoundingClientRect().top).to.be.closeTo(actionsTop, 1)
      })
      cy.get('.sona-album-song-row').should('have.length', album.song.length)
      cy.get('.sona-album-song-duration').should('not.exist')
      cy.get('.sona-album-song-title').first().find('[aria-label="Explicit"]').should('exist')
      cy.get('#image-header-container').should('not.exist')
      cy.get('[role="table"]').should('not.exist')
    })
  })

  it('opens immediately behind a transform-only cover and removes every transition layer on back', () => {
    withAlbum((album) => {
      cy.intercept('**/rest/getAlbum?*', { body: { 'subsonic-response': { status: 'ok', album } } })
      cy.mount(<App album={album} />)
      cy.get('[data-testid="card-image-link"]').click()
      cy.get('.sona-mobile-album-hero').should('exist')
      cy.get('.sona-album-morph-artwork').should('not.exist')
      cy.get('button').contains('Back to albums').click()
      cy.get('[data-testid="card-image-link"]').should('exist')
      cy.get('.sona-album-morph-artwork').should('not.exist')
      cy.get('html').should('not.have.attr', 'data-sona-album-morph')
    })
  })
  it('keeps the desktop album artwork and song table available', () => {
    cy.viewport(1280, 900)
    cy.intercept('**/rest/getAlbumInfo2*', { body: { 'subsonic-response': { status: 'ok', albumInfo: {} } } })
    withAlbum((album) => {
      cy.intercept('**/rest/getAlbum?*', { body: { 'subsonic-response': { status: 'ok', album } } })
      cy.mount(<App album={album} />, { routerProps: { initialEntries: ['/library/albums/' + album.id] } })
      cy.get('#image-header-container').should('exist')
      cy.get('[role="table"]').should('exist')
      cy.get('.sona-mobile-album-hero').should('not.exist')
    })
  })

  it('waits for a delayed destination and interpolates corners and shadow during travel',()=>{
    cy.intercept('**/rest/getAlbum?*',{body:{'subsonic-response':{status:'ok',album:{id:'delayed-cover',name:'Delayed',song:[]}}}})
    cy.mount(<DelayedRoute/> )
    cy.get('[alt="Delayed album"]').should($image=>expect(($image[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0)).click()
    cy.get('.sona-album-morph-artwork').should('exist')
    cy.get('.sona-mobile-album-cover').should('exist')
    cy.get('.sona-album-morph-artwork').then($ghost=>{
      const animation=$ghost[0].getAnimations()[0]
      expect(animation.effect?.getTiming().duration).to.equal(480)
      const frames=(animation.effect as KeyframeEffect).getKeyframes()
      expect(frames[0].borderRadius).not.to.equal(frames[1].borderRadius)
      expect(frames[0].boxShadow).not.to.equal(frames[1].boxShadow)
      const target=$ghost[0].ownerDocument.querySelector('.sona-mobile-album-cover')!
      const scale=new DOMMatrixReadOnly(String(frames[1].transform)).a
      const end=String(frames[1].boxShadow).match(/[-\d.]+px/g)!.map(Number.parseFloat)
      const settled=getComputedStyle(target).boxShadow.match(/[-\d.]+px/g)!.map(Number.parseFloat)
      end.forEach((value,index)=>expect(value*scale).to.be.closeTo(settled[index],.1))
    })
    cy.get('.sona-album-morph-artwork').should('not.exist')
    cy.get('.sona-mobile-album-cover').should('have.css','visibility','visible')
  })

})
