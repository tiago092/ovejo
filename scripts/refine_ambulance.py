"""Apply the tropical art revision to the ambulance source; leave driver untouched."""
import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/ambulance.blend'))
# Explicitly replace this revision's parts so running the script twice is safe.
for o in list(bpy.data.objects):
 if o.get('tropical_revision'):bpy.data.objects.remove(o,do_unlink=True)
root=bpy.data.objects['Ambulance']
def paint(name,color,rough=.8):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
 return m
ivory=paint('Tropical rear ivory',(.78,.76,.64));pink=paint('Tropical medical pink',(.75,.12,.30));dark=paint('Tropical rear rubber',(.045,.055,.06));seat=paint('Tropical upholstery',(.09,.14,.16));reflector=paint('Tropical reflectors',(.65,.07,.08),.35)
yellow=bpy.data.materials.get('Amarillo ambulancia')
if yellow:
 p=yellow.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.72;p.inputs['Base Color'].default_value=(.64,.38,.025,1);p.inputs['Specular IOR Level'].default_value=.22
white=bpy.data.materials.get('Marfil')
if white:white.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.64,.63,.56,1)
def box(name,pos,size,mat):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.parent=root;o['tropical_revision']=True;o.location=(pos[0],-pos[2],pos[1]);o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 b=o.modifiers.new('Soft trim','BEVEL');b.width=.035;b.segments=2;bpy.ops.object.modifier_apply(modifier=b.name);o.data.materials.append(mat)
 return o
box('Rear bumper',(0,.68,-1.97),(2.8,.22,.24),dark)
box('Rear medical panel',(0,1.10,-1.84),(1.6,.45,.07),ivory)
box('Medical cross horizontal',(0,1.10,-1.90),(.40,.10,.035),pink)
box('Medical cross vertical',(0,1.10,-1.91),(.10,.32,.035),pink)
for side in [-1,1]:
 box('Tail reflector',(side*1.08,1.12,-1.87),(.28,.17,.06),reflector)
 box('Seat upholstery',(side*.64,1.28,-.25),(.68,.16,.72),seat)
 box('Seat back upholstery',(side*.64,1.65,-.51),(.67,.66,.055),seat)
 for z in [-.42,-.17]:box('Seat seam',(side*.64,1.37,z),(.58,.01,.018),dark)
 box('Side step',(side*1.34,.82,-.30),(.26,.13,1.15),dark)
# Batch only revision parts with their material. Keep wheel/steering/beacon pivots intact.
groups={}
for o in list(bpy.context.scene.objects):
 if o.get('tropical_revision') and o.type=='MESH':groups.setdefault(o.data.materials[0],[]).append(o)
for mat,objects in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=mat.name
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art-source/ambulance.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'godot/assets/ambulance.glb'),export_format='GLB',export_yup=True,export_animations=False,export_extras=True)
