#!/usr/bin/env python3
"""Report stage acceptance without attributing art approval or final performance."""
import hashlib,json,subprocess
from pathlib import Path
from runtime_fingerprint import runtime_fingerprint
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/godot';URBAN=OUT/'urban'
def read(p):return json.loads(p.read_text()) if p.exists() else {}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source=runtime_fingerprint();world=read(ROOT/'godot/data/world.json');export=read(OUT/'verification-build.json');package=export.get('files',{}).get('index.pck',{}).get('sha256');checks=[]
def add(title,ok,evidence,current=True):checks.append({'check':title,'status':('aprobada' if ok else 'fallida') if current else 'pendiente','evidence':evidence})
for name in ['layout']:
 d=read(URBAN/(name+'.json'));add('80 parcelas, orientación, separación y márgenes',d.get('passed'),f'{name}.json',d.get('runtime_source_sha256')==source)
for name in ['simulation','presentation','hud','route-drive','route-drive-population','host']:
 d=read(OUT/(name+'.json'));add(name,d.get('passed'),'../'+name+'.json',d.get('runtime_source_sha256')==source)
for name,location in [('browser',OUT),('story-tests',OUT),('captures',URBAN),('cameras',URBAN)]:
 d=read(location/(name+'.json'));add(name,d.get('passed'),('' if location==URBAN else '../')+name+'.json',bool(package) and d.get('package_sha256')==package)
d=read(OUT/'clean-import.json');add('Importación y exportación limpias',d.get('passed'),'../clean-import.json',d.get('runtime_source_sha256')==source)
d=read(URBAN/'release-guard.json');add('El tramo provisional no se puede publicar',d.get('passed'),'release-guard.json',d.get('guard_source_sha256')==digest(ROOT/'scripts/check_story_release.py'))
review=read(OUT/'art-review.json');add('Protagonista aprobado intacto',bool(review.get('asset_sha256')) and all(digest(ROOT/name)==sha for name,sha in review.get('asset_sha256',{}).items()),'../art-review.json')
b=read(OUT/'benchmark.json');ok=bool(b.get('runs')) and all(r['max_calls']<=(150 if r['quality']=='low' else 300) for r in b.get('runs',[]));add('Presupuesto del prototipo con el tramo de referencia',ok,'../benchmark.json',b.get('package_sha256')==package)
r=read(OUT/'release-build.json');add('Descarga del prototipo ≤25 MiB',r.get('gzip_mib',999)<=25,'../release-build.json',r.get('runtime_source_sha256')==source)
art=read(URBAN/'review.json');checks.append({'check':'Revisión artística del tramo por el usuario','status':'aprobada' if art.get('approved_by_user') and art.get('runtime_source_sha256')==source else 'pendiente','evidence':'review.json'})
for title in ['Extensión del acabado a costa, comercio, plaza y puesto','Validación final de rendimiento del mundo completo','GPU física y teléfonos Android/iPhone','Publicación final y auditoría HTTPS']:
 checks.append({'check':title,'status':'pendiente'})
report={'branch':subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip(),'base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'runtime_source_sha256':source,'urban_extent':world.get('urban_extent'),'checks':checks,'complete':all(c['status']=='aprobada' for c in checks),'note':'Prototype draw-call results do not certify completed-world cost or physical-device FPS.'}
for destination in [URBAN/'acceptance.json',OUT/'acceptance.json']:
 destination.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
manifest={}
for folder in ['godot','scripts','art-source','tests/godot','.github/workflows']:
 for p in sorted((ROOT/folder).rglob('*')):
  if p.is_file() and '.godot' not in p.parts and '__pycache__' not in p.parts and p.suffix!='.blend1':manifest[str(p.relative_to(ROOT))]=digest(p)
(OUT/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print({s:sum(c['status']==s for c in checks) for s in ['aprobada','fallida','pendiente']})
