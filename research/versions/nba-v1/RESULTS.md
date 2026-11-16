# Measured retrieval pilot — 16 November 2026

## What was actually run

Four public NBA-hosted PDFs were downloaded, hashed and extracted into 299 overlapping passages from 68 English-bearing pages. All three retrieval methods used identical passage text. The corpus includes the 2023 amending Act, the 2024 Rules, the 2025 amending Rules and the 2025 ABS Regulations. It is not a consolidated or comprehensive legal database.

The 24 source-aware pilot questions and supporting-span labels were AI-authored and frozen before the first evaluation. They have not been independently reviewed. No model was fine-tuned. These are known-passage retrieval results, not validated legal-answer accuracy.

| Method | Hit@1 | Hit@3 | Hit@5 | MRR@5 | Mean retrieval |
|---|---:|---:|---:|---:|---:|
| bm25 | 41.7% | 66.7% | 75.0% (18/24) | 0.549 | 0.56 ms |
| dense | 25.0% | 62.5% | 66.7% (16/24) | 0.427 | 4.97 ms |
| hybrid | 41.7% | 70.8% | 87.5% (21/24) | 0.581 | 4.10 ms |

Hit@k means a returned chunk contains the labelled span from the specified source page. MRR@5 is reciprocal rank of the first matching passage, or zero if absent. Equivalent passages outside the provisional labels may be relevant. Small source-aware samples cannot establish general superiority. Timings are single-run, warmed CPU measurements; model loading is excluded.

## Findings worth presenting

Hybrid retrieved the labelled evidence for 21/24 questions, compared with 18/24 for BM25 and 16/24 for dense retrieval. This is a descriptive result on this pilot only. Hybrid still missed three targets.

Every one of the 72 runs also invoked the same local FLAN-T5-small generator. The raw outputs are retained and unreviewed; there is no generated-answer accuracy score. For Q22, the hybrid run found the annotated Form 11A evidence among the top five passages, but the model output was `FORM-11`. Retrieval success therefore did not establish answer correctness. The saved model input confirms that prefix truncation removed the Form 11A clause before generation. This is a context-selection failure as well as an incorrect final answer; it does not show that the model ignored a clause it actually received.

The 2024 Rules and 2025 amendment contain different certificate procedures. A version-aware resolver and an applicability check are motivated by these source conditions, but their effectiveness has not yet been tested.

## Reproduction and artifacts

See `research/README.md` for commands. `research/results/latest.json` contains raw rankings, generated text, exact model input, timings, model revisions, source hashes, configuration and frozen-label hash. `prototype/public/research/` contains the same report for the website, the passage index, benchmark labels and metric CSV.

No full TKDL records, InPASS, trade-mark, design or GI database records were accessed. India Code timed out; the IP India PDF endpoints rejected downloads. These sources were excluded.

## Limitations

- 24 AI-authored source-aware questions; labels have not been independently or professionally validated.
- Known-passage evidence hits and reciprocal rank are retrieval metrics, not answer accuracy or legal correctness.
- Relevance labels identify one specific supporting passage per question; other relevant passages may be unlabelled.
- No training or fine-tuning; no test questions or anchors are embedded into the corpus.
- Documents include an original rule and its amendment. Retrieval does not automatically resolve version conflicts.
- Generated answers are raw unreviewed FLAN-T5-small outputs; retrieved sources are not verified claim citations.
- English-bearing pages only; PDF extraction can retain mixed-language headers and broken words.
- Local CPU timings exclude model loading and use warmed models; a single run is not a robust performance benchmark.
- Results concern the downloaded NBA snapshots only; no TKDL, InPASS or patent corpus was searched.
