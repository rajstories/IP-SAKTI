"""Download public source PDFs and extract page text, preserving exact provenance."""
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent

def sha(data):
    return hashlib.sha256(data).hexdigest()

def fetch(source):
    path = ROOT / 'raw' / (source['id'] + '.pdf')
    receipt = path.with_suffix('.receipt.json')
    if not path.exists():
        r = requests.get(source['url'], timeout=30)
        r.raise_for_status()
        if not r.content.startswith(b'%PDF'):
            raise ValueError(f"Not a PDF: {source['id']}")
        path.write_bytes(r.content)
        receipt.write_text(json.dumps({'retrievedAt': datetime.now(timezone.utc).isoformat(), 'finalUrl': r.url}, indent=2))
    meta = json.loads(receipt.read_text())
    reader = PdfReader(path)
    pages = []
    for i, page in enumerate(reader.pages, 1):
        if source.get('selectedPhysicalPages') and i not in source['selectedPhysicalPages']:
            continue
        raw = page.extract_text() or ''
        text = re.sub(r'\s+', ' ', raw.replace('\x00', '')).strip()
        # Gazette PDFs are bilingual: select English pages by actual extracted script.
        if source['pages'] == 'english':
            latin = len(re.findall(r'[A-Za-z]', text))
            deva = len(re.findall(r'[\u0900-\u097f]', text))
            if latin < 300:
                continue
        if len(text) >= 100:
            pages.append({'page': i, 'text': text})
    result = {**source, **meta, 'sha256': sha(path.read_bytes()), 'pdfPages':len(reader.pages), 'includedPages':len(pages), 'extraction':'pypdf; whitespace normalised; physical PDF page numbering', 'content':pages}
    print(source['id'], 'PDF pages:',len(reader.pages),'included:',len(pages), flush=True)
    return result

if __name__ == '__main__':
    (ROOT / 'raw').mkdir(parents=True, exist_ok=True)
    sources = json.loads((ROOT / 'sources.json').read_text())
    docs, excluded = [], []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [(s, executor.submit(fetch,s)) for s in sources]
        for source, future in futures:
            try:
                docs.append(future.result())
            except Exception as e:
                excluded.append({**source,'reason':str(e)[:400]})
                print('EXCLUDED',source['id'],type(e).__name__,flush=True)
    (ROOT / 'excluded-sources.json').write_text(json.dumps(excluded,indent=2))
    if not docs: raise RuntimeError('No sources downloaded')
    (ROOT / 'corpus-pages.json').write_text(json.dumps(docs, ensure_ascii=False, indent=2))
