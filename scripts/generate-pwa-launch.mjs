// Deterministic native iOS PWA launch PNGs. No external dependencies.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

const output = join(process.cwd(), 'public', 'pwa-startup-v17')
mkdirSync(output, { recursive: true })
const devices = [[375,667,2],[414,736,3],[375,812,3],[360,780,3],[414,896,2],[414,896,3],[390,844,3],[428,926,3],[393,852,3],[430,932,3],[402,874,3],[440,956,3],[375,812,2],[320,568,2],[393,852,2],[420,912,3]]
const stops = [[0,[255,144,168]],[.34,[255,71,115]],[.66,[255,39,80]],[1,[255,2,46]]]
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
// The same vector note drawn by index.html. Native splash frames are
// rasterized from this path, not enlarged from the low-resolution app icon.
const vectorNotePath = readFileSync(join(process.cwd(),'src/app/components/header/sona-note-glyph.tsx'),'utf8').match(/export const SONA_NOTE_PATH\s*=\s*'([^']+)'/)[1]
function buildVectorNotePolygon(d) {
 const words = d.match(/[MLQVHZ]|-?\d+(?:\.\d+)?/g)
 const points = []
 let i=0,x=0,y=0,sx=0,sy=0
 while(i<words.length) {
  const command=words[i++]
  if(command==='M'||command==='L') {
    x=Number(words[i++]);y=Number(words[i++])
    if(command==='M'){sx=x;sy=y}
    points.push([x,y])
  } else if(command==='Q') {
    const x1=Number(words[i++]),y1=Number(words[i++])
    const x2=Number(words[i++]),y2=Number(words[i++])
    const x0=x,y0=y
    for(let j=1;j<=12;j++){
      const t=j/12,u=1-t
      points.push([u*u*x0+2*u*t*x1+t*t*x2,u*u*y0+2*u*t*y1+t*t*y2])
    }
    x=x2;y=y2
  } else if(command==='V') {
    y=Number(words[i++]);points.push([x,y])
  } else if(command==='H') {
    x=Number(words[i++]);points.push([x,y])
  } else if(command==='Z') {
    x=sx;y=sy;points.push([x,y])
  } else {throw Error('Unsupported SVG command: '+command)}
 }
 return points
}
const vectorNotePoints = buildVectorNotePolygon(vectorNotePath)
function insideVectorNote(x,y){
 let inside=false
 for(let i=0,j=vectorNotePoints.length-1;i<vectorNotePoints.length;j=i++) {
   const a=vectorNotePoints[i],b=vectorNotePoints[j]
   if ((a[1]>y)!==(b[1]>y) &&
      x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside
 }
 return inside
}
// Quarter-resolution coverage map with supersampling and bilinear playback.
const vectorNoteMask=new Float32Array(256*256)
for(let y=52;y<220;y++)for(let x=65;x<195;x++) {
 let coverage=0
 for(const oy of [.25,.75])for(const ox of [.25,.75])
   if(insideVectorNote((x+ox)*2,(y+oy)*2))coverage++
 vectorNoteMask[y*256+x]=coverage/4
}
function vectorNoteAt(x,y){
 const px=x/2,py=y/2
 if(px<0||py<0||px>=255||py>=255)return 0
 const ix=Math.floor(px),iy=Math.floor(py),u=px-ix,v=py-iy
 const at=(xx,yy)=>vectorNoteMask[yy*256+xx]
 return (at(ix,iy)*(1-u)+at(ix+1,iy)*u)*(1-v)
   +(at(ix,iy+1)*(1-u)+at(ix+1,iy+1)*u)*v
}

function writeSplash(logicalW, logicalH, dpr) {
 const width=logicalW*dpr,height=logicalH*dpr, rowBytes=width*4+1
 const raw=Buffer.alloc(rowBytes*height)
 const icon=Math.round(128*dpr)
 const left=Math.floor((width-icon)/2), top=Math.floor((height-icon)/2)
 for (let y=0;y<height;y++) {
   const [r,g,b]=rgbFor(y/(height-1))
   const row=y*rowBytes
   raw[row]=0
   const ny=((y-top)+.5)*512/icon
   for(let x=0;x<width;x++){
     const off=row+1+x*4, nx=((x-left)+.5)*512/icon
     const a=vectorNoteAt(nx,ny)
     const rr=Math.round(r*(1-a)+255*a)
     const gg=Math.round(g*(1-a)+255*a)
     const bb=Math.round(b*(1-a)+255*a)
     raw[off]=rr
     raw[off+1]=gg
     raw[off+2]=bb
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

// Stage 2 and native launch frames share this exact note rasterizer.
function writeStartupNote(size=512) {
  const raw=Buffer.alloc(size*(size*4+1))
  for(let y=0;y<size;y++){
    const row=y*(size*4+1)
    raw[row]=0
    for(let x=0;x<size;x++){
      const off=row+1+x*4
      const a=vectorNoteAt((x+.5)*512/size,(y+.5)*512/size)
      raw[off]=255;raw[off+1]=255;raw[off+2]=255;raw[off+3]=Math.round(a*255)
    }
  }
  const header=Buffer.alloc(13)
  header.writeUInt32BE(size,0);header.writeUInt32BE(size,4)
  header[8]=8;header[9]=6
  writeFileSync(join(process.cwd(),'public','sona-startup-note-v14.png'),
    Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
      chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),
      chunk('IEND',Buffer.alloc(0))]))
}
writeStartupNote()

// Full-bleed install icons use the same note as startup, missing artwork and lyrics.
function writeAppIcon(size){
 const raw=Buffer.alloc(size*(size*4+1))
 for(let y=0;y<size;y++){
  const row=y*(size*4+1),color=rgbFor(y/Math.max(1,size-1));raw[row]=0
  for(let x=0;x<size;x++){
   const off=row+1+x*4,a=vectorNoteAt((x+.5)*512/size,(y+.5)*512/size)
   for(let channel=0;channel<3;channel++)raw[off+channel]=Math.round(color[channel]*(1-a)+255*a)
   raw[off+3]=255
  }
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6
 writeFileSync(join(process.cwd(),'public','sona-icon-v14-'+size+'.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]))
}
for(const size of [16,32,180,192,512])writeAppIcon(size)
