extends Node3D
## One skinned surface per person; the articulated body always moves as one model.
var model: Node3D
var skeleton: Skeleton3D
var body: MeshInstance3D
var bones: Dictionary={}
var rest_rotations: Dictionary={}
var cup: Node3D
var props: Array=[]
static var palette_shader: Shader
func build(variant: int,shirt: String,skin: String,pants: String,role: String,has_cup: bool) -> void:
	model=load("res://assets/pedestrian-%d.glb" % variant).instantiate();add_child(model)
	skeleton=model.find_children("*","Skeleton3D",true,false)[0]
	body=model.find_children("*","MeshInstance3D",true,false)[0]
	if not palette_shader:
		palette_shader=Shader.new();palette_shader.code="shader_type spatial;uniform vec4 skin:source_color;uniform vec4 shirt:source_color;uniform vec4 pants:source_color;void fragment(){float region=round(COLOR.r*4.0);ALBEDO=region<.5?skin.rgb:(region<1.5?shirt.rgb:(region<2.5?pants.rgb:(region<3.5?vec3(.065,.055,.05):vec3(.68,.64,.53))));ROUGHNESS=.94;}"
	var paint:=ShaderMaterial.new();paint.shader=palette_shader;paint.set_shader_parameter("skin",Color(skin));paint.set_shader_parameter("shirt",Color(shirt));paint.set_shader_parameter("pants",Color(pants));body.material_override=paint
	for name in ["Root","Spine","Head","ArmL","ArmR","ForeL","ForeR","ThighL","ThighR","ShinL","ShinR"]:
		bones[name]=skeleton.find_bone(name)
		rest_rotations[name]=skeleton.get_bone_pose_rotation(bones[name])
	if has_cup:
		var attachment:=BoneAttachment3D.new();attachment.bone_name="ForeR";skeleton.add_child(attachment)
		var prop:=MeshInstance3D.new();var mesh:=CylinderMesh.new();mesh.top_radius=.065;mesh.bottom_radius=.05;mesh.height=.18;mesh.radial_segments=10
		var mat:=StandardMaterial3D.new();mat.albedo_color=Color("e2cda8");mat.roughness=.95;mesh.material=mat;prop.mesh=mesh;prop.position=Vector3(0,.27,.035);attachment.add_child(prop);cup=prop;props.append(prop)
	if role=="photographer":
		var attachment:=BoneAttachment3D.new();attachment.bone_name="ForeR";skeleton.add_child(attachment)
		var phone:=MeshInstance3D.new();var mesh:=BoxMesh.new();mesh.size=Vector3(.13,.22,.035);var mat:=StandardMaterial3D.new();mat.albedo_color=Color("355b61");mat.roughness=.8;mesh.material=mat;phone.mesh=mesh;phone.position=Vector3(0,.27,.045);attachment.add_child(phone);props.append(phone)
	if role=="venue_staff":scale=Vector3(1.08,1.06,1.06)
func quality(low: bool) -> void:
	body.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if low else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	for prop in props:prop.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if low else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
func pose(name: String,rotation: Vector3) -> void:
	if bones.get(name,-1)>=0:skeleton.set_bone_pose_rotation(bones[name],rest_rotations[name]*Quaternion.from_euler(rotation))
func animate(t: float,moving: bool,wave: bool,reduced: bool,role: String,index: int) -> void:
	for name in bones:pose(name,Vector3.ZERO)
	var swing:=sin(t*7+index*1.7)*.48 if moving and not reduced else 0.0
	pose("ThighL",Vector3(swing,0,0));pose("ThighR",Vector3(-swing,0,0))
	pose("ShinL",Vector3(maxf(0,-swing)*.8,0,0));pose("ShinR",Vector3(maxf(0,swing)*.8,0,0))
	pose("ArmL",Vector3(-swing*.7,0,0));pose("ArmR",Vector3(swing*.7,0,0))
	pose("ForeL",Vector3(-.12,0,0));pose("ForeR",Vector3(-.12,0,0))
	if role=="venue_staff" and not wave:
		pose("ArmL",Vector3(-.6,0,-.4));pose("ArmR",Vector3(-.6,0,.4));pose("ForeL",Vector3(-.75,0,0));pose("ForeR",Vector3(-.75,0,0))
	if wave:
		pose("ArmR",Vector3(-1.6,0,-.5));pose("ForeR",Vector3(-.7+(0.0 if reduced else sin(t*6)*.15),0,0))
	if role=="photographer" and not moving:pose("ArmR",Vector3(-1.1,0,0));pose("ForeR",Vector3(-1.35,0,0))
	if not reduced:pose("Head",Vector3(0,sin(t*1.3+index)*.045,0))
	if cup:cup.global_rotation=Vector3.ZERO
