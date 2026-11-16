import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { browserSearch } from './pilot';
import type { Passage, PilotReport } from './pilot';

const passages=JSON.parse(readFileSync(new URL('../../public/research/passages.json',import.meta.url),'utf8')) as Passage[];
const report=JSON.parse(readFileSync(new URL('../../public/research/results.json',import.meta.url),'utf8')) as PilotReport;

test('browser BM25 reproduces Python rankings for all frozen pilot questions',()=>{
  for(const run of report.runs.filter(r=>r.method==='bm25')){
    const found=browserSearch(run.query,passages);
    assert.deepEqual(found.map(p=>p.id),run.passages.map(p=>p.id),run.caseId);
    found.forEach((p,i)=>assert.ok(Math.abs(p.score!-run.passages[i].score!)<1e-8));
  }
});
test('an absent lexical term does not return arbitrary sources',()=>{
  assert.deepEqual(browserSearch('zzzzqxyznotincorpus',passages),[]);
  assert.deepEqual(browserSearch('the and a',passages),[]);
});
test('published metrics are recomputable from raw rankings and labels',()=>{
  for(const summary of report.summary){
    const rows=report.runs.filter(r=>r.method===summary.method);
    assert.equal(rows.length,summary.completed);
    const values=rows.map(run=>{
      const item=report.benchmark.cases.find(c=>c.id===run.caseId)!;
      const rank=run.passages.findIndex(p=>item.relevantPassageIds.includes(p.id))+1;
      return {hit1:Number(rank===1),hit3:Number(rank>0&&rank<=3),hit5:Number(rank>0&&rank<=5),rr5:rank?1/rank:0};
    });
    for(const key of ['hit1','hit3','hit5','rr5'] as const)assert.ok(Math.abs(values.reduce((n,v)=>n+v[key],0)/summary.attempted-summary[key])<1e-10);
  }
});

test('cohort denominators and archived ABS labels remain valid',()=>{
  const original=JSON.parse(readFileSync(new URL('../../public/research/archive/nba-v1.json',import.meta.url),'utf8')) as PilotReport;
  for(const c of original.benchmark.cases){
    const updated=report.benchmark.cases.find(item=>item.id===c.id)!;
    for(const key of ['query','documentId','page','anchor','topic','relevantPassageIds'] as const)assert.deepEqual(updated[key],c[key]);
  }
  assert.equal(report.cohorts?.reduce((n,c)=>n+c.cases,0),report.benchmark.cases.length);
  for(const cohort of report.cohorts??[]){
    const ids=new Set(report.benchmark.cases.filter(c=>c.cohort===cohort.id).map(c=>c.id));
    assert.equal(ids.size,cohort.cases);
    for(const summary of cohort.summary){
      const rows=report.runs.filter(r=>r.method===summary.method&&ids.has(r.caseId!));
      assert.equal(summary.attempted,ids.size);
      for(const key of ['hit1','hit3','hit5','rr5'] as const)assert.ok(Math.abs(rows.reduce((n,r)=>n+r.metrics![key],0)/ids.size-summary[key])<1e-10);
    }
  }
});
