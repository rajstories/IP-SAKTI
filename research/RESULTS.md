# Measured retrieval pilot v2 — 16 November 2026

## Corpus and execution

Five source PDFs, 82 included pages and 347 indexed passages. Four NBA-hosted documents retain their original download provenance. The fifth is the user-provided 2025 Guidelines for Examination of Ayush Related Inventions. Its title, issuer and year were checked against the uploaded PDF. The original download time is unknown and the bytes were not independently compared with the blocked official endpoint. Its SHA-256 and actual import time are recorded. Only substantive PDF pages 5–18 (printed pages 1–14) were indexed; covers, contents and promotional examples were excluded.

The v2 benchmark retains all 24 original ABS questions and adds 16 Ayush questions. All labels are AI-authored and source-aware, frozen before scoring, with no independent validation. All three methods search the same five-document corpus. No model training, reranking or post-result tuning occurred. All 120 retrieval-and-generation runs completed without execution errors; raw answers and exact prompts are retained.

## All 40 questions

| Method | Hit@1 | Hit@3 | Hit@5 | MRR@5 |
|---|---:|---:|---:|---:|
| bm25 | 52.5% | 77.5% | 87.5% (35/40) | 0.661 |
| dense | 35.0% | 62.5% | 67.5% (27/40) | 0.482 |
| hybrid | 45.0% | 75.0% | 90.0% (36/40) | 0.624 |

## Ayush guidelines — 16 questions

| Method | Hit@1 | Hit@3 | Hit@5 | MRR@5 |
|---|---:|---:|---:|---:|
| bm25 | 68.8% | 87.5% | 100.0% (16/16) | 0.812 |
| dense | 50.0% | 62.5% | 68.8% (11/16) | 0.565 |
| hybrid | 50.0% | 87.5% | 93.8% (15/16) | 0.693 |

## Original ABS questions on the expanded corpus — 24 questions

| Method | Hit@1 | Hit@3 | Hit@5 | MRR@5 |
|---|---:|---:|---:|---:|
| bm25 | 41.7% | 70.8% | 79.2% (19/24) | 0.560 |
| dense | 25.0% | 62.5% | 66.7% (16/24) | 0.427 |
| hybrid | 41.7% | 66.7% | 87.5% (21/24) | 0.578 |

## Interpretation

Hybrid has the highest combined Hit@5 (36/40), but BM25 leads on Ayush questions (16/16 versus hybrid 15/16). BM25 also has higher combined MRR@5. This does not establish that hybrid or dense retrieval is universally superior. Small source-aware questions favour vocabulary from the sources and cannot establish performance on unseen user formulations. Ayush 16/16 is a labelled-passage retrieval score, not 100% answer accuracy.

For the unchanged 24 ABS questions, adding the Ayush document changes BM25 Hit@5 from 18/24 to 19/24, dense remains 16/24, and hybrid remains 21/24. The corpus changed, so these are corpus-expansion observations, not algorithm improvements. The original v1 report and corpus are preserved under `versions/nba-v1/` and the website offers its report download.

## Observed failure and next experiment

Q22 hybrid retrieves the annotated Form 11A passage at rank 2 but generates `FORM-11`. A14 hybrid retrieves the annotated device passage at rank 3 but generates `no`. Inspection of the saved model prompts confirms that prefix truncation removes the critical clauses before generation in both examples. This identifies a concrete context-selection failure; it does not show that the model ignored evidence it received.

A defensible next experiment is to compare fixed-prefix context packing with sentence-aware evidence selection at the same token budget, using separate development cases and newly authored, independently reviewed evaluation cases. Assess whether the required supporting clause actually reaches the generator, then separately review claim support and answer correctness. These examples are now development evidence and should not be reused as unseen tests. This is a candidate research direction, not a verified literature novelty claim.

The uploaded study protocol is preserved in `imports/`. Its proposed clarification study has not been executed. Its hybrid stage includes reranking, whereas this pilot uses RRF without reranking. Its cited-generation and supported-resolution objectives remain unmeasured. Graph-assisted, document-tree and agentic retrieval remain proposed extensions.

## Scope and reproduction

See `README.md`. The standalone Patents Act is still excluded, and no full TKDL, InPASS, trademark, design or GI records were searched. Guideline quotations of legal provisions do not replace a complete Patents Act corpus. Original rules and amendments are indexed separately without automatic version reconciliation.

Hit@k measures retrieval of the labelled supporting span from the specified physical PDF page. MRR@5 is the reciprocal rank of the first such passage or zero. Alternative relevant passages may be unlabelled. Timings are single-run warmed CPU measurements. No generated-answer accuracy, patentability decision, expert verification or statistically established superiority is claimed.
