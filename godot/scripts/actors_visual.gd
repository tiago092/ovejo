extends Node3D
const World=preload("res://scripts/world_data.gd")
const Pedestrian=preload("res://scripts/pedestrian_visual.gd")
const Kit=preload("res://scripts/visual_kit.gd")
var pools: Dictionary={}
var humans: Array=[]
var low:=false
var ground_lifts: Dictionary={}
var last_ground_positions: Dictionary={}
var blobs: MultiMesh
var transforms: Dictionary={}
var last_positions: Dictionary={}
var headings: Dictionary={}
const SHIRTS=["d489a5","91afbd","dcbd7e","7eaba0","a58ab4","cb8468","e0d7b8"]
const SKIN=["b78061","d3a17d","946b55","c58a67","795b4b"]
func piece(pos: Vector3,size: Vector3,color: String,basis: Basis=Basis.IDENTITY,shape: String="SoftBox") -> void:
	if not transforms.has(shape):transforms[shape]=[]
	transforms[shape].append({"transform":Transform3D(basis.scaled_local(size),pos),"color":Color(color)})
func local_piece(origin: Vector3,basis: Basis,pos: Vector3,size: Vector3,color: String,tilt: float=0,shape: String="SoftBox") -> void:
	piece(origin+basis*pos,size,color,basis*Basis(Vector3.RIGHT,tilt),shape)
func reset() -> void:
	last_positions.clear();headings.clear();ground_lifts.clear();last_ground_positions.clear()

func update(sim, t: float,reduced: bool) -> void:
	transforms.clear()
	if sim.phase==0:
		var point: Array=World.data.pickup
		var stretcher:=Vector3(point[0],World.height_at(point[0],point[1]),point[1])
		if sim.load_progress>0:stretcher=stretcher.lerp(Vector3(sim.x,World.height_at(sim.x,sim.z),sim.z),clampf(sim.load_progress/1.3,0,1))
		piece(stretcher+Vector3(0,.75,0),Vector3(.85,.15,2.1),"f0dfbb")
		piece(stretcher+Vector3(0,.93,-.2),Vector3(.65,.22,1.4),"91afbd")
		piece(stretcher+Vector3(0,1,.68),Vector3(.32,.32,.38),"b78061")
		for side in [-1,1]:
			for end in [-1,1]:
				piece(stretcher+Vector3(side*.35,.43,end*.8),Vector3(.06,.5,.06),"47576a")
				piece(stretcher+Vector3(side*.35,.18,end*.8),Vector3(.12,.27,.27),"342a28",Basis.IDENTITY,"Round")
	while humans.size()<sim.pedestrians.size():
		var i:=humans.size();var role: String=sim.pedestrians[i].get("role","")
		var shirt: String=["d0a048","69aab1","b788a9"][i] if i<3 else ("e8e4d4" if role=="staff" else SHIRTS[i%SHIRTS.size()])
		if role=="venue_staff":shirt="3e505a"
		if role=="vendor":shirt="c6b58b"
		var human=Pedestrian.new();add_child(human);human.build(i%3,shirt,SKIN[i%SKIN.size()],"657582" if i%2 else "4b5a62",role,i in [1,2] or role=="party");human.quality(low);humans.append(human)
	if not blobs:make_shadows()
	blobs.visible_instance_count=sim.pedestrians.size() if low else 0
	for i in range(humans.size()):
		var human=humans[i]
		if i>=sim.pedestrians.size():human.visible=false;continue
		var p: Dictionary=sim.pedestrians[i];var position2:=Vector2(p.x,p.z)
		var displacement: Vector2=position2-last_positions.get(i,position2);last_positions[i]=position2
		var moving: bool=displacement.length()>.0001 and sim.state=="playing"
		if displacement.length()>.001 and displacement.length()<2:headings[i]=atan2(displacement.x,displacement.y)
		if not headings.has(i):headings[i]=atan2(p.dx,p.dz)
		if not last_ground_positions.has(i) or last_ground_positions[i].distance_to(position2)>1.5:
			ground_lifts[i]=.08 if World.surface_at(position2)=="stone" else .01;last_ground_positions[i]=position2
		var origin:=Vector3(p.x,World.height_at(p.x,p.z)+ground_lifts[i],p.z)
		human.position=origin;human.rotation.y=headings[i];human.visible=not (p.cool>0 and int(sim.clock*8)%2!=0)
		var near: bool=(position2.distance_to(Vector2(sim.x,sim.z))<20 and sim.siren_left>0) or (i<3 and sim.state=="cinematic" and not reduced)
		human.animate(t,moving,near,reduced,p.get("role",""),i)
		blobs.set_instance_transform(i,Transform3D(Basis.IDENTITY,origin+Vector3(0,.015,0)))
	for c in sim.carts:
		var origin:=Vector3(c.x,World.height_at(c.x,c.z),c.z);var basis:=Basis(Vector3.UP,c.angle)
		local_piece(origin,basis,Vector3(0,.85,0),Vector3(1.25,.85,1.8),"dcbd7e")
		local_piece(origin,basis,Vector3(0,1.7,0),Vector3(1.5,.12,2.1),"f1ddaf")
		for side in [-1,1]:
			for end in [-1,1]:local_piece(origin,basis,Vector3(side*.65,.35,end*.6),Vector3(.15,.6,.6),"342a28",0,"Round")
	var p: Dictionary=sim.police;var origin:=Vector3(p.x,World.height_at(p.x,p.z),p.z);var basis:=Basis(Vector3.UP,p.angle)
	if sim.phase==1:
		local_piece(origin,basis,Vector3(0,.9,0),Vector3(2.5,.65,3.7),"f0dfbb")
		local_piece(origin,basis,Vector3(0,1.5,-.2),Vector3(2.1,.65,1.8),"355d65")
		local_piece(origin,basis,Vector3(0,1.91,-.2),Vector3(2.2,.12,1.9),"f0dfbb")
		local_piece(origin,basis,Vector3(0,2.08,-.2),Vector3(1.1,.20,.30),"ef568f" if not reduced and int(t*5)%2 else "69d9d3")
		for side in [-1,1]:
			for end in [-1,1]:local_piece(origin,basis,Vector3(side*1.18,.5,end*1.15),Vector3(.3,.9,.9),"342a28",0,"Round")
	for shape in transforms:
		if not pools.has(shape):
			var mm:=MultiMesh.new();mm.transform_format=MultiMesh.TRANSFORM_3D;mm.use_colors=true;mm.mesh=Kit.mesh(shape)
			var node:=MultiMeshInstance3D.new();node.multimesh=mm;node.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if low else GeometryInstance3D.SHADOW_CASTING_SETTING_ON;add_child(node);pools[shape]=node
		var mm: MultiMesh=pools[shape].multimesh;var entries: Array=transforms[shape]
		if mm.instance_count<entries.size():mm.instance_count=entries.size()+32
		mm.visible_instance_count=entries.size()
		mm.buffer=instance_buffer(entries,mm.instance_count)
	for shape in pools:
		if not transforms.has(shape):pools[shape].multimesh.visible_instance_count=0

# Full linear uploads keep all articulated pieces on the same presentation frame.
# Format: RenderingServer.multimesh_set_buffer, 3D transform + RGBA (16 floats).
func instance_buffer(entries: Array,capacity: int) -> PackedFloat32Array:
	var buffer:=PackedFloat32Array()
	for entry in entries:
		var tr: Transform3D=entry.transform;var color: Color=entry.color
		buffer.append_array(PackedFloat32Array([tr.basis.x.x,tr.basis.y.x,tr.basis.z.x,tr.origin.x,tr.basis.x.y,tr.basis.y.y,tr.basis.z.y,tr.origin.y,tr.basis.x.z,tr.basis.y.z,tr.basis.z.z,tr.origin.z,color.r,color.g,color.b,color.a]))
	buffer.resize(capacity*16)
	return buffer

func quality(is_low: bool) -> void:
	low=is_low
	for human in humans:human.quality(low)
	for shape in pools:pools[shape].cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if low else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
func make_shadows() -> void:
	var mesh:=PlaneMesh.new();mesh.size=Vector2(.8,.6)
	var paint:=ShaderMaterial.new();var shader:=Shader.new();shader.code="shader_type spatial;render_mode unshaded,cull_disabled,depth_draw_never;void fragment(){ALBEDO=vec3(.17,.21,.20);ALPHA=(1.0-smoothstep(.2,.5,length(UV-vec2(.5))))*.20;}";paint.shader=shader;mesh.material=paint
	blobs=MultiMesh.new();blobs.transform_format=MultiMesh.TRANSFORM_3D;blobs.mesh=mesh;blobs.instance_count=30
	var node:=MultiMeshInstance3D.new();node.multimesh=blobs;node.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF;add_child(node)
