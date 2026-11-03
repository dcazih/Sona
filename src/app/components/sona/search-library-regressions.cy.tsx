import {mount} from 'cypress/react'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {createMemoryRouter,RouterProvider} from 'react-router-dom'
import {MainRoutes} from '@/app/layout/main'
import {invalidateLibrary} from './library-live'
import '@/sona-mobile.css'
import '@/sona-search-categories.css'
it('restores the header after leaving retained Search and paints Search black',()=>{
 cy.viewport(390,844)
 const router=createMemoryRouter([{path:'/',element:<div className="sona-app-shell"><header className="sona-header">Toolbar</header><MainRoutes/></div>,children:[{index:true,element:<h1>Home</h1>},{path:'mobile-search',element:<div className="sona-am-search-page">Search</div>},{path:'mobile-library',element:<h1>Library</h1>}]}])
 mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router}/></QueryClientProvider>)
 cy.get('.sona-header').should('be.visible')
 cy.then(()=>router.navigate('/mobile-search'))
 cy.get('html').should('have.attr','data-sona-search-route','true').should('have.css','background-color','rgb(0, 0, 0)')
 cy.get('.sona-header').should('not.be.visible')
 cy.then(()=>router.navigate('/mobile-library'))
 cy.get('[data-sona-cached-search]').should('have.attr','aria-hidden','true')
 cy.get('.sona-header').should('be.visible')
})
it('invalidates the main Library and every library section when music arrives',()=>{
 const client=new QueryClient()
 const keys=['sona-mobile-library-newest','get-all-albums','get-album','get-all-artists','get-all-songs','get-all-genres','get-all-playlists','get-artist-albums','get-favorite-songs']
 keys.forEach(key=>client.setQueryData([key],{loaded:true}))
 cy.wrap(invalidateLibrary(client)).then(()=>keys.forEach(key=>expect(client.getQueryState([key])?.isInvalidated,key).to.equal(true)))
})
