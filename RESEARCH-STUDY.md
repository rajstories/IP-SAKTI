# IP-SAKTI Sahayak: comparative retrieval study

Working research protocol · 16 November 2026 · DTU/CSE/BTP/GP106

## Research question

For Indian formulation enquiries with incomplete facts, does source-linked clarification improve supported, case-specific resolution beyond changing the retrieval method alone, at a reasonable interaction and inference cost?

This is a testable research direction, not an established novelty claim. Legal clarification, graph-based missing-fact detection and retrieval-augmented legal assistance already exist. The contribution must come from a defensible task definition, a reviewed benchmark, controlled experiments and an analysis of when the intervention helps or fails.

## Current evidence of progress

**Implementation update:** an NBA + Ayush-document retrieval pilot has now been executed. See [measured results](research/RESULTS.md) and [reproduction instructions](research/README.md). The planning status below records the earlier starting point; the pilot is not the planned full formulation-clarification study.

### Starting point before the pilot

The working website provides curated formulation journeys, source inspection and case management. The research workspace adds proposed method diagrams, an illustrative paired-case interaction, protocol export and a validated viewer for externally recorded experiment logs. It does not execute retrieval or model inference. No experimental scores have been recorded. Do not describe plans, diagrams or test fixtures as completed experiments, or backdate implementation activity.

## Comparisons

| ID | Method | Purpose | Priority |
|---|---|---|---|
| B1 | Dense retrieval + generation | Semantic retrieval baseline | First pilot |
| B2 | BM25 + dense retrieval + fusion + generation | Test the effect of lexical evidence alongside semantic evidence | First pilot |
| P1 | B2 + source-linked clarification | Test targeted missing-fact recovery | After B2 works |
| E1 | Graph-assisted retrieval | Test linked provisions and multi-source evidence | Extension |
| E2 | Document-tree retrieval | Test definitions, parent sections and exceptions | Extension |
| E3 | Bounded agentic retrieval | Test adaptive search against a fixed workflow | Extension |

Use the same reranker in B1 and B2, or omit it from both. Keep the generator checkpoint, answer prompt, corpus snapshot and final evidence-token budget fixed. Specify the actual embedding model, retrieval settings, fusion rule and random seeds in the experiment configuration.

A graph database is an implementation choice, not another RAG baseline. A source-linked condition graph is not automatically Microsoft GraphRAG. “Vectorless” covers several methods, including lexical retrieval; select a specific hierarchy-search implementation before evaluating it. Agentic control can operate above any retriever, so a six-way comparison without controls would mix several effects.

## Proposed system

1. Ingest permitted public documents, preserve section hierarchy and assign stable passage IDs.
2. Store source URL, issuing body, jurisdiction, document/version date when verified and retrieval date. Keep statutory text separate from commentary and illustrative examples.
3. Retrieve initial passages from the supplied case facts.
4. Identify a decision-relevant condition whose required fact is absent. In the first pilot, explicitly label any manually curated condition mappings.
5. Ask at most two source-linked questions; obtain replies only from the case's predefined answer bank. An unknown answer stays unknown.
6. Refresh retrieval with the additional facts and generate a cited answer, or explain the unresolved condition.
7. Retain retrieved IDs, user-visible questions and replies, answer, timings, model calls and token usage. Record errors as well as successful runs.

Use pretrained transformer embeddings and a pretrained generator. Describe this as applying deep-learning models, not training a new transformer. A rule-based clarification policy is a valid initial baseline when labelled accurately.

## Pilot data and scoring

Start with one task family, such as identifying which product-category sources need consultation. Expand to patentability considerations and ABS information requirements only after the corpus and labels for those tasks are reviewed. Avoid trying to establish product approval from ingredient names alone.

Target five development case families, ten separate evaluation families with complete/incomplete variants, and five unresolved or out-of-scope controls: 25 evaluation inputs. These are proposed pilot sizes, not collected data. Keep related variants in the same split. Do not place answer keys or hidden case facts into the retrieval corpus.

For each family, record the decisive fact, answerable clarification questions, expected relevant passages, applicable conditions and acceptable answer/abstention criteria. Start with team review; report it as team review. Seek qualified review for the relevant Ayurveda and legal/regulatory judgements. Report the number actually reviewed and unresolved disagreements.

Score separately:

- Retrieval: recall of annotated supporting passages at a fixed k, with limitations of incomplete relevance labels disclosed.
- Evidence support: substantive claims supported by their cited passages, divided by assessed substantive claims.
- Applicability: correct use of the case facts and source conditions, including correctly unresolved cases.
- Supported resolution: correct, supported substantive answers divided by reviewed cases. Report justified abstention separately so answering nothing cannot appear to be perfect performance.
- Clarification: necessary-fact recovery and unnecessary questioning on complete cases.
- Cost: end-to-end latency, questions, model calls, tokens, indexing cost and failed runs.

The website currently summarizes reviewer counts, supported resolutions, unsupported conclusions, question count and latency from imported completed runs. It does not yet compute claim-level citation metrics, retrieval recall, uncertainty intervals or failure rates. Keep those in the experiment report until implemented.

## Controls that matter

Compare B1 and B2 on identical inputs. Compare B2 and P1 on the same incomplete inputs. Also run B2 with complete facts upfront: improvement from receiving more information must not be attributed to a better language model. Both baselines may abstain.

For the subsequent study, compare generic clarification and source-linked clarification under the same question budget. Add minimal counterfactual variants that change one decisive fact while preserving the rest. Run the selected retrieval methods both with and without clarification where feasible; this separates retrieval effects from interaction effects. Review outputs with method labels hidden where practical.

Report paired case-level outcomes, raw counts and failure examples. Use family-level uncertainty estimates for a larger study because variants from one family are dependent. A small, manually curated pilot supports feasibility observations, not broad accuracy claims or proof of generalisation.

## Delivery sequence

For the internal assessment, show the working demo, related-work boundary, corpus plan, two baseline designs and the proposed intervention. Include results only for experiments actually run and reviewed. If time permits only retrieval, report passage-retrieval results and label generation as pending.

The next implementation milestone is a reproducible corpus snapshot, B1 and B2 runners, case files and raw traces. Then add P1 and the complete-facts control. By December, aim to integrate the tested pipeline, review the pilot labels, expand the benchmark and document limitations. Subsequent work should select graph or hierarchy retrieval based on observed failures, add controlled ablations and independent review, then prepare a manuscript from actual findings. Paper acceptance is not guaranteed by the project architecture.

## Related-work boundary

- [Intelligent Legal Assistant, WWW Companion 2025](https://arxiv.org/html/2502.07904v1): already combines missing legal facts, fact–rule graph structure and clarification. Graph-guided clarification alone is not a defensible novelty claim.
- [Clarify When Necessary, Findings of NAACL 2025](https://aclanthology.org/2025.findings-naacl.306/): studies when asking a question is worthwhile. Include unnecessary-question and interaction-cost measures.
- [Factual Clarification Question Generation, GEM 2025](https://aclanthology.org/2025.gem-1.15/): motivates separating missing-fact recovery from downstream answer quality.
- [Microsoft GraphRAG query documentation](https://microsoft.github.io/graphrag/query/overview/): local entity-focused retrieval and global corpus summarisation are distinct modes. Select the mode that matches the task.
- [PageIndex official implementation](https://github.com/VectifyAI/PageIndex): one concrete document-tree approach to investigate, not evidence that all vectorless methods outperform dense retrieval.
- [Agentic RAG survey](https://arxiv.org/abs/2501.09136): useful architecture taxonomy; a survey is not experimental evidence for this application's performance.

The candidate contribution is a source-versioned, paired formulation-applicability benchmark and controlled evidence about retrieval, clarification and abstention. A broader literature review and observed baseline failures are still needed before calling that contribution novel.
