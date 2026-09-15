import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGuidance, createCase, firstUnanswered, questionKeys, setFact, UNKNOWN } from './case';

test('wizard asks only questions relevant to the current pathway', () => {
  const cosmetic = { use: 'cosmetic' };
  const medicine = { use: 'medicine', reference: 'yes' };
  assert.deepEqual(questionKeys(cosmetic), ['description', 'use']);
  assert.deepEqual(questionKeys(medicine), ['description', 'use', 'reference', 'change', 'origin']);
});

test('editing an earlier answer invalidates later answers and the result', () => {
  let record = createCase('classical', 'en');
  record = setFact(record, 'use', 'medicine');
  record = setFact(record, 'reference', 'yes');
  record = setFact(record, 'change', 'same');
  record = setFact(record, 'origin', 'india');
  record = { ...record, complete: true };
  const changed = setFact(record, 'use', 'cosmetic');
  assert.equal(changed.complete, false);
  assert.equal(changed.facts.reference, undefined);
  assert.equal(changed.facts.origin, undefined);
  assert.equal(firstUnanswered(changed.facts), null);
  assert.equal(buildGuidance(changed).claims.some(claim => claim.id === 'traditional-knowledge'), false);
});

test('uncertainty produces missing-fact status rather than a classification verdict', () => {
  let record = createCase('modified', 'en');
  record = setFact(record, 'use', 'food');
  record = setFact(record, 'reference', UNKNOWN);
  record = setFact(record, 'origin', UNKNOWN);
  const guidance = buildGuidance(record);
  assert.deepEqual(guidance.missing, ['reference', 'origin']);
  assert.ok(guidance.claims.some(claim => claim.status === 'missing'));
});

test('unmatched free text reports the prototype boundary instead of canned guidance', () => {
  let record = createCase(null, 'en');
  record = setFact(record, 'description', 'An unfamiliar botanical formulation');
  record = setFact(record, 'use', 'food');
  record = setFact(record, 'reference', 'no');
  record = setFact(record, 'origin', 'india');
  const guidance = buildGuidance(record);
  assert.deepEqual(guidance.sourceIds, []);
  assert.equal(guidance.claims[0]?.id, 'prototype-coverage');
});

test('the export sample keeps Indian and US claims in separate scopes', () => {
  let record = createCase('export', 'en');
  record = setFact(record, 'use', 'food');
  record = setFact(record, 'reference', 'no');
  record = setFact(record, 'origin', 'india');
  record = { ...record, jurisdiction: 'compare', market: 'us' };
  const claims = buildGuidance(record).claims;
  assert.ok(claims.some(claim => claim.scope === 'India' && claim.sourceIds.includes('food')));
  assert.ok(claims.some(claim => claim.scope === 'United States' && claim.sourceIds.includes('fda')));
});

test('unsupported international selections never reuse US destination-market claims', () => {
  let record = createCase('export', 'en');
  record = setFact(record, 'use', 'food');
  record = setFact(record, 'reference', 'no');
  record = setFact(record, 'origin', 'india');
  record = { ...record, jurisdiction: 'international', market: 'pct' };
  assert.equal(buildGuidance(record).claims.some(claim => claim.scope === 'United States'), false);
});
