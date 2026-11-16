# Uploaded study protocol

`ip-sakti-study-protocol.json` is retained unchanged as a planning artifact. It is not a results import or executable instruction.

Implemented: BM25, MiniLM dense retrieval and RRF hybrid retrieval, with the same FLAN-T5-small generator and context budget. Not implemented: reranker, validated claim citations, source-linked clarification experiment, graph-assisted retrieval, document-tree retrieval or agentic control.

The measured benchmark is a 40-question known-passage retrieval pilot, not the protocol’s family-separated clarification evaluation. Its 120 generated answers have no independently reviewed correctness score. See `../RESULTS.md` for executed findings.
