import { useEffect, useState } from 'react';
import { ArrowUpRight, Database, Download, Search, Check } from 'lucide-react';
import { browserSearch } from '../lib/pilot';
import type { Passage, PilotReport, RetrievalRun } from '../lib/pilot';
import '../pilot.css';

const names:Record<string,string>={bm25:'BM25',dense:'Dense · MiniLM',hybrid:'Hybrid · RRF'};
const pct=(n:number)=>`${(n*100).toFixed(1)}%`;

function Evidence({passages,relevant=[]}:{passages:Passage[];relevant?:string[]}) {
  return <div className="pilot-evidence">{passages.map((p,i)=><details key={p.id}><summary><span className="pilot-rank">{i+1}</span><span><strong>{p.title}</strong><small>PDF page {p.page} · {relevant.includes(p.id)?'Contains the annotated evidence':'Retrieved passage'}</small></span>{relevant.includes(p.id)&&<Check size={17} aria-label="Annotated evidence retrieved"/>}</summary><blockquote>{p.text}</blockquote><a href={p.url} target="_blank" rel="noreferrer">Open source PDF at page {p.page} <ArrowUpRight size={14}/></a><details className="pilot-technical"><summary>Passage provenance</summary><p>{p.issuer}</p><code>{p.id}</code><p>Document SHA-256: {p.documentHash}</p></details></details>)}</div>;
}
function Answer({run}:{run:RetrievalRun}) {
  if(!run.answer) return null;
  return <details className="pilot-answer"><summary>Inspect raw FLAN-T5 answer · unreviewed</summary><p className="pilot-notice">This is actual model output. It can be wrong even when retrieval succeeds. The passages below are retrieved context, not verified citations for its claims.</p><blockquote>{run.answer.text}</blockquote><p className="research-small">{run.answer.inputTokens} input tokens · {run.answer.outputTokens} output tokens · {(run.answer.generationMs/1000).toFixed(2)} s generation</p><details className="pilot-technical"><summary>Exact model input</summary><pre>{run.answer.actualPrompt}</pre></details></details>;
}

export default function MeasuredPilot(){
  const [report,setReport]=useState<PilotReport|null>(null);
  const [loadError,setLoadError]=useState('');
  const [cohort,setCohort]=useState('all');
  const [view,setView]=useState('results');
  const [caseId,setCaseId]=useState('Q01');
  const [method,setMethod]=useState('hybrid');
  const [ready,setReady]=useState(false);
  const [query,setQuery]=useState('Which form is used to apply for a cultivated medicinal plant certificate of origin under the 2025 amendment?');
  const [liveMethod,setLiveMethod]=useState('browser');
  const [generate,setGenerate]=useState(false);
  const [busy,setBusy]=useState(false);
  const [liveError,setLiveError]=useState('');
  const [result,setResult]=useState<RetrievalRun|null>(null);
  const [corpus,setCorpus]=useState<Passage[]|null>(null);
  useEffect(()=>{const abort=new AbortController();fetch('/research/results.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('The recorded experiment file is unavailable.');return r.json();}).then(data=>{if(data.kind!=='measured-retrieval-pilot')throw Error('Unexpected experiment format.');setReport(data);}).catch(e=>{if(e.name!=='AbortError')setLoadError(e.message);});return()=>abort.abort();},[]);
  useEffect(()=>{const abort=new AbortController();fetch('/api/research/health',{signal:abort.signal}).then(r=>r.ok?r.json():null).then(data=>setReady(data?.ready===true)).catch(()=>setReady(false));return()=>abort.abort();},[]);
  async function search(){
    if(query.trim().length<3||query.length>1200)return;
    setBusy(true);setLiveError('');setResult(null);
    try{
      if(liveMethod==='browser'){
        const data=corpus??await fetch('/research/passages.json').then(r=>{if(!r.ok)throw Error('Corpus could not be loaded.');return r.json() as Promise<Passage[]>;});
        if(!data || !Array.isArray(data)) throw Error('The corpus format is invalid.');
        setCorpus(data);const start=performance.now();const passages=browserSearch(query,data);const elapsed=performance.now()-start;
        setResult({query,method:'bm25',passages,answer:null,retrievalMs:elapsed,totalMs:elapsed,corpusHash:report?.corpusHash??''});
      }else{
        const response=await fetch('/api/research/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,method:liveMethod,generate}),signal:AbortSignal.timeout(120000)});
        if(!response.ok)throw Error('Local inference is unavailable. Start the research server, or select browser BM25.');
        setResult(await response.json());setReady(true);
      }
    }catch(e){if(liveMethod!=='browser')setReady(false);setLiveError(e instanceof Error?e.message:'Search failed. No result was substituted.');}finally{setBusy(false);}
  }
  if(loadError)return <p role="alert" className="research-error">{loadError}</p>;
  if(!report)return <p role="status">Loading recorded experiment…</p>;
  const visibleCases=report.benchmark.cases.filter(c=>cohort==='all'||c.cohort===cohort);
  const current=visibleCases.find(c=>c.id===caseId)??visibleCases[0];
  const summaries=cohort==='all'?report.summary:report.cohorts?.find(c=>c.id===cohort)?.summary??report.summary;
  const run=report.runs.find(r=>r.caseId===current.id&&r.method===method);
  return <section className="measured-pilot">
    <div className="research-section-heading"><div><span className="research-number">EXECUTED PILOT / PUBLIC GOVERNMENT DOCUMENTS</span><h2>A corpus you can inspect.<br/>Results you can reproduce.</h2><p>Indian biodiversity, ABS and Ayush patent-examination guidance. Every score below comes from the recorded local run.</p></div><Database size={28}/></div>
    <div className="pilot-counts"><div><strong>{report.sources.length}</strong><span>indexed source PDFs</span></div><div><strong>{report.index.includedPageCount}</strong><span>English-bearing pages</span></div><div><strong>{report.index.passageCount}</strong><span>indexed passages</span></div><div><strong>{report.benchmark.cases.length}</strong><span>labelled pilot questions</span></div></div>
    <nav className="pilot-tabs" aria-label="Measured pilot sections">{[['results','Measured results'],['corpus','Source corpus'],['search','Ask the corpus']].map(([id,label])=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</nav>
    {view==='results'&&<>
      <p className="pilot-notice"><strong>Retrieval performance, not answer accuracy.</strong> Questions and evidence labels were AI-authored from these sources, then frozen before scoring. Independent expert validation is pending. This is an exploratory pilot.</p>
      <div className="pilot-selectors"><label>Question group<select value={cohort} onChange={e=>setCohort(e.target.value)}><option value="all">All questions · {report.benchmark.cases.length}</option>{report.cohorts?.map(c=><option key={c.id} value={c.id}>{c.id==='ayush'?'Ayush guidelines':'ABS · original questions'} · {c.cases}</option>)}</select></label></div>
      <p className="research-small">All groups search the same expanded corpus. ABS and Ayush scores describe different question sets; compare methods within a group. Changing the group also filters the recorded runs below.</p>
      <div className="research-table-scroll" role="region" tabIndex={0} aria-label="Measured retrieval results"><table className="research-results-table"><caption>{visibleCases.length} questions · identical corpus across methods · no reranker · fixed RRF constant 60 · CPU inference</caption><thead><tr><th>Method</th><th>Evidence hit @1</th><th>Evidence hit @3</th><th>Evidence hit @5</th><th>MRR @5</th><th>Mean retrieval</th></tr></thead><tbody>{summaries.map(s=><tr key={s.method}><th scope="row">{names[s.method]}</th><td>{pct(s.hit1)}</td><td>{pct(s.hit3)}</td><td><strong>{pct(s.hit5)}</strong><small> {Math.round(s.hit5*s.attempted)}/{s.attempted}</small></td><td>{s.rr5.toFixed(3)}</td><td>{s.meanRetrievalMs.toFixed(1)} ms</td></tr>)}</tbody></table></div>
      <p className="research-small">Evidence hit @k: at least one of the first k passages contains the annotated supporting span from the specified PDF page. MRR @5: reciprocal rank of the first such passage, or zero if absent. Unlabelled relevant passages may exist.</p>
      <div className="pilot-downloads"><a className="button secondary" href="/research/results.json" download><Download size={15}/> Full results + model outputs</a><a className="text-button" href="/research/metrics.csv" download>Metrics CSV</a><a className="text-button" href="/research/benchmark.json" download>Questions + labels</a>{report.previousReportUrl&&<a className="text-button" href={report.previousReportUrl} download>Original ABS-only run (v1)</a>}</div>
      <section className="pilot-traces"><span className="research-number">INSPECT A RECORDED RUN</span><h3>See the question, the ranking and the evidence.</h3><div className="pilot-selectors"><label>Question<select value={current.id} onChange={e=>setCaseId(e.target.value)}>{visibleCases.map(c=><option key={c.id} value={c.id}>{c.id} · {c.topic}</option>)}</select></label><label>Method<select value={method} onChange={e=>setMethod(e.target.value)}>{Object.entries(names).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></div><p className="pilot-query">{current.query}</p><details className="pilot-label"><summary>Inspect the provisional relevance label</summary><blockquote>{current.anchor}</blockquote><p>{current.documentId} · PDF page {current.page}. This label was created before scoring and needs independent review.</p></details>{run?<><p className="pilot-outcome">{run.metrics?.hit5?'Annotated evidence found in the top 5':'Annotated evidence not found in the top 5'} · {(run.totalMs/1000).toFixed(2)} s retrieval + generation</p><Answer run={run}/><Evidence passages={run.passages} relevant={current.relevantPassageIds}/></>:<p role="status">No completed run for this selection. See the error log in the download.</p>}</section>
      <details className="pilot-limitations"><summary>Method, limitations and reproducibility</summary><ul>{report.limitations.map(l=><li key={l}>{l}</li>)}</ul><p>Run completed: {report.completedAt}<br/>Labels frozen: {report.freeze.frozenAt}<br/>Completed runs: {report.runs.length}. Failed attempts: {report.summary.reduce((n,s)=>n+s.failed,0)}.</p><p>Encoder: {report.embeddingModel}<br/>Generator: {report.generatorModel}</p><p>Benchmark SHA-256: {report.freeze.benchmarkHash}<br/>Corpus SHA-256: {report.corpusHash}</p><pre>{JSON.stringify({config:report.config,models:report.modelLock},null,2)}</pre></details>
    </>}
    {view==='corpus'&&<><p className="pilot-notice">This is a snapshot retrieval corpus, not a consolidated legal database. The 2024 Rules and 2025 amendment are separate documents; the system does not automatically reconcile superseded provisions.</p><div className="pilot-sources">{report.sources.map(s=><article key={s.id}><span className="research-number">{s.includedPages} indexed pages / {s.pdfPages} PDF pages</span><h3>{s.title}</h3><p>{s.issuer}</p><p>{s.versionLabel}</p><p>{s.acquisitionMethod??'Downloaded from official website'}</p>{s.selectionNote&&<p>{s.selectionNote}</p>}<a href={s.localUrl??s.finalUrl} target="_blank" rel="noreferrer">{s.localUrl?'Open uploaded source PDF':'Official source PDF'} <ArrowUpRight size={15}/></a>{s.localUrl&&<p><a href={s.finalUrl} target="_blank" rel="noreferrer">Official reference location</a></p>}<details className="pilot-technical"><summary>Source provenance</summary><p>{s.importedAt?`Imported: ${s.importedAt}`:`Retrieved: ${s.retrievedAt}`}</p>{s.provenanceNote&&<p>{s.provenanceNote}</p>}<p>SHA-256: {s.sha256}</p></details></article>)}</div><h3>Outside this pilot</h3><ul><li>TKDL full records: access-controlled; no search or ingestion claimed.</li><li>InPASS, trade marks, designs and GI records: not collected.</li>{report.excludedSources.map(s=><li key={s.id}>{s.title}: download unavailable during this build; excluded from the index and scores.</li>)}</ul><a href="/research/passages.json" download className="button secondary"><Download size={15}/> Download extracted passages</a></>}
    {view==='search'&&<><p className="pilot-notice">Search the indexed corpus with your own question. Browser BM25 works without a backend. Dense, hybrid and generation use the local Python server; availability is shown below.</p><form className="pilot-search-form" onSubmit={e=>{e.preventDefault();void search();}}><label htmlFor="pilot-query">Your research question</label><textarea id="pilot-query" value={query} maxLength={1200} minLength={3} required onChange={e=>setQuery(e.target.value)} rows={3}/><div className="pilot-selectors"><label>Retrieval method<select value={liveMethod} onChange={e=>{setLiveMethod(e.target.value);setResult(null);}}><option value="browser">BM25 · in this browser</option><option value="bm25">BM25 · local server</option><option value="dense">Dense MiniLM · local server</option><option value="hybrid">Hybrid RRF · local server</option></select></label><p className="research-small">Local server: {ready?'connected':'not detected; browser search remains available'}</p></div>{liveMethod!=='browser'&&<label className="pilot-generate"><input type="checkbox" checked={generate} onChange={e=>setGenerate(e.target.checked)}/> Also generate an unreviewed answer with FLAN-T5</label>}<button className="button primary" disabled={busy||query.trim().length<3}><Search size={16}/>{busy?'Searching the corpus…':'Search corpus'}</button></form><div role="status" aria-live="polite">{busy&&<p>Running the selected method. The result will appear here when it finishes.</p>}</div>{liveError&&<p role="alert" className="research-error">{liveError}</p>}{result&&<section className="pilot-live-results"><h3>Retrieved for your question</h3><p>{result.query}</p><p className="research-small">{result.passages.length} passages · {result.retrievalMs.toFixed(1)} ms retrieval · {names[result.method]??result.method}. Live searches are not added to the benchmark scores.</p><Answer run={result}/>{result.passages.length?<Evidence passages={result.passages}/>:<p>No lexical match was found. Try a question within the corpus scope.</p>}</section>}</>}
  </section>;
}
