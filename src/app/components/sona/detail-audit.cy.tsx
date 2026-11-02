import {mount} from 'cypress/react'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {MemoryRouter,Route,Routes,createMemoryRouter,RouterProvider} from 'react-router-dom'
import Album from '@/app/pages/albums/album'
import {subsonic} from '@/service/subsonic'
import {queryKeys} from '@/utils/queryKeys'
import {MainRoutes} from '@/app/layout/main'
import {SonaMobileArtistSections} from './mobile-artist-sections'
import {SonaMobileAlbumActions} from './mobile-album-actions'
import {usePlayerStore} from '@/store/player.store'
import {useSonaSearch} from './search-state'
import type {SingleAlbum} from '@/types/responses/album'
import type {ISong} from '@/types/responses/song'
import '@/sona-mobile.css'
import '@/sona-sections.css'
import './mobile-artist-sections.css'

describe('Mobile detail and retained Search requirements',()=>{
 beforeEach(()=>{cy.mockCoverArt();cy.viewport(390,844);useSonaSearch.getState().reset()})
 it('shows black first, skeleton after 1 second, and reveals the loaded album together',()=>{
  cy.fixture('albums/album').then((album:SingleAlbum)=>{
   let resolve!:(album:SingleAlbum)=>void
   cy.stub(subsonic.albums,'getOne').returns(new Promise<SingleAlbum>(done=>{resolve=done}))
   cy.stub(subsonic.artists,'getOne').resolves({album:[]})
   cy.stub(subsonic.albums,'getAlbumList').resolves({list:[]})
   cy.clock()
   mount(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={['/library/albums/'+album.id]}><Routes><Route path="/library/albums/:albumId" element={<Album/>}/></Routes></MemoryRouter></QueryClientProvider>)
   cy.get('.sona-detail-black').should('be.visible')
   cy.tick(999);cy.get('.sona-mobile-album-cover').should('not.exist')
   cy.tick(1);cy.get('.sona-detail-black').should('not.exist');cy.get('.sona-mobile-album-cover').should('exist')
   cy.clock().invoke('restore');cy.then(()=>resolve({...album,song:[]}));cy.contains('h1',album.name).should('exist')
   cy.get('.sona-album-page').should($page=>expect(getComputedStyle($page[0]).animationName).to.equal('sona-detail-content-in'))
  })
 })
 it('opens a cached album immediately and recognizes playing songs started outside its album queue',()=>{
  cy.fixture('albums/album').then((album:SingleAlbum)=>cy.fixture('songs/random').then((songs:ISong[])=>{
   const loaded={...album,song:[songs[0]]}
   const client=new QueryClient();client.setQueryData([queryKeys.album.single,album.id],loaded)
   usePlayerStore.getState().actions.playSong(songs[0])
   mount(<QueryClientProvider client={client}><MemoryRouter><SonaMobileAlbumActions album={loaded}/></MemoryRouter></QueryClientProvider>)
   cy.get('button[aria-label="Pause '+album.name+'"]').should('exist')
   cy.get('.sona-detail-black').should('not.exist')
  }))
 })
 it('keeps Search DOM, term, filter and viewport position across a tab roundtrip',()=>{
  useSonaSearch.setState({term:'Kendrick',filter:'songs',engaged:true})
  const router=createMemoryRouter([{path:'/',element:<div className="sona-app-shell"><MainRoutes/></div>,children:[{index:true,element:<div style={{height:2500}}>Home</div>},{path:'mobile-search',element:<div data-test-search style={{height:2500}}>Results</div>}]}],{initialEntries:['/mobile-search']})
  mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router}/></QueryClientProvider>)
  cy.get('[data-test-search]').then($search=>{
   const search=$search[0]
   cy.get('#scroll-viewport').scrollTo(0,350).should($viewport=>expect($viewport[0].scrollTop).to.be.closeTo(350,1))
   cy.then(()=>router.navigate('/'))
   cy.get('[data-sona-cached-search]').should('have.attr','aria-hidden','true')
   cy.then(()=>router.navigate('/mobile-search'))
   cy.get('[data-test-search]').should($node=>expect($node[0]).to.equal(search))
   cy.get('#scroll-viewport').should($viewport=>expect($viewport[0].scrollTop).to.be.closeTo(350,1))
   cy.then(()=>{expect(useSonaSearch.getState().term).to.equal('Kendrick');expect(useSonaSearch.getState().filter).to.equal('songs')})
  })
 })
 it('lays popular songs down four rows before the next column and hides an empty Singles section',()=>{
  cy.viewport(390,1400)
  cy.fixture('albums/album').then((album:SingleAlbum)=>cy.fixture('songs/random').then((songs:ISong[])=>{
   const tracks=Array.from({length:16},(_,i)=>({...songs[i%songs.length],id:'popular-'+i,title:'Popular '+(i+1)}))
   mount(<MemoryRouter><SonaMobileArtistSections artistId="artist" artistName="Artist" songs={tracks} albums={[{...album,songCount:12,releaseTypes:['Album']}]}/></MemoryRouter>)
   cy.get('.sona-artist-popular-song').should('have.length',16).then($rows=>{
    const boxes=[...$rows].map(row=>row.getBoundingClientRect())
    expect(boxes[0].left).to.be.closeTo(20,1)
    expect(boxes[3].left).to.equal(boxes[0].left);expect(boxes[3].top).to.be.greaterThan(boxes[0].top)
    expect(boxes[4].top).to.equal(boxes[0].top);expect(boxes[4].left).to.be.greaterThan(boxes[0].left)
   })
   cy.contains('h2','Essential Albums').should('be.visible');cy.contains('h2','Singles').should('not.exist')
   cy.get('.sona-mobile-artist-sections').screenshot('artist-four-row-popular-and-albums')
  }))
 })
})
