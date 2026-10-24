extends Node3D
const World=preload("res://scripts/world_data.gd")
const Kit=preload("res://scripts/visual_kit.gd")
var pools: Dictionary={}
var transforms: Dictionary={}
var last_positions: Dictionary={}
var headings: Dictionary={}
const SHIRTS=["d489a5","91afbd","dcbd7e","7eaba0","a58ab4","cb8468","e0d7b8"]
const SKIN=["b78061","d3a17d","946b55","c58a67","795b4b"]
func piece(pos: Vector3,size: Vector3,color: String,basis: Basis=Basis.IDENTITY,shape: String="SoftBox") -> void:
	if not transforms.has(shape):transforms[shape]=[]
	transforms[shape].append({"transform":Transform3D(basis.scaled(size),pos),"color":Color(color)})
func local_piece(origin: Vector3,basis: Basis,pos: Vector3,size: Vector3,color: String,tilt: float=0,shape: String="SoftBox") -> void:
	piece(origin+basis*pos,size,color,basis*Basis(Vector3.RIGHT,tilt),shape)
func limb(origin: Vector3,basis: Basis,a: Vector3,b: Vector3,width: float,color: String) -> void:
	var direction: Vector3=b-a;var rotation:=Basis(Quaternion(Vector3.UP,direction.normalized()))
	piece(origin+basis*((a+b)*.5),Vector3(width,direction.length()+width*.4,width),color,basis*rotation,"Limb")
func reset() -> void:
	last_positions.clear();headings.clear()

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
	for i in range(sim.pedestrians.size()):
		var p: Dictionary=sim.pedestrians[i]
		var position2:=Vector2(p.x,p.z)
		var displacement: Vector2=position2-last_positions.get(i,position2)
		last_positions[i]=position2
		var moving: bool=displacement.length()>.0001 and sim.state=="playing"
		if displacement.length()>.001 and displacement.length()<2:headings[i]=atan2(displacement.x,displacement.y)
		if not headings.has(i):headings[i]=atan2(p.dx,p.dz)
		var near: bool=(position2.distance_to(Vector2(sim.x,sim.z))<20 and sim.siren_left>0) or (i<3 and sim.state=="cinematic" and not reduced)
		if p.cool>0 and int(sim.clock*8)%2!=0:continue
		var origin:=Vector3(p.x,World.height_at(p.x,p.z),p.z);var basis:=Basis(Vector3.UP,headings[i])
		var swing:=0.0 if reduced or not moving else sin(t*(11 if near else 7)+i*1.7)*.48
		var bob:=0.0 if reduced or not moving else absf(sin(t*7+i*1.7))*.045
		origin.y+=bob
		var skin: String=SKIN[i%SKIN.size()];var shirt: String=(["d0a048","69aab1","b788a9"][i] if i<3 else ("e8e4d4" if p.get("role","")=="staff" else SHIRTS[i%SHIRTS.size()]))
		local_piece(origin,basis,Vector3(0,1.2,0),Vector3(.64,.70,.42),shirt,0,"SoftBox")
		local_piece(origin,basis,Vector3(0,1.58,0),Vector3(.18,.24,.19),skin,0,"Limb")
		local_piece(origin,basis,Vector3(0,1.83,0),Vector3(.47,.55,.45),skin,0,"Round")
		local_piece(origin,basis,Vector3(0,2.02,-.03),Vector3(.46,.22,.44),"493d36" if i%3 else "302e33",0,"Round")
		if i%4==0:local_piece(origin,basis,Vector3(0,2.08,-.12),Vector3(.55,.38,.45),"493d36",0,"Round")
		local_piece(origin,basis,Vector3(0,1.82,.22),Vector3(.11,.12,.13),skin,0,"Round")
		for sign in [-1,1]:
			local_piece(origin,basis,Vector3(sign*.11,1.89,.20),Vector3(.05,.05,.04),"35343b",0,"Round")
			local_piece(origin,basis,Vector3(sign*.22,1.82,0),Vector3(.09,.15,.10),skin,0,"Round")
			var hip:=Vector3(sign*.16,.95,0);var knee:=Vector3(sign*.16,.53,swing*sign*.38);var foot:=Vector3(sign*.16,.14,-swing*sign*.42)
			var pants: String="657582" if i%2 else "4b5a62"
			limb(origin,basis,hip,knee,.23,pants);limb(origin,basis,knee,foot,.19,pants)
			local_piece(origin,basis,foot+Vector3(0,-.04,.08),Vector3(.25,.17,.40),"e2d6bd")
			var shoulder:=Vector3(sign*.33,1.42,0)
			var elbow:=Vector3(sign*(.43 if near else .38),1.13,swing*sign*.24)
			var hand:=Vector3(sign*(.59 if near else .39),1.53 if near else .86,swing*sign*.40)
			limb(origin,basis,shoulder,elbow,.22,shirt);limb(origin,basis,elbow,hand,.14,skin)
			local_piece(origin,basis,hand,Vector3(.16,.19,.14),skin,0,"Round")
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
		local_piece(origin,basis,Vector3(0,2.08,-.2),Vector3(1.1,.20,.30),"ef568f" if int(t*5)%2 else "69d9d3")
		for side in [-1,1]:
			for end in [-1,1]:local_piece(origin,basis,Vector3(side*1.18,.5,end*1.15),Vector3(.3,.9,.9),"342a28",0,"Round")
	for shape in transforms:
		if not pools.has(shape):
			var mm:=MultiMesh.new();mm.transform_format=MultiMesh.TRANSFORM_3D;mm.use_colors=true;mm.mesh=Kit.mesh(shape)
			var node:=MultiMeshInstance3D.new();node.multimesh=mm;add_child(node);pools[shape]=node
		var mm: MultiMesh=pools[shape].multimesh;var entries: Array=transforms[shape]
		if mm.instance_count<entries.size():mm.instance_count=entries.size()+32
		mm.visible_instance_count=entries.size()
		for i in range(entries.size()):mm.set_instance_transform(i,entries[i].transform);mm.set_instance_color(i,entries[i].color)
	for shape in pools:
		if not transforms.has(shape):pools[shape].multimesh.visible_instance_count=0
