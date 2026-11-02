import { mount } from 'cypress/react'

describe('Music Profiles live request list', () => {
  it('inserts a newly requested song from the event stream and preserves unchanged rows', () => {
    let rows: object[] = []
    cy.viewport(390,844)
    cy.intercept('GET','**/assets/*',{statusCode:204})
    cy.intercept('GET','**/health',{status:'ok'})
    cy.intercept('GET','**/openapi.json',{info:{version:'test'}})
    cy.intercept('POST','**/v1/auth/sona-token',{profile_token:'test'})
    cy.intercept('GET','**/v1/me',{username:'test',playlist:'My Music',song_count:0})
    cy.intercept('GET','**/v1/me/droppedneedle',{connected:true})
    cy.intercept('GET','**/v1/proposals',request=>request.reply({proposals:rows})).as('list')
    cy.intercept('GET','**/v1/album-requests',{requests:[]})
    cy.intercept('GET','**/v1/requests/live-status',{requests:[]})
    cy.intercept('GET','**/v1/requests/live-events', request=>{
      rows=[{id:'new-request',artist:'Example Artist',title:'Arriving Live',state:'requested',display_status:'Queued',created:1}]
      request.reply({headers:{'content-type':'text/event-stream'},body:'data: {"kind":"refresh"}\n\n'})
    })
    // Fixture is the deployed Music Profiles page, captured from profiles/index.html.
    cy.fixture('music-profiles.html').then(html=>{
      cy.intercept('GET','**/profiles-fixture*',{headers:{'content-type':'text/html'},body:html})
      mount(<iframe title="Requests fixture" src="/profiles-fixture?embed=sona" style={{width:390,height:844}}/>)
    })
    cy.get('iframe').then($frame=>new Cypress.Promise<void>(resolve=>{
      const frame=$frame[0] as HTMLIFrameElement
      const send=()=>{frame.contentWindow!.dispatchEvent(new MessageEvent('message',{origin:'https://sona.hippocampus-polaris.ts.net',source:frame.contentWindow!.parent,data:{type:'sona-profile-auth',username:'test',token:'test',salt:'salt',authType:1}}));resolve()}
      if(frame.contentDocument?.querySelector('#items'))send();else frame.onload=send
    }))
    cy.get('iframe').its('0.contentDocument.body').should('contain','Arriving Live')
    cy.get('iframe').then($frame=>{
      const win=($frame[0] as HTMLIFrameElement).contentWindow!
      const row=win.document.querySelector('#items .item')
      win.dispatchEvent(new MessageEvent('message',{origin:'https://sona.hippocampus-polaris.ts.net',source:win.parent,data:{type:'sona-profile-refresh'}}))
      cy.wait('@list')
      cy.then(()=>expect(win.document.querySelector('#items .item')).to.equal(row))
    })
  })
})
