extends Node3D
const Kit=preload("res://scripts/visual_kit.gd")
const World = preload("res://scripts/world_data.gd")
var materials: Dictionary = {}
var batches: Dictionary = {}
var sun: DirectionalLight3D
var water_material: ShaderMaterial
var leaf_material: ShaderMaterial
var palms: Array = []
var static_batch_nodes: Array = []
var foam_material: ShaderMaterial

func material(color: String) -> StandardMaterial3D:
	if materials.has(color): return materials[color]
	var m:=StandardMaterial3D.new(); m.albedo_color=Color(color); m.roughness=.86
	materials[color]=m; return m

func shape_at(shape: String,pos: Vector3,size: Vector3,color: String,rotation_y: float=0,detail: bool=false,shadow: bool=true,axis: Vector3=Vector3.ZERO) -> void:
	var key:="%s:%s:%s:%s:%s" % [shape,shadow,detail,floori((pos.x+220)/220),floori((pos.z+250)/250)]
	if not batches.has(key):batches[key]={"shape":shape,"shadow":shadow,"detail":detail,"colors":[],"transforms":[]}
	var rotation:=Basis(Vector3.UP,rotation_y) if axis==Vector3.ZERO else Basis(Quaternion(Vector3.UP,axis.normalized()))
	batches[key].transforms.append(Transform3D(rotation.scaled(size),pos));batches[key].colors.append(Color(color))

func cube_at(pos: Vector3,size: Vector3,color: String,rotation_y: float=0) -> void:
	shape_at("SoftBox",pos,size,color,rotation_y,color in ["d9c7a5","f0dfbb"],color.begins_with("#") or color=="9b8260")

func sign_at(text: String,pos: Vector3,size: float,color: String="fff0d3",back: bool=false) -> void:
	var sign:=Label3D.new();sign.text=text;sign.font_size=64;sign.pixel_size=size/64;sign.position=pos;sign.modulate=Color(color);sign.outline_size=0;sign.rotation.y=PI if back else 0;sign.no_depth_test=false;add_child(sign)

func build() -> void:
	var environment:=WorldEnvironment.new(); var env:=Environment.new(); environment.environment=env; add_child(environment)
	var sky:=Sky.new(); var sky_mat:=ProceduralSkyMaterial.new()
	sky_mat.sky_top_color=Color("78afc8"); sky_mat.sky_horizon_color=Color("f6bba0"); sky_mat.ground_bottom_color=Color("677d8d"); sky_mat.ground_horizon_color=Color("e8c4a6")
	sky_mat.sky_curve=.2; sky.sky_material=sky_mat; env.background_mode=Environment.BG_SKY; env.sky=sky
	env.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR; env.ambient_light_color=Color("a7c6dc"); env.ambient_light_energy=.6
	env.tonemap_mode=Environment.TONE_MAPPER_ACES
	env.fog_enabled=true;env.fog_light_color=Color("b5c8c8");env.fog_density=.0016;env.fog_sky_affect=.12
	sun=DirectionalLight3D.new(); sun.rotation_degrees=Vector3(-18,-58,0); sun.light_color=Color("ffd6a0"); sun.light_energy=.48; sun.shadow_enabled=true; sun.directional_shadow_mode=DirectionalLight3D.SHADOW_ORTHOGONAL; sun.directional_shadow_max_distance=65; add_child(sun)
	var paving:=ShaderMaterial.new();var paving_shader:=Shader.new()
	paving_shader.code="""shader_type spatial;
varying vec3 world;
void vertex(){world=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void fragment(){vec2 p=world.xz*vec2(1.05,1.55);p.x+=mod(floor(p.y),2.0)*.5;vec2 edge=abs(fract(p)-.5);float seam=smoothstep(.41,.49,max(edge.x,edge.y));float tint=hash(floor(p));vec3 stone=mix(vec3(.48,.46,.41),vec3(.62,.58,.49),tint);float wear=sin(world.x*.07+world.z*.04)*.5+.5;ALBEDO=mix(stone,vec3(.63,.56,.44),wear*.23);ALBEDO=mix(ALBEDO,vec3(.43,.42,.37),seam*.2);ROUGHNESS=.96;}
""";paving.shader=paving_shader
	build_terrain(sand_material())
	build_roads(paving)
	for building in World.data.buildings:
		if detailed(building.x,building.z):build_house(building)
		else:
			shape_at("SoftBox",Vector3(building.x,World.height_at(building.x,building.z)+building.h/2,building.z),Vector3(building.w,building.h,building.d),"9daaa8")
			camera_blocker(Vector3(building.x,World.height_at(building.x,building.z),building.z),building)
	build_coast()
	if World.data.art_extent=="complete":
		for i in range(12):shape_at("SoftBox",Vector3(122-i*2.1,World.height_at(122-i*2.1,121)+5.2,121),Vector3(.7,.6,.05),["c79879","88aaa0","bd8ea5"][i%3],0,true,false)
	for obstacle in World.data.obstacles:
		if not detailed(obstacle.x,obstacle.z):continue
		if obstacle.kind=="palm":palm(obstacle.x,obstacle.z,obstacle.h,obstacle.angle)
		elif obstacle.kind=="plaza_garden":build_plaza(obstacle)
		elif obstacle.kind=="sign":build_road_sign(obstacle)
		camera_blocker(Vector3(obstacle.x,World.height_at(obstacle.x,obstacle.z),obstacle.z),obstacle)
	build_leaves()
	for key in batches:
		var batch: Dictionary=batches[key];var mm:=MultiMesh.new();mm.transform_format=MultiMesh.TRANSFORM_3D;mm.use_colors=true;mm.mesh=Kit.mesh(batch.shape);mm.instance_count=batch.transforms.size()
		for i in range(mm.instance_count):mm.set_instance_transform(i,batch.transforms[i]);mm.set_instance_color(i,batch.colors[i])
		var node:=MultiMeshInstance3D.new();node.multimesh=mm;node.set_meta("small_detail",batch.detail);node.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_ON if batch.shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF;add_child(node);static_batch_nodes.append(node)
	batches.clear()
	water_material=ShaderMaterial.new();var shader:=Shader.new();shader.code="""shader_type spatial;
render_mode cull_disabled;
uniform float clock=0.0;
varying vec3 world;
void vertex(){world=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;VERTEX.y+=sin(world.z*.22+clock)*.10+sin(world.x*.31+clock*1.2)*.06;}
void fragment(){float ripple=pow(max(0.0,sin(world.z*.36+clock+sin(world.x*.15))),14.0);ALBEDO=mix(vec3(.08,.39,.46),vec3(.41,.72,.70),ripple*.35);ROUGHNESS=.29;METALLIC=.13;}
""";water_material.shader=shader
	var sea:=MeshInstance3D.new();var plane:=PlaneMesh.new();plane.size=Vector2(850,1100);plane.subdivide_width=30;plane.subdivide_depth=55;sea.mesh=plane;sea.material_override=water_material;sea.position=Vector3(-595,-1.1,0);add_child(sea)
	foam_material=ShaderMaterial.new();var foam_shader:=Shader.new()
	foam_shader.code="""shader_type spatial; render_mode unshaded,cull_disabled;
uniform float clock=0.0;varying vec2 p;
void vertex(){p=VERTEX.xz;VERTEX.x+=sin(VERTEX.z*.08+clock*.5)*.35;}
void fragment(){float band=sin(p.y*.5+clock)*.12;ALBEDO=mix(vec3(.41,.64,.60),vec3(.93,.87,.71),smoothstep(-.3,.7,sin(p.x*7.0+band+clock*.65)));}
""";foam_material.shader=foam_shader
	build_shore(foam_material)

func detailed(x: float,z: float) -> bool:
	return World.data.art_extent=="complete" or z< -100

func road_mesh(width_extra: float,lift: float,mat: Material) -> void:
	var tool:=SurfaceTool.new();tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	var points:=World.nodes();var paths: Array=[World.data.main_route.duplicate()];var bypass: Array=[]
	var widths: Dictionary={}
	for edge in World.data.edges:
		widths[edge.a]=maxf(widths.get(edge.a,0),edge.width);widths[edge.b]=maxf(widths.get(edge.b,0),edge.width)
		if edge.section=="desvio":
			if bypass.is_empty():bypass.append(edge.a)
			bypass.append(edge.b)
		elif edge.section=="acceso":paths.append([edge.a,edge.b])
	paths.append(bypass)
	for pi in range(paths.size()):
		var path: Array=paths[pi];var offsets: Array=[]
		for i in range(path.size()):
			var p: Vector2=points[path[i]]
			var before: Vector2=(p-points[path[i-1]]).normalized() if i>0 else (points[path[1]]-p).normalized()
			var after: Vector2=(points[path[i+1]]-p).normalized() if i<path.size()-1 else before
			var tangent: Vector2=(before+after).normalized();var normal:=Vector2(-tangent.y,tangent.x)
			var half: float=float(widths[path[i]])*.5+width_extra
			offsets.append(normal*half/maxf(.7,tangent.dot(after)))
		for i in range(1,path.size()):
			var a: Vector2=points[path[i-1]];var b: Vector2=points[path[i]];var na: Vector2=offsets[i-1];var nb: Vector2=offsets[i]
			for p in [a-na,b+nb,a+na,a-na,b-nb,b+nb]:tool.add_vertex(Vector3(p.x,World.height_at(p.x,p.y)+lift+pi*.008,p.y))
	tool.generate_normals();var node:=MeshInstance3D.new();node.mesh=tool.commit();node.material_override=mat;node.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF;add_child(node)

func build_roads(paving: Material) -> void:
	road_mesh(1.1,.04,material("b7a78c"));road_mesh(0,.075,paving)
	# Curved paved courtyard joins the street; shared surface data drives dust/audio.
	var center:=Vector2(104,107);var tool:=SurfaceTool.new();tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	var outline: Array=World.data.plaza_paving
	for i in range(outline.size()):
		var a:=Vector2(outline[i][0],outline[i][1]);var b:=Vector2(outline[(i+1)%outline.size()][0],outline[(i+1)%outline.size()][1])
		for p in [center,a,b]:tool.add_vertex(Vector3(p.x,World.height_at(p.x,p.y)+.11,p.y))
	tool.generate_normals();var node:=MeshInstance3D.new();node.mesh=tool.commit();node.material_override=paving;node.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF;add_child(node)

func build_road_sign(b: Dictionary) -> void:
	var c:=Vector3(b.x,World.height_at(b.x,b.z),b.z)
	shape_at("SoftBox",c+Vector3(0,1.4,0),Vector3(.18,2.8,.18),"8c7057")
	shape_at("SoftBox",c+Vector3(0,2.5,0),Vector3(4,1.1,.3),"527c75")
	sign_at("SEGUNDA PRAIA",c+Vector3(0,2.64,-.17),.32,"f8e6ba",true)
	sign_at("← COSTA",c+Vector3(0,2.27,-.17),.27,"f8e6ba",true)

func build_plaza(b: Dictionary) -> void:
	var c:=Vector3(b.x,World.height_at(b.x,b.z),b.z)
	shape_at("Pole",c+Vector3(0,.25,0),Vector3(14,.5,14),"9b9b86")
	shape_at("Ring",c+Vector3(0,.9,0),Vector3(7,1.6,7),"a5b5aa")
	shape_at("Pole",c+Vector3(0,.62,0),Vector3(6,.12,6),"6eaaa3",0,false,false)
	shape_at("Pole",c+Vector3(0,1.3,0),Vector3(.8,1.6,.8),"adc1b5")
	shape_at("Ring",c+Vector3(0,2,0),Vector3(2.8,.8,2.8),"b9c8b7")
	for side in [-1,1]:
		shape_at("SoftBox",c+Vector3(side*5,1,0),Vector3(.9,.25,4),"a78261")
		shape_at("SoftBox",c+Vector3(side*5.35,1.45,0),Vector3(.15,.9,4),"a78261")
		shape_at("Round",c+Vector3(0,.9,side*5.1),Vector3(3.5,1.8,2.4),"6e936d")
	sign_at("PRAÇA DO SOL",c+Vector3(0,2.8,0),.6,"f5dfa5")

func build_terrain(mat: Material) -> void:
	var tool:=SurfaceTool.new();tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	for zi in range(70):
		for xi in range(40):
			for ij in [Vector2(0,0),Vector2(1,0),Vector2(1,1),Vector2(0,0),Vector2(1,1),Vector2(0,1)]:
				var z: float=-245+(zi+ij.y)*7;var shore:=World.shore_at(z);var x:=lerpf(shore,225,(xi+ij.x)/40.0)
				tool.add_vertex(Vector3(x,World.height_at(x,z),z))
	tool.generate_normals();var node:=MeshInstance3D.new();node.mesh=tool.commit();node.material_override=mat;add_child(node)

func build_shore(mat: Material) -> void:
	var tool:=SurfaceTool.new();tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	for zi in range(70):
		for ij in [Vector2(0,0),Vector2(1,0),Vector2(1,1),Vector2(0,0),Vector2(1,1),Vector2(0,1)]:
			var z: float=-245+(zi+ij.y)*7;var shore:=World.shore_at(z);var x: float=shore-ij.x*8
			tool.add_vertex(Vector3(x,lerpf(World.height_at(shore,z),-1.1,ij.x)+.025,z))
	tool.generate_normals();var node:=MeshInstance3D.new();node.mesh=tool.commit();node.material_override=mat;add_child(node)

func sand_material() -> ShaderMaterial:
	var mat:=ShaderMaterial.new();var sh:=Shader.new()
	sh.code="""shader_type spatial;varying vec3 world;void vertex(){world=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;}void fragment(){float shore=-185.0+sin(world.z*.013)*7.0+sin(world.z*.034)*3.0;float wet=1.0-smoothstep(0.0,14.0,world.x-shore);float grain=sin(world.x*.21+sin(world.z*.16))*sin(world.z*.19)*.012;ALBEDO=mix(vec3(.65,.56,.41),vec3(.38,.40,.34),wet*.6)+grain;ROUGHNESS=mix(.96,.55,wet);}"""
	mat.shader=sh;return mat

func build_house(b: Dictionary) -> void:
	var base:=World.height_at(b.x,b.z);var c:=Vector3(b.x,base,b.z)
	var club: bool=b.title=="LUAU DO MORRO";var clinic: bool=b.title=="POSTO DE SAÚDE"
	var family:=0 if "POUSADA" in b.title else (1 if "COCO" in b.title else (2 if "ARTESANATO" in b.title else 3))
	var wall: String=b.color
	if club:wall="#b86476"
	if clinic:wall="#e0dfc8"
	shape_at("SoftBox",c+Vector3(0,b.h/2,-.9 if club else (.9 if clinic else 0)),Vector3(b.w,b.h,b.d-1.8 if club or clinic else b.d),wall)
	shape_at("SoftBox",c+Vector3(0,.27,0),Vector3(b.w,.54,b.d),"bcab8f",0,false,false)
	if not clinic:
		shape_at("Roof",c+Vector3(0,b.h+1.1,0),Vector3(b.w+1.0,2.3,b.d-2.2 if club else b.d+.8),"a46c59" if family%2==0 else "876451")
		shape_at("SoftBox",c+Vector3(0,b.h+.06,0),Vector3(b.w+.8,.24,b.d-2 if club else b.d+.6),"e5c9a4",0,false,false)
	else:shape_at("SoftBox",c+Vector3(0,b.h+.2,0),Vector3(b.w+.8,.4,b.d+.8),"649d98")
	# Side façades share the same kit but vary openings, trim and shutters.
	for side in [-1,1]:
		for ix in range(int(-b.w/2+4),int(b.w/2-2),7):
			if club and side==1:continue
			if clinic and side==-1 and absf(ix)<6:continue
			var z: float=side*(b.d/2+.05)
			shape_at("SoftBox",c+Vector3(ix,3.0,z),Vector3(2.6,3,.16),"e8d7b5",0,false,false)
			shape_at("SoftBox",c+Vector3(ix,3.0,z+side*.11),Vector3(2.1,2.5,.12),"3c6665",0,false,false)
			for hand in [-1,1]:
				shape_at("SoftBox",c+Vector3(ix+hand*1.35,3,z+side*.20),Vector3(.55,2.7,.18),"77a695" if family%2 else "537e85",0,true,false)
			if family==0:
				shape_at("SoftBox",c+Vector3(ix,1.5,z+side*.25),Vector3(3.1,.2,.65),"c69c72",0,false,false)
				shape_at("Round",c+Vector3(ix,1.8,z+side*.25),Vector3(2,.65,.6),"73926a",0,true,false)
		for iz in range(int(-b.d/2+4),int(b.d/2-2),8):
			shape_at("SoftBox",c+Vector3(side*(b.w/2+.07),3.1,iz),Vector3(.15,2.9,2.3),"ead7b8",0,false,false)
			shape_at("SoftBox",c+Vector3(side*(b.w/2+.17),3.1,iz),Vector3(.12,2.3,1.8),"47716b",0,false,false)
	if not club and not clinic:
		for k in range(3):
			shape_at("SoftBox",c+Vector3(-b.w*.3+k*b.w*.3,1.2,b.d*.5-.4),Vector3(.7,1,.7),"a87f65",0,true,false)
			shape_at("Round",c+Vector3(-b.w*.3+k*b.w*.3,1.9,b.d*.5-.4),Vector3(1.2,1.1,.9),"5e896a",0,true,false)
	if not club and not clinic:
		if family==1:
			shape_at("Pole",c+Vector3(-2,.6,b.d*.5-.6),Vector3(.8,1.2,.8),"af8763",0,true,false)
			shape_at("Round",c+Vector3(-2,1.3,b.d*.5-.6),Vector3(.9,.6,.9),"6b8b64",0,true,false)
		if family==2:
			for k in range(4):shape_at("Round",c+Vector3(-1.5+k,2.6,b.d*.5-.1),Vector3(.55,.55,.15),"c3976e" if k%2 else "79a3a1",0,true,false)
		if family==3:
			shape_at("SoftBox",c+Vector3(0,4.6,b.d*.5-.1),Vector3(b.w*.7,.045,.045),"646559",0,true,false)
			for k in range(3):shape_at("SoftBox",c+Vector3(-1.5+k*1.5,4.25,b.d*.5-.1),Vector3(.7,.65,.04),["d6bf9d","ab8599","83a5a0"][k],0,true,false)
	if club:build_club(b,c)
	elif clinic:build_clinic(b,c)
	else:
		for side in [-1,1]:
			var z: float=side*(b.d/2+.15)
			shape_at("SoftBox",c+Vector3(0,1.7,z),Vector3(3,3.4,.2),"34494d",0,false,false)
			# Awnings and upper balconies distinguish bars, shops, houses and inns.
			var width:=12.0 if family in [1,2] else 6.0
			shape_at("SoftBox",c+Vector3(0,4.1,z),Vector3(width,.24,1.2),"e8c985" if family==1 else "6d9e99",0,false,false)
			if family==0:
				shape_at("SoftBox",c+Vector3(0,4.6,z),Vector3(8,.16,.8),"c7a783",0,false,false)
				for k in range(-4,5):shape_at("Pole",c+Vector3(k,5.05,z+.2*side),Vector3(.08,.8,.08),"e2ceb1",0,true,false)
			elif family in [1,2]:
				for k in range(-5,6,2):shape_at("SoftBox",c+Vector3(k,4.13,z+.05*side),Vector3(1,.3,1.25),"ce827b",0,true,false)
			sign_at(b.title,c+Vector3(0,b.h-.6,z+.25*side),.58,"fff1d3",side==-1)
	camera_blocker(c,b)

func camera_blocker(c: Vector3,b: Dictionary) -> void:
	var body:=StaticBody3D.new();body.collision_layer=2;body.collision_mask=0
	var shape:=CollisionShape3D.new();var box:=BoxShape3D.new();box.size=Vector3(b.w,b.h+3,b.d);shape.shape=box;body.add_child(shape);body.position=c+Vector3(0,(b.h+3)/2,0);add_child(body)

func build_club(b: Dictionary,c: Vector3) -> void:
	var front: float=b.d/2
	# Recess, pilasters and canopy all remain within the original solid rectangle.
	shape_at("SoftBox",c+Vector3(0,2.5,front-1.4),Vector3(9,5,.25),"293b4a")
	for side in [-1,1]:
		shape_at("SoftBox",c+Vector3(side*5.7,2.8,front-.8),Vector3(2.6,5.6,1.6),"a65368")
		for k in range(9):shape_at("SoftBox",c+Vector3(side*(7.5+k*.95),2.6,front-.3),Vector3(.18,4.8,.22),"694e51",0,true,false)
		shape_at("Pole",c+Vector3(side*4.3,2.3,front-.55),Vector3(.16,4.5,.16),"ef88ae",0,false,false)
		shape_at("SoftBox",c+Vector3(side*11,1.1,front-1.4),Vector3(5,.24,1),"ae815c")
		for leg in [-1,1]:shape_at("SoftBox",c+Vector3(side*11+leg*1.8,.5,front-1.4),Vector3(.25,1,.6),"524c50",0,true,false)
		for cup in range(3):shape_at("Pole",c+Vector3(side*11+cup*.5,1.34,front-1.5),Vector3(.16,.25,.16),"e0d2b3",0,true,false)
		shape_at("Round",c+Vector3(side*15.5,1.1,front-1.6),Vector3(2.8,2.2,1.5),"507b65")
	shape_at("SoftBox",c+Vector3(0,5.4,front-1.5),Vector3(15,.55,2.8),"563e55")
	shape_at("SoftBox",c+Vector3(0,5.12,front-.2),Vector3(14,.09,.10),"ff80ba",0,false,false)
	shape_at("SoftBox",c+Vector3(0,7.1,front-.35),Vector3(18,3.5,.5),"403d56")
	sign_at("LUAU",c+Vector3(0,7.7,front-.06),1.5,"ffa2c9")
	sign_at("DO MORRO",c+Vector3(0,6.35,front-.04),.65,"f4dca9")
	sign_at("ATÉ O SOL CHEGAR",c+Vector3(0,4.25,front-.85),.43,"f6ccae")
	# Local pink fill, no extra shadow maps.
	var glow:=OmniLight3D.new();glow.position=c+Vector3(0,3.4,front+.5);glow.light_color=Color("ff78af");glow.light_energy=.9;glow.omni_range=12;glow.shadow_enabled=false;add_child(glow)

func build_clinic(b: Dictionary,c: Vector3) -> void:
	var front: float=-b.d/2
	for side in [-1,1]:shape_at("SoftBox",c+Vector3(side*(b.w/4+3),b.h/2,front+.9),Vector3(b.w/2-6,b.h,1.8),"#e0dfc8")
	shape_at("SoftBox",c+Vector3(0,5.6,front+.9),Vector3(12,2.8,1.8),"#e0dfc8")
	shape_at("SoftBox",c+Vector3(0,2.0,front+1.6),Vector3(8,4,.3),"46858a")
	for side in [-1,1]:
		shape_at("SoftBox",c+Vector3(side*4.9,2,front+.6),Vector3(.6,4,1),"e8dec2")
		shape_at("SoftBox",c+Vector3(side*11,1.6,front+.8),Vector3(4,2.6,.25),"a5c8bc")
	shape_at("SoftBox",c+Vector3(0,4.7,front+.6),Vector3(15,.6,1.2),"518e87")
	shape_at("SoftBox",c+Vector3(0,6,front-.05),Vector3(1.8,.55,.15),"d8697e",0,false,false)
	shape_at("SoftBox",c+Vector3(0,6,front-.06),Vector3(.55,1.8,.15),"d8697e",0,false,false)
	sign_at("POSTO DE SAÚDE",c+Vector3(0,4.7,front-.09),.65,"fff1d3",true)
	sign_at("BEM-VINDO · RESPIRA",c+Vector3(0,3.7,front-.09),.36,"e2f3de",true)

func build_coast() -> void:
	var rng:=RandomNumberGenerator.new();rng.seed=95
	for i in range(16):
		var z:=rng.randf_range(-238,235);var x:=World.shore_at(z)+rng.randf_range(1,7)
		if not detailed(x,z):continue
		# Boats sit beyond the land boundary; shrubs stay inside registered footprints.
		shape_at("Hull",Vector3(x-12,World.height_at(x,z)-.5,z),Vector3(2.5,1,5.2),"ba8671" if i%2 else "6e9c9e",rng.randf())
	for building in World.data.buildings:
		if not detailed(building.x,building.z):continue
		for side in [-1,1]:shape_at("Round",Vector3(building.x+side*(building.w/2-1.2),World.height_at(building.x,building.z)+.7,building.z),Vector3(1.7,1.4,2.3),"668b68",0,true,false)

func build_landmark(b: Dictionary) -> void:
	var center:=Vector3(b.x,World.height_at(b.x,b.z),b.z)
	var hill:=MeshInstance3D.new();var sphere:=SphereMesh.new();sphere.radius=1;sphere.height=2;sphere.radial_segments=24;sphere.rings=12
	hill.mesh=sphere;hill.material_override=material("7b9c78");hill.position=center;hill.scale=Vector3(16,5,14);add_child(hill)
	var tower:=MeshInstance3D.new();var cylinder:=CylinderMesh.new();cylinder.top_radius=1.3;cylinder.bottom_radius=1.9;cylinder.height=10;cylinder.radial_segments=16
	tower.mesh=cylinder;tower.material_override=material("f8eed5");tower.position=center+Vector3(1,9,0);add_child(tower)
	cube_at(center+Vector3(1,14,0),Vector3(3.4,.4,3.4),"ded6bc")
	cube_at(center+Vector3(1,15,0),Vector3(2.1,1.7,2.1),"598589")
	var roof:=MeshInstance3D.new();var cone:=CylinderMesh.new();cone.top_radius=0;cone.bottom_radius=1.65;cone.height=1.1;cone.radial_segments=16
	roof.mesh=cone;roof.material_override=material("587478");roof.position=center+Vector3(1,16.4,0);add_child(roof)
	var body:=StaticBody3D.new();body.collision_layer=2;body.collision_mask=0
	var shape:=CollisionShape3D.new();var box:=BoxShape3D.new();box.size=Vector3(b.w,b.h,b.d);shape.shape=box;body.add_child(shape);body.position=center+Vector3(0,b.h/2,0);add_child(body)

func palm(x: float,z: float,h: float,angle: float) -> void:
	var y:=World.height_at(x,z);var lean:=Vector3(cos(angle)*.12,0,sin(angle)*.12)
	for i in range(7):
		var t0: float=i/7.0;var t1: float=(i+1)/7.0
		var a:=Vector3(x,y+h*t0,z)+lean*t0*t0;var b:=Vector3(x,y+h*t1,z)+lean*t1*t1
		shape_at("Pole",(a+b)*.5,Vector3(.48-t0*.2,a.distance_to(b)+.08,.48-t0*.2),"9b8260",0,false,true,b-a)
	palms.append({"position":Vector3(x,y+h,z)+lean,"angle":angle})

func build_leaves() -> void:
	var tool:=SurfaceTool.new();tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in range(10):
		var t0:=i/10.0;var t1:=(i+1)/10.0
		var a:=Vector3(-sin(t0*PI)*.5,sin(t0*PI)*.6-t0*t0,t0*4.5)
		var b:=Vector3(sin(t0*PI)*.5,a.y,a.z)
		var c:=Vector3(-sin(t1*PI)*.5,sin(t1*PI)*.6-t1*t1,t1*4.5)
		var d:=Vector3(sin(t1*PI)*.5,c.y,c.z)
		for v in [a,b,c,b,d,c]:tool.add_vertex(v)
	tool.generate_normals();var mesh:=tool.commit();leaf_material=ShaderMaterial.new();var sh:=Shader.new()
	sh.code="shader_type spatial; render_mode cull_disabled; uniform float clock=0.0; void vertex(){VERTEX.x+=sin(clock+VERTEX.z*.7)*VERTEX.z*.035;} void fragment(){ALBEDO=vec3(.24,.43,.28);ROUGHNESS=.9;}";leaf_material.shader=sh;mesh.surface_set_material(0,leaf_material)
	var mm:=MultiMesh.new();mm.transform_format=MultiMesh.TRANSFORM_3D;mm.mesh=mesh;mm.instance_count=palms.size()*7
	for i in range(palms.size()):
		for j in range(7):mm.set_instance_transform(i*7+j,Transform3D(Basis(Vector3.UP,palms[i].angle+j*TAU/7),palms[i].position))
	var node:=MultiMeshInstance3D.new();node.multimesh=mm;add_child(node)

func patch(x0: float,x1: float,z0: float,z1: float,nx: int,nz: int,mat: Material,lift: float) -> void:
	var vertices:=PackedVector3Array();var normals:=PackedVector3Array();var uv:=PackedVector2Array();var indices:=PackedInt32Array()
	for iz in range(nz+1):
		for ix in range(nx+1):
			var x:=lerpf(x0,x1,float(ix)/nx);var z:=lerpf(z0,z1,float(iz)/nz)
			vertices.append(Vector3(x,World.height_at(x,z)+lift,z));normals.append(Vector3.UP);uv.append(Vector2(x/2,z/2))
	for iz in range(nz):
		for ix in range(nx):
			var a:=iz*(nx+1)+ix;var b:=a+nx+1
			indices.append_array([a,a+1,b,b,a+1,b+1])
	var arrays:=[];arrays.resize(Mesh.ARRAY_MAX);arrays[Mesh.ARRAY_VERTEX]=vertices;arrays[Mesh.ARRAY_NORMAL]=normals;arrays[Mesh.ARRAY_TEX_UV]=uv;arrays[Mesh.ARRAY_INDEX]=indices
	var mesh:=ArrayMesh.new();mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES,arrays)
	var node:=MeshInstance3D.new();node.mesh=mesh;node.material_override=mat;add_child(node)

func animate(t: float) -> void:
	water_material.set_shader_parameter("clock",t);leaf_material.set_shader_parameter("clock",t);foam_material.set_shader_parameter("clock",t)

func quality(is_low: bool) -> void:
	sun.directional_shadow_max_distance=40 if is_low else 65
	for n in get_children():
		if n is Label3D:n.visibility_range_end=60 if is_low else 120
		if n.get_meta("small_detail",false):n.visible=not is_low
