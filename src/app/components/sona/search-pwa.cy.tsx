import {SonaReloadPlayback} from './reload-playback'
import {usePlayerStore} from '@/store/player.store'
import type {ISong} from '@/types/responses/song'
import {createMemoryRouter,RouterProvider} from 'react-router-dom'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {mount} from 'cypress/react'
import SonaMobileSearch from './mobile-search'
import {SonaMobileNavigation} from './mobile-navigation'
import {useSonaSearch} from './search-state'
import {useSonaDock} from './dock-state'
import {DISCOVER_PHOTOS,SONA_DISCOVER_CATEGORIES} from './search-discovery'
import {installSonaPwaUpdates} from '@/utils/sona-pwa-updates'
import '@/sona-mobile.css'
import '@/sona-search-categories.css'

describe('Installed Sona Search',()=>{
 beforeEach(()=>{
  cy.viewport(390,844)
  for(const path of Object.values(DISCOVER_PHOTOS))cy.intercept('GET',path,{fixture:'../../public'+path+',null',headers:{'content-type':'image/webp'}})
  useSonaDock.setState({selected:0,compact:false,returnRoute:'/'})
  useSonaSearch.getState().reset()
  cy.intercept('**/rest/getGenres*',{delay:500,body:{'subsonic-response':{status:'ok',genres:{genre:[]}}}})
  cy.intercept('**/rest/getAlbumList2*',{body:{'subsonic-response':{status:'ok',albumList2:{album:[]}}}})
 })
 it('opens the complete category grid on installed iPhone even with stale search state',()=>{
  cy.window().then(win=>Object.defineProperty(win.navigator,'standalone',{value:true,configurable:true}))
  useSonaSearch.setState({engaged:true,focused:false,term:'old query'})
  const router=createMemoryRouter([{path:'/',element:<div className="sona-app-shell"><div id="main-scroll-area"><div id="scroll-viewport" style={{height:844,overflow:'auto'}}>Home</div></div><SonaMobileNavigation/></div>},{path:'/mobile-search',element:<div className="sona-app-shell"><div id="main-scroll-area"><div id="scroll-viewport" style={{height:844,overflow:'auto'}}><SonaMobileSearch/></div></div><SonaMobileNavigation/></div>}])
  mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router}/></QueryClientProvider>)
  cy.get('[aria-label="Search"]').click()
  cy.get('.sona-am-genre-card').first().should('be.visible')
  cy.get('.sona-am-genre-card').should('have.length',SONA_DISCOVER_CATEGORIES.length)
  cy.get('.sona-am-category-label').first().should($label=>{
   const label=$label[0],box=label.getBoundingClientRect(),card=label.closest('button')!.getBoundingClientRect()
   expect(box.left-card.left).to.be.closeTo(12,1)
   expect(card.bottom-box.bottom).to.be.closeTo(12,1)
   expect(getComputedStyle(label).textAlign).to.equal('left')
   expect(getComputedStyle(label).transform).to.equal('none')
  })
  cy.get('.sona-am-category-photo').first().should($image=>expect(($image[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0))
  cy.get('.sona-am-category-photo').each($image=>expect($image.attr('src')).to.match(/^\/discovery\/artists-v1\/.+\.webp$/))
  cy.get('.sona-am-search-page').screenshot('sona-artist-categories',{capture:'viewport'})
 })
 it('has a valid locally shipped WebP photograph for every category',()=>{
  for(const path of Object.values(DISCOVER_PHOTOS))cy.readFile('public'+path,null).then(body=>{
   expect(body.length).to.be.greaterThan(1000)
   expect(body.subarray(0,4).toString()).to.equal('RIFF')
   expect(body.subarray(8,12).toString()).to.equal('WEBP')
  })
 })
 it('checks updates on PWA resume and defers the refresh until music/input is idle',()=>{
  let idle=false
  const worker=new EventTarget() as ServiceWorkerContainer
  Object.defineProperty(worker,'controller',{value:{}})
  const reload=cy.stub(), update=cy.stub().resolves()
  const watcher=installSonaPwaUpdates({update},{serviceWorker:worker,canReload:()=>idle,reload})
  worker.dispatchEvent(new Event('controllerchange'))
  expect(reload).not.to.have.been.called
  idle=true;watcher.flush()
  expect(reload).to.have.been.calledOnce
  watcher.flush();expect(reload).to.have.been.calledOnce
  watcher.check();expect(update).to.have.been.calledOnce
  watcher.dispose()
 })
 it('does not reload a new installation on its initial worker claim',()=>{
  const worker=new EventTarget() as ServiceWorkerContainer
  Object.defineProperty(worker,'controller',{value:null})
  const reload=cy.stub()
  const watcher=installSonaPwaUpdates({update:cy.stub().resolves()},{serviceWorker:worker,canReload:()=>true,reload})
  worker.dispatchEvent(new Event('controllerchange'))
  expect(reload).not.to.have.been.called
  watcher.dispose()
 })
 it('keeps a paused song and its position across the safe PWA refresh',()=>{
  cy.window().then(win=>{
   cy.stub(win.performance,'getEntriesByType').callsFake((type:string)=>type==='navigation'?[{type:'reload'}]:[])
   const song={id:'pwa-paused',title:'Paused song',artist:'Artist',duration:180} as ISong
   usePlayerStore.getState().actions.setSongList([song],0)
   const audio=win.document.createElement('audio')
   Object.defineProperty(audio,'readyState',{value:1})
   usePlayerStore.setState(state=>({playerState:{...state.playerState,isPlaying:false,audioPlayerRef:audio}}))
   win.sessionStorage.setItem('sona:reload-playback-v2',JSON.stringify({id:song.id,progress:42,playing:false,savedAt:Date.now(),song}))
   mount(<SonaReloadPlayback/>)
   cy.then(()=>{
    expect(usePlayerStore.getState().playerProgress.progress).to.equal(42)
    expect(usePlayerStore.getState().playerState.isPlaying).to.equal(false)
    expect(audio.currentTime).to.equal(42)
    win.sessionStorage.removeItem('sona:reload-playback-v2')
   })
  })
 })

})
