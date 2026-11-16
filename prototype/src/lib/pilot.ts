export type RetrievalMethod = 'bm25' | 'dense' | 'hybrid';
export interface Passage { id:string; documentId:string; page:number; text:string; title:string; issuer:string; url:string; documentHash:string; score?:number }
export interface GeneratedAnswer {text:string; generationMs:number; inputTokens:number; outputTokens:number; contexts:{id:string;text:string}[]; actualPrompt:string; reviewStatus:string}
export interface RetrievalRun {caseId?:string; query:string; method:string; passages:Passage[]; retrievalMs:number; totalMs:number; answer:GeneratedAnswer|null; corpusHash:string; metrics?:{hit1:number;hit3:number;hit5:number;rr5:number;firstRelevantRank:number|null}}
export interface PilotCase {id:string;cohort?:string;query:string;documentId:string;page:number;anchor:string;topic:string;relevantPassageIds:string[]}
export interface PilotReport {
  kind:string; completedAt:string; corpusHash:string; indexHash:string; embeddingModel:string; generatorModel:string;
  freeze:{benchmarkHash:string; frozenAt:string};
  benchmark:{version:string;status:string;task:string;cases:PilotCase[]};
  index:{passageCount:number;includedPageCount:number};
  cohorts?:{id:string;cases:number;summary:PilotReport['summary']}[];
  previousReportUrl?:string;
  sources:{id:string;title:string;issuer:string;url:string;finalUrl:string;versionLabel:string;retrievedAt:string|null;importedAt?:string;acquisitionMethod?:string;provenanceNote?:string;localUrl?:string;selectionNote?:string;sha256:string;pdfPages:number;includedPages:number}[];
  excludedSources:{id:string;title:string;reason:string}[];
  summary:{method:RetrievalMethod;completed:number;attempted:number;failed:number;hit1:number;hit3:number;hit5:number;rr5:number;meanRetrievalMs:number;meanTotalMs:number}[];
  runs:RetrievalRun[]; limitations:string[]; config:Record<string,unknown>; modelLock:Record<string,{revision:string}>;
}
const STOP = new Set('a an the is are was were be been being of to in for on and or with by as at from this that it its do does can could would should which what how i my we our'.split(' '));
export const lexicalTokens = (text:string) => (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(word => !STOP.has(word));

/** Same BM25 formula and constants as research/engine.py; no fixture answers or labels. */
export function browserSearch(query:string, passages:Passage[]):Passage[] {
  if (!passages.length) return [];
  const counts=passages.map(p=>{const map=new Map<string,number>(); for(const word of lexicalTokens(p.text)) map.set(word,(map.get(word)??0)+1); return map;});
  const lengths=counts.map(c=>[...c.values()].reduce((sum,n)=>sum+n,0));
  const average=lengths.reduce((a,b)=>a+b,0)/lengths.length;
  const words=[...new Set(lexicalTokens(query))];
  const idf=new Map(words.map(w=>{const df=counts.filter(c=>c.has(w)).length;return [w,Math.log(1+(passages.length-df+0.5)/(df+0.5))];}));
  return passages.map((p,i)=>({...p,score:words.reduce((sum,w)=>{const tf=counts[i].get(w)??0;return sum+(idf.get(w)??0)*tf*2.5/(tf+1.5*(0.25+0.75*lengths[i]/Math.max(average,1)));},0),order:i})).filter(p=>p.score>0).sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,5);
}
