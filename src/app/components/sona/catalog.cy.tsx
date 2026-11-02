import { mount } from 'cypress/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SonaMobileSearch from './mobile-search'
import SonaCatalogAlbum from './catalog-album'
import { useSonaSearch } from './search-state'
import { useAppStore } from '@/store/app.store'
import { usePlayerStore } from '@/store/player.store'
import '@/sona-mobile.css'
import './catalog.css'

const albumId = '11111111-1111-4111-8111-111111111111'
const trackId = '22222222-2222-4222-8222-222222222222'
const remoteSong = { id: trackId, kind:'song', title:'Request This Song', artist:'Example Artist', album:'New Album', albumId }
const remoteAlbum = { id: albumId, kind:'album', title:'New Album', artist:'Example Artist', tracks:[{...remoteSong, requestable:true, track:1,localSong:null}] }
const localSong = { id:'local-song', title:'Available Song', artist:'Example Artist', album:'On Server', albumId:'local-album',duration:180,track:1,coverArt:'',isDir:false,type:'music',suffix:'flac' }
function setup() {
  cy.viewport(390,844)
  localStorage.setItem('sona-mobile-search-scope','sona')
  useSonaSearch.setState({term:'Example',engaged:true,focused:false,filter:'all'})
  useAppStore.setState(state=>({data:{...state.data,username:'catalog-test-'+Date.now(),password:'test-token'}}))
  cy.intercept('POST','/sona-api/auth/sona-token',{profile_token:'profile-test'})
  cy.intercept('GET','/sona-api/requests/live-status',{requests:[]})
  cy.intercept('GET','/sona-api/requests/live-events',{body:': connected\n\n',headers:{'content-type':'text/event-stream'}})
  cy.intercept('GET','/sona-api/sona/search*',{albums:[remoteAlbum],artists:[]}).as('catalog')
  cy.intercept('GET','/sona-api/sona/songs*',{songs:[remoteSong]}).as('tracks')
  cy.intercept('GET','**/rest/search3*',{body:{'subsonic-response':{status:'ok',searchResult3:{song:[localSong],album:[],artist:[]}}}})
  cy.intercept('GET','**/rest/getGenres*',{body:{'subsonic-response':{status:'ok',genres:{genre:[]}}}})
  cy.intercept('GET','**/rest/getAlbumList2*',{body:{'subsonic-response':{status:'ok',albumList2:{album:[]}}}})
  cy.intercept('GET','/sona-api/sona/albums/'+albumId,remoteAlbum).as('album')
  cy.intercept('POST','/sona-api/sona/request',{delay:350,body:{status:'requested',message:'Queued'}}).as('request')
  cy.intercept('GET','/cloud-request.svg',{fixture:'../../public/cloud-request.svg'})
}
function render(route='/mobile-search') {
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}})
  mount(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><div className="sona-app-shell"><Routes>
    <Route path="/mobile-search" element={<SonaMobileSearch/>}/><Route path="/catalog/albums/:albumId" element={<SonaCatalogAlbum/>}/>
  </Routes></div></MemoryRouter></QueryClientProvider>)
  return client
}
describe('Sona Music catalogue requests',()=>{
  beforeEach(setup)
  it('shows server songs and requestable songs together, but Library only contains server songs',()=>{
    render()
    cy.wait(['@catalog','@tracks'])
    cy.contains('Available Song').should('be.visible')
    cy.contains('Request This Song').closest('.sona-catalog-row').should('be.visible').should('have.class','is-unavailable')
    cy.get('.sona-am-search-page').screenshot('sona-catalog-results')
    cy.contains('button','Library').click()
    cy.contains('Available Song').should('be.visible')
    cy.contains('Request This Song').should('not.exist')
  })
  it('requests an unavailable result, gives native haptic interaction, and pulses without starting playback',()=>{
    render()
    cy.wait('@tracks')
    cy.contains('Request This Song').closest('.sona-catalog-row').find('input[switch]').click({force:true})
    cy.wait('@request').its('request.body').should('deep.equal',{kind:'song',id:trackId,album_id:albumId})
    cy.contains('Request This Song').closest('.sona-catalog-row').find('.sona-request-cloud').should('have.class','is-working')
    cy.then(()=>expect(usePlayerStore.getState().playerState.currentSong?.id).not.to.equal(trackId))
  })
  it('opens the catalogue album and requests a track or the entire album',()=>{
    render()
    cy.wait('@catalog')
    cy.contains('strong','New Album').click()
    cy.wait('@album')
    cy.get('.sona-album-song-title').should('contain','Request This Song')
    cy.get('.sona-album-song-title').click({force:true})
    cy.wait('@request').its('request.body.kind').should('equal','song')
    cy.get('button[aria-label="Request New Album"]').click({force:true})
    cy.wait('@request').its('request.body').should('deep.equal',{kind:'album',id:albumId,album_id:''})
  })
  it('replaces the cloud with the real favorite heart only after the album is on the server',()=>{
    const client=render('/catalog/albums/'+albumId)
    cy.wait('@album')
    cy.get('.sona-mobile-album-actions .sona-request-cloud').should('exist')
    const available={...localSong,title:'Request This Song',album:'New Album'}
    cy.intercept('GET','/sona-api/sona/albums/'+albumId,{...remoteAlbum,tracks:[{...remoteSong,localSong:available}],localAlbum:{id:'local-album',name:'New Album',artist:'Example Artist',song:[available],coverArt:'',duration:180}})
    cy.then(()=>client.invalidateQueries({queryKey:['sona-catalog-album']}))
    cy.get('.sona-mobile-album-actions .sona-request-cloud').should('not.exist')
    cy.get('button[aria-label="Favorite New Album"]').should('exist')
  })
  it('keeps request failures visible and does not pulse forever',()=>{
    cy.intercept('POST','/sona-api/sona/request',{statusCode:409,body:{detail:'Reconnect your request account'}}).as('rejected')
    render()
    cy.wait('@tracks')
    cy.contains('Request This Song').closest('.sona-catalog-row').find('input[switch]').click({force:true})
    cy.wait('@rejected')
    cy.contains('Request This Song').closest('.sona-catalog-row').find('.sona-request-cloud').should('not.have.class','is-working')
  })
})
