import test from 'node:test';
import assert from 'node:assert/strict';
import { matchedCases, methodStats, parseBatch, emptyBatch } from './research';

// Synthetic parser fixtures only. Never loaded by the product as measured results.
function fixture() {
  return { ...emptyBatch, datasetVersion: 'TEST-DATA', corpusVersion: 'TEST-CORPUS', generator: 'TEST-MODEL', promptVersion: 'TEST-PROMPT', retrievalConfig: 'unit-test fixture', recordedAt: '2026-11-16T00:00:00Z', runs: [
    { caseId: 'test-1', familyId: 'family-1', variant: 'incomplete', method: 'hybrid', answer: 'Synthetic unit-test output.', retrievedPassageIds: ['test-source'], questions: [], latencyMs: 100, review: null },
  ] };
}
test('an empty template cannot become experimental results', () => {
  const data = { ...fixture(), runs: [] };
  assert.throws(() => parseBatch(JSON.stringify(data)), /1–1000 recorded runs/);
});
test('logs require provenance and known methods', () => {
  const data = fixture(); data.generator = '';
  assert.throws(() => parseBatch(JSON.stringify(data)), /generator/);
  data.generator = 'TEST'; data.runs[0].method = 'made-up-rag';
  assert.throws(() => parseBatch(JSON.stringify(data)), /unknown method/);
});
test('duplicate case/method rows cannot inflate the sample size', () => {
  const data = fixture(); data.runs.push({ ...data.runs[0] });
  assert.throws(() => parseBatch(JSON.stringify(data)), /duplicate/);
});
test('unreviewed runs are not treated as correct or as zero errors', () => {
  const batch = parseBatch(JSON.stringify(fixture()));
  const stats = methodStats(batch,'hybrid');
  assert.equal(stats.count,1); assert.equal(stats.reviewed,0);
  assert.equal(methodStats(batch,'graph').meanLatency,null);
  assert.equal(matchedCases(batch),0);
});
test('review denominators include only assessed rows', () => {
  const data = fixture();
  const reviewed = { ...data.runs[0], caseId: 'test-2', review: { reviewer: 'Unit test', appropriate: true, unsupportedConclusion: false, resolved: true } };
  const batch = parseBatch(JSON.stringify({ ...data, runs: [...data.runs,reviewed] }));
  assert.equal(methodStats(batch,'hybrid').reviewed,1);
  assert.equal(methodStats(batch,'hybrid').resolved,1);
});
test('inconsistent scoring and over-budget clarifications are rejected', () => {
  const data = fixture();
  assert.throws(() => parseBatch(JSON.stringify({ ...data, runs: [{ ...data.runs[0], review: { reviewer: 'Unit test', appropriate: true, unsupportedConclusion: true, resolved: true } }] })), /cannot also/);
  data.runs[0].questions = [];
  assert.throws(() => parseBatch(JSON.stringify({ ...data, runs: [{ ...data.runs[0], questions: ['one','two','three'] }] })), /budget/);
});
test('matched counts require the same case IDs and identities across methods', () => {
  const data = fixture();
  const batch = parseBatch(JSON.stringify({ ...data, runs: [data.runs[0], { ...data.runs[0], method: 'dense' }, { ...data.runs[0], caseId: 'test-2', method: 'dense' }] }));
  assert.equal(matchedCases(batch),1);
  assert.throws(() => parseBatch(JSON.stringify({ ...data, runs: [data.runs[0], { ...data.runs[0], method: 'dense', variant: 'complete' }] })), /same family and variant/);
});
test('malformed input is rejected without accepting partial records', () => {
  assert.throws(() => parseBatch('bad-json'), /valid JSON/);
  assert.throws(() => parseBatch(JSON.stringify({ ...fixture(), runs: [null] })), /object/);
  assert.throws(() => parseBatch('x'.repeat(2_000_001)), /2 MB/);
});
