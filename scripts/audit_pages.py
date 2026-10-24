#!/usr/bin/env python3
"""Read-only HTTPS audit: verify the actual Godot package, not merely the HTML title."""
import argparse,hashlib,json,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--url',default='https://tiago092.github.io/ovejo/');args=p.parse_args()
base=args.url.rstrip('/')+'/'
local=json.loads((ROOT/'artifacts/godot/release-build.json').read_text())
report={'url':base,'local_package_sha256':local['files']['index.pck']['sha256'],'published_current_package':False,'passed':False}
def request(name,method='GET'):
 return urllib.request.urlopen(urllib.request.Request(urllib.parse.urljoin(base,name),method=method,headers={'User-Agent':'CodigoRosa-release-audit','Cache-Control':'no-cache'}),timeout=30)
try:
 with request('index.html') as response:html=response.read().decode();report['html_status']=response.status;report['html_headers']=dict(response.headers)
 report['godot_only_html']='new Engine(' in html and 'three.min.js' not in html and 'src="game.js"' not in html
 with request('manifest.json') as response:manifest=json.load(response)
 report['remote_runtime_source_sha256']=manifest.get('runtime_source_sha256');report['local_runtime_source_sha256']=local.get('runtime_source_sha256');report['remote_rules_version']=manifest.get('rules_version');report['remote_art_extent']=manifest.get('art_extent');report['remote_manifest_package_sha256']=manifest.get('files',{}).get('index.pck',{}).get('sha256')
 with request('index.wasm','HEAD') as response:report['wasm_content_type']=response.headers.get('Content-Type');report['wasm_content_encoding']=response.headers.get('Content-Encoding')
 with request('index.pck') as response:
  h=hashlib.sha256()
  for chunk in iter(lambda:response.read(1024*1024),b''):h.update(chunk)
  report['remote_package_sha256']=h.hexdigest()
 report['byte_identical_to_local']=report['remote_package_sha256']==report['local_package_sha256']
 report['matches_runtime_sources']=bool(local.get('runtime_source_sha256')) and manifest.get('runtime_source_sha256')==local['runtime_source_sha256']
 report['published_current_package']=report['matches_runtime_sources'] and report['remote_package_sha256']==report['remote_manifest_package_sha256']
 report['passed']=report['godot_only_html'] and report['published_current_package'] and report['wasm_content_type']=='application/wasm' and report['remote_rules_version']==2 and report['remote_art_extent']=='complete'
except Exception as error:report['error']=str(error)
(ROOT/'artifacts/godot/pages-audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({k:report[k] for k in ['url','published_current_package','passed']}));print(report.get('error',''))
# A pending planned release is diagnostic, not an automatic CI failure.
