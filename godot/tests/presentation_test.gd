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
	art.free()
	vehicle.free();actors.free()
	var passed: bool=checks.all(func(c):return c.passed)
	var output=FileAccess.open("res://../artifacts/godot/presentation.json",FileAccess.WRITE)
	output.store_string(JSON.stringify({"checks":checks,"passed":passed},"  "))
	print("Presentation: ",checks.size()," checks; ","PASSED" if passed else "FAILED");quit(0 if passed else 1)
