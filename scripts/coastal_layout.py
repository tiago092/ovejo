"""Original promenade dressing inspired by the user's beach photo; shared solids."""
import math
from compact_village import at_distance,rectangle,road_gap,polygon_gap

def build(main,nodes,edges,buildings,obstacles,protected,shore):
 def safe(item,clearance=.25):
  poly=rectangle(item)
  if road_gap(poly,nodes,edges)<3.05:return False
  if any(x<shore(z)+1.5 for x,z in poly):return False
  if any(polygon_gap(poly,b['polygon'])<clearance for b in buildings):return False
  if any(polygon_gap(poly,o.get('polygon',rectangle(o)))<clearance for o in obstacles):return False
  if any(polygon_gap(poly,o['polygon'])<.1 for o in protected):return False
  return True
 ids=[]
 for index,distance in enumerate([35,80,125,175,225,280,335]):
  p,t=at_distance(main,distance);n=[-t[1],t[0]] # sea-facing side on this coastal section
  for offset in [11.5,13,15,17]:
   lamp={'id':f'coast-lamp-{index}','kind':'coastal_lamp','x':round(p[0]+n[0]*offset,4),'z':round(p[1]+n[1]*offset,4),'w':2.0,'d':.8,'h':4.7,'yaw':math.atan2(-n[0],-n[1]),'glow':index%3==0}
   if not safe(lamp):continue
   lamp['polygon']=rectangle(lamp);obstacles.append(lamp);ids.append(lamp['id']);break
 for index,distance in enumerate([105,255]):
  p,t=at_distance(main,distance);n=[-t[1],t[0]]
  for offset in [11.5,13,15,17]:
   sign={'id':f'coast-guide-{index}','kind':'coastal_sign','x':round(p[0]+n[0]*offset,4),'z':round(p[1]+n[1]*offset,4),'w':2.3,'d':.65,'h':3.9,'yaw':math.atan2(-n[0],-n[1])}
   if not safe(sign):continue
   sign['polygon']=rectangle(sign);obstacles.append(sign);ids.append(sign['id']);break
 for index,distance in enumerate([65,150,245,305]):
  a,t=at_distance(main,distance);b,u=at_distance(main,distance+6)
  for offset in [11.5,13,15]:
   pa=[a[0]-t[1]*offset,a[1]+t[0]*offset];pb=[b[0]-u[1]*offset,b[1]+u[0]*offset]
   delta=[pb[k]-pa[k] for k in [0,1]]
   fence={'id':f'coast-rope-{index}','kind':'coastal_rope','x':round((pa[0]+pb[0])/2,4),'z':round((pa[1]+pb[1])/2,4),'w':.28,'d':round(math.hypot(*delta)+.28,4),'h':1.1,'yaw':math.atan2(delta[0],delta[1])}
   if not safe(fence):continue
   fence['polygon']=rectangle(fence);obstacles.append(fence);ids.append(fence['id']);break
 for index,distance in enumerate([90,130,165,205,240,275,315,350]):
  p,t=at_distance(main,distance)
  for side in [-1,1]:
   for offset in [12.5,15.5,19,23]:
    garden={'id':f'coast-green-{index}-{side}','kind':'tropical_garden','x':round(p[0]+t[1]*side*offset,4),'z':round(p[1]-t[0]*side*offset,4),'w':4.8,'d':4.8,'h':2.5,'radius':2.4,'seed':8300+index*2+side,'district':'costa'}
    if not safe(garden,.5):continue
    garden['polygon']=rectangle(garden);obstacles.append(garden);ids.append(garden['id']);break
 return {'style':'warm-tropical-promenade','path':list(range(65)),'wood_edges':list(range(2,24))+list(range(32,46))+list(range(49,63)),'wood_width':7.5,'obstacle_ids':ids,'photo_reference':'User-provided nighttime beach promenade: wood, ropes, warm lamps and layered plants; dawn retained.'}
