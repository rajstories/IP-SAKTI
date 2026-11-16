export const methods = [
  { id: 'dense', code: 'B1', name: 'Dense RAG', kind: 'Core baseline', question: 'Can semantic similarity retrieve the evidence this case needs?', stages: ['Supplied facts', 'Transformer embeddings', 'Same reranking stage', 'Cited generation'], change: 'Semantic retrieval only. No interactive clarification stage.', limit: 'A relevant passage does not establish that its conditions apply to the case.', reference: 'https://aclanthology.org/2024.naacl-long.389/' },
  { id: 'hybrid', code: 'B2', name: 'Hybrid RAG', kind: 'Core baseline', question: 'Do exact legal terms and semantic matches complement each other?', stages: ['Supplied facts', 'BM25 + embeddings', 'Fusion + same reranker', 'Cited generation'], change: 'Replace dense-only retrieval with lexical and semantic retrieval. Hold the reranker, generator and evidence budget fixed; omit reranking from both if it is unavailable.', limit: 'Better retrieval cannot supply facts the user has not provided.', reference: 'https://link.springer.com/article/10.1007/s10506-026-09537-2' },
  { id: 'clarified', code: 'P1', name: 'Hybrid + clarification', kind: 'Proposed comparison', question: 'Does collecting the missing fact improve a supported, case-specific answer?', stages: ['Initial hybrid retrieval', 'Source-linked questions', 'Updated facts + retrieval', 'Same cited generation'], change: 'Add a bounded clarification stage to B2. Unknown answers remain unknown.', limit: 'Use a complete-facts control; extra information is not evidence of a better language model.', reference: 'https://aclanthology.org/2025.findings-naacl.306/' },
  { id: 'graph', code: 'E1', name: 'Graph-assisted RAG', kind: 'Study extension', question: 'Does traversing source relationships help with multi-source questions?', stages: ['Case entities', 'Source-linked graph', 'Bounded traversal', 'Passages + generation'], change: 'Test graph-assisted evidence selection on cases that require linked provisions. Record the cost and review of graph construction.', limit: 'A curated condition graph is not automatically Microsoft GraphRAG. A graph database is storage, not an additional baseline.', reference: 'https://microsoft.github.io/graphrag/query/overview/' },
  { id: 'tree', code: 'E2', name: 'Document-tree retrieval', kind: 'Study extension', question: 'Does keeping a provision with its parent section preserve important context?', stages: ['Case question', 'Document hierarchy', 'Section selection', 'Passages + generation'], change: 'Evaluate hierarchy-based retrieval on definition, exception and cross-reference cases. Specify the actual traversal implementation.', limit: '“Vectorless” describes a family, not one algorithm. BM25 is also vectorless; a section browser alone is not a RAG experiment.', reference: 'https://github.com/VectifyAI/PageIndex' },
  { id: 'agentic', code: 'E3', name: 'Agentic retrieval', kind: 'Study extension', question: 'Does choosing another search step help enough to justify its cost?', stages: ['Case question', 'Plan / select tool', 'Budgeted search loop', 'Evidence-led response'], change: 'Allow a controller to choose retrieval actions within a fixed call and token budget; compare it with a fixed workflow.', limit: 'Agentic control can use dense, hybrid or graph retrieval. Count every model call and include failed or exhausted runs.', reference: 'https://arxiv.org/abs/2501.09136' },
] as const;
export type MethodId = typeof methods[number]['id'];
export const RESEARCH_KEY = 'ip-sakti-research-runs-v1';

export interface ExperimentRun {
  caseId: string;
  familyId: string;
  variant: 'complete' | 'incomplete' | 'unresolved';
  method: MethodId;
  answer: string;
  retrievedPassageIds: string[];
  questions: string[];
  latencyMs: number;
  review: null | { reviewer: string; appropriate: boolean; unsupportedConclusion: boolean; resolved: boolean };
}
export interface ExperimentBatch {
  schemaVersion: 1;
  datasetVersion: string;
  corpusVersion: string;
  generator: string;
  promptVersion: string;
  retrievalConfig: string;
  evidenceTokenBudget: number;
  maxClarificationTurns: number;
  recordedAt: string;
  runs: ExperimentRun[];
}
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 30000;
const textList = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 100 && value.every(isText);
export function parseBatch(raw: string): ExperimentBatch {
  if (raw.length > 2_000_000) throw new Error('Choose a JSON file smaller than 2 MB.');
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Error('This file is not valid JSON.'); }
  if (!isObject(data) || data.schemaVersion !== 1) throw new Error('Expected experiment schema version 1. Download the empty template for its format.');
  for (const key of ['datasetVersion', 'corpusVersion', 'generator', 'promptVersion', 'retrievalConfig', 'recordedAt']) {
    if (!isText(data[key])) throw new Error(`Missing provenance: ${key}.`);
  }
  if (!Number.isFinite(Date.parse(data.recordedAt as string))) throw new Error('recordedAt must be a valid date.');
  if (!Number.isInteger(data.evidenceTokenBudget) || Number(data.evidenceTokenBudget) < 1) throw new Error('Provide a positive evidenceTokenBudget.');
  if (!Number.isInteger(data.maxClarificationTurns) || Number(data.maxClarificationTurns) < 0 || Number(data.maxClarificationTurns) > 20) throw new Error('maxClarificationTurns must be an integer from 0 to 20.');
  if (!Array.isArray(data.runs) || data.runs.length < 1 || data.runs.length > 1000) throw new Error('Import 1–1000 recorded runs. The empty template does not contain results.');
  const ids = new Set<string>();
  const cases = new Map<string, string>();
  for (const [i, run] of data.runs.entries()) {
    const fail = (message: string): never => { throw new Error(`Run ${i + 1}: ${message}`); };
    if (!isObject(run)) fail('expected an object.');
    const row = run as Record<string, unknown>;
    if (!isText(row.caseId) || !isText(row.familyId) || !isText(row.answer)) fail('caseId, familyId and answer are required.');
    if (!methods.some(method => method.id === row.method)) fail('unknown method.');
    if (!['complete', 'incomplete', 'unresolved'].includes(String(row.variant))) fail('unknown case variant.');
    if (!textList(row.retrievedPassageIds) || !textList(row.questions)) fail('passage IDs and questions must be lists of non-empty strings.');
    if ((row.questions as string[]).length > Number(data.maxClarificationTurns)) fail('question count exceeds the declared clarification budget.');
    if (typeof row.latencyMs !== 'number' || !Number.isFinite(row.latencyMs) || row.latencyMs < 0) fail('latencyMs must be a non-negative number.');
    const key = JSON.stringify([row.caseId, row.method]);
    if (ids.has(key)) fail('duplicate case/method pair. Use a separate batch for repeated trials.');
    ids.add(key);
    const identity = JSON.stringify([row.familyId, row.variant]);
    if (cases.has(String(row.caseId)) && cases.get(String(row.caseId)) !== identity) fail('a case must keep the same family and variant across methods.');
    cases.set(String(row.caseId), identity);
    if (row.review !== null) {
      if (!isObject(row.review) || !isText(row.review.reviewer) || ['appropriate', 'unsupportedConclusion', 'resolved'].some(key => typeof (row.review as Record<string, unknown>)[key] !== 'boolean')) fail('review must be null or contain a reviewer and all three boolean scores.');
      if ((row.review as Record<string, unknown>).resolved && (row.review as Record<string, unknown>).unsupportedConclusion) fail('a supported resolution cannot also contain an unsupported conclusion.');
      if ((row.review as Record<string, unknown>).resolved && !(row.review as Record<string, unknown>).appropriate) fail('a supported resolution must be marked appropriate.');
    }
  }
  return data as unknown as ExperimentBatch;
}
export function methodStats(batch: ExperimentBatch, method: MethodId) {
  const runs = batch.runs.filter(run => run.method === method);
  const reviewed = runs.filter(run => run.review !== null);
  return { count: runs.length, reviewed: reviewed.length,
    unsupported: reviewed.filter(run => run.review?.unsupportedConclusion).length,
    resolved: reviewed.filter(run => run.review?.resolved).length,
    meanQuestions: runs.length ? runs.reduce((sum, run) => sum + run.questions.length, 0) / runs.length : null,
    meanLatency: runs.length ? runs.reduce((sum, run) => sum + run.latencyMs, 0) / runs.length : null };
}
export function matchedCases(batch: ExperimentBatch) {
  const included = methods.filter(method => batch.runs.some(run => run.method === method.id));
  if (included.length < 2) return 0;
  const sets = included.map(method => new Set(batch.runs.filter(run => run.method === method.id).map(run => run.caseId)));
  return [...sets[0]].filter(id => sets.every(set => set.has(id))).length;
}
export const emptyBatch = { schemaVersion: 1, datasetVersion: '', corpusVersion: '', generator: '', promptVersion: '', retrievalConfig: '', evidenceTokenBudget: 1200, maxClarificationTurns: 2, recordedAt: '', runs: [] };
export const studyProtocol = {
  title: 'IP-SAKTI Sahayak — formulation-aware retrieval study', status: 'Planned study; no experimental findings included', scope: 'India; English pilot',
  question: 'Does source-linked clarification improve supported resolution and reduce incorrect applicability at comparable answer coverage?',
  coreMethods: methods.slice(0, 3), extensions: methods.slice(3),
  pilotTarget: { developmentFamilies: 5, pairedEvaluationFamilies: 10, variantsPerFamily: 2, unresolvedCases: 5 },
  controls: ['Same corpus and generator checkpoint', 'Same reranker in both retrieval baselines, or omit it from both', 'Same evidence-token budget and answer prompt', 'Complete-facts baseline control', 'Both baselines may abstain', 'No test answers or hidden facts in the retrieval index', 'Frozen family-separated evaluation set'],
  laterExperiments: ['Generic versus source-linked clarification at the same turn budget', 'Graph traversal for cross-provision cases', 'Document hierarchy for definitions and exceptions', 'Separate support and applicability ablations'],
};
