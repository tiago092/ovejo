extends Node3D
const World=preload("res://scripts/world_data.gd")
var model: Node3D
var driver: Node3D
var head: Node3D
var face: MeshInstance3D
var steering: Node3D
var wheels: Array=[]
var arms: Array=[]
var arm_rig: Array=[]
var low := false
var wheel_phase:=0.0
var previous_speed:=0.0
var suspension:=0.0
var braking_pitch:=0.0
var beacon: MeshInstance3D
var beacon_material: StandardMaterial3D
func build(is_low: bool) -> void:
	low=is_low
	model=load("res://assets/ambulance.glb").instantiate();add_child(model)
	steering=model.find_child("Steering",true,false)
	beacon=model.find_child("Baliza",true,false)
	if beacon:
		beacon_material=beacon.get_active_material(0).duplicate()
		beacon_material.emission_enabled=true;beacon_material.emission=Color("ed2746")
		beacon.material_override=beacon_material
	for name in ["FrontLeft","FrontRight","RearLeft","RearRight"]:wheels.append(model.find_child(name,true,false))
	load_driver()
	var sign:=Label3D.new();sign.text="AMBULÂNCIA";sign.font_size=80;sign.pixel_size=.004;sign.modulate=Color("df407f");sign.outline_size=0;sign.position=Vector3(0,3.32,.825);sign.scale.x=-1;add_child(sign)
func load_driver() -> void:
	if driver:driver.get_parent().remove_child(driver);driver.queue_free()
	driver=load("res://assets/driver-low.glb" if low else "res://assets/driver.glb").instantiate()
	var mount=model.find_child("DriverMount",true,false);mount.add_child(driver);driver.scale=Vector3.ONE*.78
	head=driver.find_child("Head",true,false);face=driver.find_child("Face",true,false)
	arms=[driver.find_child("ArmLeft",true,false),driver.find_child("ArmRight",true,false)]
	for n in driver.find_children("*","GeometryInstance3D",true,false):n.layers=5
	arm_rig.clear()
	for i in range(2):
		if arms[i]:arms[i].visible=false
		var parts: Array=[]
		for j in range(3):
			var node:=MeshInstance3D.new();var mesh: PrimitiveMesh
			if j==2:
				var sphere:=SphereMesh.new();sphere.radius=1;sphere.height=2;sphere.radial_segments=12;sphere.rings=8;mesh=sphere
			else:
				var cylinder:=CylinderMesh.new();cylinder.top_radius=1;cylinder.bottom_radius=1;cylinder.height=1;cylinder.radial_segments=12;mesh=cylinder
			var material:=StandardMaterial3D.new();material.albedo_color=Color("e74688" if j==0 else "c88964");material.roughness=.85;mesh.material=material;node.mesh=mesh;node.layers=5;driver.add_child(node);parts.append(node)
		arm_rig.append(parts)
func reset() -> void:
	wheel_phase=0;previous_speed=0;suspension=0;braking_pitch=0
	if steering:steering.rotation.z=0
	for wheel in wheels:
		if wheel:wheel.rotation=Vector3.ZERO
	model.position.y=0;model.rotation.x=0

func update(sim,dt: float,t: float,reduced: bool) -> void:
	if beacon_material:
		beacon_material.emission_energy_multiplier=(.7 if reduced else (.9 if int(sim.clock*8)%2 else .12)) if sim.siren_left>0 else 0.0
	position=Vector3(sim.x,World.height_at(sim.x,sim.z)+.04,sim.z)
	var slope: float=(World.height_at(sim.x+sin(sim.angle)*2,sim.z+cos(sim.angle)*2)-World.height_at(sim.x-sin(sim.angle)*2,sim.z-cos(sim.angle)*2))/4
	var turn: int=int(sim.keys.left)-int(sim.keys.right)
	var acceleration: float=clampf((sim.speed-previous_speed)/maxf(dt,.001),-34,16) if dt>0 else 0.0
	if dt>0:previous_speed=sim.speed
	var bob: float=sin(t*11)*minf(absf(sim.speed)*.0018,.035)+sin(t*19)*sim.impact*.012
	suspension=lerpf(suspension,bob,minf(dt*10,1));braking_pitch=lerpf(braking_pitch,-acceleration*.0018,minf(dt*7,1))
	model.position.y=0 if reduced else suspension;model.rotation.x=0 if reduced else braking_pitch
	rotation=Vector3(-atan(slope),sim.angle,0 if reduced else turn*clampf(sim.speed/24,0,1)*(.035+sim.drift_amount*.035))
	wheel_phase+=sim.speed*dt/.58 if sim.state=="playing" else 0.0
	for wheel in wheels:
		if wheel:
			wheel.rotation.x=wheel_phase
			if str(wheel.name).begins_with("Front"):wheel.rotation.y=lerpf(wheel.rotation.y,turn*.32,minf(dt*9,1))
	if steering:steering.rotation.z=lerpf(steering.rotation.z,-turn*.48,minf(1,dt*10))
	if head:
		head.rotation.x=0 if reduced else -sim.impact*.06
		head.rotation.z=0 if reduced else sin(t*7)*minf(sim.speed*.0016,.025)+sin(sim.impact*20)*sim.impact*.055
	if face and face.mesh.get_blend_shape_count()>0:face.set_blend_shape_value(0,.9 if sim.state=="won" else (.0 if sim.state=="lost" else .22))
	for i in range(arm_rig.size()):
		var sign: float=-1 if i==0 else 1
		var shoulder:=Vector3(sign*.42,.60,-.02)
		var elbow:=Vector3(sign*.49,.27,.38)
		var grip: Vector3=driver.to_local(steering.to_global(Vector3(sign*.25,0,0)))
		limb(arm_rig[i][0],shoulder,elbow,.14)
		limb(arm_rig[i][1],elbow,grip,.085)
		arm_rig[i][2].position=grip;arm_rig[i][2].scale=Vector3(.10,.07,.12)

func limb(node: Node3D,a: Vector3,b: Vector3,radius: float) -> void:
	node.position=(a+b)*.5
	node.quaternion=Quaternion(Vector3.UP,(b-a).normalized())
	node.scale=Vector3(radius,a.distance_to(b),radius)

func quality(is_low: bool) -> void:
	for wheel in wheels:
		if wheel:
			for n in wheel.find_children("*","GeometryInstance3D",true,false):n.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if is_low else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	for n in driver.find_children("*","GeometryInstance3D",true,false):n.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if is_low else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
