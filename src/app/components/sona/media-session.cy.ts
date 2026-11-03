import { manageMediaSession, requestMediaPlayback } from '@/utils/setMediaSession'
import { usePlayerStore } from '@/store/player.store'

describe('standby playback commands',()=>{
 let audio:HTMLAudioElement
 beforeEach(()=>{
  audio=document.createElement('audio')
  cy.stub(audio,'play').resolves()
  cy.stub(audio,'pause')
  usePlayerStore.setState(state=>({playerState:{...state.playerState,audioPlayerRef:audio,isPlaying:false},playerProgress:{...state.playerProgress,progress:42}}))
 })
 it('repeated Play stays playing and restores the real audio position',()=>{
  requestMediaPlayback(true)
  requestMediaPlayback(true)
  expect(usePlayerStore.getState().playerState.isPlaying).to.equal(true)
  expect(audio.currentTime).to.equal(42)
  expect(audio.play).to.have.been.calledTwice
 })
 it('repeated Pause stays paused',()=>{
  requestMediaPlayback(false)
  requestMediaPlayback(false)
  expect(usePlayerStore.getState().playerState.isPlaying).to.equal(false)
  expect(audio.pause).to.have.been.calledTwice
 })
 it('lock-screen handlers use explicit Play and Pause commands',()=>{
  const handlers=new Map<string,MediaSessionActionHandler|null>()
  cy.stub(navigator.mediaSession,'setActionHandler').callsFake((action,handler)=>handlers.set(action,handler))
  manageMediaSession.setHandlers()
  handlers.get('play')?.({action:'play'})
  handlers.get('play')?.({action:'play'})
  expect(usePlayerStore.getState().playerState.isPlaying).to.equal(true)
  handlers.get('pause')?.({action:'pause'})
  expect(usePlayerStore.getState().playerState.isPlaying).to.equal(false)
 })
})
