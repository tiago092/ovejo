"""Original single-surface skinned townspeople. Editable sources; never touches driver assets."""
import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mat=bpy.data.materials.new('Region palette');mat.use_nodes=True
node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Region'
mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.93
G=lambda p:Vector((p[0],-p[2],p[1]))
bones={'Root':((0,0,0),(0,.9,0),None),'Spine':((0,.9,0),(0,1.5,0),'Root'),'Head':((0,1.53,0),(0,2.1,0),'Spine')}
for side,sign in [('L',-1),('R',1)]:
 bones['Arm'+side]=((sign*.33,1.42,0),(sign*.41,1.12,.03),'Spine')
 bones['Fore'+side]=((sign*.41,1.12,.03),(sign*.4,.86,.08),'Arm'+side)
 bones['Thigh'+side]=((sign*.16,.96,0),(sign*.16,.53,0),'Root')
 bones['Shin'+side]=((sign*.16,.53,0),(sign*.16,.13,0),'Thigh'+side)
models=[]
for variant in range(3):
 bpy.ops.object.armature_add();rig=bpy.context.object;rig.name=f'Townsperson{variant}';bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
 for name,(a,b,parent) in bones.items():
  bone=rig.data.edit_bones.new(name);bone.head=G(a);bone.tail=G(b)
  if parent:bone.parent=rig.data.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT');parts=[]
 def finish(o,bone,region):
  bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
  color=o.data.color_attributes.new(name='Region',type='FLOAT_COLOR',domain='CORNER')
  for entry in color.data:entry.color=(region/4,0,0,1)
  group=o.vertex_groups.new(name=bone);group.add(list(range(len(o.data.vertices))),1,'REPLACE')
  o.data.materials.clear();o.data.materials.append(mat)
  for face in o.data.polygons:face.use_smooth=True
  parts.append(o)
 def sphere(p,size,bone,region):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.5,location=G(p));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);finish(o,bone,region)
 def box(p,size,bone,region):
  bpy.ops.mesh.primitive_cube_add(size=1,location=G(p));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  bevel=o.modifiers.new('Soft edges','BEVEL');bevel.width=.055;bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name);finish(o,bone,region)
 def capsule(a,b,width,bone,region):
  direction=G(b)-G(a);bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.5,location=(G(a)+G(b))*.5);o=bpy.context.object;o.scale=(width,width,direction.length+width*.6);o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(direction.normalized());finish(o,bone,region)
 sphere((0,1.20,0),(.65,.78,.43),'Spine',1);box((0,.92,0),(.53,.21,.35),'Root',2)
 sphere((0,1.56,0),(.19,.27,.20),'Head',0);sphere((0,1.83,0),(.47,.55,.45),'Head',0)
 sphere((0,1.81,.24),(.12,.13,.15),'Head',0)
 box((0,1.705,.215),(.13,.025,.035),'Head',3)
 for sign in [-1,1]:
  sphere((sign*.12,1.89,.215),(.055,.055,.04),'Head',3);sphere((sign*.235,1.82,0),(.09,.16,.11),'Head',0)
  box((sign*.12,1.98,.195),(.13,.025,.035),'Head',3)
 if variant==1:
  for j in range(7):sphere((math.cos(j*math.tau/7)*.17,2.05,math.sin(j*math.tau/7)*.15),(.20,.21,.20),'Head',3)
 else:sphere((0,2.02,-.025),(.49,.24 if variant==0 else .34,.46),'Head',3)
 for side,sign in [('L',-1),('R',1)]:
  for name,width,region in [('Arm'+side,.23,1),('Fore'+side,.15,0),('Thigh'+side,.24,2),('Shin'+side,.20,2)]:capsule(*bones[name][:2],width,name,region)
  sphere((sign*.4,.86,.08),(.17,.19,.15),'Fore'+side,0)
  box((sign*.16,.10,.08),(.26,.17,.40),'Shin'+side,4)
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name='Body';bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 modifier=mesh.modifiers.new('Articulated body','ARMATURE');modifier.object=rig;mesh.parent=rig
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(ROOT/f'godot/assets/pedestrian-{variant}.glb'),export_format='GLB',export_yup=True,use_selection=True,export_animations=False)
 models.append(rig)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art-source/pedestrians.blend'))
