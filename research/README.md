# Real retrieval and generation pilot

This implementation downloads public government source documents, chunks their extracted text, runs three actual retrievers and invokes a local pretrained text generator. The website displays the saved measurements and can also search new questions. No paid API is required.

## On the prepared Mac

Double-click `research/start.command`, keep its Terminal window open, and open the local URL printed by Vite. In the website, choose **Research workspace → Measured pilot**.

- **Measured results:** recorded scores, rankings, raw generated answers and downloads.
- **Source corpus:** included and excluded sources, official links, download dates and file hashes.
- **Ask the corpus:** browser BM25 works independently; select a local-server method for dense/hybrid retrieval and optionally enable FLAN-T5 generation.

The existing formulation wizard still uses curated samples. It is not silently backed by this new experimental pipeline.

## Fresh setup

From the repository root, using Python 3.11 or later:

```sh
python3 -m venv .research-runtime/venv
.research-runtime/venv/bin/python -m pip install -r research/requirements.txt
.research-runtime/venv/bin/python research/download_models.py
.research-runtime/venv/bin/python research/evaluate.py
```

On Windows, use `.research-runtime\venv\Scripts\python.exe`. Install the frontend dependencies with `npm install` in `prototype/`.

The commands above use the tracked extracted corpus snapshot for offline replication. `prepare.py` is an optional acquisition tool; do not run it to reproduce a frozen corpus because fresh downloads may change its content. `import_ayush.py` records a user-provided PDF and archives v1; it refuses to overwrite an already imported source.

`download_models.py` uses the committed model revisions when available. Existing source PDFs and their receipts are reused. A fresh website download may differ or fail; compare SHA-256 hashes against the published report before claiming an exact replication. The extracted page snapshot is tracked to allow offline replication without downloading the source PDFs again. Keep the frozen benchmark/configuration unchanged for a replication. For changed documents or settings, create a new benchmark version and retain the previous result file.

Start the inference server:

```sh
.research-runtime/venv/bin/python research/server.py
```

In another terminal:

```sh
cd prototype
npm run dev -- --host 127.0.0.1
```

The Vite proxy forwards `/api/research` to the loopback-only Python server on port 8765. The server makes no external inference requests. It does not persist live questions or change benchmark scores.

## Implementation

- BM25: lexical tokenizer with a fixed stopword list; k1=1.5, b=0.75.
- Dense: `sentence-transformers/all-MiniLM-L6-v2`, attention-mask mean pooling, L2 normalisation and cosine similarity. CPU, four threads. This is real pretrained transformer inference.
- Hybrid: reciprocal-rank fusion, constant 60, depth 50 per retriever. Zero-score lexical documents are omitted. No reranker or learned fusion weights.
- Corpus chunks: 180 MiniLM tokens, overlap 30, boundaries restricted to one physical PDF page. Only source text is embedded; evaluation queries, labels and answers are never in the index.
- Generation: `google/flan-t5-small`, same prompt and greedy decoding for every method, 96 maximum new tokens. It receives up to 120 generator tokens from each of the first three retrieved passages, within a 512-token total input limit. Exact final model input is saved.
- Index cache: keyed by corpus, passage, model-revision and configuration hashes.

## Evaluation and limits

The v2 benchmark contains 40 AI-authored questions (24 ABS and 16 Ayush) and source-span labels, not independently validated ground truth. It is a source-aware feasibility pilot, not a held-out generalisation benchmark. The labels were frozen before ranking results were inspected. No model training or tuning was done on them.

Hit@1/3/5 tests whether a labelled supporting span from the specified PDF page occurs in the first k retrieved chunks. MRR@5 uses the reciprocal rank of the first matching chunk. Other relevant passages may be unlabelled. Failures count as zero in aggregate retrieval metrics and are retained in the error log.

One hundred and twenty actual model answers are retained, but no answer-correctness metric is claimed. FLAN-T5-small often gives weak or incorrect answers. The experiment can therefore demonstrate retrieval improvements while showing why generation, version handling and applicability still need work. Inspect Q22: the hybrid run retrieves the annotated Form 11A span but returns `FORM-11`. The saved prompt confirms that prefix truncation removed the Form 11A clause before generation. Attribute this example to context selection and the incorrect final response, rather than claiming the model ignored supplied evidence.

Original 2024 rule text and the 2025 replacement both occur in the index. The system is not a legal consolidation or version-resolution engine. No legal approval or professional verification is claimed.

The corpus contains four NBA-hosted PDFs plus user-provided Ayush examination guidelines (substantive PDF pages 5–18 only). The upload has a hash, import time and local PDF link; original download time is unknown. The standalone Patents Act remains excluded after IP India returned HTTP 403 and India Code timed out. No full TKDL, InPASS, trademark, design or GI search occurred. The archived v1 corpus and results remain in `versions/nba-v1/`.

## Artifacts

- `sources.json`: source candidates.
- `corpus-pages.json`: downloaded and user-provided sources, metadata and extracted page text.
- `excluded-sources.json`: failed source downloads.
- `benchmark.json`: frozen questions and supporting spans.
- `model-lock.json`: exact downloaded model revisions.
- `results/freeze-*.json`: pre-scoring protocol freeze.
- `results/latest.json`: all rankings, measured times, raw generation, exact prompts, metrics and hashes.
- `RESULTS.md`: readable findings.
- `../prototype/public/research/`: the published static report, passage index, annotated benchmark and CSV.

## Verification

```sh
.research-runtime/venv/bin/python research/test_engine.py
cd prototype
node --import tsx --test src/lib/*.test.ts
npm run build
```

The frontend test recomputes every reported score from raw rankings and labels, and checks that browser BM25 reproduces all 40 Python BM25 rankings and scores.

## Deployment boundary

The Vercel static build includes measured results, downloads and real browser BM25 search. The Python model server is local and is not deployed by the current Vercel configuration. Dense/hybrid live inference and generation require that server or a separately hosted inference endpoint. The UI states when the server is unavailable; it never substitutes a fixture answer for a failed live request.
