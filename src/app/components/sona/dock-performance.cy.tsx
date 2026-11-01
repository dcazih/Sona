import {mount} from 'cypress/react'
import {createMemoryRouter,RouterProvider} from 'react-router-dom'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {Player} from '@/app/components/player/player'
import {SonaMobileNavigation} from './mobile-navigation'
import {useSonaDock} from './dock-state'
import {useSonaSearch} from './search-state'
import {usePlayerStore} from '@/store/player.store'
import type {ISong} from '@/types/responses/song'
import '@/sona-mobile.css'

const protocol=(command:string,params:Record<string,unknown>={})=>Cypress.automation('remote:debugger:protocol',{command,params})
const metrics=()=>protocol('Performance.getMetrics').then((result:{metrics:{name:string;value:number}[]})=>Object.fromEntries(result.metrics.map(m=>[m.name,m.value])))
describe('Dock frame cost',()=>{
 afterEach(()=>{cy.then(()=>protocol('Emulation.setCPUThrottlingRate',{rate:1}))})
 it('measures actual dock morphs over textured content under CPU load',()=>{
  cy.viewport(390,844);cy.mockCoverArt();cy.mockSongStream()
  useSonaDock.setState({selected:0,compact:false,returnRoute:'/'})
  useSonaSearch.getState().reset()
  let before:Record<string,number>={},router:ReturnType<typeof createMemoryRouter>
  cy.fixture('songs/random').then((songs:ISong[])=>{
   usePlayerStore.getState().actions.setSongList(songs,0)
   usePlayerStore.getState().actions.setPlayingState(false)
   usePlayerStore.getState().fullscreen.setIsFullscreen(false)
   router=createMemoryRouter([{path:'*',element:<div className="sona-app-shell"><div id="main-scroll-area"><div id="scroll-viewport" style={{height:844,overflow:'auto'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{Array.from({length:20},(_,i)=><img key={i} src="/rest/getCoverArt?id=profile" alt="Album" style={{width:'100%',height:180,objectFit:'cover'}}/>)}</div></div></div><Player/><SonaMobileNavigation/></div>}])
   mount(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router}/></QueryClientProvider>)
  })
  cy.get('.sona-player-cover img').should('be.visible')
  // Start after initial image/font decoding and the mount paint, so startup work
  // is not attributed to the first interaction. The animation itself stays cold.
  cy.window().then(win=>new Cypress.Promise<void>(async resolve=>{
   await win.document.fonts.ready
   await Promise.all([...win.document.images].map(image=>image.decode().catch(()=>{})))
   win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>resolve()))
  }))
  cy.then(()=>protocol('Performance.enable'))
  cy.then(()=>protocol('Emulation.setCPUThrottlingRate',{rate:4}))
  cy.then(()=>metrics()).then(result=>{before=result})
  const gaps:number[]=[],animationSamples:number[]=[],longFrames:{gap:number;afterAction:number;action:number}[]=[]
  cy.window().then({timeout:15000},win=>new Cypress.Promise<void>(resolve=>{
   const actions=[()=>useSonaDock.setState({compact:true}),()=>useSonaDock.setState({compact:false}),()=>router.navigate('/mobile-search'),()=>router.navigate('/'),()=>useSonaDock.setState({compact:true}),()=>router.navigate('/mobile-search'),()=>router.navigate('/'),()=>useSonaDock.setState({compact:false})]
   let index=0,start=0,last=0
   const tick=(time:number)=>{
    if(last){gaps.push(time-last);if(time-last>25)longFrames.push({gap:time-last,afterAction:time-start,action:index})};last=time
    if(!start||time-start>=600){
     start=time
     if(index===actions.length){resolve();return}
     void actions[index++]()
     win.requestAnimationFrame(()=>win.requestAnimationFrame(()=>{animationSamples.push([...win.document.querySelectorAll('.sona-dock-host')].filter(el=>el.getAnimations().some(a=>(a.effect as KeyframeEffect).getKeyframes().some(f=>f.transform||f.translate||f.width))).length)}))
    }
    win.requestAnimationFrame(tick)
   }
   win.requestAnimationFrame(tick)
  }))
  cy.then(()=>metrics()).then(after=>{
   const sorted=[...gaps].sort((a,b)=>a-b)
   expect(animationSamples).to.have.length(8)
   expect(animationSamples).to.deep.equal([3,3,3,3,3,2,2,3])
   const report={longFrames,animationSamples,transitions:8,CPUThrottle:4,frames:gaps.length,averageFrameMs:gaps.reduce((a,b)=>a+b,0)/gaps.length,p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:Math.max(...gaps),framesOver25ms:gaps.filter(g=>g>25).length,layouts:after.LayoutCount-before.LayoutCount,layoutMs:(after.LayoutDuration-before.LayoutDuration)*1000,recalcStyles:after.RecalcStyleCount-before.RecalcStyleCount,styleMs:(after.RecalcStyleDuration-before.RecalcStyleDuration)*1000,scriptMs:(after.ScriptDuration-before.ScriptDuration)*1000}
   cy.writeFile('/tmp/sona-dock-performance.json',report)
  })
 })
})
