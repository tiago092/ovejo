#!/usr/bin/env python3
"""Evidence for rules v2. Package-bound reports never certify another export."""
import datetime,hashlib,json,platform,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/godot'
def read(name):
 p=OUT/(name+'.json');return json.loads(p.read_text()) if p.exists() else {}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def result(name,title,bound=None):
 report=read(name);current=report.get("runtime_source_sha256")==read("release-build").get("runtime_source_sha256") if not bound else True
 if bound:
  expected=read(bound).get('files',{}).get('index.pck',{}).get('sha256');current=bool(expected and report.get('package_sha256')==expected)
 status=('aprobada' if report.get('passed') else ('fallida' if report else 'pendiente')) if current else 'pendiente'
 return {'check':title,'status':status,'evidence':name+'.json','matches_current_package':current}
checks=[result('simulation','Simulación v2: reglas, colisiones continuas y trazas 30/60/120 FPS'),result('route-drive','Recorrido con entradas, sin teletransportes ni reposición'),result('route-drive-population','Recorrido con toda la población y entradas sin reposición'),result('host','Migración v2, récord separado y audio externo'),result('presentation','Presentación sin modificar simulación y reinicios'),result('browser','Chrome: flujo y cuatro resoluciones','verification-build'),result('story-tests','Audio, reacciones, pausa y animación de recogida','verification-build'),result('firefox','Firefox: arranque de la versión actual','verification-build'),result('distribution','Distribución sin API de pruebas y fallos de carga','release-build'),result('clean-import','Importación y exportación desde fuentes sin caché')]
release=read('release-build');checks.append({'check':'Descarga comprimida ≤25 MiB','status':'aprobada' if release.get('gzip_mib',999)<=25 else 'fallida','evidence':'release-build.json'})
benchmark=read('benchmark');current=benchmark.get('package_sha256')==read('verification-build').get('files',{}).get('index.pck',{}).get('sha256')
ok=bool(benchmark.get('runs')) and all(r['max_calls']<=(150 if r['quality']=='low' else 300) for r in benchmark.get('runs',[]))
checks.append({'check':'Presupuesto de render de la versión actual','status':('aprobada' if ok else 'fallida') if current else 'pendiente','evidence':'benchmark.json','matches_current_package':current})
review=read('art-review');hashes=review.get('asset_sha256',{});identity=bool(hashes) and all((ROOT/name).is_file() and digest(ROOT/name)==value for name,value in hashes.items())
checks.append({'check':'Protagonista aprobado conservado exactamente','status':'aprobada' if identity and review.get('approved') else 'pendiente','evidence':'art-review.json'})
world=json.loads((ROOT/'godot/data/world.json').read_text())
checks.append({'check':'Extensión artística tras revisión técnica del primer tramo','status':'aprobada' if world.get('art_extent')=='complete' and (OUT/'story-reference/review.json').exists() else 'pendiente','evidence':'story/captures.json'})
for title in ['Revisión visual del usuario del mundo nuevo','Cinco jugadores nuevos: ≥4 victorias iniciales; mediana 90–130 s','Android Chrome e iPhone Safari reales','GPU física: tres recorridos por configuración y objetivos 58/29 FPS, p95 33,3/50 ms','SoundCloud real disponible, bloqueado y lento']:
 checks.append({'check':title,'status':'pendiente'})
audit=read("pages-audit")
published=audit.get("passed") is True and audit.get("local_runtime_source_sha256")==release.get("runtime_source_sha256")
checks.append({"check":"Publicación del paquete final en HTTPS, solo Godot en raíz de Pages","status":"aprobada" if published else "pendiente","evidence":"pages-audit.json"})
source={}
for folder in ['godot','scripts','art-source','tests/godot','.github/workflows']:
 for p in sorted((ROOT/folder).rglob('*')):
  if p.is_file() and '.godot' not in p.parts and '__pycache__' not in p.parts and p.suffix!='.blend1':source[str(p.relative_to(ROOT))]=digest(p)
(OUT/'source-manifest.json').write_text(json.dumps(source,indent=2)+'\n')
report={'rules_version':2,'generated_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'working_tree':'local implementation; source-manifest.json records exact hashes','os':platform.platform(),'physical_gpu_available':Path('/dev/dri').exists(),'art_extent':json.loads((ROOT/'godot/data/world.json').read_text())['art_extent'],'tools':release.get('engine'),'checks':checks,'complete':all(c['status']=='aprobada' for c in checks)}
(OUT/'acceptance.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print('Acceptance:',{status:sum(c['status']==status for c in checks) for status in ['aprobada','fallida','pendiente']})
