"""Real lexical/dense/hybrid retrieval and local FLAN-T5 generation.

No case labels are loaded by this module. Both evaluation and the local API use it.
"""
import hashlib
import json
import math
import re
import time
from collections import Counter
from pathlib import Path
import numpy as np
import torch
from transformers import AutoModel, AutoModelForSeq2SeqLM, AutoTokenizer

ROOT = Path(__file__).resolve().parent
EMBEDDER = 'sentence-transformers/all-MiniLM-L6-v2'
GENERATOR = 'google/flan-t5-small'
CONFIG = {'chunkTokens':180, 'overlapTokens':30, 'bm25K1':1.5, 'bm25B':0.75, 'rrfConstant':60, 'rrfDepth':50, 'reranker':None, 'retrievalK':5, 'generatorInputTokens':512, 'contextTokensPerPassage':120, 'generationPassages':3, 'maxNewTokens':96, 'doSample':False, 'device':'cpu', 'threads':4}
STOP = set('a an the is are was were be been being of to in for on and or with by as at from this that it its do does can could would should which what how i my we our'.split())

def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()

def tokens(text):
    return [w for w in re.findall(r'[a-z0-9]+',text.lower()) if w not in STOP]

def rank(scores):
    return np.argsort(-scores, kind='stable').tolist()

class BM25:
    def __init__(self, texts):
        self.counts = [Counter(tokens(t)) for t in texts]
        self.lengths = np.array([sum(c.values()) for c in self.counts])
        self.average = float(self.lengths.mean()) if len(texts) else 1
        df = Counter(w for c in self.counts for w in c)
        self.idf = {w:math.log(1+(len(texts)-n+0.5)/(n+0.5)) for w,n in df.items()}

    def score(self, query):
        out = np.zeros(len(self.counts))
        for w in set(tokens(query)):
            tf = np.array([c.get(w,0) for c in self.counts])
            denom = tf + CONFIG['bm25K1']*(1-CONFIG['bm25B']+CONFIG['bm25B']*self.lengths/max(self.average,1))
            out += self.idf.get(w,0)*tf*(CONFIG['bm25K1']+1)/denom
        return out

def fuse(lexical, dense):
    out = np.zeros(len(dense))
    # Do not add irrelevant zero-score lexical documents to rank fusion.
    orders = [[i for i in rank(lexical) if lexical[i]>0][:CONFIG['rrfDepth']], rank(dense)[:CONFIG['rrfDepth']]]
    for order in orders:
        for position,i in enumerate(order,1):
            out[i] += 1/(CONFIG['rrfConstant']+position)
    return out

class Engine:
    def __init__(self, generation=True):
        torch.set_num_threads(CONFIG['threads'])
        torch.manual_seed(0)
        paths = json.loads((ROOT.parent/'.research-runtime/model-paths.json').read_text())
        self.lock = json.loads((ROOT/'model-lock.json').read_text())
        self.tokenizer = AutoTokenizer.from_pretrained(paths[EMBEDDER]['path'], local_files_only=True)
        self.encoder = AutoModel.from_pretrained(paths[EMBEDDER]['path'], local_files_only=True, use_safetensors=True).eval()
        self.docs = json.loads((ROOT/'corpus-pages.json').read_text())
        self.corpus_hash = digest(self.docs)
        self.passages = []
        for d in self.docs:
            for p in d['content']:
                offsets = self.tokenizer(p['text'],add_special_tokens=False,return_offsets_mapping=True,truncation=False)['offset_mapping']
                for start in range(0,len(offsets),CONFIG['chunkTokens']-CONFIG['overlapTokens']):
                    end = min(start+CONFIG['chunkTokens'],len(offsets))
                    if start and end-start < 35: break
                    text = p['text'][offsets[start][0]:offsets[end-1][1]]
                    self.passages.append({'id':f"{d['id']}:p{p['page']}:t{start}", 'documentId':d['id'], 'page':p['page'], 'text':text, 'title':d['title'], 'issuer':d['issuer'], 'url':d.get('localUrl',d['finalUrl'])+f"#page={p['page']}", 'documentHash':d['sha256']})
                    if end==len(offsets): break
        self.texts = [p['text'] for p in self.passages]
        self.bm25 = BM25(self.texts)
        self.index_hash = digest({'corpus':self.corpus_hash,'model':self.lock[EMBEDDER], 'config':CONFIG, 'passages':self.passages})
        cache = ROOT/'index'; cache.mkdir(exist_ok=True)
        cachefile = cache/(self.index_hash+'.npy')
        t=time.perf_counter()
        if cachefile.exists():
            self.vectors = np.load(cachefile,allow_pickle=False)
            self.index_cache=True
        else:
            self.vectors=self.encode(self.texts)
            np.save(cachefile,self.vectors)
            self.index_cache=False
        self.index_seconds=time.perf_counter()-t
        self.generator=None
        if generation:
            self.gen_tokenizer=AutoTokenizer.from_pretrained(paths[GENERATOR]['path'],local_files_only=True)
            self.generator=AutoModelForSeq2SeqLM.from_pretrained(paths[GENERATOR]['path'],local_files_only=True,use_safetensors=True).eval()

    def encode(self,texts):
        arrays=[]
        for start in range(0,len(texts),32):
            batch=self.tokenizer(texts[start:start+32],return_tensors='pt',padding=True,truncation=True,max_length=256)
            with torch.inference_mode():
                hidden=self.encoder(**batch).last_hidden_state
                mask=batch['attention_mask'].unsqueeze(-1).expand(hidden.size()).float()
                pooled=(hidden*mask).sum(1)/mask.sum(1).clamp(min=1e-9)
                arrays.append(torch.nn.functional.normalize(pooled,p=2,dim=1).numpy())
        return np.concatenate(arrays)

    def search(self,query,method,k=5):
        if method not in ['bm25','dense','hybrid']: raise ValueError('Unknown retrieval method')
        t=time.perf_counter()
        lexical=self.bm25.score(query) if method!='dense' else None
        dense=(self.vectors@self.encode([query])[0]) if method!='bm25' else None
        scores=lexical if method=='bm25' else dense if method=='dense' else fuse(lexical,dense)
        order=rank(scores)[:k]
        if method=='bm25': order=[i for i in order if scores[i]>0]
        return [{**self.passages[i],'score':float(scores[i])} for i in order], (time.perf_counter()-t)*1000

    def generate(self,query,passages):
        if self.generator is None: raise ValueError('Generator not loaded')
        contexts=[]
        for p in passages[:CONFIG['generationPassages']]:
            ids=self.gen_tokenizer.encode(p['text'],add_special_tokens=False)[:CONFIG['contextTokensPerPassage']]
            contexts.append({'id':p['id'],'text':self.gen_tokenizer.decode(ids,skip_special_tokens=True)})
        context='\n'.join(f"[{i+1}] {p['text']}" for i,p in enumerate(contexts))
        prompt=f"Answer the question using only the evidence below. If the evidence is insufficient, say you cannot determine the answer.\nQuestion: {query}\nEvidence:\n{context}\nAnswer:"
        encoded=self.gen_tokenizer(prompt,return_tensors='pt',truncation=True,max_length=CONFIG['generatorInputTokens'])
        start=time.perf_counter()
        with torch.inference_mode():
            output=self.generator.generate(**encoded,max_new_tokens=CONFIG['maxNewTokens'],do_sample=False,num_beams=1)
        return {'text':self.gen_tokenizer.decode(output[0],skip_special_tokens=True),'generationMs':(time.perf_counter()-start)*1000,'inputTokens':int(encoded['input_ids'].shape[1]),'outputTokens':int(output.shape[1]),'contexts':contexts,'actualPrompt':self.gen_tokenizer.decode(encoded['input_ids'][0],skip_special_tokens=True),'reviewStatus':'Unreviewed model output; retrieved sources do not certify this answer'}

    def query(self,query,method,generate=True):
        started=time.perf_counter()
        passages,ms=self.search(query,method)
        answer=self.generate(query,passages) if generate else None
        return {'query':query,'method':method,'passages':passages,'retrievalMs':ms,'answer':answer,'totalMs':(time.perf_counter()-started)*1000,'corpusHash':self.corpus_hash,'indexHash':self.index_hash}
