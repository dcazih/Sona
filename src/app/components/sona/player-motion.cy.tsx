import {useSonaDock} from './dock-state'
import {getDockBounds} from './dock-bounds'
import {SonaMobileNavigation} from './mobile-navigation'
import { Profiler } from 'react'
import { Player } from '@/app/components/player/player'
import { usePlayerStore } from '@/store/player.store'
import type { ISong } from '@/types/responses/song'
import { SonaMobileNowPlaying } from './mobile-now-playing'
import '@/sona-mobile.css'

function mountPlayer() {
  cy.fixture('songs/random').then((songs: ISong[]) => {
    usePlayerStore.getState().actions.setSongList(songs, 0)
    usePlayerStore.getState().actions.setPlayingState(false)
    usePlayerStore.getState().fullscreen.setIsFullscreen(false)
    cy.mount(<div className="sona-app-shell"><Player /><SonaMobileNowPlaying /><SonaMobileNavigation/></div>)
  })
}

describe('Mobile player sheet motion', () => {
  beforeEach(() => {
    useSonaDock.setState({selected:0,compact:false,returnRoute:'/'})
    cy.viewport(390, 844)
    cy.mockCoverArt()
    cy.mockSongStream()
  })

  it('grows on press and morphs to/from the actual mini-player bounds', () => {
    mountPlayer()
    cy.get('.sona-player-track').trigger('pointerdown', { eventConstructor:'PointerEvent',pointerId:1,isPrimary:true,button:0 })
    cy.get('.sona-player').should(($mini) => {
      expect(parseFloat(getComputedStyle($mini[0]).scale)).to.be.greaterThan(1.01)
    })
    cy.get('.sona-player-track').trigger('pointerup', { eventConstructor:'PointerEvent',pointerId:1,isPrimary:true,button:0 })
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'open')
      .should(($sheet) => {
        const bounds = $sheet[0].getBoundingClientRect()
        expect(bounds.top).to.equal(0)
        expect(bounds.width).to.be.closeTo(390, 1)
        expect(bounds.height).to.be.closeTo(844, 1)
        expect(getComputedStyle($sheet[0]).borderTopLeftRadius).to.equal('0px')
      })
    cy.get('[aria-label="Minimize Now Playing"]').click()
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'closed').then(($sheet) => {
      cy.get('.sona-player').should(($mini) => {
        expect($mini.attr('data-sona-rebound')).to.be.undefined
        const closed = $sheet[0].getBoundingClientRect()
        const mini = getDockBounds($mini[0])
        expect(closed.left).to.be.closeTo(mini.left, 1)
        expect(closed.top).to.be.closeTo(mini.top, 1)
        expect(closed.width).to.be.closeTo(mini.width, 1)
        expect(closed.height).to.be.closeTo(mini.height, 1)
        expect(getComputedStyle($sheet[0]).opacity).to.equal('0')
      })
    })
  })

  it('follows a long drag, rounds early, restores the notch, and avoids React renders per move', () => {
    let renders = 0
    cy.mount(<div className="sona-app-shell">
      <div className="sona-player" data-mobile-active="true" />
      <Profiler id="sheet" onRender={() => { renders++ }}><SonaMobileNowPlaying /></Profiler>
    </div>)
    cy.then(() => usePlayerStore.getState().fullscreen.setIsFullscreen(true))
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'open')
    cy.get('.sona-now-overlay').then(($sheet) => {
      // Deterministic held-pointer frames; the real touch release is covered below.
      cy.stub($sheet[0], 'setPointerCapture')
    }).trigger('pointerdown', { eventConstructor: 'PointerEvent', pointerId: 1, isPrimary: true, button: 0, clientX: 180, clientY: 60 })
    cy.get('.sona-now-overlay').trigger('pointermove', { eventConstructor: 'PointerEvent', pointerId: 1, clientX: 180, clientY: 84 })
    cy.get('.sona-now-overlay').should(($sheet) => {
      expect($sheet[0].getBoundingClientRect().top).to.be.closeTo(24, 2)
      expect(parseFloat(getComputedStyle($sheet[0]).borderTopLeftRadius)).to.be.greaterThan(18)
      expect($sheet[0].ownerDocument.documentElement.dataset.sonaNotchOwner).not.to.equal('player')
    })
    cy.then(() => {
      const before = renders
      cy.get('.sona-now-overlay').trigger('pointermove', { eventConstructor: 'PointerEvent', pointerId: 1, clientX: 180, clientY: 650 })
      cy.get('.sona-now-overlay').should(($sheet) => {
        expect($sheet[0].getBoundingClientRect().top).to.be.greaterThan(500)
        expect(renders).to.equal(before)
      })
    })
    cy.get('.sona-now-overlay').trigger('pointerup', { eventConstructor: 'PointerEvent', pointerId: 1, clientX: 180, clientY: 650, force: true })
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'closed')
  })

  it('dismisses with a real touch swipe and reopens with square full-screen corners', () => {
    mountPlayer()
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'open')
    cy.get('.sona-now-overlay').realSwipe('toBottom', { x: 180, y: 120, length: 500, step: 20 })
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'closed')
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'open')
      .should('have.css', 'border-top-left-radius', '0px')
  })
  it('flies the mini artwork independently and slides every control upward', () => {
    mountPlayer()
    cy.get('#track-song-image').should(($image) => {
      expect(($image[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0)
    }).then(($image) => {
      const source = ($image[0] as HTMLImageElement).currentSrc
      cy.get('.sona-player-track').click()
      cy.get('.sona-player-artwork-flight img').should('have.attr', 'src', source)
      cy.get('.sona-now-panel').should(($panel) => {
        const frames = $panel[0].getAnimations().flatMap(animation => (animation.effect as KeyframeEffect).getKeyframes())
        expect(frames.some(frame => String(frame.transform).includes('92px'))).to.equal(true)
      })
      cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'open')
      cy.get('[aria-label="Minimize Now Playing"]').click()
      cy.get('.sona-player-artwork-flight').should('exist')
      cy.get('.sona-player').should('have.attr', 'data-sona-rebound', 'true')
      cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'closed')
      cy.get('.sona-player-artwork-flight').should('not.exist')
    })
  })

  it('uses thicker song and volume tracks at rest and during scrubbing', () => {
    mountPlayer()
    cy.then(() => usePlayerStore.getState().actions.setCurrentDuration(180))
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'open')
    cy.get('.sona-now-overlay .sona-scrubber-track').should('have.css', 'height', '6px')
    cy.get('.sona-volume-track').should('have.css', 'height', '6px')
    cy.get('.sona-volume-slider').realMouseDown()
    cy.get('.sona-volume-track').should('have.css', 'height', '13px')
    cy.get('.sona-volume-slider').realMouseUp()
    cy.get('.sona-volume-track').should('have.css', 'height', '6px')
    cy.get('.sona-now-overlay .sona-mobile-scrubber').realMouseDown()
    cy.get('.sona-now-overlay .sona-scrubber-track').should('have.css', 'height', '13px')
    cy.get('.sona-now-overlay .sona-mobile-scrubber').realMouseUp()
    cy.get('.sona-now-overlay .sona-scrubber-track').should('have.css', 'height', '6px')
    cy.get('.sona-now-overlay').should('have.attr', 'data-phase', 'open')
  })

  it('settles edges independently, keeps mini artwork visible, and ends rebound before close', () => {
    mountPlayer()
    cy.get('#track-song-image').should('be.visible')
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').then(($sheet) => {
      const animation = $sheet[0].getAnimations()[0]
      const frames = (animation.effect as KeyframeEffect).getKeyframes()
      expect(frames).to.have.length(41)
      const halfway = frames.find(frame => frame.offset === .5)!
      const matrix = new DOMMatrixReadOnly(String(halfway.transform))
      // The growing bottom is nearly formed while the top still travels.
      expect(matrix.f + matrix.d * 844).to.be.greaterThan(830)
      expect(matrix.f).to.be.greaterThan(30)
    })
    cy.get('.sona-player-cover img').should('have.css', 'visibility', 'visible')
    cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
    cy.get('[aria-label="Minimize Now Playing"]').click()
    cy.get('.sona-now-overlay').then(($sheet) => {
      const frames = ($sheet[0].getAnimations()[0].effect as KeyframeEffect).getKeyframes()
      expect(Number(frames.find(frame => frame.offset === .25)?.opacity)).to.be.greaterThan(.8)
      expect(Number(frames.find(frame => frame.offset === .5)?.opacity)).to.be.greaterThan(.6)
    })
    cy.get('.sona-player-cover img').should('have.css','visibility','visible')
    cy.get('.sona-player').should('have.attr','data-sona-rebound','true')
    cy.get('.sona-now-overlay').should('have.attr','data-phase','closed')
    cy.get('.sona-player').should('not.have.attr','data-sona-rebound')
    cy.get('.sona-player').should(($mini) => {
      expect(getComputedStyle($mini[0]).translate).to.equal('0px -58px')
    })
  })

  it('grows the cover and eases its contents on play, then reverses on pause', () => {
    mountPlayer()
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
    cy.get('.sona-now-art').should('not.have.class','is-playing')
    cy.then(()=>usePlayerStore.getState().actions.setPlayingState(true))
    cy.get('.sona-now-art').should('have.class','is-playing').should(($cover)=>{
      expect(new DOMMatrixReadOnly(getComputedStyle($cover[0]).transform).a).to.be.closeTo(1.07,.002)
    })
    cy.get('.sona-now-art-content').should(($content)=>{
      expect(new DOMMatrixReadOnly(getComputedStyle($content[0]).transform).a).to.be.closeTo(1.035,.002)
    })
    cy.then(()=>usePlayerStore.getState().actions.setPlayingState(false))
    cy.get('.sona-now-art').should('not.have.class','is-playing').should(($cover)=>{
      expect(new DOMMatrixReadOnly(getComputedStyle($cover[0]).transform).a).to.be.closeTo(.86,.002)
    })
  })

  it('crops an unscaled gradient and fades the capsule immediately on close',()=>{
    mountPlayer()
    cy.get('.sona-player-track a').should('not.exist')
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
    cy.get('[aria-label="Minimize Now Playing"]').click()
    cy.get('.sona-now-overlay').then($sheet=>{
      const shape=$sheet[0].getAnimations()[0].effect as KeyframeEffect
      expect(shape.getTiming().duration).to.equal(740)
      const frame=shape.getKeyframes().find(frame=>frame.offset===.5)!
      const matrix=new DOMMatrixReadOnly(String(frame.transform))
      const background=$sheet[0].querySelector('.sona-now-background')!
      const inverse=(background.getAnimations()[0].effect as KeyframeEffect).getKeyframes().find(frame=>frame.offset===.5)!
      const scale=String(inverse.scale).split(' ').map(Number)
      expect(matrix.a*scale[0]).to.be.closeTo(1,.001)
      expect(matrix.d*scale[1]).to.be.closeTo(1,.001)
      expect(Number(frame.opacity)).to.equal(1)
      expect(Number(inverse.opacity)).to.be.lessThan(.1)
      expect(getComputedStyle($sheet[0].querySelector('.sona-now-glass')!).backdropFilter).to.equal('none')
      const capsule=$sheet[0].querySelector('.sona-now-top')!
      expect(capsule.getAnimations()[0].effect?.getTiming().duration).to.equal(80)
    })
  })

  it('centers the missing-artwork note inside the full cover',()=>{
    cy.fixture('songs/random').then((songs:ISong[])=>{
      usePlayerStore.getState().actions.setSongList([{...songs[0],coverArt:undefined} as ISong],0)
      usePlayerStore.getState().fullscreen.setIsFullscreen(true)
      cy.mount(<div className="sona-app-shell"><Player/><SonaMobileNowPlaying/></div>)
    })
    cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
    cy.get('.sona-now-art .sona-artwork-note-fallback svg').should($icon=>{
      const icon=$icon[0].getBoundingClientRect()
      const cover=$icon[0].closest('.sona-now-art')!.getBoundingClientRect()
      expect(icon.x+icon.width/2).to.be.closeTo(cover.x+cover.width/2,1)
      expect(icon.y+icon.height/2).to.be.closeTo(cover.y+cover.height/2,1)
    })
    cy.get('.sona-now-art img').should('not.exist')
  })

  it('moves title and controls up 25 pixels without moving the artwork',()=>{
    mountPlayer()
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
    cy.get('.sona-now-panel').should($panel=>{
      const panel=$panel[0]
      expect(getComputedStyle(panel).translate).to.equal('0px 14px')
      const progress=panel.querySelector('.sona-now-progress')!.getBoundingClientRect(),transport=panel.querySelector('.sona-now-transport')!.getBoundingClientRect(),volume=panel.querySelector('.sona-now-volume')!.getBoundingClientRect()
      expect(transport.top-progress.bottom).to.be.closeTo(19,1)
      expect(volume.top-transport.bottom).to.be.closeTo(31,1)
    })
  })

  it('allows an upward start to reverse smoothly into a downward held drag',()=>{
    mountPlayer()
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr','data-phase','open').then($sheet=>cy.stub($sheet[0],'setPointerCapture'))
    cy.get('.sona-now-overlay').trigger('pointerdown',{eventConstructor:'PointerEvent',pointerId:1,isPrimary:true,button:0,clientX:180,clientY:120})
      .trigger('pointermove',{eventConstructor:'PointerEvent',pointerId:1,clientX:182,clientY:95})
    cy.get('.sona-now-overlay').should($sheet=>expect($sheet[0].getBoundingClientRect().top).to.be.closeTo(0,1))
    cy.get('.sona-now-overlay').trigger('pointermove',{eventConstructor:'PointerEvent',pointerId:1,clientX:183,clientY:320})
      .should($sheet=>expect($sheet[0].getBoundingClientRect().top).to.be.closeTo(200,2))
      .trigger('pointermove',{eventConstructor:'PointerEvent',pointerId:1,clientX:181,clientY:145})
      .should($sheet=>expect($sheet[0].getBoundingClientRect().top).to.be.closeTo(25,2))
      .trigger('pointerup',{eventConstructor:'PointerEvent',pointerId:1,clientX:181,clientY:145})
    cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
  })

 it('keeps controls unscaled at every sampled opening frame and flies artwork both ways',()=>{
  mountPlayer()
  cy.get('.sona-player-track').click()
  cy.get('.sona-now-overlay').then($sheet=>{
   const sheet=$sheet[0],shape=sheet.getAnimations()[0]
   shape.pause()
   const content=sheet.querySelector('.sona-now-content')!,inverse=content.getAnimations()[0]
   inverse.pause()
   for(const fraction of [.15,.35,.65]){
    shape.currentTime=600*fraction;inverse.currentTime=600*fraction
    const matrix=new DOMMatrixReadOnly(getComputedStyle(sheet).transform)
    const scale=getComputedStyle(content).scale.split(' ').map(Number)
    expect(matrix.a*scale[0]).to.be.closeTo(1,.02)
    expect(matrix.d*(scale[1]||scale[0])).to.be.closeTo(1,.02)
   }
   shape.finish();inverse.finish()
  })
  cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
  cy.get('[aria-label="Minimize Now Playing"]').click()
  cy.get('.sona-player-artwork-flight').should('exist').then($ghost=>{
   const animation=$ghost[0].getAnimations()[0]
   animation.pause();animation.currentTime=740
   const frame=$ghost[0].getBoundingClientRect(),mini=$ghost[0].ownerDocument.querySelector('.sona-player-cover')!.getBoundingClientRect()
   expect(frame.left).to.be.closeTo(mini.left,1)
   expect(frame.top).to.be.closeTo(mini.top,1)
   expect(frame.width).to.be.closeTo(mini.width,1)
   animation.finish()
  })
 })

 it('does not change the notch color in installed PWA mode',()=>{
  cy.window().then(win=>{
   const original=win.matchMedia.bind(win)
   cy.stub(win,'matchMedia').callsFake((query:string)=>query==='(display-mode: standalone)'?{matches:true}:original(query))
   win.document.documentElement.style.setProperty('--sona-notch-color','#123456')
  })
  mountPlayer()
  cy.get('.sona-player-track').click()
  cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
  cy.get('html').should($html=>expect($html[0].style.getPropertyValue('--sona-notch-color')).to.equal('#123456'))
  cy.get('[aria-label="Minimize Now Playing"]').click()
  cy.get('.sona-now-overlay').should('have.attr','data-phase','closed')
  cy.get('html').should($html=>expect($html[0].style.getPropertyValue('--sona-notch-color')).to.equal('#123456'))
 })

 it('profiles a sustained drag without repeated layout work',()=>{
  mountPlayer()
  cy.get('.sona-player-track').click()
  cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
  let before:Record<string,number>={}
  const metrics=()=>Cypress.automation('remote:debugger:protocol',{command:'Performance.getMetrics',params:{}}).then((result:{metrics:{name:string;value:number}[]})=>Object.fromEntries(result.metrics.map(metric=>[metric.name,metric.value])))
  cy.then(()=>Cypress.automation('remote:debugger:protocol',{command:'Performance.enable',params:{}}))
  cy.then(()=>metrics()).then(values=>{before=values})
  const gaps:number[]=[]
  cy.get('.sona-now-overlay').then($sheet=>{
   const sheet=$sheet[0],win=sheet.ownerDocument.defaultView!
   cy.stub(sheet,'setPointerCapture')
   return new Cypress.Promise<void>(resolve=>{
    const send=(type:string,y:number)=>sheet.dispatchEvent(new win.PointerEvent(type,{bubbles:true,pointerId:71,isPrimary:true,button:0,clientX:180,clientY:y}))
    send('pointerdown',90)
    let index=0,last=performance.now()
    const step=(time:number)=>{
     if(index)gaps.push(time-last);last=time
     send('pointermove',90+70*(1-Math.cos(index*Math.PI/15)))
     if(++index<=60)win.requestAnimationFrame(step)
     else{send('pointerup',90);resolve()}
    }
    win.requestAnimationFrame(step)
   })
  })
  cy.then(()=>metrics()).then(after=>{
   const report={frames:gaps.length,averageFrameMs:gaps.reduce((a,b)=>a+b,0)/gaps.length,maxFrameMs:Math.max(...gaps),layouts:after.LayoutCount-before.LayoutCount,layoutMs:(after.LayoutDuration-before.LayoutDuration)*1000,scriptMs:(after.ScriptDuration-before.ScriptDuration)*1000}
   expect(report.layouts).to.be.lessThan(4)
   cy.writeFile('/tmp/sona-player-drag-profile.json',report)
  })
 })

 it('ignores downward drags until opening has fully settled',()=>{
  mountPlayer()
  cy.get('.sona-player-track').click()
  cy.get('.sona-now-overlay').then($sheet=>{
   const sheet=$sheet[0],shape=sheet.getAnimations().find(a=>(a.effect as KeyframeEffect).getKeyframes().some(f=>f.transform))!
   shape.pause();shape.currentTime=180
   const win=sheet.ownerDocument.defaultView!
   sheet.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true,pointerId:42,isPrimary:true,button:0,clientX:170,clientY:100}))
   sheet.dispatchEvent(new win.PointerEvent('pointermove',{bubbles:true,pointerId:42,isPrimary:true,button:0,clientX:170,clientY:400}))
   sheet.dispatchEvent(new win.PointerEvent('pointerup',{bubbles:true,pointerId:42,isPrimary:true,button:0,clientX:170,clientY:400}))
   expect(sheet.dataset.phase).to.equal('opening');expect(sheet.classList.contains('is-dragging')).to.equal(false)
   expect(shape.playState).to.equal('paused');shape.finish()
  })
  cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
 })
 it('reveals top-anchored mini title and controls after 200ms and fades only after landing',()=>{
  mountPlayer()
  cy.get('.sona-player-track').click()
  cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
  cy.get('.sona-mini-artist-text').should('not.exist')
  cy.get('[aria-label="Minimize Now Playing"]').click()
  cy.get('.sona-player-detail-flight.is-title').should('exist')
  cy.get('.sona-player-detail-flight.is-play').should('exist')
  cy.get('.sona-player-detail-flight.is-next').should('exist')
  cy.get('.sona-player-detail-flight.is-play svg,.sona-player-detail-flight.is-next svg').each($icon=>expect(getComputedStyle($icon[0]).fill).to.equal('rgb(255, 255, 255)'))
  cy.get('.sona-player-detail-flight').each($node=>{
   expect($node[0].parentElement?.classList.contains('sona-now-content')).to.equal(true)
   const fade=$node[0].getAnimations()[0]
   expect(fade.effect?.getTiming().delay).to.equal(200)
   expect(fade.effect?.getTiming().duration).to.equal(130)
  })
  cy.get('.sona-now-overlay').then($sheet=>{
   const sheet=$sheet[0],shape=sheet.getAnimations().find(a=>(a.effect as KeyframeEffect).getKeyframes().some(f=>f.transform))!
   shape.pause();shape.currentTime=370
   expect(Number(getComputedStyle(sheet).opacity)).to.equal(1)
   expect(sheet.dataset.phase).to.equal('closing')
   shape.finish()
  })
  cy.get('.sona-now-overlay').should('have.attr','data-phase','landing').then($sheet=>{
   const sheet=$sheet[0],mini=sheet.ownerDocument.querySelector<HTMLElement>('.sona-player')!,target=getDockBounds(mini),landed=sheet.getBoundingClientRect()
   expect(landed.left).to.be.closeTo(target.left,1);expect(landed.top).to.be.closeTo(target.top,1);expect(landed.width).to.be.closeTo(target.width,1)
   const fade=sheet.getAnimations().find(a=>a.effect?.getTiming().duration===90)!
   expect(fade).to.exist
  })
  cy.get('.sona-now-overlay').should('have.attr','data-phase','closed')
  cy.get('.sona-player-detail-flight,.sona-player-artwork-flight').should('not.exist')
 })

 it('reveals only play on a compact landing and actually blends away the album color',()=>{
  mountPlayer()
  cy.then(()=>useSonaDock.setState({compact:true}))
  cy.get('.sona-player').should($el=>expect(getDockBounds($el[0]).width).to.be.closeTo(254,1))
  cy.get('.sona-player-track').click()
  cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
  cy.get('[aria-label="Minimize Now Playing"]').click()
  cy.get('.sona-player-detail-flight.is-play').should('exist')
  cy.get('.sona-player-detail-flight.is-next').should('not.exist')
  cy.get('.sona-now-background').then($bg=>{
   const animation=$bg[0].getAnimations()[0];animation.pause();animation.currentTime=600
   expect(Number(getComputedStyle($bg[0]).opacity)).to.be.lessThan(.01)
  })
  cy.get('.sona-now-overlay').should('have.attr','data-phase','closed')
 })

})
