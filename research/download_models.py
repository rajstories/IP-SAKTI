"""Download fixed model snapshots; no credentials or remote custom code required."""
import json
import os
from pathlib import Path
ROOT = Path(__file__).resolve().parent
os.environ['HF_HOME'] = str(ROOT.parent / '.research-runtime' / 'huggingface')
from huggingface_hub import snapshot_download

if __name__ == '__main__':
    models = {}
    lock_path = ROOT / 'model-lock.json'
    existing = json.loads(lock_path.read_text()) if lock_path.exists() else {}
    for name in ['sentence-transformers/all-MiniLM-L6-v2', 'google/flan-t5-small']:
        path = snapshot_download(name, revision=existing.get(name,{}).get('revision','main'), allow_patterns=['config.json','model.safetensors','tokenizer.json','tokenizer_config.json','special_tokens_map.json','generation_config.json','spiece.model','vocab.txt'])
        models[name] = {'revision': Path(path).name, 'path':path}
        print(name, Path(path).name, flush=True)
    (ROOT / 'model-lock.json').write_text(json.dumps({name:{'revision': info['revision']} for name,info in models.items()}, indent=2))
    (ROOT.parent / '.research-runtime' / 'model-paths.json').write_text(json.dumps(models, indent=2))
