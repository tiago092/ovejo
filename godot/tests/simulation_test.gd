extends SceneTree
const Sim = preload("res://scripts/simulation.gd")
const World = preload("res://scripts/world_data.gd")
var checks: Array = []
var failed := false
func check(ok: bool, message: String) -> void:
	checks.append({"name":message,"passed":ok})
	if not ok: failed=true; printerr("FAIL: "+message)
func _init() -> void:
	var fixtures: Dictionary=JSON.parse_string(FileAccess.get_file_as_string("res://tests/reference.json"))
	for test in fixtures.cases:
		var s=Sim.new(); s.start(false,true,27)
		for key in test.setup: s.set(key,test.setup[key])
		for action in test.actions:
			if action.siren: s.siren()
			s.advance(action.dt,action.keys)
		var actual: Dictionary=s.snapshot()
		for key in ["state","phase","ped_hits","bumps","score","stars"]: check(actual[key]==test.expected[key],test.name+" "+key)
		for key in ["x","z","angle","vx","vz","speed","time","health","cooldown","siren_left","impact","load"]:
			check(absf(actual[key]-test.expected[key])<.001,test.name+" "+key)
		check(absf(actual.police.x-test.expected.police.x)<.001 and absf(actual.police.z-test.expected.police.z)<.001,test.name+" patrol")
		for i in range(30): check(absf(actual.pedestrians[i].x-test.expected.pedestrians[i].x)<.001 and absf(actual.pedestrians[i].z-test.expected.pedestrians[i].z)<.001,test.name+" pedestrian "+str(i))
		for i in range(5): check(absf(actual.carts[i].x-test.expected.carts[i].x)<.001,test.name+" cart "+str(i))
	var s=Sim.new(); s.start(true,false)
	s.advance(3); s.pause(); s.advance(20)
	check(s.cinematic_time==3 and s.time==90,"pause freezes introduction")
	s.pause(); s.advance(4)
	check(s.state==Sim.PLAYING and s.time==90,"intro seven active seconds")
	s.start(true); s.skip_intro(); check(s.time==90 and s.siren_left==0,"skip preserves time and siren")
	s.start(false,true); s.advance(5)
	check(absf(s.time-85)<.001,"long frame retains wall time")
	s.pause(); var before=s.time; s.advance(20); check(s.time==before,"pause freezes mission")
	for repeat in range(3):
		s.start(false,true); s.x=-28; s.z=-110; s.impact=2
		s.advance(.25); s.x=-60; s.advance(.025); check(s.load_progress==0,"interrupted pickup "+str(repeat))
		s.x=-28
		for i in range(54): s.step(.025)
		check(s.phase==1,"pickup "+str(repeat))
		s.x=76; s.z=100; s.vx=0; s.vz=0; s.impact=2
		for i in range(54): s.step(.025)
		check(s.state==Sim.WON and s.stars==3,"delivery "+str(repeat))
		s.carts[0].stop=1; s.carts[0].next=.01; s.reset(27)
		check(s.carts[0].stop==0 and s.carts[0].next==3 and s.police.cool==0 and s.pedestrians[0].cool==0,"reset actors "+str(repeat))
	for kind in ["time","health","hit"]:
		s.start(false,true); s.x=76; s.z=100; s.phase=1; s.load_progress=1.29
		if kind=="time": s.time=.01
		if kind=="health": s.health=0
		if kind=="hit": s.health=10; s.carts[0].x=76; s.carts[0].z=100
		s.step(.025); check(s.state==Sim.LOST,"loss before delivery: "+kind)
	for hp in [100,85,84,50,49]:
		s.start(false,true); s.time=12.345; s.health=hp; s.finish(true)
		check(s.stars==(3 if hp>=85 else (2 if hp>=50 else 1)),"stars boundary "+str(hp))
		check(s.score==int(floor(1234.5+hp*20+1500+.5)),"JS rounding "+str(hp))
	s.start(false,true); s.damage(12); s.damage(15); check(s.health==88,"single immunity authority")
	s.siren(); s.advance(.25); s.siren(); check(absf(s.cooldown-6.75)<.001,"siren cooldown not reset")
	var route=World.route(Vector2(-60,-80),Vector2(76,100))
	check(route.size()>2,"route avoids diagonal buildings")
	for i in range(1,route.size()): check(World.clear_segment(route[i-1],route[i]),"route clear segment "+str(i))
	for kind in ["building","cart","pedestrian","patrol"]:
		s.start(false,true);s.pedestrians.clear();s.carts.clear()
		match kind:
			"building":s.x=-54.7;s.z=-80;s.angle=PI/2;s.vx=20
			"cart":s.carts.append({"x":s.x,"z":s.z,"dir":1,"speed":1.1,"stop":0.0,"next":3.0})
			"pedestrian":s.vz=5;s.pedestrians.append({"x":s.x,"z":s.z+.1,"dx":0.0,"dz":0.0,"change":1.0,"cool":0.0})
			"patrol":s.police.x=s.x+1;s.police.z=s.z
		s.step(.025)
		var hp: float={"building":88,"cart":85,"pedestrian":95,"patrol":88}[kind]
		var seconds: float={"building":89.975,"cart":89.975,"pedestrian":81.975,"patrol":86.975}[kind]
		check(s.health==hp and absf(s.time-seconds)<.001,"explicit damage and penalty "+kind)
	for sample in JSON.parse_string(FileAccess.get_file_as_string("res://tests/heights.json")):
		check(absf(World.height_at(sample.x,sample.z)-sample.height)<.000001,"original ground height %s/%s" % [sample.x,sample.z])
	check(World.blocked(-78,-151),"lighthouse hill blocks movement")
	var output=FileAccess.open("res://../artifacts/godot/simulation.json",FileAccess.WRITE)
	if output: output.store_string(JSON.stringify({"engine":Engine.get_version_info().string,"checks":checks,"passed":not failed},"  "))
	print("Simulation: ",checks.size()," checks; ","FAILED" if failed else "PASSED")
	quit(1 if failed else 0)
