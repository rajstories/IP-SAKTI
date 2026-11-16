# IP-SAKTI Sahayak

An evidence-led prototype for exploring intellectual-property and regulatory considerations for AYUSH formulations. The interface keeps Indian and selected international evidence scopes separate, links substantive guidance to curated official sources, and prepares editable summaries for professional review.

## Current prototype

- Guided formulation intake with adaptive questions
- India, International, and Compare views
- Numbered evidence citations with an accessible source drawer
- India–United States sample comparison
- Expandable evidence path with a textual alternative
- Traditional-knowledge and prior-art pointers
- ABS information checklist
- Editable professional-review summary with copy and download
- English and Hindi interface
- Device-local saved cases with rename and delete
- Research workspace with a study protocol and six proposed method descriptions
- Illustrative complete/incomplete case explorer
- Validated import/export of recorded experiment logs and reviewer-score summaries

The formulation wizard uses curated sample data. The research workspace now includes a real NBA + Ayush-document retrieval pilot: BM25, MiniLM dense retrieval, hybrid fusion and local FLAN-T5 generation. Measured retrieval scores are displayed with their raw runs and provisional labels; generated-answer accuracy has not been established. See [the executed pilot](research/README.md) and [results](research/RESULTS.md). Imported external logs remain separate from the recorded pilot. Research content is currently English, with an explicit fallback notice when Hindi is selected.

The comparison protocol and staged implementation plan are in [RESEARCH-STUDY.md](RESEARCH-STUDY.md).

## Run locally

```bash
cd prototype
npm install
npm run dev
```

## Validate

```bash
cd prototype
npm test
npm run build
```

## Deploy on Vercel

Import the repository with its root directory left at the repository root. The committed `vercel.json` installs and builds the Vite app from `prototype/` and publishes `prototype/dist`.
