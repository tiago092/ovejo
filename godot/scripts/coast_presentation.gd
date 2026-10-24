extends RefCounted
## Original wood, ropes and warm fittings from the user's photographic direction.
const World=preload("res://scripts/world_data.gd")
const Kit=preload("res://scripts/visual_kit.gd")

static func build_walkway(art: Node3D) -> void:
	if not World.data.has("coastal_promenade"):return
	var coast: Dictionary=World.data.coastal_promenade;var path: Array=coast.path
	var widths: Dictionary={}
	for edge in World.data.edges:
		widths[edge.a]=maxf(widths.get(edge.a,0),edge.width);widths[edge.b]=maxf(widths.get(edge.b,0),edge.width)
	var offsets: Array=[];var lengths: Array=[0.0];var points:=World.nodes()
	for i in range(path.size()):
		var p: Vector2=points[path[i]]
		var before: Vector2=(p-points[path[i-1]]).normalized() if i>0 else (points[path[1]]-p).normalized()
		var after: Vector2=(points[path[i+1]]-p).normalized() if i<path.size()-1 else before
		var tangent: Vector2=(before+after).normalized()
		offsets.append(Vector2(-tangent.y,tangent.x)*float(widths[path[i]])*.5/maxf(.7,tangent.dot(after)))
		if i>0:lengths.append(float(lengths[-1])+p.distance_to(points[path[i-1]]))
	var tool:=SurfaceTool.new();tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in range(1,path.size()):
		var a: Vector2=points[path[i-1]];var b: Vector2=points[path[i]];var na: Vector2=offsets[i-1];var nb: Vector2=offsets[i]
		var wood:=1.0 if coast.wood_edges.has(path[i-1]) else 0.0
		var vertices: Array=[a-na,b+nb,a+na,a-na,b-nb,b+nb]
		var uv: Array=[Vector2(0,lengths[i-1]),Vector2(1,lengths[i]),Vector2(1,lengths[i-1]),Vector2(0,lengths[i-1]),Vector2(0,lengths[i]),Vector2(1,lengths[i])]
		for j in range(6):
			var p: Vector2=vertices[j];var endpoint: int=i if j in [1,4,5] else i-1
			tool.set_uv(uv[j]);tool.set_color(Color(wood,float(widths[path[endpoint]])/20.0,0))
			tool.add_vertex(Vector3(p.x,World.height_at(p.x,p.y)+.095,p.y))
	tool.generate_normals();var node:=MeshInstance3D.new();node.mesh=tool.commit();node.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var paint:=ShaderMaterial.new();var shader:=Shader.new();shader.code="""shader_type spatial;
void fragment(){
 float across=abs(UV.x-.5)*COLOR.g*20.0;
 float plank=floor(UV.y*3.1);
 float grain=sin(UV.x*94.0+sin(UV.y*.9)*2.0)*.012;
 float tint=fract(sin(plank*91.17)*43758.5);
 vec3 timber=mix(vec3(.43,.32,.21),vec3(.60,.48,.32),tint*.6)+grain;
 float seam=smoothstep(.45,.495,abs(fract(UV.y*3.1)-.5));
 timber=mix(timber,vec3(.26,.22,.17),seam*.38);
 vec3 paving=vec3(.59,.54,.44)+sin(UV.y*1.6)*.012;
 float wood=COLOR.r*(1.0-smoothstep(3.65,3.85,across));
 vec3 ground=mix(paving,timber,wood);
 float sand=smoothstep(COLOR.g*10.0-1.2,COLOR.g*10.0,across);
 ALBEDO=mix(ground,vec3(.63,.56,.43),sand);ROUGHNESS=.94;
}
""";paint.shader=shader;node.material_override=paint;art.add_child(node)
	build_bulbs(art)

static func beam(art: Node3D,a: Vector3,b: Vector3,width: float,color: String) -> void:
	art.shape_at("Pole",(a+b)*.5,Vector3(width,a.distance_to(b),width),color,0,false,false,b-a)

static func build_obstacle(art: Node3D,b: Dictionary) -> void:
	art.building_frame=Transform3D(Basis(Vector3.UP,b.yaw),Vector3(b.x,World.height_at(b.x,b.z),b.z))
	if b.kind=="coastal_lamp":
		art.shape_at("Pole",Vector3(0,2.3,0),Vector3(.18,4.6,.18),"876c4d",0,false,false)
		beam(art,Vector3(-.82,4.05,0),Vector3(.82,4.05,0),.10,"93734e")
		for side in [-1,1]:
			beam(art,Vector3(0,4.6,0),Vector3(side*.82,4.05,0),.08,"876c4d")
			art.shape_at("Pole",Vector3(side*.75,3.99,0),Vector3(.15,.09,.15),"c4a57b",0,false,false)
		if b.glow:
			var light:=OmniLight3D.new();light.position=art.building_frame*Vector3(0,3.7,0);light.light_color=Color("ffd39a");light.light_energy=.5;light.omni_range=8;light.shadow_enabled=false;light.set_meta("coast_fill",true);art.add_child(light)
	elif b.kind=="coastal_rope":
		var ends: Array=[-b.d*.5+.14,0,b.d*.5-.14]
		for z in ends:art.shape_at("Pole",Vector3(0,.55,z),Vector3(.14,1.1,.14),"8f795b",0,false,false)
		for height in [.65,.95]:
			for i in range(2):
				var mid: float=(ends[i]+ends[i+1])*.5
				beam(art,Vector3(0,height,ends[i]),Vector3(0,height-.06,mid),.035,"c9b58c")
				beam(art,Vector3(0,height-.06,mid),Vector3(0,height,ends[i+1]),.035,"c9b58c")
	elif b.kind=="coastal_sign":
		art.shape_at("Pole",Vector3(0,1.45,0),Vector3(.18,2.9,.18),"92714d",0,false,false)
		art.shape_at("SoftBox",Vector3(0,2.35,0),Vector3(2.15,1.5,.24),"c4a36a",0,false,false)
		art.shape_at("SoftBox",Vector3(0,2.35,.13),Vector3(1.9,1.27,.035),"846649",0,false,false)
		for i in range(8):
			var angle:=i*TAU/8
			art.shape_at("Round",Vector3(cos(angle)*.48,3.15+sin(angle)*.48,0),Vector3(.25,.33,.12),"c4a36a",0,false,false)
		art.shape_at("Round",Vector3(0,3.15,.04),Vector3(.75,.75,.16),"ae8b58",0,false,false)
		art.sign_at("MORRO\n← 2ª PRAIA\nVILA · POSTO",Vector3(0,2.35,.17),.24,"fff0d1").set_meta("coast_guide",true)
	art.building_frame=Transform3D.IDENTITY

static func build_bulbs(art: Node3D) -> void:
	var transforms: Array=[]
	for b in World.data.obstacles:
		if b.kind!="coastal_lamp":continue
		var frame:=Transform3D(Basis(Vector3.UP,b.yaw),Vector3(b.x,World.height_at(b.x,b.z),b.z))
		for side in [-1,1]:transforms.append(Transform3D(Basis.IDENTITY.scaled(Vector3(.12,.12,.12)),frame*Vector3(side*.75,3.95,0)))
	if transforms.is_empty():return
	var mesh: Mesh=Kit.mesh("Round").duplicate();var paint:=StandardMaterial3D.new();paint.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED;paint.albedo_color=Color("ffe2ab");mesh.surface_set_material(0,paint)
	var mm:=MultiMesh.new();mm.transform_format=MultiMesh.TRANSFORM_3D;mm.mesh=mesh;mm.instance_count=transforms.size()
	for i in range(transforms.size()):mm.set_instance_transform(i,transforms[i])
	var node:=MultiMeshInstance3D.new();node.multimesh=mm;node.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF;art.add_child(node)
