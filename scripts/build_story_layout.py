#!/usr/bin/env python3
"""Authoritative hand-authored story route; deterministic scenery placement, no art mutation."""
import argparse, json, math, random
parser=argparse.ArgumentParser()
extent=parser.add_mutually_exclusive_group()
extent.add_argument("--reference-slice",action="store_true",help="Author the compact-village review slice (default)")
extent.add_argument("--complete-urban",action="store_true",help="Extend the reviewed compact-village presentation to all districts")
args=parser.parse_args()
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
P=[(-115,-210),(-132,-185),(-140,-145),(-130,-95),(-148,-45),(-145,0),(-132,45),(-105,80),(-50,100),(10,95),(50,60),(52,-20),(95,-40),(140,15),(145,70),(125,115),(85,145),(100,195),(150,205)]
def curve(points):
 out=[list(points[0])]
 for i in range(len(points)-1):
  a,b,c,d=points[max(0,i-1)],points[i],points[i+1],points[min(len(points)-1,i+2)]
  for j in range(1,9):
   t=j/8
   out.append([round(.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t),4) for k in range(2)])
 return out
main=curve(P)
length=lambda pts:sum(math.dist(a,b) for a,b in zip(pts,pts[1:]))
a,b=9*8,12*8
start,end=main[a],main[b]
mid=[(start[k]+end[k])/2 for k in range(2)]
# Western bend adds exactly 60m while avoiding the primary commercial street.
lo,hi=0,180
for _ in range(50):
 off=(lo+hi)/2
 bypass=curve([start,[mid[0]-off,mid[1]-off*.25],end])
 if length(bypass)<length(main[a:b+1])+60:lo=off
 else:hi=off
nodes=main[:];edges=[]
for i in range(len(main)-1):
 section='disco' if i<16 else ('costa' if i<64 else ('comercio' if i<108 else ('plaza' if i<128 else 'puesto')))
 edges.append({'a':i,'b':i+1,'width':18 if section in ['disco','plaza','puesto'] else 13,'section':section,'surface':'stone'})
prev=a
for p in bypass[1:-1]:
 nodes.append(p);n=len(nodes)-1;edges.append({'a':prev,'b':n,'width':13,'section':'desvio','surface':'sand'});prev=n
edges.append({'a':prev,'b':b,'width':13,'section':'desvio','surface':'sand'})
def shore(z):return -185+math.sin(z*.013)*7+math.sin(z*.034)*3
boundary=[[round(shore(z),3),z] for z in range(-245,246,10)]+[[220,245],[220,-245]]
def segment_distance(p,a,b):
 d=[b[k]-a[k] for k in range(2)];l=sum(v*v for v in d)
 t=max(0,min(1,sum((p[k]-a[k])*d[k] for k in range(2))/l))
 return math.dist(p,[a[k]+t*d[k] for k in range(2)])
def on_road(x,z,margin=0):return any(segment_distance((x,z),nodes[e['a']],nodes[e['b']])<e['width']/2+margin for e in edges)
# Include aprons before authoring: every parcel must clear the complete road graph.
for source,point in [(0,[-115,-220]),(len(main)-1,[153,217])]:
 nodes.append(point);edges.append({'a':source,'b':len(nodes)-1,'width':12,'section':'acceso','surface':'stone'})
from compact_village import build, rectangle, polygon_gap, road_gap, local, TARGETS
buildings,blocks,open_spaces=build(main,nodes,edges,shore)
def touches_building(poly,margin=1):return any(polygon_gap(poly,b['polygon'])<margin for b in buildings)
rng=random.Random(47)
obstacles=[]
# Deliberate small coastal clusters: each solid trunk/planter is shared with collision.
for idx in [5,10,16,22,28,35,43,50,58]:
 p=main[idx];t=[main[idx+1][k]-main[idx-1][k] for k in range(2)];l=math.hypot(*t);normal=[t[1]/l,-t[0]/l]
 for j in range(2 if idx%2 else 1):
  x=p[0]-normal[0]*(12+j*3.5);z=p[1]-normal[1]*(12+j*3.5)+j*3
  if x<shore(z)+3 or on_road(x,z,2):continue
  if touches_building(rectangle({'x':x,'z':z,'w':.8,'d':.8}),2):continue
  obstacles.append({'kind':'palm','x':round(x,3),'z':round(z,3),'w':.8,'d':.8,'h':rng.uniform(6,9),'angle':rng.uniform(0,6.28)})
# Irregular shoreline grove; every solid trunk is registered, no invisible trees.
for _ in range(44):
 z=rng.uniform(-235,235);x=shore(z)+rng.uniform(3,18)
 if on_road(x,z,2) or touches_building(rectangle({'x':x,'z':z,'w':.8,'d':.8}),2):continue
 if any(math.dist((x,z),(o['x'],o['z']))<3 for o in obstacles):continue
 obstacles.append({'kind':'palm','x':round(x,3),'z':round(z,3),'w':.8,'d':.8,'h':rng.uniform(6,9),'angle':rng.uniform(0,6.28)})
# Lush first-slice gardens: irregular groups, never on the road or in camera/start space.
vegetation=[]
vrng=random.Random(204)
candidates=[(-139,-232,3.5),(-91,-230,4),(-143,-217,3),(-88,-211,4.5),
 (-157,-201,4),(-162,-186,4),(-168,-176,4.5),(-159,-163,3),
 (-168,-148,4),(-164,-132,4),(-173,-217,4.5),(-173,-235,4),
 (-88,-186,4.5),(-93,-151,4),(-107,-132,3.5),(-178,-195,3),
 (-112,-186,4.5),(-116,-164,4.5),(-121,-143,4),(-115,-123,3.5),
 (-103,-174,4),(-98,-130,4),(-79,-165,4.5),(-98,-199,4)]
for x,z,r in candidates:
 # Full footprint is tested, with extra clearance for steering and rear cameras.
 if any(on_road(x+dx,z+dz,3) for dx in [-r,0,r] for dz in [-r,0,r]):continue
 if x-r<shore(z)+2:continue
 if touches_building(rectangle({'x':x,'z':z,'w':r*2,'d':r*2}),1):continue
 if any(o['kind']!='palm' and abs(x-o['x'])<r+o['w']/2+.5 and abs(z-o['z'])<r+o['d']/2+.5 for o in obstacles):continue
 garden={'kind':'tropical_garden','x':x,'z':z,'w':r*2,'d':r*2,'h':2.5,
         'radius':r,'seed':vrng.randrange(10000)}
 obstacles.append(garden);vegetation.append(garden)
 # Solid trunks are registered separately; leafy crowns are above the camera.
 for j in range(2 if r>=4 else 1):
  px=x+(-1 if j==0 else 1)*r*.35;pz=z+vrng.uniform(-.8,.8)
  obstacles.append({'kind':'palm','x':round(px,3),'z':round(pz,3),'w':.8,'d':.8,'h':vrng.uniform(6.8,10.2),'angle':vrng.uniform(0,math.tau)})
# Raised plaza garden, fountain and benches share an explicit twelve-sided footprint.
cx,cz=104,107
poly=[[round(cx+7*math.cos(i*math.tau/12),3),round(cz+7*math.sin(i*math.tau/12),3)] for i in range(12)]
assert not any(on_road(x,z,2) for x,z in poly)
obstacles.append({'kind':'plaza_garden','x':cx,'z':cz,'w':14,'d':14,'h':2.5,'polygon':poly})
# Road-side sign: solid backing has a shared footprint instead of floating lettering.
obstacles.append({'kind':'sign','x':-104,'z':-205,'w':4,'d':.6,'h':3.1})
# A vendor and the open counter share a parcel-local anchor, independent of rotation.
story_shop=next(b for b in buildings if b['family']=='bar' and b['district']=='disco')
vendor=local(story_shop,0,story_shop['d']/2+1.3)
# Narrow planted pockets connect houses without obstructing the road or neighboring walls.
for block in blocks:
 row=[b for b in buildings if b['block']==block['id']]
 for left,right in zip(row,row[1:]):
  x=(left['x']+right['x'])/2;z=(left['z']+right['z'])/2;r=.8
  bed={'kind':'pocket_garden','x':round(x,4),'z':round(z,4),'w':1.6,'d':1.6,'h':1.7,'radius':r,'seed':vrng.randrange(10000),'district':block['district']}
  if touches_building(rectangle(bed),.2) or road_gap(rectangle(bed),nodes,edges)<3:continue
  obstacles.append(bed)
# Large green groups are relocated, not left intersecting the new parcels.
for block in blocks:
 row=[b for b in buildings if b['block']==block['id']];middle=row[len(row)//2]
 for delta in [5,9,14]:
  x,z=local(middle,0,-middle['d']/2-delta)
  bed={'kind':'tropical_garden','x':x,'z':z,'w':6,'d':6,'h':2.5,'radius':3,'seed':vrng.randrange(10000),'district':block['district']}
  if touches_building(rectangle(bed),1) or road_gap(rectangle(bed),nodes,edges)<3:continue
  if any(polygon_gap(rectangle(bed),o.get('polygon',rectangle(o)))<.5 for o in obstacles):continue
  obstacles.append(bed);vegetation.append(bed)
  # A contrasting round crown, with its trunk represented in the shared collision data.
  tree={'kind':'broadleaf_tree','x':x,'z':z,'w':.8,'d':.8,'h':5.5,'angle':0,'district':block['district']}
  obstacles.append(tree);break
world={'version':2,'bounds':[-197,220,-245,245],'boundary':boundary,'start':P[0],'start_angle':math.atan2(P[1][0]-P[0][0],P[1][1]-P[0][1]),'pickup':P[5],'hospital':P[-1],'nodes':nodes,'edges':edges,'main_route':list(range(len(main))),'bypass':{'from':a,'to':b,'extra_length':round(length(bypass)-length(main[a:b+1]),3)},'plaza_paving':[[round(cx+21*math.cos(i*math.tau/24),3),round(cz+21*math.sin(i*math.tau/24),3)] for i in range(24)],'landmarks':{'club':[-115,-232],'coast':P[3],'plaza':P[15],'hospital':[153,231]},'buildings':buildings,'blocks':blocks,'open_spaces':open_spaces,'district_targets':TARGETS,'obstacles':obstacles,'route_length':round(length(main),3),'pickup_index':40,'detail_pass':'compact-village-complete' if args.complete_urban else 'compact-village-reference','urban_extent':'complete' if args.complete_urban else 'reference-slice','vegetation_clusters':len(vegetation),'story_shop':[story_shop['x'],story_shop['z'],story_shop['d']],'story_shop_id':story_shop['id'],'scene_spawns':{'3':{'point':[-122,-221.5],'role':'venue_staff','parcel_id':'club'},'4':{'point':[-129,-221],'role':'party','parcel_id':'club'},'5':{'point':[-100,-220],'role':'party','parcel_id':'club'},'6':{'point':[round(main[18][0]-5.5,3),main[18][1]],'role':'photographer'},'8':{'point':vendor,'role':'vendor','parcel_id':story_shop['id']}},'art_extent':'complete' if args.complete_urban else 'reference-slice'}
(ROOT/'godot/data/world.json').write_text(json.dumps(world,indent=2)+'\n')
print('Main',world['route_length'],'m; bypass +',world['bypass']['extra_length'],'m;',len(buildings),'buildings')
print('Blocks:',[(b['id'],b['setback'],b['along_shift']) for b in blocks])
