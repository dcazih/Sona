// Deterministic native iOS PWA launch PNGs. No external dependencies.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

const output = join(process.cwd(), 'public', 'pwa-startup')
mkdirSync(output, { recursive: true })
const devices = [[375,667,2],[414,736,3],[375,812,3],[360,780,3],[414,896,2],[414,896,3],[390,844,3],[428,926,3],[393,852,3],[430,932,3],[402,874,3],[440,956,3],[375,812,2],[320,568,2],[393,852,2],[420,912,3]]
const stops = [[0,[255,144,168]],[.34,[255,71,115]],[.66,[255,39,80]],[1,[255,2,46]]]
// First frame of the owner's 30x30 note GIF. Static launch and animated HTML icon line up.
const note = `
000000000000000000000000000000
000000000000000000000000000000
000000000000000000000000000000
000000000000000000011100000000
000000000000001111111100000000
000000000000011111111100000000
000000000000011111111100000000
000000000000011111111100000000
000000000000011111110000000000
000000000000011000000000000000
000000000000011000000000000000
000000000000011000000000000000
000000000000011000000000000000
000000000000011000000000000000
000000000000011000000000000000
000000000000011000000000000000
000000000000011000000000000000
000000000000011000000000000000
000000000000111000000000000000
000000000111111000000000000000
000000001111111000000000000000
000000011111111000000000000000
000000011111111000000000000000
000000011111111000000000000000
000000011111110000000000000000
000000001111110000000000000000
000000000111100000000000000000
000000000000000000000000000000
000000000000000000000000000000
000000000000000000000000000000
`.trim().split('\n')
const table = new Uint32Array(256)
for (let i=0;i<256;i++) {
 let x=i
 for(let j=0;j<8;j++)x=(x&1)?0xedb88320^(x>>>1):x>>>1
 table[i]=x>>>0
}
function crc32(buffer) {
 let crc=0xffffffff
 for(let i=0;i<buffer.length;i++)crc=table[(crc^buffer[i])&255]^(crc>>>8)
 return (crc^0xffffffff)>>>0
}
function chunk(type, data) {
 const label=Buffer.from(type)
 const len=Buffer.alloc(4);len.writeUInt32BE(data.length)
 const checksum=Buffer.alloc(4);checksum.writeUInt32BE(crc32(Buffer.concat([label,data])))
 return Buffer.concat([len,label,data,checksum])
}
function rgbFor(t) {
 let lo=stops[0], hi=stops.at(-1)
 for (let i=1;i<stops.length;i++)if(t<=stops[i][0]){lo=stops[i-1];hi=stops[i];break}
 const ratio=Math.max(0,Math.min(1,(t-lo[0])/(hi[0]-lo[0])))
 return [0,1,2].map(c=>Math.round(lo[1][c]*(1-ratio)+hi[1][c]*ratio))
}
function writeSplash(logicalW, logicalH, dpr) {
 const width=logicalW*dpr,height=logicalH*dpr, rowBytes=width*4+1
 const raw=Buffer.alloc(rowBytes*height)
 const icon=Math.round(90*dpr)
 const left=Math.floor((width-icon)/2), top=Math.floor((height-icon)/2)
 for (let y=0;y<height;y++) {
   const [r,g,b]=rgbFor(y/(height-1))
   const row=y*rowBytes
   raw[row]=0
   const ny=Math.floor((y-top)*30/icon)
   for(let x=0;x<width;x++){
     const off=row+1+x*4
     const nx=Math.floor((x-left)*30/icon)
     const isNote=ny>=0&&ny<30&&nx>=0&&nx<30&&note[ny][nx]==='1'
     raw[off]=isNote?255:r
     raw[off+1]=isNote?255:g
     raw[off+2]=isNote?255:b
     raw[off+3]=255
   }
 }
 const header=Buffer.alloc(13)
 header.writeUInt32BE(width,0);header.writeUInt32BE(height,4)
 header[8]=8;header[9]=6
 const png=Buffer.concat([
   Buffer.from([137,80,78,71,13,10,26,10]),
   chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))
 ])
 const name=width+'x'+height+'.png'
 writeFileSync(join(output,name),png)
 console.log('Generated iOS startup '+name+' ('+png.length+' bytes)')
}
const emitted=new Set()
for(const [w,h,dpr] of devices){
 const name=(w*dpr)+'x'+(h*dpr)
 if(emitted.has(name))continue
 emitted.add(name)
 writeSplash(w,h,dpr)
}
