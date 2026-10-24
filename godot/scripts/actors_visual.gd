extends Node3D
const World=preload("res://scripts/world_data.gd")
var pool: MultiMeshInstance3D
var transforms: Dictionary={}
const SHIRTS=["d489a5","91afbd","dcbd7e","7eaba0","a58ab4"]
func piece(pos: Vector3,size: Vector3,color: String,basis: Basis=Basis.IDENTITY) -> void:
	if not transforms.has(color): transforms[color]=[]
	transforms[color].append(Transform3D(basis.scaled(size),pos))
func local_piece(origin: Vector3,basis: Basis,pos: Vector3,size: Vector3,color: String,tilt: float=0) -> void:
	piece(origin+basis*pos,size,color,basis*Basis(Vector3.RIGHT,tilt))
func update(sim, t: float,reduced: bool) -> void:
	transforms.clear()
	if sim.phase==0:
		var point: Array=World.data.pickup
		var stretcher:=Vector3(point[0],World.height_at(point[0],point[1]),point[1])
		piece(stretcher+Vector3(0,.75,0),Vector3(.85,.15,2.1),"f0dfbb")
		piece(stretcher+Vector3(0,.93,-.2),Vector3(.65,.22,1.4),"91afbd")
		piece(stretcher+Vector3(0,1,.68),Vector3(.32,.32,.38),"b78061")
		for side in [-1,1]:
			for end in [-1,1]:
				piece(stretcher+Vector3(side*.35,.43,end*.8),Vector3(.06,.5,.06),"47576a")
				piece(stretcher+Vector3(side*.35,.18,end*.8),Vector3(.12,.27,.27),"342a28")
	for i in range(sim.pedestrians.size()):
		var p: Dictionary=sim.pedestrians[i]
		if p.cool>0 and int(sim.clock*8)%2!=0:continue
		var origin:=Vector3(p.x,World.height_at(p.x,p.z),p.z);var basis:=Basis(Vector3.UP,p.get("angle",0.0));var swing:=0.0 if reduced else sin(t*8+p.x)*.45
		local_piece(origin,basis,Vector3(0,1.18,0),Vector3(.52,.66,.30),SHIRTS[i%5])
		local_piece(origin,basis,Vector3(0,1.75,0),Vector3(.32,.36,.32),"b78061")
		local_piece(origin,basis,Vector3(0,1.94,-.02),Vector3(.34,.09,.33),"342a28")
		for sign in [-1,1]:
			local_piece(origin,basis,Vector3(sign*.15,.47,sin(swing*sign)*.2),Vector3(.18,.78,.21),"47576a",swing*sign)
			local_piece(origin,basis,Vector3(sign*.34,1.08,-sin(swing*sign)*.16),Vector3(.14,.58,.17),"b78061",-swing*sign)
	for c in sim.carts:
		var origin:=Vector3(c.x,World.height_at(c.x,c.z),c.z);var basis:=Basis(Vector3.UP,c.dir*PI/2)
		local_piece(origin,basis,Vector3(0,.85,0),Vector3(1.25,.85,1.8),"dcbd7e")
		local_piece(origin,basis,Vector3(0,1.7,0),Vector3(1.5,.12,2.1),"f1ddaf")
		for side in [-1,1]:
			for end in [-1,1]:local_piece(origin,basis,Vector3(side*.65,.35,end*.6),Vector3(.15,.6,.6),"342a28")
	var p: Dictionary=sim.police;var origin:=Vector3(p.x,World.height_at(p.x,p.z),p.z);var basis:=Basis(Vector3.UP,p.angle)
	if sim.state not in ["menu","cinematic"] and not (sim.state=="paused" and sim.paused_from=="cinematic"):
		local_piece(origin,basis,Vector3(0,.9,0),Vector3(2.5,.65,3.7),"f0dfbb")
		local_piece(origin,basis,Vector3(0,1.5,-.2),Vector3(2.1,.65,1.8),"355d65")
		local_piece(origin,basis,Vector3(0,1.91,-.2),Vector3(2.2,.12,1.9),"f0dfbb")
		local_piece(origin,basis,Vector3(0,2.08,-.2),Vector3(1.1,.20,.30),"ef568f" if int(t*5)%2 else "69d9d3")
		for side in [-1,1]:
			for end in [-1,1]:local_piece(origin,basis,Vector3(side*1.18,.5,end*1.15),Vector3(.3,.9,.9),"342a28")
	if not pool:
		var mm:=MultiMesh.new();mm.transform_format=MultiMesh.TRANSFORM_3D;mm.use_colors=true
		var mesh:=BoxMesh.new();var mat:=StandardMaterial3D.new();mat.vertex_color_use_as_albedo=true;mat.vertex_color_is_srgb=true;mat.roughness=.85;mesh.material=mat;mm.mesh=mesh
		pool=MultiMeshInstance3D.new();pool.multimesh=mm;add_child(pool)
	var count:=0
	for color in transforms:count+=transforms[color].size()
	var mm:=pool.multimesh
	if mm.instance_count<count:mm.instance_count=count+16
	mm.visible_instance_count=count
	var at:=0
	for color in transforms:
		for transform in transforms[color]:
			mm.set_instance_transform(at,transform);mm.set_instance_color(at,Color(color));at+=1
