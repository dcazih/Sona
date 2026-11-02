import { mount } from 'cypress/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CatalogArtist from './catalog-artist'
import Artist from '@/app/pages/artists/artist'
import { useAppStore } from '@/store/app.store'
import { subsonic } from '@/service/subsonic'
import '@/sona-mobile.css'
import './catalog.css'

it('resolves a server artist into the complete catalogue and uses square snapping rails', () => {
 cy.viewport(390,844)
 useAppStore.setState(state=>({data:{...state.data,username:'artist-check',password:'token'}}))
 cy.intercept('POST','/sona-api/auth/sona-token',{profile_token:'profile'})
 cy.intercept('GET','/sona-api/requests/live-status',{requests:[]})
 cy.intercept('GET','/sona-api/requests/live-events',{body:': connected\n\n',headers:{'content-type':'text/event-stream'}})
 cy.intercept('GET','/sona-api/sona/search*',{artists:[{id:'catalog-artist',kind:'artist',title:'Server Artist'}]})
 cy.intercept('GET','/sona-api/sona/artists/catalog-artist',{title:'Server Artist',albums:Array.from({length:6},(_,i)=>({id:'release-'+i,kind:'album',title:'Remote '+i,releaseType:i===5?'Single':'Album'})),songs:[]}).as('artist')
 cy.stub(subsonic.songs,'getTopSongs').resolves([])
 mount(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><CatalogArtist embedded artistName="Server Artist"/></MemoryRouter></QueryClientProvider>)
 cy.wait('@artist')
 cy.contains('strong','Remote 4').should('exist')
 cy.contains('h2','Singles').should('exist')
 cy.get('.sona-artist-album-rail').each($rail=>expect(getComputedStyle($rail[0]).scrollSnapType).to.equal('x mandatory'))
 cy.get('.sona-artist-album-card .sona-artwork-shell').each($art=>{
   const rect=$art[0].getBoundingClientRect();expect(rect.width).to.be.closeTo(rect.height,1)
 })
})

it('waits for server hero and catalogue together under one one-second loading gate',()=>{
 cy.viewport(390,844)
 cy.mockCoverArt()
 useAppStore.setState(state=>({data:{...state.data,username:'artist-gate-check',password:'token'}}))
 cy.intercept('POST','/sona-api/auth/sona-token',{profile_token:'gate-profile'})
 cy.intercept('GET','/sona-api/requests/live-status',{requests:[]})
 cy.intercept('GET','/sona-api/requests/live-events',{body:': connected\n\n',headers:{'content-type':'text/event-stream'}})
 cy.intercept('GET','/sona-api/sona/search*',{artists:[{id:'catalog-gated',title:'Gated Artist',kind:'artist'}]})
 cy.intercept('GET','/sona-api/sona/artists/catalog-gated',{delay:1800,body:{title:'Gated Artist',albums:[{id:'remote-release',kind:'album',title:'Complete Discography',releaseType:'Album'}],songs:[]}}).as('gated')
 cy.stub(subsonic.artists,'getOne').resolves({id:'server',name:'Gated Artist',coverArt:'artist-cover',artistImageUrl:'',albumCount:1,album:[]})
 cy.stub(subsonic.artists,'getInfo').resolves({})
 cy.stub(subsonic.songs,'getTopSongs').resolves([])
 mount(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={['/library/artists/server']}><Routes><Route path="/library/artists/:artistId" element={<Artist/>}/></Routes></MemoryRouter></QueryClientProvider>)
 cy.get('.sona-detail-black').should('exist')
 cy.get('.sona-artist-loading',{timeout:1600}).should('exist')
 cy.wait('@gated')
 cy.contains('h1','Gated Artist').should('exist')
 cy.contains('strong','Complete Discography').should('exist')
 cy.get('.sona-mobile-artist-art .sona-artwork-note-fallback').should('not.exist')
 cy.get('.sona-detail-black,.sona-artist-loading').should('not.exist')
})
