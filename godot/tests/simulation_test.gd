extends SceneTree
const Sim=preload("res://scripts/simulation.gd")
const World=preload("res://scripts/world_data.gd")
const Story=preload("res://scripts/story.gd")
var checks: Array=[]
func check(ok: bool,name: String) -> void:
	checks.append({"name":name,"passed":ok})
	if not ok:printerr("FAIL: "+name)
func fresh():
	var s=Sim.new();s.start(false,true,27);s.pedestrians.clear();s.carts.clear();return s
func _init() -> void:
	var populated=Sim.new()
	for i in range(populated.pedestrians.size()):
		var p: Dictionary=populated.pedestrians[i]
		check(not World.blocked(p.x,p.z,.4),"staged person spawns outside solids "+str(i))
	check(World.data.buildings.size()==80,"compact village has eighty buildings")
	for district in World.data.district_targets:
		check(World.data.buildings.filter(func(b):return b.district==district).size()==int(World.data.district_targets[district]),"district parcel count "+district)
	var s=fresh()
	check(s.time==150 and s.health==100,"v2 initial balance")
	check(World.data.route_length>930 and World.data.route_length<970,"main route 950m")
	check(absf(World.data.bypass.extra_length-60)<.1,"bypass adds 60m")
	for i in range(World.nodes().size()):
		var point: Vector2=World.nodes()[i]
		check(not World.blocked(point.x,point.y,2),"road node clearance "+str(i))
	for edge in World.data.edges:
		check(World.clear_segment(World.nodes()[edge.a],World.nodes()[edge.b]),"road edge clear %d/%d" % [edge.a,edge.b])
	for bed in World.data.obstacles.filter(func(o):return o.kind=="tropical_garden"):
		var clear:=true
		for dx in [-bed.radius,0,bed.radius]:
			for dz in [-bed.radius,0,bed.radius]:
				var p:=Vector2(bed.x+dx,bed.z+dz)
				for edge in World.data.edges:
					var nearest:=Geometry2D.get_closest_point_to_segment(p,World.nodes()[edge.a],World.nodes()[edge.b])
					if p.distance_to(nearest)<edge.width*.5+2.99:clear=false
		check(clear,"tropical garden leaves road width and steering margin clear "+str(bed.seed))
		check(World.blocked(bed.x,bed.z),"planted garden shares a solid footprint "+str(bed.seed))
	var path:=World.route(Vector2(World.data.start[0],World.data.start[1]),Vector2(World.data.hospital[0],World.data.hospital[1]))
	check(absf(World.path_length(path)-World.data.route_length)<1,"navigation follows main route")
	for rate in [30,60,120]:
		s=fresh();s.angle=0;s.x=-20;s.z=-180
		for _i in range(rate):s.advance(1.0/rate,{"up":true})
		check(s.speed>13 and s.speed<15,"acceleration "+str(rate))
		s.vx=0;s.vz=14;s.angle=0
		for _i in range(int(rate*.5)):s.advance(1.0/rate,{"up":true,"left":true})
		check(s.drift_amount>.9,"automatic drift enters "+str(rate))
		var forward: float=s.vx*sin(s.angle)+s.vz*cos(s.angle);var lateral: float=s.vx*cos(s.angle)-s.vz*sin(s.angle)
		check(absf(rad_to_deg(atan2(lateral,forward)))<=18.001,"slip limited "+str(rate))
		for _i in range(int(ceil(rate*.36))):s.advance(1.0/rate,{"up":true,"left":false})
		check(s.drift_amount==0,"grip recovers in .35s "+str(rate))
		s=fresh();s.angle=0;s.x=-20;s.z=-180
		for _i in range(rate):s.advance(1.0/rate,{"down":true})
		check(s.vz<0 and s.vz>=-7,"reverse "+str(rate))
		s.vz=20;s.speed=20
		for _i in range(int(rate*.5)):s.advance(1.0/rate,{"down":true})
		check(absf(s.vz)<5,"braking "+str(rate))
	s=fresh();s.angle=0;s.vz=15;s.advance(.175,{"left":true});check(s.drift_amount==0,"drift requires .2 seconds")
	s=fresh();s.angle=0;s.vz=6;s.advance(.25,{"left":true});check(s.drift_amount==0,"no low speed drift")
	var garden: Dictionary=World.data.obstacles.filter(func(o):return o.kind=="plaza_garden")[0]
	check(World.surface_at(Vector2(garden.x+10,garden.z))=="stone","plaza pavement uses shared surface")
	for i in range(World.data.buildings.size()):
		var garden_polygon:=PackedVector2Array()
		for p in garden.polygon:garden_polygon.append(Vector2(p[0],p[1]))
		check(Geometry2D.intersect_polygons(World.polygons()[i],garden_polygon).is_empty(),"garden not hidden in building "+str(i))
	check(World.blocked(garden.x,garden.z),"raised plaza has polygon collision")
	var garden_hit:=World.move_circle(Vector2(garden.x+20,garden.z),Vector2(-40,0))
	check(garden_hit.position.x>garden.x+8.4,"sweep hits plaza polygon before crossing")
	var wall: Dictionary=World.data.buildings[0];var origin:=Vector2(wall.x,wall.z+wall.d/2+20)
	var move:=World.move_circle(origin,Vector2(0,-100))
	check(move.position.y>=wall.z+wall.d/2+1.599,"swept circle cannot tunnel")
	move=World.move_circle(Vector2(wall.x-wall.w/2-4,wall.z+wall.d/2+5),Vector2(10,-20))
	check(not World.blocked(move.position.x,move.position.y,1.59),"corner resolution leaves circle outside")
	move=World.move_circle(Vector2(210,0),Vector2(100,30));check(move.position.x<=218.401 and move.position.y>20,"boundary collision slides")
	s=Sim.new();s.start(true,false);s.advance(3);s.pause();s.advance(20);check(s.cinematic_time==3 and s.time==150,"pause freezes intro")
	s.pause();s.advance(4);check(s.state==Sim.PLAYING and s.time==150,"intro seven seconds")
	s.start(true,false);s.skip_intro();check(s.siren_left==0 and s.time==150,"intro skip consumes no siren or time")
	s=fresh();var at:=Vector2(s.x,s.z);s.advance(5,{"up":true});check(absf(s.time-145)<.001 and at.distance_to(Vector2(s.x,s.z))<2,"long frame counts wall time without catchup")
	s.pause();var before: float=s.time;s.advance(40);check(s.time==before,"pause freezes time")
	for repeat in range(3):
		s=fresh();s.x=World.data.pickup[0];s.z=World.data.pickup[1];s.advance(.25);s.x+=10;s.advance(.025);check(s.load_progress==0,"cancel pickup "+str(repeat))
		s.x=World.data.pickup[0]
		for _i in range(6):s.advance(.25)
		check(s.phase==1,"pickup "+str(repeat))
		s.x=World.data.hospital[0];s.z=World.data.hospital[1];s.vx=0;s.vz=0
		for _i in range(6):s.advance(.25)
		check(s.state==Sim.WON and s.stars==3,"delivery reduced skips ending "+str(repeat))
		s.reset(27);check(s.pedestrians.size()==30 and s.carts.size()==5 and s.police.cool==0 and s.drift_amount==0 and s.ending_time==0,"full reset "+str(repeat))
	for kind in ["time","health"]:
		s=fresh();s.phase=1;s.x=World.data.hospital[0];s.z=World.data.hospital[1];s.load_progress=1.29
		if kind=="time":s.time=.01
		else:s.health=0
		s.advance(.025);check(s.state==Sim.LOST,"loss overrides delivery "+kind)
	s=fresh();s.presentation_reduced=false;s.finish(true);check(s.state==Sim.ENDING,"ending before result");s.advance(3);s.pause();s.advance(20);check(s.ending_time==3,"pause freezes ending");s.pause();s.advance(3);check(s.state==Sim.WON,"ending lasts six seconds")
	s=fresh();s.presentation_reduced=false;s.finish(false);s.skip_ending();s.skip_ending();check(s.take_events().filter(func(e):return e.type=="result").size()==1,"single terminal event and skip")
	for hp in [100,75,74,50,49]:
		s=fresh();s.health=hp;s.time=12.345;s.finish(true);check(s.stars==(3 if hp>=75 else (2 if hp>=50 else 1)),"star boundary "+str(hp));check(s.score==int(floor(1234.5+hp*20+1500+.5)),"score rounding "+str(hp))
	s=fresh();s.damage(6);s.damage(8);check(s.health==94 and s.impact==1.5,"wall damage immunity")
	s=fresh();s.damage(5,true);check(s.health==95 and s.time==146,"pedestrian penalty")
	s=fresh();var police=s.police.duplicate();s.advance(.25);check(s.police==police,"patrol waits for pickup")
	s.phase=1;s.police.x=s.x+1;s.police.z=s.z;s.advance(.025);check(s.health==96 and s.time>149.7,"patrol damage no time penalty")
	s=fresh();s.siren();s.advance(.25);s.siren();check(absf(s.cooldown-6.75)<.001 and absf(s.siren_left-1.95)<.001,"siren unchanged")
	var story=Story.new();story.consume({"type":"moment","id":"departure"});story.consume({"type":"moment","id":"departure"});story.update(0,true)
	check(story.speaker=="Nico" and story.queue.is_empty(),"dialogue deduplicated")
	story.consume({"type":"moment","id":"coast"});story.update(4,true);check(story.remaining==0 and story.queue.size()==1,"dialogue four seconds");story.update(5.9,true);check(story.queue.size()==1,"six second gap");story.update(.1,true);check(story.speaker=="Lau","next dialogue after gap")
	story.consume({"type":"damage","text":"Peligro"});check(story.priority and story.text=="Peligro","danger preempts jokes");before=story.remaining;story.update(20,false);check(story.remaining==before,"dialogue freezes while paused");story.reset();check(story.seen.is_empty() and story.queue.is_empty(),"dialogue reset")
	var passed: bool=checks.all(func(c):return c.passed)
	var output=FileAccess.open("res://../artifacts/godot/simulation.json",FileAccess.WRITE);output.store_string(JSON.stringify({"rules_version":2,"checks":checks,"passed":passed},"  "))
	print("Story simulation: ",checks.size()," checks; ","PASSED" if passed else "FAILED");quit(0 if passed else 1)
