import type { CatalogItem } from './sona-catalog'
export type SearchIdentity = {intent?:'artist'|'album'|'song';effectiveQuery?:string;identity?:{id:string;name:string;aliases:string[]}|null;matches?:{artists:string[];albums:string[];songs:string[]}}
export const searchFold=(value?:string)=>(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
/** Sona Music only: never apply discovery ranking to the Library selector. */
export function relevantLocal<T extends {title:string;artist?:string;identityId?:string}>(rows:T[],kind:CatalogItem['kind'],query:string,context?:SearchIdentity):T[]{
 const q=searchFold(query),aliases=(context?.identity?.aliases||[]).concat(context?.identity?.name||'').map(searchFold).filter(Boolean)
 const rank=(row:T)=>{
  const title=searchFold(row.title),artist=searchFold(row.artist)
  const bucket=kind==='artist'?'artists':kind==='album'?'albums':'songs'
  if(row.identityId&&context?.matches?.[bucket]?.includes(row.identityId))return 110
  if(context?.intent&&context.intent!=='artist'&&aliases.length&&!aliases.includes(kind==='artist'?title:artist))return 0
  if(context?.intent==='artist'&&aliases.length)return aliases.includes(kind==='artist'?title:artist)?100:0
  if(title===q||searchFold((row.artist||'')+' '+row.title)===q)return 100
  if(kind==='artist')return 0
  return q.length>=5&&title.startsWith(q)&&q.length/title.length>=.65?90:0
 }
 return rows.map(row=>({row,score:rank(row)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.row)
}
export function mergeRelevant<T extends {id:string;title:string;artist?:string;identityId?:string}>(local:T[],remote:T[],limit=5):T[]{
 const ids=new Set<string>(),names=new Set<string>()
 return [...local,...remote].filter(row=>{
  const name=searchFold(row.title)+'|'+searchFold(row.artist)
  if(ids.has(row.identityId||row.id)||names.has(name))return false
  ids.add(row.identityId||row.id);names.add(name);return true
 }).slice(0,limit)
}
