import {getDockBounds} from './dock-bounds'
import { Player } from '@/app/components/player/player'
import { SonaMobileNavigation } from './mobile-navigation'
import SonaMobileSearch from './mobile-search'
import SonaMobileLibrary from './mobile-library'
import { usePlayerStore } from '@/store/player.store'
import { useSonaDock } from './dock-state'
import { useSonaSearch } from './search-state'
import type { ISong } from '@/types/responses/song'
import '@/sona-mobile.css'

function mountDock() {
 cy.fixture('songs/random').then((songs:ISong[])=>{
  usePlayerStore.getState().actions.setSongList([{...songs[0],title:'A very long song title that extends beneath the controls',artist:'A long artist name that must fade cleanly'}],0)
  usePlayerStore.getState().actions.setPlayingState(false)
  usePlayerStore.getState().fullscreen.setIsFullscreen(false)
  cy.mount(<div className="sona-app-shell"><div id="main-scroll-area"><div id="scroll-viewport" style={{height:700,overflow:'auto'}}><div style={{height:2400}}>Home</div></div></div><Player/><SonaMobileNavigation/></div>)
 })
}
describe('Dock material and stable contents',()=>{
 beforeEach(()=>{
  cy.viewport(390,844);cy.mockCoverArt();cy.mockSongStream()
  useSonaDock.setState({selected:0,compact:false,returnRoute:'/'})
  useSonaSearch.getState().reset()
 })
 it('uses neutral navigation glass and keeps the text blur clear of full-width progress',()=>{
  mountDock()
  cy.get('.sona-player').should($mini=>{
   const mini=$mini[0],nav=mini.ownerDocument.querySelector('.sona-bottom-nav')!
   expect(getComputedStyle(nav.querySelector('.sona-dock-rim')!).display).to.equal('none')
   expect(getComputedStyle(mini).borderTopWidth).to.equal('0px')
   expect(getComputedStyle(mini.querySelector('.sona-dock-surface')!).backgroundColor).to.equal('rgba(29, 29, 33, 0.82)')
   expect(getComputedStyle(nav.querySelector('.sona-dock-surface')!).backgroundColor).to.equal('rgba(29, 29, 33, 0.82)')
   expect(getComputedStyle(mini.querySelector('.sona-dock-surface')!).backdropFilter).to.equal(getComputedStyle(nav.querySelector('.sona-dock-surface')!).backdropFilter)
   expect(getComputedStyle(mini,'::before').display).to.equal('none')
   const progress=mini.querySelector('.sona-web-player-progress')!.getBoundingClientRect()
   const buttons=mini.querySelector('[data-testid="player-button-play"],[data-testid="player-button-pause"]')!.getBoundingClientRect()
   expect(progress.width).to.be.greaterThan(getDockBounds(mini).width-30)
   expect(buttons.bottom).to.be.lessThan(progress.top)
   expect(getComputedStyle(mini.querySelector('.sona-player-controls')!,'::before').display).to.equal('none')
  })
  cy.get('.sona-player').screenshot('sona-neutral-mini-progress')
 })
 it('keeps mini artwork and icon sizes fixed during every sampled width change',()=>{
  mountDock()
  cy.then(()=>useSonaDock.setState({compact:true}))
  cy.get('html').should('have.attr','data-sona-dock','compact')
  cy.get('.sona-player').should($mini=>expect(getDockBounds($mini[0]).width).to.be.closeTo(254,1))
  cy.get('.sona-player').should($mini=>expect($mini[0].getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().duration===440).some(a=>a.playState==='running')).to.equal(false))
  cy.get('[aria-label="Expand Sona navigation"]').click()
  cy.get('.sona-player').then($mini=>{
   const mini=$mini[0],animations=mini.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().duration===440)
   animations.forEach(a=>a.pause())
   const sizes:number[]=[]
   for(const time of Array.from({length:89},(_,i)=>i*5)){
    animations.forEach(a=>a.currentTime=time)
    const art=mini.querySelector('.sona-player-cover')!.getBoundingClientRect()
    expect(art.width).to.be.closeTo(27,.001);expect(art.height).to.be.closeTo(27,.001)
    expect(art.left-getDockBounds(mini).left).to.be.closeTo(18,1)
    sizes.push(getDockBounds(mini).width)
   }
   expect(Math.max(...sizes)).to.be.greaterThan(370).and.lessThan(373)
   animations.forEach(a=>a.finish())
  })
 })
 it('snaps the two search scopes while dragging and commits the selected source',()=>{
  cy.intercept('**/rest/getGenres*',{body:{'subsonic-response':{status:'ok',genres:{genre:[]}}}})
  cy.intercept('**/rest/getAlbumList2*',{body:{'subsonic-response':{status:'ok',albumList2:{album:[]}}}})
  useSonaSearch.setState({engaged:true})
  cy.mount(<SonaMobileSearch/>,{routerProps:{initialEntries:['/mobile-search']}})
  cy.get('.sona-search-scope').then($scope=>{
   const scope=$scope[0],r=scope.getBoundingClientRect()
   cy.stub(scope,'setPointerCapture')
   cy.wrap(scope).trigger('pointerdown',{eventConstructor:'PointerEvent',pointerId:1,isPrimary:true,pointerType:'touch',clientX:r.left+r.width*.25,clientY:r.top+20})
     .trigger('pointermove',{eventConstructor:'PointerEvent',pointerId:1,isPrimary:true,pointerType:'touch',clientX:r.left+r.width*.65,clientY:r.top+20})
   cy.get('.sona-search-scope').should($el=>expect($el[0].style.getPropertyValue('--sona-scope-progress')).to.equal('1'))
   cy.wrap(scope).trigger('pointerup',{eventConstructor:'PointerEvent',pointerId:1,isPrimary:true,pointerType:'touch',clientX:r.left+r.width*.65,clientY:r.top+20})
  })
  cy.get('.sona-search-scope button').contains('Library').should('have.attr','aria-pressed','true')
 })
 it('paints the Library viewport and bottom with the Library background',()=>{
  cy.intercept('**/rest/getAlbumList2*',{body:{'subsonic-response':{status:'ok',albumList2:{album:[]}}}})
  cy.mount(<div className="sona-app-shell"><div id="main-scroll-area"><div id="scroll-viewport" style={{height:700,overflow:'auto'}}><div><SonaMobileLibrary/></div></div></div></div>)
  cy.get('#scroll-viewport').scrollTo('bottom')
  cy.get('.sona-apple-library').should($library=>{
   const doc=$library[0].ownerDocument,win=doc.defaultView!
   expect(doc.documentElement.matches('html:has(.sona-apple-library)')).to.equal(true)
   const layers=[doc.documentElement,doc.body,...doc.querySelectorAll('.sona-app-shell,#main-scroll-area,#scroll-viewport,#scroll-viewport>div,.sona-apple-library')]
   for(const el of layers)expect(win.getComputedStyle(el).backgroundColor,el.tagName+'#'+el.id+'.'+el.className).to.equal('rgb(23, 23, 25)')
  })
 })
 it('centers both compact circle icons and leaves extra space to the right of play',()=>{
  mountDock()
  cy.then(()=>useSonaDock.setState({compact:true}))
  cy.get('.sona-player').should($mini=>expect(getDockBounds($mini[0]).width).to.be.closeTo(254,.01))
  cy.get('.sona-search-orb svg').should($svg=>{
   const icon=$svg[0].getBoundingClientRect(),circle=getDockBounds($svg[0].closest('.sona-search-morph') as HTMLElement)
   expect(icon.left+icon.width/2).to.be.closeTo(circle.left+circle.width/2,.1)
   expect(icon.top+icon.height/2).to.be.closeTo(circle.top+circle.height/2,.1)
  })
  cy.get('.sona-nav-return svg').should($svg=>{
   const icon=$svg[0].getBoundingClientRect(),circle=getDockBounds($svg[0].closest('.sona-bottom-nav') as HTMLElement)
   expect(icon.left+icon.width/2).to.be.closeTo(circle.left+circle.width/2,.1)
   expect(icon.top+icon.height/2).to.be.closeTo(circle.top+circle.height/2,.1)
  })
  cy.get('.sona-player [data-testid="player-button-play"] svg').should($svg=>{
   const icon=$svg[0].getBoundingClientRect(),mini=getDockBounds($svg[0].closest('.sona-player') as HTMLElement)
   expect(mini.right-icon.right).to.be.greaterThan(8)
   expect(icon.top+icon.height/2).to.be.closeTo(mini.top+mini.height/2,1)
   const button=$svg[0].closest('button')!
   const gradient=getComputedStyle(button,'::before')
   expect(parseFloat(gradient.width)).to.be.closeTo(button.getBoundingClientRect().width/3,1)
  })
 })

})
