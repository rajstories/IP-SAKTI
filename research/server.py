"""Loopback-only inference API. No remote calls; no access to local files via HTTP."""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from engine import Engine

class Handler(BaseHTTPRequestHandler):
    def send(self,status,data):
        raw=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.end_headers();self.wfile.write(raw)

    def do_GET(self):
        if self.path=='/api/research/health':
            return self.send(200,{'ready':True,'passages':len(engine.passages),'corpusHash':engine.corpus_hash,'generation':True})
        self.send(404,{'error':'Unknown route'})

    def do_POST(self):
        if self.path!='/api/research/query': return self.send(404,{'error':'Unknown route'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=12000: return self.send(413,{'error':'Request is too large or empty'})
            data=json.loads(self.rfile.read(length))
            if not isinstance(data,dict): return self.send(400,{'error':'Expected a JSON object'})
            query=data.get('query');method=data.get('method')
            if not isinstance(query,str) or not 3<=len(query.strip())<=1200: return self.send(400,{'error':'Enter a question of 3–1200 characters'})
            if method not in ['bm25','dense','hybrid']: return self.send(400,{'error':'Unknown retrieval method'})
            return self.send(200,engine.query(query.strip(),method,generate=data.get('generate') is True))
        except (ValueError,TypeError,json.JSONDecodeError): self.send(400,{'error':'Invalid JSON request'})
        except Exception as e:
            print('Inference failed:',type(e).__name__,flush=True)
            self.send(500,{'error':'Local inference failed. Check the server log.'})

if __name__=='__main__':
    engine=Engine()
    print(f'Ready: http://127.0.0.1:8765 | {len(engine.passages)} real passages | local CPU models',flush=True)
    HTTPServer(('127.0.0.1',8765),Handler).serve_forever()
