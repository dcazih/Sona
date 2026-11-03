import { usePlayerStore } from '@/store/player.store'
import type { ISong } from '@/types/responses/song'
import { Player } from './player'

it('keeps the same audio URL when metadata for the current song refreshes',()=>{
 cy.mockCoverArt()
 cy.mockSongStream()
 cy.fixture('songs/random').then((songs:ISong[])=>{
  usePlayerStore.getState().actions.setSongList([songs[0]],0)
  usePlayerStore.getState().actions.setPlayingState(false)
  cy.mount(<Player/>)
  cy.getByTestId('player-song-audio').invoke('attr','src').then(source=>{
   cy.then(()=>usePlayerStore.setState(state=>({songlist:{...state.songlist,currentList:state.songlist.currentList.map(song=>({...song,title:song.title+' refreshed'}))}})))
   cy.getByTestId('player-song-audio').should('have.attr','src',source)
  })
 })
})
