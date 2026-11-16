"""Import the supplied official-publication PDF without claiming a web download.

Usage: python research/import_ayush.py /path/to/guidelines.pdf
Archives the original NBA pilot before changing the corpus.
"""
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from prepare import ROOT, fetch

def main(path):
    docs = json.loads((ROOT/'corpus-pages.json').read_text())
    if any(d['id'] == 'ayush-guidelines' for d in docs):
        raise SystemExit('Ayush source already imported; create a new version for replacements.')
    if not path.read_bytes().startswith(b'%PDF'):
        raise ValueError('Expected a PDF')
    archive = ROOT/'versions/nba-v1'
    archive.mkdir(parents=True, exist_ok=False)
    for name in ['corpus-pages.json', 'benchmark.json', 'excluded-sources.json', 'RESULTS.md']:
        shutil.copy2(ROOT/name, archive/name)
    shutil.copy2(ROOT/'results/latest.json', archive/'results.json')
    public = ROOT.parent/'prototype/public/research'
    (public/'archive').mkdir(exist_ok=True)
    shutil.copy2(archive/'results.json', public/'archive/nba-v1.json')
    source = next(s for s in json.loads((ROOT/'sources.json').read_text()) if s['id']=='ayush-guidelines')
    # Exclude cover, contents, promotional patent examples and back matter.
    source['selectedPhysicalPages'] = list(range(5,19))
    source['selectionNote'] = 'Substantive guidelines and annexures only: PDF pages 5–18 (printed pages 1–14).'
    raw = ROOT/'raw/ayush-guidelines.pdf'
    shutil.copy2(path, raw)
    receipt = {'acquisitionMethod':'User-provided PDF', 'importedAt':datetime.now(timezone.utc).isoformat(), 'retrievedAt':None, 'finalUrl':source['url'], 'localUrl':'/research/sources/ayush-guidelines.pdf', 'provenanceNote':'Title, issuer and year checked against uploaded cover. Original download time unknown; bytes not independently compared with the blocked official endpoint.'}
    raw.with_suffix('.receipt.json').write_text(json.dumps(receipt, indent=2))
    imported = fetch(source)
    docs.append(imported)
    (ROOT/'corpus-pages.json').write_text(json.dumps(docs, ensure_ascii=False, indent=2))
    excluded = json.loads((ROOT/'excluded-sources.json').read_text())
    (ROOT/'excluded-sources.json').write_text(json.dumps([s for s in excluded if s['id']!='ayush-guidelines'], indent=2))
    (public/'sources').mkdir(exist_ok=True)
    shutil.copy2(raw, public/'sources/ayush-guidelines.pdf')

if __name__=='__main__':
    main(Path(sys.argv[1]))
