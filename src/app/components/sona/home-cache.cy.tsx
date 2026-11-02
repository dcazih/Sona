import {useEffect} from 'react'
import {createMemoryRouter,RouterProvider} from 'react-router-dom'
import {mount} from 'cypress/react'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {MainRoutes} from '@/app/layout/main'
import {SonaMobileNavigation} from './mobile-navigation'
import {useSonaSearch} from './search-state'
import {useSonaDock} from './dock-state'
import '@/sona-mobile.css'

it('keeps Home and its artwork mounted when returning from expanded search',()=>{
 cy.viewport(390,844)
 useSonaDock.setState({selected:0,compact:false,returnRoute:'/'})
 useSonaSearch.getState().reset()
 let mounts=0,unmounts=0
 function Home(){useEffect(()=>{mounts++;return()=>{unmounts++}},[]);return <div data-testid="cached-home">Home artwork grid<div data-testid="cached-rail" style={{width:180,overflow:'auto'}}><div style={{width:1200,height:100}}>Album rail</div></div></div>}
 const router=createMemoryRouter([{path:'/',element:<div className="sona-app-shell"><MainRoutes/><SonaMobileNavigation/></div>,children:[{index:true,element:<Home/>},{path:'mobile-search',element:<div>Search categories</div>}]}])
 mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router}/></QueryClientProvider>)
 cy.get('[data-testid="cached-home"]').then($home=>{
  const home=$home[0]
  home.querySelector('[data-testid="cached-rail"]')!.scrollLeft=180
  cy.get('[aria-label="Search"]').click()
  cy.get('[data-sona-cached-home]').should('have.attr','aria-hidden','true')
  cy.get('[aria-label="Return to Sona"]').click()
  cy.get('[data-testid="cached-home"]').should($restored=>{
   expect($restored[0]).to.equal(home)
   expect(mounts).to.equal(1);expect(unmounts).to.equal(0)
   expect(home.querySelector('[data-testid="cached-rail"]')!.scrollLeft).to.equal(180)
  })
 })
})
