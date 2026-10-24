#!/usr/bin/env python3
"""Consolidate observed checks; never promote device/art review to passed automatically."""
import datetime,hashlib,json,platform,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/godot'
def read(name):
 path=OUT/(name+'.json');return json.loads(path.read_text()) if path.exists() else {}
def result(name,title):
 report=read(name)
 return {'check':title,'status':'aprobada' if report.get('passed') else ('fallida' if report else 'pendiente'),'evidence':name+'.json'}
checks=[result('layout','Distribución y alturas del escenario original'),result('simulation','Reglas y trazas 30/60/120 FPS'),result('host','Persistencia y prioridad del audio externo'),result('browser','Chrome: flujo, capturas y controles emulados'),result('firefox','Firefox: arranque y primer fotograma de juego'),result('distribution','Paquete de distribución y fallos de carga'),result('clean-import','Importación desde fuentes sin caché')]
release=read('release-build');checks.append({'check':'Descarga comprimida ≤25 MiB','status':'aprobada' if release.get('gzip_mib',999)<=25 else 'fallida','evidence':'release-build.json'})
benchmark=read('benchmark')
if benchmark:
 ok=all(r['max_calls']<=(150 if r['quality']=='low' else 300) for r in benchmark['runs'])
 checks.append({'check':'Presupuesto de dibujo durante recorrido diagnóstico','status':'aprobada' if ok else 'fallida','evidence':'benchmark.json'})
review=read('art-review')
review_hashes=review.get('asset_sha256',{})
review_current=bool(review_hashes) and all((ROOT/name).is_file() and hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest for name,digest in review_hashes.items())
checks.append({'check':'Parecido del protagonista presentado en las comparativas: revisión del usuario','status':'aprobada' if review.get('approved') is True and review_current else 'pendiente','evidence':'art-review.json','matches_reviewed_assets':review_current})
for title in ['Incorporación de fotografías originales adicionales a las fuentes de autoría','Android Chrome e iPhone Safari: controles, audio y compatibilidad reales','GPU física: tres recorridos de 60 s por perfil y recuadro abierto/cerrado','Objetivos físicos 58/29 FPS y p95 33,3/50 ms','Reproductor real SoundCloud disponible y red lenta (el puente está probado con eventos simulados)','Publicación de prueba HTTPS y aceptación antes de sustituir el enlace principal']:
 checks.append({'check':title,'status':'pendiente'})
original_files=['game.js','visuals.js','index.html','style.css','music.js','track.js','assets/driver.png']
original=subprocess.run(['git','diff','--quiet','HEAD','--',*original_files],cwd=ROOT).returncode==0
checks.append({'check':'Runtime y retrato originales conservados','status':'aprobada' if original else 'fallida'})
source={}
for folder in ['godot','scripts','art-source']:
 for p in sorted((ROOT/folder).rglob('*')):
  if not p.is_file() or '.godot' in p.parts or '__pycache__' in p.parts or p.suffix=='.blend1':continue
  source[str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()
(OUT/'source-manifest.json').write_text(json.dumps(source,indent=2)+'\n')
report={'generated_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'working_tree':'uncommitted implementation; exact source hashes in source-manifest.json','os':platform.platform(),'cpu':next((l.split(':',1)[1].strip() for l in Path('/proc/cpuinfo').read_text().splitlines() if l.startswith('model name')),'unknown'),'physical_gpu_available':Path('/dev/dri').exists(),'tools':read('release-build').get('engine'),'checks':checks,'complete':all(c['status']=='aprobada' for c in checks)}
(OUT/'acceptance.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print('Acceptance:',{status:sum(c['status']==status for c in checks) for status in ['aprobada','fallida','pendiente']})
