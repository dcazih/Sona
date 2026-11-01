import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import assert from 'node:assert/strict'

const source=readFileSync(new URL('../src/utils/download-song-archive.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace('export async function','async function')
const js=transpileModule(source,{compilerOptions:{target:9}}).outputText
let blob,clicked=false,filename=''
const download=runInNewContext(js+';downloadSongArchive',{
  Uint32Array,Uint8Array,ArrayBuffer,DataView,TextEncoder,Blob,
  fetch:async url=>new Response('audio:'+url,{headers:{'content-type':'audio/mpeg'}}),
  getDownloadUrl:id=>id,
  URL:{createObjectURL:value=>{blob=value;return 'blob:test'},revokeObjectURL:()=>{}},
  document:{createElement:()=>({set download(value){filename=value},click:()=>{clicked=true},remove:()=>{}}),body:{appendChild:()=>{}}},
  window:{setTimeout:()=>{}},
})
await download([{id:'one',title:'Café',artist:'Artist',suffix:'flac'},{id:'two',title:'Two',artist:'Artist',suffix:'mp3'}],'Favorites')
assert.equal(clicked,true);assert.equal(filename,'Favorites.zip')
const data=new Uint8Array(await blob.arrayBuffer()),view=new DataView(data.buffer)
let offset=0
for(const id of ['one','two']){
  assert.equal(view.getUint32(offset,true),0x04034b50)
  const size=view.getUint32(offset+18,true),length=view.getUint16(offset+26,true)
  const start=offset+30+length
  assert.equal(new TextDecoder().decode(data.slice(start,start+size)),'audio:'+id)
  offset=start+size
}
assert.equal(view.getUint32(offset,true),0x02014b50)
assert.equal(view.getUint32(data.length-22,true),0x06054b50)
assert.equal(view.getUint16(data.length-14,true),2)
console.log('Favorites archive: both tracks, Unicode filenames, directory and a single download verified.')
