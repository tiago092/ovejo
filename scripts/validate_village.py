#!/usr/bin/env python3
"""Validate shared village polygons and write a reproducible overhead authoring map."""
import hashlib,html,json,math
from pathlib import Path
from compact_village import TARGETS,PARCEL_GAP,rectangle,polygon_gap,road_gap,local
from runtime_fingerprint import runtime_fingerprint
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/godot/urban';OUT.mkdir(parents=True,exist_ok=True)
w=json.loads((ROOT/'godot/data/world.json').read_text());buildings=w['buildings'];checks=[]
def check(ok,name):
 checks.append({'name':name,'passed':bool(ok)})
 if not ok:print('FAIL:',name)
check(len(buildings)==80,'80 buildings');check(len({b['id'] for b in buildings})==80,'stable unique building identifiers')
check(len({b['parcel_id'] for b in buildings})==80,'stable unique parcel identifiers')
for district,total in TARGETS.items():check(sum(b['district']==district for b in buildings)==total,'quota '+district)
for i,b in enumerate(buildings):
 check(max(math.dist(p,q) for p,q in zip(b['polygon'],rectangle(b)))<.001,'oriented shared footprint '+b['id'])
 gap=road_gap(b['polygon'],w['nodes'],w['edges'])
 if b['landmark']:
  # Access ribbons have flat end caps: the old landmark is four metres beyond it.
  gaps=[]
  for edge in w['edges']:
   a,c=[w['nodes'][edge[k]] for k in ['a','b']];length=math.dist(a,c)
   ribbon=rectangle({'x':(a[0]+c[0])/2,'z':(a[1]+c[1])/2,'w':edge['width'],'d':length,'yaw':math.atan2(c[0]-a[0],c[1]-a[1])})
   gaps.append(polygon_gap(b['polygon'],ribbon))
  gap=min(gaps)
 check(gap>=2.999,'full road width plus 3m margin '+b['id'])
 check(all(polygon_gap(b['polygon'],o['polygon'])>=.099 for o in w['open_spaces']),'protected spaces '+b['id'])
 for other in buildings[i+1:]:check(polygon_gap(b['polygon'],other['polygon'])>=PARCEL_GAP-.001,'nonoverlapping parcels '+b['id']+'/'+other['id'])
for block in w['blocks']:
 row=[b for b in buildings if b['block']==block['id']]
 check(3<=len(row)<=5,'compact block size '+block['id'])
 check(all(abs(polygon_gap(a['polygon'],b['polygon'])-PARCEL_GAP)<.002 for a,b in zip(row,row[1:])),'1.2m gaps '+block['id'])
for o in w['obstacles']:
 if abs(o.get('yaw',0))>.001:check('polygon' in o and max(math.dist(p,q) for p,q in zip(o['polygon'],rectangle(o)))<.001,'rotated garden serializes its collision polygon '+str(o['x']))
 poly=o.get('polygon',rectangle(o))
 check(all(polygon_gap(poly,b['polygon'])>=.15 for b in buildings),'vegetation/solid clear of houses '+o['kind']+':'+str(o['x']))
for actor,spawn in w['scene_spawns'].items():
 point=spawn['point'];body=rectangle({'x':point[0],'z':point[1],'w':.8,'d':.8})
 check(all(polygon_gap(body,b['polygon'])>.001 for b in buildings),'scene actor outside buildings '+actor)
 if spawn.get('parcel_id'):
  check(any(b['id']==spawn['parcel_id'] for b in buildings),'actor anchor refers to a parcel '+actor)
# SVG uses true world coordinates and orientation; road strokes include actual widths.
colors={'disco':'#d883a6','costa':'#65a99e','comercio':'#e6b86c','plaza':'#9e9ec6','puesto':'#b0c58c'}
x0,x1,z0,z1=w['bounds'];scale=1.5
X=lambda x:(x-x0)*scale+18
Y=lambda z:(z1-z)*scale+18
points=lambda poly:' '.join(f'{X(x):.2f},{Y(z):.2f}' for x,z in poly)
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {(x1-x0)*scale+36} {(z1-z0)*scale+36}" role="img" aria-label="Plano de ochenta parcelas del pueblo compacto">','<rect width="100%" height="100%" fill="#19323d"/>',f'<polygon points="{points(w["boundary"])}" fill="#b5aa8c"/>']
for o in w['open_spaces']:svg.append(f'<polygon points="{points(o["polygon"])}" fill="#b7d8c4" fill-opacity=".6" stroke="#6a8f85" stroke-width=".8"/>')
for e in w['edges']:
 a,b=[w['nodes'][e[k]] for k in ['a','b']]
 svg.append(f'<path d="M {X(a[0])} {Y(a[1])} L {X(b[0])} {Y(b[1])}" fill="none" stroke="#e0cfaa" stroke-width="{(e["width"]+6)*scale}"/>')
for e in w['edges']:
 a,b=[w['nodes'][e[k]] for k in ['a','b']]
 svg.append(f'<path d="M {X(a[0])} {Y(a[1])} L {X(b[0])} {Y(b[1])}" fill="none" stroke="#626e6b" stroke-width="{e["width"]*scale}"/>')
for o in w['obstacles']:
 poly=o.get('polygon',rectangle(o));svg.append(f'<polygon points="{points(poly)}" fill="#4c7957" fill-opacity=".8"/>')
for b in buildings:
 svg.append(f'<polygon points="{points(b["polygon"])}" fill="{colors[b["district"]]}" stroke="#293d40" stroke-width=".8"><title>{html.escape(b["id"]+" · "+b["district"]+" · "+b["family"])}</title></polygon>')
 front=local(b,0,b['d']/2);svg.append(f'<path d="M {X(b["x"])} {Y(b["z"])} L {X(front[0])} {Y(front[1])}" stroke="#fff1d5" stroke-width="1.4"/>')
for label,key in [('SALIDA','start'),('PACIENTE','pickup'),('PUESTO','hospital')]:
 x,z=w[key];svg.append(f'<circle cx="{X(x)}" cy="{Y(z)}" r="4" fill="#fff1d5"/><text x="{X(x)+6}" y="{Y(z)-6}" fill="#213c40" font-family="sans-serif" font-size="9">{label}</text>')
svg.append('</svg>');(OUT/'site-plan.svg').write_text('\n'.join(svg)+'\n')
report={'runtime_source_sha256':runtime_fingerprint(),'passed':all(c['passed'] for c in checks),'counts':{k:sum(b['district']==k for b in buildings) for k in TARGETS},'urban_extent':w['urban_extent'],'checks':checks}
(OUT/'layout.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');print('Village layout:',len(checks),'checks;',report['passed']);raise SystemExit(0 if report['passed'] else 1)
