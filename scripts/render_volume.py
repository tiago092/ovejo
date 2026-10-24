"""Neutral three-view study of the exact runtime GLB. Does not save or alter authoring sources."""
import bpy,math
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'godot/assets/driver.glb'))
original=list(bpy.context.scene.objects)
neutral=bpy.data.materials.new('Volume review');neutral.use_nodes=True
p=neutral.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.43,.43,.43,1);p.inputs['Roughness'].default_value=.8
for o in original:
 if o.type!='MESH':continue
 # Hide only the detachable glasses so the forehead/nose transition is visible.
 o.hide_render=any(m and m.name in ['Marco negro','Cristal oscuro'] for m in o.data.materials)
 o.data.materials.clear();o.data.materials.append(neutral)
for view,angle in enumerate([0,-math.pi/4,-math.pi/2]):
 copies={}
 for o in original:
  n=o.copy();bpy.context.collection.objects.link(n);copies[o]=n
 for o,n in copies.items():
  if o.parent in copies:n.parent=copies[o.parent]
  else:n.location.x+=(view-1)*1.4;n.rotation_mode="XYZ";n.rotation_euler.z+=angle
for o in original:bpy.data.objects.remove(o,do_unlink=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Neutral background');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.45,.45,.45,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
camera=bpy.data.objects.new('Review camera',bpy.data.cameras.new('Orthographic'));bpy.context.collection.objects.link(camera);camera.location=(0,-8,1.25);camera.rotation_euler=(Vector((0,0,1.25))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=4.98;scene.camera=camera
for name,position,power,size in [('Key',(-3,-4,6),450,5),('Fill',(3,-3,3),160,4)]:
 light=bpy.data.objects.new(name,bpy.data.lights.new(name,'AREA'));bpy.context.collection.objects.link(light);light.location=position;light.rotation_euler=(Vector((0,0,1.25))-light.location).to_track_quat('-Z','Y').to_euler();light.data.energy=power;light.data.shape='DISK';light.data.size=size
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/'artifacts/godot/character-volume.png')
bpy.ops.render.render(write_still=True)
