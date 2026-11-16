"""Freeze labels, execute every method, retain outputs and compute retrieval metrics."""
import csv
import json
import platform
import re
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import torch
import transformers
from engine import Engine, ROOT, CONFIG, EMBEDDER, GENERATOR, digest

def normal(text):
    return re.sub(r'\W+', '', text.casefold())

def score(ids, relevant):
    ranks=[i for i,p in enumerate(ids,1) if p in relevant]
    first=min(ranks) if ranks else None
    return {'hit1':int(first is not None and first<=1),'hit3':int(first is not None and first<=3),'hit5':int(first is not None and first<=5),'rr5':1/first if first and first<=5 else 0,'firstRelevantRank':first}

def summarize(runs, errors, cases):
    ids={c['id'] for c in cases}
    summary=[]
    for method in ['bm25','dense','hybrid']:
        rows=[r for r in runs if r['method']==method and r['caseId'] in ids]
        summary.append({'method':method,'completed':len(rows),'attempted':len(cases),'failed':sum(e['method']==method and e['caseId'] in ids for e in errors),**{k:sum(r['metrics'][k] for r in rows)/len(cases) for k in ['hit1','hit3','hit5','rr5']},'meanRetrievalMs':float(np.mean([r['retrievalMs'] for r in rows])) if rows else None,'meanTotalMs':float(np.mean([r['totalMs'] for r in rows])) if rows else None})
    return summary

if __name__=='__main__':
    benchmark=json.loads((ROOT/'benchmark.json').read_text())
    frozen={'benchmarkHash':digest(benchmark),'frozenAt':datetime.now(timezone.utc).isoformat(),'config':CONFIG,'modelLock':json.loads((ROOT/'model-lock.json').read_text()),'corpusHash':digest(json.loads((ROOT/'corpus-pages.json').read_text()))}
    freeze_path=ROOT/'results'/('freeze-'+frozen['benchmarkHash'][:12]+'.json')
    if freeze_path.exists():
        old=json.loads(freeze_path.read_text())
        assert old['config']==CONFIG and old['corpusHash']==frozen['corpusHash'] and old['modelLock']==frozen['modelLock'], 'Frozen protocol changed: create a new benchmark version.'
        frozen=old
    else: freeze_path.write_text(json.dumps(frozen,indent=2))
    engine=Engine()
    # Validate annotation presence before any evaluation, without reading model rankings.
    for case in benchmark['cases']:
        case['relevantPassageIds']=[p['id'] for p in engine.passages if p['documentId']==case['documentId'] and p['page']==case['page'] and normal(case['anchor']) in normal(p['text'])]
        if not case['relevantPassageIds']: raise ValueError(f"Label not contained in a chunk: {case['id']}")
    engine.encode(['Warm up the retrieval encoder.'])
    engine.generate('What is this document about?',engine.passages[:1])
    runs=[]; errors=[]
    started=datetime.now(timezone.utc).isoformat()
    for case in benchmark['cases']:
        for method in ['bm25','dense','hybrid']:
            try:
                result=engine.query(case['query'],method)
                metrics=score([p['id'] for p in result['passages']],case['relevantPassageIds'])
                runs.append({**result,'caseId':case['id'],'metrics':metrics})
                print(case['id'],method,'hit@5',metrics['hit5'],'answer',result['answer']['text'][:65],flush=True)
            except Exception as exc:
                errors.append({'caseId':case['id'],'method':method,'error':str(exc)})
    summary=summarize(runs,errors,benchmark['cases'])
    cohorts=[{'id':cohort,'cases':len(cases),'summary':summarize(runs,errors,cases)} for cohort in ['abs','ayush'] if (cases:=[c for c in benchmark['cases'] if c.get('cohort')==cohort])]
    result={'schemaVersion':1,'kind':'measured-retrieval-pilot','startedAt':started,'completedAt':datetime.now(timezone.utc).isoformat(),'freeze':frozen,'benchmark':benchmark,'corpusHash':engine.corpus_hash,'indexHash':engine.index_hash,'embeddingModel':EMBEDDER,'generatorModel':GENERATOR,'modelLock':engine.lock,'config':CONFIG,'hardware':{'platform':platform.platform(),'processor':platform.machine(),'torch':torch.__version__,'transformers':transformers.__version__},'index':{'passageCount':len(engine.passages),'includedPageCount':sum(d['includedPages'] for d in engine.docs),'cacheUsed':engine.index_cache,'loadOrBuildSeconds':engine.index_seconds},'sources':[{k:v for k,v in d.items() if k!='content'} for d in engine.docs],'excludedSources':json.loads((ROOT/'excluded-sources.json').read_text()),'cohorts':cohorts,'previousReportUrl':'/research/archive/nba-v1.json','summary':summary,'runs':runs,'errors':errors,'limitations':[f"{len(benchmark['cases'])} AI-authored source-aware questions; labels have not been independently or professionally validated.",'Known-passage evidence hits and reciprocal rank are retrieval metrics, not answer accuracy or legal correctness.','Relevance labels identify one specific supporting passage per question; other relevant passages may be unlabelled.','No training or fine-tuning; no test questions or anchors are embedded into the corpus.','Documents include an original rule and its amendment. Retrieval does not automatically resolve version conflicts.','Generated answers are raw unreviewed FLAN-T5-small outputs; retrieved sources are not verified claim citations.','English-bearing pages only; PDF extraction can retain mixed-language headers and broken words.','Local CPU timings exclude model loading and use warmed models; a single run is not a robust performance benchmark.','Corpus contains four NBA snapshots and user-provided Ayush examination guidelines. The standalone Patents Act and TKDL/InPASS records are not indexed. Ayush questions test guideline passage retrieval, not patentability decisions.']}
    path=ROOT/'results/latest.json';path.write_text(json.dumps(result,ensure_ascii=False,indent=2))
    public=ROOT.parent/'prototype/public/research';public.mkdir(parents=True,exist_ok=True)
    (public/'results.json').write_text(path.read_text())
    (public/'passages.json').write_text(json.dumps(engine.passages,ensure_ascii=False))
    (public/'benchmark.json').write_text(json.dumps(benchmark,ensure_ascii=False,indent=2))
    with (public/'metrics.csv').open('w') as f:
        writer=csv.DictWriter(f,fieldnames=list(summary[0]));writer.writeheader();writer.writerows(summary)
    print(json.dumps(summary,indent=2),flush=True)
