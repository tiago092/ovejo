extends SceneTree
const Sim=preload("res://scripts/simulation.gd")
const Vehicle=preload("res://scripts/vehicle_visual.gd")
const Art=preload("res://scripts/world_visual.gd")
const Actors=preload("res://scripts/actors_visual.gd")
var checks: Array=[]
func check(value: bool,title: String) -> void:
	checks.append({"name":title,"passed":value})
	if not value:printerr("FAIL: "+title)
func _init() -> void:
	call_deferred("run_checks")
func run_checks() -> void:
	var sim=Sim.new();sim.start(false,false,27)
	var vehicle=Vehicle.new();root.add_child(vehicle);vehicle.build(true)
	vehicle.wheel_phase=9;vehicle.previous_speed=14;vehicle.model.position.y=.2;vehicle.model.rotation.x=.1;vehicle.steering.rotation.z=.4
	for wheel in vehicle.wheels:wheel.rotation=Vector3(.5,.3,0)
	vehicle.reset()
	for wheel in vehicle.wheels:check(wheel.rotation==Vector3.ZERO,"restart centres "+str(wheel.name))
	check(vehicle.steering.rotation.z==0,"restart centres steering")
	check(vehicle.wheel_phase==0 and vehicle.previous_speed==0 and vehicle.model.position.y==0 and vehicle.model.rotation.x==0,"restart clears vehicle visual history")
	sim.speed=18;sim.impact=1;sim.keys.left=true
	var before: Dictionary=sim.snapshot()
	vehicle.update(sim,.1,.7,false)
	check(before==sim.snapshot(),"vehicle presentation does not mutate simulation")
	vehicle.update(sim,.1,.7,true)
	check(vehicle.model.position.y==0 and vehicle.model.rotation.x==0 and vehicle.head.rotation.x==0 and vehicle.head.rotation.z==0,"reduced motion removes secondary vehicle and head movement")
	var actors=Actors.new();root.add_child(actors);actors.update(sim,.7,false)
	check(before==sim.snapshot(),"rounded actors do not mutate simulation")
	check(actors.humans.size()==30,"thirty articulated actors keep the logical population")
	var person=actors.humans[0]
	check(person.body.mesh.get_surface_count()==1 and person.body.skin!=null,"townsperson uses one skinned surface")
	person.pose("ArmR",Vector3.ZERO)
	check(person.skeleton.get_bone_pose_rotation(person.bones.ArmR).is_equal_approx(person.skeleton.get_bone_rest(person.bones.ArmR).basis.get_rotation_quaternion()),"neutral arm preserves imported rest rotation")
	check(person.skeleton.get_bone_count()==11,"editable townsperson skeleton keeps eleven bones")
	var art=Art.new();var axis:=Vector3(.2,8,.3).normalized()
	art.shape_at("Pole",Vector3.ZERO,Vector3(.4,8,.4),"9b8260",0,false,true,axis)
	var trunk: Transform3D=art.batches.values()[0].transforms[0]
	check((trunk.basis*Vector3.UP).distance_to(axis*8)<.001,"leaning trunk preserves length along its own axis")
	var frame:=Transform3D(Basis(Vector3.UP,.7),Vector3(13,2,-30))
	art.building_frame=frame;art.batches.clear()
	art.shape_at("SoftBox",Vector3(2,1,3),Vector3(4,2,5),"e8d7b5")
	var facade: Transform3D=art.batches.values()[0].transforms[0]
	check(facade.origin.distance_to(frame*Vector3(2,1,3))<.001,"oriented façade uses parcel translation and rotation")
	check(facade.basis.z.normalized().distance_to(frame.basis.z)<.001,"oriented façade preserves local axes")
	var label=art.sign_at("TEST",Vector3(0,3,4),.3)
	check(label.position.distance_to(frame*Vector3(0,3,4))<.001 and label.basis.is_equal_approx(frame.basis),"shop lettering follows its parcel")
	art.building_frame=Transform3D.IDENTITY
	art.camera_blocker(Vector3(13,2,-30),{"w":8,"d":9,"h":6,"yaw":.7})
	check(is_equal_approx(art.get_child(art.get_child_count()-1).rotation.y,.7),"camera query solid uses the parcel orientation")
	for family in ["house","pousada","shop","bar"]:
		var data: Dictionary=preload("res://scripts/world_data.gd").data
		var home: Dictionary=data.buildings.filter(func(b):return b.family==family)[0]
		art.batches.clear();art.build_compact_house(home)
		var inverse:=Transform3D(Basis(Vector3.UP,home.yaw),Vector3(home.x,preload("res://scripts/world_data.gd").height_at(home.x,home.z),home.z)).affine_inverse()
		var within:=true
		for batch in art.batches.values():
			var mesh: Mesh=preload("res://scripts/visual_kit.gd").mesh(batch.shape)
			for transform in batch.transforms:
				for vertex in mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX]:
					var point: Vector3=inverse*(transform*vertex)
					if absf(point.x)>home.w*.5+.002 or absf(point.z)>home.d*.5+.002:within=false
		check(within,"widened "+family+" geometry stays inside its collision parcel")
	for kind in ["coastal_lamp","coastal_rope","coastal_sign"]:
		var items: Array=preload("res://scripts/world_data.gd").data.obstacles.filter(func(b):return b.kind==kind)
		if items.is_empty():continue
		var item: Dictionary=items[0];art.batches.clear()
		preload("res://scripts/coast_presentation.gd").build_obstacle(art,item)
		var inverse:=Transform3D(Basis(Vector3.UP,item.yaw),Vector3(item.x,preload("res://scripts/world_data.gd").height_at(item.x,item.z),item.z)).affine_inverse()
		var within:=true
		for batch in art.batches.values():
			for transform in batch.transforms:
				for vertex in preload("res://scripts/visual_kit.gd").mesh(batch.shape).surface_get_arrays(0)[Mesh.ARRAY_VERTEX]:
					var point: Vector3=inverse*(transform*vertex)
					if absf(point.x)>item.w*.5+.002 or absf(point.z)>item.d*.5+.002 or point.y>item.h+.002:within=false
		check(within,kind+" visible solid fits the shared collision footprint")
		if kind=="coastal_sign":
			var projection: Dictionary=preload("res://scripts/world_data.gd").road_projection(Vector2(item.x,item.z))
			var edge: Dictionary=preload("res://scripts/world_data.gd").data.edges[projection.edge]
			var nodes: Array=preload("res://scripts/world_data.gd").nodes()
			var direction: Vector2=(nodes[edge.b]-nodes[edge.a]).normalized()
			var arrow: Vector3=Basis(Vector3.UP,item.yaw)*Vector3.LEFT
			var labels=art.find_children("*","Label3D",true,false)
			check(Vector2(arrow.x,arrow.z).dot(direction)>.9 and labels[-1].text.contains("← 2ª PRAIA"),"coastal guide arrow points forward along the road")

	art.free()
	vehicle.free();actors.free()
	var passed: bool=checks.all(func(c):return c.passed)
	var output=FileAccess.open("res://../artifacts/godot/presentation.json",FileAccess.WRITE)
	output.store_string(JSON.stringify({"checks":checks,"passed":passed},"  "))
	print("Presentation: ",checks.size()," checks; ","PASSED" if passed else "FAILED");quit(0 if passed else 1)
