"""Editable Blender authoring source. Run with Blender --background --python this_file.
Generated base sculpt requires the user's likeness review; never a substitute for it.
Coordinates in helpers are the game's Y-up, +Z-forward space.
"""
import bpy, math, random, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'godot/assets'; SOURCE=ROOT/'art-source'
OUT.mkdir(exist_ok=True); SOURCE.mkdir(exist_ok=True)
if (SOURCE/"driver.blend").exists() and "--rebuild-base" not in sys.argv:
 raise RuntimeError("Editable sources already exist. Use export_art.py to preserve manual edits, or explicitly --rebuild-base to regenerate the base.")
random.seed(81)
def xyz(v): return (v[0],-v[2],v[1])
def clear(): bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,color,rough=.65,metal=0,alpha=1):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,alpha); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,alpha); p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if alpha<1: p.inputs['Alpha'].default_value=alpha; m.surface_render_method='DITHERED'
 return m
skin=mat('Piel cálida',(.63,.34,.23),.88); pink=mat('Remera rosa',(.82,.035,.24),.9); black=mat('Marco negro',(.009,.012,.016),.55); lens=mat('Cristal oscuro',(.016,.026,.037),.30,.1); hair=mat('Rulos castaños',(.023,.014,.011),.9); trousers=mat('Bermuda azul',(.025,.065,.10)); yellow=mat('Amarillo ambulancia',(1,.62,.015),.36); white=mat('Marfil',(.93,.9,.81)); rubber=mat('Goma',(.018,.021,.025),.92); metal=mat('Metal',(.15,.19,.21),.35,.65); red=mat('Baliza',(.85,.012,.035),.22); glass=mat('Parabrisas',(.44,.69,.72),.16,.05,.16)
def group(name,loc=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=xyz(loc);o.parent=parent;return o
def finish(o,name,loc,material,parent):
 o.name=name;o.location=xyz(loc);o.parent=parent
 if material: o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
def ellipsoid(name,loc,scale,material,parent=None,segments=24,rings=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings);o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);return finish(o,name,loc,material,parent)
def box(name,loc,size,material,parent=None,bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  m=o.modifiers.new('Bordes suaves','BEVEL');m.width=bevel;m.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
 return finish(o,name,loc,material,parent)
def rod(name,a,b,r,material,parent=None,verts=12):
 av,bv=Vector(xyz(a)),Vector(xyz(b));d=bv-av
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.location=(av+bv)/2;o.name=name;o.parent=parent;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
def join(objects,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;return o
def export(name):
 # Merge static pieces by parent/material while preserving articulation and blend shapes.
 batches={}
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and not o.data.shape_keys and len(o.data.materials)==1:
   batches.setdefault((o.parent,o.data.materials[0]),[]).append(o)
 for (parent,material),objects in batches.items():
  if len(objects)>1:join(objects,material.name+' Mesh')
 bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_yup=True,export_apply=False,export_animations=False,export_extras=True)
black.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.18
clear()
driver=group('Driver');head=group('Head',(0,1.35,.02),driver)
# Continuous cross sections, with real nose/chin projection and a softly squared jaw.
sections=[(-.55,.05,.24,.04),(-.50,.19,.36,.13),(-.42,.31,.42,.22),(-.30,.38,.44,.29),(-.17,.405,.43,.33),(-.02,.415,.405,.36),(.15,.405,.39,.37),(.32,.402,.40,.37),(.47,.38,.38,.35),(.59,.30,.29,.27),(.68,.13,.13,.13),(.70,.001,.001,.001)]
def section(y):
 for a,b in zip(sections,sections[1:]):
  if y<=b[0]:
   t=max(0,min(1,(y-a[0])/(b[0]-a[0])));return tuple(a[i]*(1-t)+b[i]*t for i in range(1,4))
 return sections[-1][1:]
def bump(x,y,cx,cy,sx,sy):return math.exp(-((x-cx)/sx)**2-((y-cy)/sy)**2)
def point(y,theta):
 w,d,b=section(y);c=math.cos(theta);x=math.sin(theta)*w
 nose=.07*bump(x,y,0,.12,.069,.18)+.135*bump(x,y,0,.005,.082,.07)+.045*bump(abs(x),y,.078,-.028,.03,.039)
 features=nose+.026*bump(x,y,0,-.18,.18,.06)+.052*bump(x,y,0,-.40,.20,.10)
 z=d*max(0,c)**.63+features*max(0,c)**.5 if c>=0 else -b*(-c)**.9
 return x,y,z
rows,cols=64,80;vertices=[];faces=[]
for j in range(rows+1):
 for i in range(cols+1):vertices.append(xyz(point(-.55+1.25*j/rows,math.tau*i/cols)))
for j in range(rows):
 for i in range(cols):
  a=j*(cols+1)+i;b=a+cols+1;faces.extend([(a,a+1,b),(a+1,b+1,b)])
mesh=bpy.data.meshes.new('Cabeza continua');mesh.from_pydata(vertices,[],faces);mesh.update();face=bpy.data.objects.new('Face',mesh);bpy.context.collection.objects.link(face);face.parent=head
uv=mesh.uv_layers.new(name='UVMap')
for poly in mesh.polygons:
 poly.use_smooth=True
 for li in poly.loop_indices:
  idx=mesh.loops[li].vertex_index;uv.data[li].uv=(idx%(cols+1)/cols,idx//(cols+1)/rows)
face.shape_key_add(name='Basis');smile=face.shape_key_add(name='Smile')
for v in smile.data:
 x,z,y=v.co;front=-z
 if front>.2:
  weight=bump(abs(x),y,.13,-.18,.07,.06);v.co.z+=.022*weight;v.co.y-=.006*weight
# Bake the previous generated atlas into conventional UVs. Original photos are never altered.
import numpy as np
atlas=bpy.data.images.load(str(ROOT/'assets/driver-atlas-v2.png'));aw,ah=atlas.size
pixels=np.array(atlas.pixels[:],dtype=np.float32).reshape(ah,aw,4)
size=768;texture=np.zeros((size,size,4),np.float32)
for j in range(size):
 y=-.55+1.25*j/(size-1)
 for i in range(size):
  theta=math.tau*i/(size-1);x,_,z=point(y,theta);c=math.cos(theta)
  def sample(u,v):return pixels[max(0,min(ah-1,int(v*ah))),max(0,min(aw-1,int(u*aw)))]
  front=sample(323/1942+x*.239,.5+y*.625);su=min(.864-z*.32,1878/1942);side=sample(su,.5+y*.625)
  if .846<su<.911 and .4<.5+y*.625<.6:side=sample(.22,.54)
  t=max(0,min(1,(c-.12)/.6));t=t*t*(3-2*t);texture[j,i]=front*t+side*(1-t)
tex=bpy.data.images.new('Driver UV bake',width=size,height=size);tex.pixels.foreach_set(texture.ravel());tex.filepath_raw=str(OUT/'driver-skin.png');tex.file_format='PNG';tex.save();tex.pack()
face_mat=mat('Rostro UV',(.8,.55,.4),.93);node=face_mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=tex;face_mat.node_tree.links.new(node.outputs['Color'],face_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);face.data.materials.append(face_mat)
ellipsoid('Cuello',(0,.78,-.025),(.21,.28,.19),skin,driver)
for sign in [-1,1]:
 ellipsoid('Oreja',(sign*.415,.015,-.03),(.06,.117,.072),skin,head)
 ellipsoid('Interior oreja',(sign*.44,.02,.012),(.026,.074,.03),skin,head)
ellipsoid('Remera',(0,.37,-.06),(.48,.48,.25),pink,driver)
box('Cadera',(0,.02,-.10),(.76,.23,.55),trousers,driver)
for sign in [-1,1]:
 rod('Pierna',(sign*.22,.02,.0),(sign*.25,-.17,.73),.14,trousers,driver)
 rod('Pantorrilla',(sign*.25,-.17,.73),(sign*.25,-.65,.87),.105,skin,driver)
 box('Zapatilla',(sign*.25,-.67,.94),(.26,.17,.39),white,driver)
 arm=group('ArmLeft' if sign<0 else 'ArmRight',(sign*.42,.60,-.02),driver)
 rod('Manga',(0,0,0),(sign*.06,-.20,.12),.145,pink,arm)
 rod('Antebrazo',(sign*.06,-.20,.12),(-sign*.15,-.20,.65),.09,skin,arm)
 ellipsoid('HandLeft' if sign<0 else 'HandRight',(-sign*.15,-.20,.67),(.09,.065,.13),skin,arm)
# Thick rounded rectangular frames, matching driver.png; lenses sit behind rims.
def outline(cx,cy,w,h,z):
 pts=[]
 for i in range(48):
  a=i/48*math.tau;co,si=math.cos(a),math.sin(a);xx=cx+w*(.92+.08*si)*math.copysign(abs(co)**.55,co);yy=cy+h*math.copysign(abs(si)**.55,si)+.018*abs(xx)/.42;pts.append((xx,yy,z-1.25*xx**2))
 return pts
frames=[]
for sign in [-1,1]:
 pts=outline(sign*.218,.17,.198,.132,.473)
 verts=[];polygons=[]
 for i,p in enumerate(pts):
  prev=Vector(pts[(i-1)%len(pts)]);nxt=Vector(pts[(i+1)%len(pts)]);tangent=(nxt-prev).normalized();normal=Vector((-tangent.y,tangent.x,0)).normalized()
  for j in range(10):
   a=j*math.tau/10;v=Vector(p)+normal*(math.cos(a)*.016)+Vector((0,0,math.sin(a)*.016));verts.append(xyz(v))
 for i in range(len(pts)):
  for j in range(10):
   a=i*10+j;b=((i+1)%len(pts))*10+j;c=((i+1)%len(pts))*10+(j+1)%10;d=i*10+(j+1)%10;polygons.append((a,b,c,d))
 m=bpy.data.meshes.new('Marco continuo');m.from_pydata(verts,[],polygons);o=bpy.data.objects.new('Montura',m);bpy.context.collection.objects.link(o);o.parent=head;o.data.materials.append(black)
 for poly in m.polygons:poly.use_smooth=True
 frames.append(o)
 verts=[xyz((sign*.218,.17,.467-1.25*.218**2))]+[xyz(p) for p in pts];ff=[(0,i+1,(i+1)%len(pts)+1) for i in range(len(pts))]
 m=bpy.data.meshes.new('Lente');m.from_pydata(verts,[],ff);o=bpy.data.objects.new('Lens',m);bpy.context.collection.objects.link(o);o.parent=head;o.data.materials.append(lens)
 for poly in o.data.polygons:poly.use_smooth=True
 frames.append(rod('Patilla',(sign*.41,.22,.26),(sign*.43,.18,-.06),.027,black,head))
frames.append(rod('Puente',(-.035,.20,.478),(.035,.20,.478),.027,black,head));join(frames,'Glasses')
# Curl clusters grouped as one mesh/material to avoid hundreds of draw calls.
curls=[]
cap_vertices=[];cap_faces=[]
for j in range(11):
 for i in range(65):
  theta=math.tau*i/64;c=math.cos(theta);boundary=.16+.31*max(c,0)-.34*max(-c,0)
  y=boundary+(.704-boundary)*j/10;x,_,z=point(min(y,.7),theta);cap_vertices.append(xyz((x*1.035,y+.008,z*1.035)))
for j in range(10):
 for i in range(64):
  a=j*65+i;b=a+65;cap_faces.extend([(a,a+1,b),(a+1,b+1,b)])
cap=bpy.data.meshes.new('Scalp');cap.from_pydata(cap_vertices,[],cap_faces);o=bpy.data.objects.new('Scalp',cap);bpy.context.collection.objects.link(o);o.parent=head;o.data.materials.append(hair)
for p in o.data.polygons:p.use_smooth=True
curls.append(o)
for i in range(320):
 theta=random.random()*math.tau;c=math.cos(theta);boundary=.16+.31*max(c,0)-.34*max(-c,0);y=boundary+(.702-boundary)*random.random()
 x,_,z=point(y,theta);r=random.uniform(.028,.052)
 curls.append(ellipsoid('Rulo',(x*1.045,y+.012,z*1.045),(r,r*.75,r),hair,head,10,6))
join(curls,'Curls')
export('driver')
# Low detail version preserves separate head, glasses and expression.
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and not o.data.shape_keys and len(o.data.polygons)>150:
  bpy.context.view_layer.objects.active=o;m=o.modifiers.new('LOD móvil','DECIMATE');m.ratio=.5;bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.export_scene.gltf(filepath=str(OUT/'driver-low.glb'),export_format='GLB',export_yup=True,export_animations=False)
clear();root=group('Ambulance')
box('Chasis',(0,.64,0),(2.65,.28,3.85),rubber,root)
box('Caja amarilla',(0,1.03,0),(2.72,.62,3.62),yellow,root,.12)
box('Capó',(0,1.44,1.36),(2.72,.34,1.18),yellow,root,.14)
box('Defensa',(0,.79,2.05),(2.80,.25,.27),rubber,root,.09)
box('Parrilla',(0,1.12,1.99),(1.78,.27,.08),rubber,root)
for sign in [-1,1]:
 light=box('Faro',(sign*1.02,1.28,2.01),(.58,.18,.10),white,root,.05);light.rotation_euler.y=sign*.13
 for zz in [-1.25,1.26]:
  wheel=group(('Front' if zz>0 else 'Rear')+('Left' if sign<0 else 'Right'),(sign*1.39,.58,zz),root)
  rod('Neumático',(-.20,0,0),(.20,0,0),.58,rubber,wheel,24)
  rod('Llanta',(sign*.205,0,0),(sign*.22,0,0),.30,metal,wheel,16)
  for i in range(12):
   a=i*math.tau/12;block=box('Taco',(0,math.cos(a)*.55,math.sin(a)*.55),(.44,.10,.15),rubber,wheel,.01);block.rotation_euler.x=a
 rod('Pilar frontal',(sign*1.24,1.6,.85),(sign*1.17,2.95,.56),.055,metal,root)
 rod('Pilar trasero',(sign*1.24,1.4,-1.48),(sign*1.17,2.95,-1.48),.065,metal,root)
 box('Asiento',(sign*.64,1.23,-.25),(.78,.22,.85),rubber,root,.10)
 box('Respaldo',(sign*.64,1.63,-.64),(.80,.84,.20),rubber,root,.12)
box('Techo',(0,3.0,-.45),(2.75,.18,2.65),white,root,.10)
box('Cartel',(0,3.32,.76),(2.78,.56,.11),white,root,.03)
wind=box('Parabrisas',(0,2.25,.72),(2.34,1.32,.016),glass,root,.005);wind.rotation_euler.x=.20
rod('Baliza',(0,3.1,.25),(0,3.37,.25),.15,red,root,16)
box('Tablero',(0,1.66,.67),(2.30,.25,.37),rubber,root,.08)
steering=group('Steering',(-.64,1.86,.65),root)
for i in range(32):
 a=i*math.tau/32;b=(i+1)*math.tau/32
 rod('Aro',(.28*math.cos(a),.28*math.sin(a),0),(.28*math.cos(b),.28*math.sin(b),0),.026,rubber,steering,8)
for a in [0,2.1,4.2]:rod('Radio',(0,0,0),(.27*math.cos(a),.27*math.sin(a),0),.02,metal,steering)
group('DriverMount',(-.64,1.32,-.06),root)
export('ambulance')
print('Editable Blender sources and GLB exports ready; likeness review remains pending.')
