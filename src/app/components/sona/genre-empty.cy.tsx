import {mount} from 'cypress/react'
import {createMemoryRouter,RouterProvider} from 'react-router-dom'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import Genre from '@/app/pages/genres/genre'
import '@/sona-mobile.css'
import '@/sona-search-categories.css'

describe('Empty discovery genre',()=>{
 it('opens the actual genre page and shows the requested empty message',()=>{
  cy.viewport(390,844)
  cy.intercept('**/rest/getAlbumList2*',{body:{'subsonic-response':{status:'ok',albumList2:{album:[]}}}})
  const router=createMemoryRouter([{path:'/library/genres/:genreName',element:<div className="sona-app-shell"><Genre/></div>}],{initialEntries:['/library/genres/Jazz']})
  mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router}/></QueryClientProvider>)
  cy.contains('h1','Jazz').should('be.visible')
  cy.contains('Nothing to Show.').should('be.visible')
  cy.get('[data-sona-album-id]').should('not.exist')
 })
})
