"""Create the editable modular kit. Rebuilding is explicit; does not touch approved driver art."""
import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mat=bpy.data.materials.new('Kit paint · overridden by instance colour');mat.diffuse_color=(1,1,1,1)
def finish(o,name):
 o.name=name
 bpy.context.view_layer.objects.active=o
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 o.data.materials.clear();o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 return o
bpy.ops.mesh.primitive_cube_add(size=1)
o=bpy.context.object;m=o.modifiers.new('Soft handmade edges','BEVEL');m.width=.09;m.segments=3;bpy.ops.object.modifier_apply(modifier=m.name)
finish(o,'SoftBox')
bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.5);finish(bpy.context.object,'Round')
bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.5,depth=1);finish(bpy.context.object,'Pole')
# Capsule, unit height and diameter; intentionally cartoonish rounded limbs.
bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.5)
o=bpy.context.object
for v in o.data.vertices:v.co.z=v.co.z*.55+(.225 if v.co.z>=0 else -.225)
finish(o,'Limb')
# Roof centred on origin; Blender Z is exported as Godot Y.
verts=[(-.5,-.5,-.5),(.5,-.5,-.5),(-.5,.5,-.5),(.5,.5,-.5),(0,-.5,.5),(0,.5,.5)]
faces=[(0,2,3,1),(0,1,4),(2,5,3),(0,4,5,2),(1,3,5,4)]
mesh=bpy.data.meshes.new('Roof');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Roof',mesh);bpy.context.collection.objects.link(o);finish(o,'Roof')
# Stylized shallow wooden hull. The open top receives an inset dark Round in game.
verts=[]
for z,w,l in [(-.5,.19,.37),(.5,.5,.5)]:
 for x,y in [(0,-l),(-w,-l*.55),(-w,l*.55),(0,l),(w,l*.55),(w,-l*.55)]:verts.append((x,y,z))
faces=[tuple(reversed(range(6)))]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)]+[tuple(range(6,12))]
mesh=bpy.data.meshes.new('Hull');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Hull',mesh);bpy.context.collection.objects.link(o);finish(o,'Hull')
# Plaza fountain rim: unit outer diameter, low polygon count, opaque material.
bpy.ops.mesh.primitive_torus_add(major_radius=.43,minor_radius=.07,major_segments=24,minor_segments=6)
finish(bpy.context.object,'Ring')
# Four-triangle seabird, editable wings animated by the local vertex shader.
mesh=bpy.data.meshes.new('Bird');mesh.from_pydata([(-.6,.05,.05),(-.12,0,0),(0,.18,0),(.12,0,0),(.6,.05,.05),(0,-.28,0)],[],[(0,1,2),(2,3,4),(1,5,3),(1,3,2)]);mesh.update();o=bpy.data.objects.new('Bird',mesh);bpy.context.collection.objects.link(o);finish(o,'Bird')
# Keep each template at the origin: this file is a library, not a composed scene.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art-source/tropical-kit.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'godot/assets/tropical-kit.glb'),export_format='GLB',export_yup=True,export_animations=False)
