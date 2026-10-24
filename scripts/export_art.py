"""Export the already-open, manually edited Blender source without saving over it."""
import bpy,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
name=sys.argv[sys.argv.index('--')+1]
if name not in ['driver','ambulance']:raise ValueError('Expected driver or ambulance')
bpy.ops.export_scene.gltf(filepath=str(ROOT/'godot/assets'/(name+'.glb')),export_format='GLB',export_yup=True,export_animations=False,export_extras=True)
if name=='driver':
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and not o.data.shape_keys and len(o.data.polygons)>150:
   bpy.context.view_layer.objects.active=o;m=o.modifiers.new('Mobile export only','DECIMATE');m.ratio=.5;bpy.ops.object.modifier_apply(modifier=m.name)
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'godot/assets/driver-low.glb'),export_format='GLB',export_yup=True,export_animations=False)
