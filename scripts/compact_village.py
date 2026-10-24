"""Deterministic authoring of compact blocks; common polygon geometry for validation."""
import math

TARGETS={'disco':12,'costa':18,'comercio':26,'plaza':14,'puesto':10}
# Curated rows: district, stable block ID, route distance, side, number of parcels.
# Positive normal is generally inland on the coast; actual shoreline is tested below.
BLOCKS=[('disco','d1',26,1,4),('disco','d2',62,1,4),('disco','d3',43,-1,3),
 ('costa','c1',112,1,4),('costa','c2',174,1,4),('costa','c3',235,1,4),('costa','c4',300,1,3),('costa','c5',350,-1,3),
 ('comercio','m1',401,1,4),('comercio','m2',446,-1,4),('comercio','m3',491,1,4),('comercio','m4',539,-1,4),('comercio','m5',590,1,4),('comercio','m6',640,-1,3),('comercio','m7',689,1,3),
 ('plaza','p1',743,1,4),('plaza','p2',778,-1,4),('plaza','p3',815,1,3),('plaza','p4',832,-1,3),
 ('puesto','s1',874,1,3),('puesto','s2',913,-1,3),('puesto','s3',932,1,3)]

def rotate(p,yaw):
 c,s=math.cos(yaw),math.sin(yaw)
 return [c*p[0]+s*p[1],-s*p[0]+c*p[1]]
def local(b,x,z):
 v=rotate([x,z],b.get('yaw',0));return [round(b['x']+v[0],4),round(b['z']+v[1],4)]
def rectangle(b,margin=0):
 return [local(b,sx*(b['w']/2+margin),sz*(b['d']/2+margin)) for sx,sz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
def inside(p,poly):
 result=False
 for a,b in zip(poly,poly[1:]+poly[:1]):
  if (a[1]>p[1])!=(b[1]>p[1]) and p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]:result=not result
 return result
def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
def intersects(a,b,c,d):
 return cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0

def point_segment(p,a,b):
 v=[b[k]-a[k] for k in [0,1]];l=sum(x*x for x in v)
 t=max(0,min(1,sum((p[k]-a[k])*v[k] for k in [0,1])/l)) if l else 0
 return math.dist(p,[a[k]+v[k]*t for k in [0,1]])
def segment_gap(a,b,c,d):
 if intersects(a,b,c,d):return 0
 return min(point_segment(p,u,v) for p,u,v in [(a,c,d),(b,c,d),(c,a,b),(d,a,b)])
def polygon_gap(a,b):
 if inside(a[0],b) or inside(b[0],a):return 0
 return min(segment_gap(p,q,r,s) for p,q in zip(a,a[1:]+a[:1]) for r,s in zip(b,b[1:]+b[:1]))
def road_gap(poly,nodes,edges):
 minimum=math.inf
 for e in edges:
  a,b=nodes[e['a']],nodes[e['b']]
  if inside(a,poly) or inside(b,poly):return -e['width']/2
  gap=min(segment_gap(a,b,c,d) for c,d in zip(poly,poly[1:]+poly[:1]))-e['width']/2
  minimum=min(minimum,gap)
 return minimum

def at_distance(main,distance):
 for a,b in zip(main,main[1:]):
  length=math.dist(a,b)
  if distance<=length:
   return ([a[k]+(b[k]-a[k])*distance/length for k in [0,1]],[(b[k]-a[k])/length for k in [0,1]])
  distance-=length
 a,b=main[-2:];l=math.dist(a,b);return b,[(b[k]-a[k])/l for k in [0,1]]

def build(main,nodes,edges,shore):
 buildings=[]
 for ident,district,x,z,w,d,title,color,yaw in [('club','disco',-115,-232,36,16,'LUAU DO MORRO','#b86476',0),('clinic','puesto',153,231,29,17,'POSTO DE SAÚDE','#e0dfc8',0)]:
  b=dict(id=ident,parcel_id=ident,district=district,block=ident,family='landmark',x=x,z=z,w=w,d=d,h=7,title=title,color=color,yaw=yaw,landmark=True)
  b['polygon']=rectangle(b);buildings.append(b)
 protected=[]
 for ident,x,z,r in [('pickup',*main[40],8),('arrival',*main[-1],8),('plaza',104,107,21)]:
  protected.append({'id':ident,'kind':'maneuver','polygon':[[x+math.cos(i*math.tau/24)*r,z+math.sin(i*math.tau/24)*r] for i in range(24)]})
 for i in range(3):
  x,z=main[0][0]+6+i*1.5,main[0][1]+2+i*3
  protected.append({'id':f'friend-{i}','kind':'actor','polygon':[[x+math.cos(j*math.tau/12)*1.2,z+math.sin(j*math.tau/12)*1.2] for j in range(12)]})
 for index in [12,28,48]:
  x,z=main[index];protected.append({'id':f'sea-window-{index}','kind':'sea_view','polygon':[[shore(z)+1,z-6],[x-13,z-6],[x-13,z+6],[shore(z)+1,z+6]]})
 colors=['#cfa690','#85aaa2','#d29d96','#b6bea1','#d0bf91','#b2c4be','#c1a3a4']
 families=['house','pousada','shop','bar']
 titles={'house':'','pousada':'POUSADA DO MAR','shop':'ARTESANATO','bar':'AÇAÍ & COCO'}
 blocks=[]
 for block_index,(district,ident,distance,side,count) in enumerate(BLOCKS):
  widths=[7.0+((block_index+j)%4)*.65 for j in range(count)];depth=8.4 if block_index%2 else 9.2
  spacing=2.6;total=sum(widths)+spacing*(count-1)
  placed=None
  # All members move together: compact rows and 2.6m gaps are never broken by rejection.
  for offset in ([27,29,32,35] if ident in ['p2','p4'] else [17,19,21,24,28,32]):
   for shift in [0,-8,8,-16,16,-24,24]:
    point,tangent=at_distance(main,distance+shift);normal=[tangent[1]*side,-tangent[0]*side]
    if ident=='p2':point=[104,107];tangent=[0,1];normal=[-1,0]
    if ident=='p4':point=[104,107];tangent=[1,0];normal=[0,-1]
    if ident in ['p2','p4']:point=[point[k]+tangent[k]*shift for k in [0,1]]
    yaw=math.atan2(-normal[0],-normal[1]) # local +Z façade faces the road
    row=[];cursor=-total/2
    for j,width in enumerate(widths):
     center=[point[k]+normal[k]*offset+tangent[k]*(cursor+width/2) for k in [0,1]];cursor+=width+spacing
     family=families[(block_index+j)%4]
     b=dict(id=f'{ident}-{j+1}',parcel_id=f'{district}-{ident}-{j+1}',district=district,block=ident,family=family,x=round(center[0],4),z=round(center[1],4),w=width,d=depth,h=[4.8,5.8,7][(block_index+j)%3],yaw=round(yaw,7),title=titles[family],color=colors[(block_index*2+j)%len(colors)],landmark=False)
     b['polygon']=rectangle(b);poly=b['polygon']
     if any(p[0]<shore(p[1])+3 or p[0]>216 or abs(p[1])>241 for p in poly):break
     if road_gap(poly,nodes,edges)<3.05:break
     if any(polygon_gap(poly,o['polygon'])<2 for o in buildings):break
     if any(polygon_gap(poly,o['polygon'])<.1 for o in protected):break
     row.append(b)
    if len(row)==count:placed=row;break
   if placed:break
  if not placed:raise ValueError('No safe location for complete block '+ident)
  buildings.extend(placed);blocks.append({'id':ident,'district':district,'parcels':[b['id'] for b in placed],'route_distance':distance,'side':side,'setback':offset,'along_shift':shift})
 counts={key:sum(b['district']==key for b in buildings) for key in TARGETS}
 assert counts==TARGETS,(counts,TARGETS)
 return buildings,blocks,protected
