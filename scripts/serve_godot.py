#!/usr/bin/env python3
import argparse,http.server,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
 def do_GET(self):
  self.compressed=False
  original=self.path.split('?',1)[0]
  if original.endswith('/'):original+='index.html'
  local=Path(self.translate_path(original))
  if 'gzip' in self.headers.get('Accept-Encoding','') and local.with_suffix(local.suffix+'.gz').is_file():
   self.original_type=self.guess_type(str(local));self.path=original+'.gz';self.compressed=True
  super().do_GET()
 def guess_type(self,path):
  if getattr(self,'compressed',False):return self.original_type
  if path.endswith('.wasm'):return 'application/wasm'
  return super().guess_type(path)
 def end_headers(self):
  if getattr(self,'compressed',False):self.send_header('Content-Encoding','gzip');self.send_header('Vary','Accept-Encoding')
  self.send_header('Cache-Control','no-cache')
  super().end_headers()
p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8767);args=p.parse_args();os.chdir(ROOT)
print(f'Código Rosa: http://127.0.0.1:{args.port}/dist/godot/',flush=True)
http.server.ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
