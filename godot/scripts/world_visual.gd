extends Node3D
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

func cube_at(pos: Vector3,size: Vector3,color: String,rotation_y: float=0) -> void:
	# Spatial batches retain useful culling rather than one map-sized bounding box.
	var trunk:=color=="9b8260"
	var shadow:=color.begins_with("#") or trunk
	var detail:=color in ["d9c7a5","f0dfbb"]
	var key:="%s:%s:%s:%s:%s" % [trunk,shadow,detail,floori(pos.x/80),floori(pos.z/100)]
	if not batches.has(key): batches[key]={"trunk":trunk,"shadow":shadow,"detail":detail,"colors":[],"transforms":[]}
	batches[key].transforms.append(Transform3D(Basis(Vector3.UP,rotation_y).scaled(size),pos))
	batches[key].colors.append(Color(color))

func build() -> void:
	var environment:=WorldEnvironment.new(); var env:=Environment.new(); environment.environment=env; add_child(environment)
	var sky:=Sky.new(); var sky_mat:=ProceduralSkyMaterial.new()
	sky_mat.sky_top_color=Color("6dacc7"); sky_mat.sky_horizon_color=Color("f4c4a6"); sky_mat.ground_bottom_color=Color("677d8d"); sky_mat.ground_horizon_color=Color("e8c4a6")
	sky_mat.sky_curve=.2; sky.sky_material=sky_mat; env.background_mode=Environment.BG_SKY; env.sky=sky
	env.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR; env.ambient_light_color=Color("c4ccd5"); env.ambient_light_energy=.32
	env.tonemap_mode=Environment.TONE_MAPPER_ACES
	sun=DirectionalLight3D.new(); sun.rotation_degrees=Vector3(-24,-62,0); sun.light_color=Color("ffd6a0"); sun.light_energy=.38; sun.shadow_enabled=true; sun.directional_shadow_mode=DirectionalLight3D.SHADOW_ORTHOGONAL; sun.directional_shadow_max_distance=65; add_child(sun)
	var paving:=ShaderMaterial.new();var paving_shader:=Shader.new()
	paving_shader.code="""shader_type spatial;
render_mode cull_disabled;
varying vec3 world;
void vertex(){world=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;}
void fragment(){vec2 p=world.xz*vec2(2.2,3.5);p.x+=mod(floor(p.y),2.0)*.5;vec2 edge=abs(fract(p)-.5);float seam=smoothstep(.40,.49,max(edge.x,edge.y));float tint=fract(sin(dot(floor(p),vec2(12.9898,78.233)))*43758.5453);ALBEDO=mix(vec3(.57,.51,.42)+tint*.13,vec3(.38,.35,.30),seam*.65);ROUGHNESS=.94;}
""";paving.shader=paving_shader
	patch(-105,120,-170,160,45,66,material("c4b18b"),0)
	for x in World.data.road_x: patch(x-5.4,x+5.4,-157,148,2,60,paving,.06)
	for z in World.data.road_z: patch(-93,117,z-5.4,z+5.4,44,2,paving,.075)
	for x in World.data.road_x:
		for zi in range(-154,146,4):
			var crossing:=false
			for z in World.data.road_z:
				if absf(zi-z)<6.5: crossing=true
			if crossing: continue
			for sign in [-1,1]: cube_at(Vector3(x+sign*5.8,World.height_at(x+sign*5.8,zi)+.15,zi),Vector3(.55,.17,3.1),"d9c7a5")
	for z in range(-135,143,2): cube_at(Vector3(-71,World.height_at(-71,z)+.13,z),Vector3(3,.13,1.87),"bb9472")
	for building in World.data.buildings: build_house(building)
	for obstacle in World.data.obstacles: build_landmark(obstacle)
	var rng:=RandomNumberGenerator.new(); rng.seed=27
	for i in range(48):
		var px: float= -87+rng.randf_range(-4,4) if i<28 else 113+rng.randf_range(-2,2)
		var pz: float= -153+i%28*11
		palm(px,pz,6+rng.randf_range(0,3),rng.randf()*TAU)
	build_leaves()
	for key in batches:
		var batch: Dictionary=batches[key]; var mm:=MultiMesh.new();mm.transform_format=MultiMesh.TRANSFORM_3D;mm.use_colors=true
		var box: PrimitiveMesh
		if batch.trunk:
			var trunk:=CylinderMesh.new();trunk.height=1;trunk.top_radius=.5;trunk.bottom_radius=.5;trunk.radial_segments=8;box=trunk
		else:box=BoxMesh.new()
		var colors:=material("ffffff").duplicate();colors.vertex_color_use_as_albedo=true;colors.vertex_color_is_srgb=true
		box.material=colors;mm.mesh=box;mm.instance_count=batch.transforms.size()
		for i in range(mm.instance_count):
			mm.set_instance_transform(i,batch.transforms[i]);mm.set_instance_color(i,batch.colors[i])
		var node:=MultiMeshInstance3D.new();node.multimesh=mm;node.set_meta("small_detail",batch.detail);node.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_ON if batch.shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF;add_child(node);static_batch_nodes.append(node)
	batches.clear()
	water_material=ShaderMaterial.new();var shader:=Shader.new();shader.code="""shader_type spatial;
render_mode cull_disabled;
uniform float clock=0.0;
varying vec3 world;
void vertex(){world=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;VERTEX.y+=sin(world.z*.22+clock)*.10+sin(world.x*.31+clock*1.2)*.06;}
void fragment(){float ripple=pow(max(0.0,sin(world.z*.36+clock+sin(world.x*.15))),14.0);ALBEDO=mix(vec3(.08,.39,.46),vec3(.41,.72,.70),ripple*.35);ROUGHNESS=.29;METALLIC=.13;}
""";water_material.shader=shader
	var sea:=MeshInstance3D.new();var plane:=PlaneMesh.new();plane.size=Vector2(450,800);plane.subdivide_width=60;plane.subdivide_depth=100;sea.mesh=plane;sea.material_override=water_material;sea.position=Vector3(-327,-.12,0);add_child(sea)
	foam_material=ShaderMaterial.new();var foam_shader:=Shader.new()
	foam_shader.code="""shader_type spatial; render_mode unshaded,cull_disabled;
uniform float clock=0.0;varying vec2 p;
void vertex(){p=VERTEX.xz;VERTEX.x+=sin(VERTEX.z*.08+clock*.5)*.35;}
void fragment(){float band=sin(p.y*.5+clock)*.12;ALBEDO=mix(vec3(.41,.64,.60),vec3(.93,.87,.71),smoothstep(-.3,.7,sin(p.x*7.0+band+clock*.65)));}
""";foam_material.shader=foam_shader
	patch(-105,-103,-170,160,2,100,foam_material,.05)

func build_house(b: Dictionary) -> void:
	var base:=World.height_at(b.x,b.z); var center:=Vector3(b.x,base,b.z)
	cube_at(center+Vector3(0,b.h/2,0),Vector3(b.w,b.h,b.d),b.color)
	cube_at(center+Vector3(0,.3,0),Vector3(b.w+.3,.6,b.d+.3),"f0dfbb")
	cube_at(center+Vector3(0,b.h+.22,0),Vector3(b.w+1.6,.45,b.d+1.6),"aa6955")
	cube_at(center+Vector3(0,b.h+.55,0),Vector3(b.w+.5,.35,b.d+.5),"ba8063")
	for side in [-1,1]:
		for ix in range(int(-b.w/2+4),int(b.w/2-2),6):
			cube_at(center+Vector3(ix,2.9,side*(b.d/2+.12)),Vector3(2.8,2.9,.2),"f0dfbb")
			cube_at(center+Vector3(ix,2.9,side*(b.d/2+.25)),Vector3(2.2,2.3,.12),"355d65")
			cube_at(center+Vector3(ix,2.9,side*(b.d/2+.33)),Vector3(.09,2.4,.1),"83b5aa")
		for iz in range(int(-b.d/2+4),int(b.d/2-2),6):
			cube_at(center+Vector3(side*(b.w/2+.12),2.9,iz),Vector3(.2,2.9,2.8),"f0dfbb")
			cube_at(center+Vector3(side*(b.w/2+.25),2.9,iz),Vector3(.12,2.3,2.2),"355d65")
		cube_at(center+Vector3(0,1.6,side*(b.d/2+.2)),Vector3(2.8,3.2,.2),"5d5555")
		cube_at(center+Vector3(0,4.3,side*(b.d/2+.9)),Vector3(9,.18,2.2),"78b5a5")
	var back: bool=b.title=="POSTO DE SAÚDE"
	var sign:=Label3D.new();sign.text=b.title;sign.font_size=80;sign.pixel_size=.015;sign.modulate=Color("fff0cb");sign.outline_size=8;sign.position=center+Vector3(0,b.h-.6,(-1 if back else 1)*(b.d/2+.4));sign.rotation.y=PI if back else 0;add_child(sign)
	if b.title=="LUAU DO MORRO":
		for side in [-1,1]:
			var neon:=MeshInstance3D.new();var mesh:=BoxMesh.new();mesh.size=Vector3(.15,4.8,.18);neon.mesh=mesh
			var m:=material("ff559b").duplicate();m.emission_enabled=true;m.emission=Color("ff559b");m.emission_energy_multiplier=2;neon.material_override=m;neon.position=center+Vector3(side*14.5,2.7,16.4);add_child(neon)
		var slogan:=Label3D.new();slogan.text="ATÉ O SOL CHEGAR";slogan.font_size=60;slogan.pixel_size=.012;slogan.position=center+Vector3(0,3.3,16.5);slogan.modulate=Color("ffb3ce");add_child(slogan)
	# Camera-only obstacles; game collisions remain the data rectangles.
	var body:=StaticBody3D.new();body.collision_layer=2;body.collision_mask=0
	var shape:=CollisionShape3D.new();var box:=BoxShape3D.new();box.size=Vector3(b.w,b.h+3,b.d);shape.shape=box;body.add_child(shape);body.position=center+Vector3(0,(b.h+3)/2,0);add_child(body)

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
	var y:=World.height_at(x,z)
	for i in range(8):
		cube_at(Vector3(x+.3*sin(i*.2),y+h*(i+.5)/8,z),Vector3(.30,h/8+.1,.30),"9b8260",angle)
	palms.append({"position":Vector3(x+.3*sin(1.4),y+h,z),"angle":angle})

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
	sh.code="shader_type spatial; render_mode cull_disabled; uniform float clock=0.0; void vertex(){VERTEX.x+=sin(clock+VERTEX.z*.7)*VERTEX.z*.035;} void fragment(){ALBEDO=vec3(.16,.37,.23);ROUGHNESS=.9;}";leaf_material.shader=sh;mesh.surface_set_material(0,leaf_material)
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
