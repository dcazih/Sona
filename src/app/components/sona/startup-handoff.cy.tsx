let html="",critical="",cover="",boot="",geometry=""
import {SonaNoteGlyph} from '@/app/components/header/sona-note-glyph'
describe('Native launch to web cover continuity',()=>{
 before(()=>cy.readFile('index.html').then(content=>{
  html=content
  critical=html.match(/<style id="sona-startup-critical">([\s\S]*?)<\/style>/)![1]
  cover=html.match(/<div id="sona-startup"[\s\S]*?<\/div>/)![0]
  geometry=html.match(/<script id="sona-startup-geometry">([\s\S]*?)<\/script>/)![1]
  boot=html.match(/<script>\s*(\(function\(\)\{[\s\S]*?)<\/script>/)![1]
 }))
 it('keeps native canvas and note coordinates fixed while the initial viewport resizes',()=>{
  cy.viewport(430,932)
  const setup="Object.defineProperty(navigator,'standalone',{value:true});Object.defineProperty(screen,'width',{value:390});Object.defineProperty(screen,'height',{value:844});"
  cy.mount(<iframe title="Startup handoff" style={{width:390,height:800}} srcDoc={`<html class="sona-booting"><head><script>${setup}${geometry}</script><style>${critical}</style><style>html,body{background:#171719!important;min-height:100vh!important}</style></head><body>${cover}<script>${boot}</script></body></html>`}/>)
  const check=()=>cy.get('iframe').should($frame=>{
   const doc=($frame[0] as HTMLIFrameElement).contentDocument!,cover=doc.getElementById('sona-startup')!.getBoundingClientRect(),note=doc.querySelector('svg')!.getBoundingClientRect()
   expect(cover.height).to.equal(844);expect(cover.width).to.equal(390)
   expect(note.top+note.height/2).to.equal(422)
   expect(getComputedStyle(doc.body).backgroundImage).to.contain('linear-gradient')
  })
  check()
  cy.get('iframe').invoke('css','height','844px')
  check()
  cy.get('iframe').invoke('css','height','750px')
  check()
 })
 it('uses the identical vector for the splash, default covers and lyrics icon',()=>{
  cy.mount(<SonaNoteGlyph/>)
  cy.get('svg path').should('have.attr','d',cover.match(/d="(M201[^\"]+)"/)![1])
  cy.get('svg').should('have.attr','viewBox','0 0 512 512')
 })
})
