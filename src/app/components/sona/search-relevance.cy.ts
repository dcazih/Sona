import {relevantLocal,mergeRelevant} from '@/service/search-relevance'
it('keeps artist intent scoped to verified names and aliases',()=>{
 const rows=[{title:'Michael Jackson',artist:'Somebody Else'},{title:'Billie Jean',artist:'Michael Jackson'}]
 expect(relevantLocal(rows,'song','miceal jackson',{intent:'artist',identity:{id:'mj',name:'Michael Jackson',aliases:['Michael Jackson']}}).map(row=>row.title)).to.deep.equal(['Billie Jean'])
})
it('accepts exact songs and artist-album phrases but rejects shared words',()=>{
 const rows=[{title:'Pompeii',artist:'Beirut'},{title:'Reasonable Doubt',artist:'JAY-Z'},{title:'Doubt',artist:'Other'}]
 expect(relevantLocal(rows,'album','Jay-Z Reasonable Doubt').map(row=>row.title)).to.deep.equal(['Reasonable Doubt'])
})
it('deduplicates and caps existing sections without padding',()=>{
 const row={id:'a',title:'Billie Jean',artist:'Michael Jackson'}
 expect(mergeRelevant([row],[{...row,id:'other-edition'}])).to.deep.equal([row])
 expect(mergeRelevant([],Array.from({length:12},(_,i)=>({id:String(i),title:String(i)})))).to.have.length(5)
})
it('rejects unrelated local covers and preserves canonical identity matches',()=>{
 const context={intent:'song' as const,identity:{id:'mj',name:'Michael Jackson',aliases:['Michael Jackson']},matches:{artists:[],albums:[],songs:['verified-recording']}}
 const rows=[{title:'Thriller',artist:'Unrelated Cover Band'},{title:'Thriller',artist:'Michael Jackson'},{title:'Thriller',artist:'MJ',identityId:'verified-recording'}]
 expect(relevantLocal(rows,'song','Thriller',context)).to.deep.equal([rows[2],rows[1]])
 expect(mergeRelevant([{id:'local',identityId:'verified-recording',title:'Thriller',artist:'MJ'}],[{id:'verified-recording',title:'Thriller',artist:'Michael Jackson'}])).to.have.length(1)
})
