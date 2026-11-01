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
    cy.mount(<div className="sona-app-shell"><Player /><SonaMobileNowPlaying /></div>)
  })
}

describe('Mobile player sheet motion', () => {
  beforeEach(() => {
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
        const mini = $mini[0].getBoundingClientRect()
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
      expect(Number(frames.find(frame => frame.offset === .25)?.opacity)).to.be.lessThan(.1)
      expect(Number(frames.find(frame => frame.offset === .5)?.opacity)).to.equal(0)
    })
    cy.get('.sona-player-cover img').should('have.css','visibility','visible')
    cy.get('.sona-player').should('have.attr','data-sona-rebound','true')
    cy.get('.sona-now-overlay').should('have.attr','data-phase','closed')
    cy.get('.sona-player').should('not.have.attr','data-sona-rebound')
    cy.get('.sona-player').should(($mini) => {
      expect(getComputedStyle($mini[0]).translate).to.equal('none')
    })
  })

  it('grows the cover and eases its contents on play, then reverses on pause', () => {
    mountPlayer()
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
    cy.get('.sona-now-art').should('not.have.class','is-playing')
    cy.then(()=>usePlayerStore.getState().actions.setPlayingState(true))
    cy.get('.sona-now-art').should('have.class','is-playing').should(($cover)=>{
      expect(new DOMMatrixReadOnly(getComputedStyle($cover[0]).transform).a).to.be.closeTo(1,.002)
    })
    cy.get('.sona-now-art-content').should(($content)=>{
      expect(new DOMMatrixReadOnly(getComputedStyle($content[0]).transform).a).to.be.closeTo(1.035,.002)
    })
    cy.then(()=>usePlayerStore.getState().actions.setPlayingState(false))
    cy.get('.sona-now-art').should('not.have.class','is-playing').should(($cover)=>{
      expect(new DOMMatrixReadOnly(getComputedStyle($cover[0]).transform).a).to.be.closeTo(.91,.002)
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
      expect(shape.getTiming().duration).to.equal(660)
      const frame=shape.getKeyframes().find(frame=>frame.offset===.5)!
      const matrix=new DOMMatrixReadOnly(String(frame.transform))
      const background=$sheet[0].querySelector('.sona-now-background')!
      const inverse=(background.getAnimations()[0].effect as KeyframeEffect).getKeyframes().find(frame=>frame.offset===.5)!
      const scale=String(inverse.scale).split(' ').map(Number)
      expect(matrix.a*scale[0]).to.be.closeTo(1,.001)
      expect(matrix.d*scale[1]).to.be.closeTo(1,.001)
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

  it('moves the title down 15 pixels and uses equal fixed gaps around transport',()=>{
    mountPlayer()
    cy.get('.sona-player-track').click()
    cy.get('.sona-now-overlay').should('have.attr','data-phase','open')
    cy.get('.sona-now-panel').then($panel=>{
      const panel=$panel[0],doc=panel.ownerDocument
      const baseline=panel.cloneNode(true) as HTMLElement
      Object.assign(baseline.style,{position:'fixed',bottom:'0',left:'0',width:'100%',visibility:'hidden',translate:'0 0',transform:'none'})
      baseline.querySelector<HTMLElement>('.sona-now-bottom-actions')!.style.translate='0 0'
      const stack=baseline.querySelector('.sona-now-control-stack')!
      stack.replaceWith(...Array.from(stack.childNodes))
      const oldProgress=baseline.querySelector<HTMLElement>('.sona-now-progress')!
      const oldTransport=baseline.querySelector<HTMLElement>('.sona-now-transport')!
      const oldVolume=baseline.querySelector<HTMLElement>('.sona-now-volume')!
      oldProgress.style.setProperty('margin-top','8px','important')
      oldTransport.style.setProperty('margin','14px 0 6px','important')
      oldVolume.style.setProperty('margin','12px 0 9px','important')
      panel.parentElement!.appendChild(baseline)
      try{
        const oldTop=baseline.querySelector('h2')!.getBoundingClientRect().top
        const top=panel.querySelector('h2')!.getBoundingClientRect().top
        expect(top-oldTop).to.be.closeTo(15,1)
        const progress=panel.querySelector('.sona-now-progress')!.getBoundingClientRect()
        const transport=panel.querySelector('.sona-now-transport')!.getBoundingClientRect()
        const volume=panel.querySelector('.sona-now-volume')!.getBoundingClientRect()
        expect(transport.top-progress.bottom).to.be.closeTo(19,1)
        expect(volume.top-transport.bottom).to.be.closeTo(31,1)
        const songTrack=panel.querySelector('.sona-scrubber-track')!.getBoundingClientRect()
        const volumeTrack=panel.querySelector('.sona-volume-track')!.getBoundingClientRect()
        const center=transport.top+transport.height/2
        expect(center-(songTrack.top+songTrack.height/2)).to.be.closeTo(volumeTrack.top+volumeTrack.height/2-center,1)
      }finally{baseline.remove()}
      expect(doc.querySelectorAll('.sona-now-panel')).to.have.length(1)
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

})
