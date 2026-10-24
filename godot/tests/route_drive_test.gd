extends SceneTree
## Input-driven road traversal, no position/health/time resets. Not a human balance study.
const Sim=preload("res://scripts/simulation.gd")
const World=preload("res://scripts/world_data.gd")
func _init() -> void:
	var population: bool=OS.get_cmdline_user_args().has("--population")
	var s=Sim.new();s.start(false,true,27)
	if not population:s.pedestrians.clear();s.carts.clear()
	var points:=World.nodes();var lengths: Array=[0.0]
	for i in range(1,World.data.main_route.size()):lengths.append(lengths[-1]+points[i-1].distance_to(points[i]))
	var best_progress:=0.0;var minimum_health:=100.0
	for frame in range(150*60):
		if s.state!=Sim.PLAYING:break
		var pos:=Vector2(s.x,s.z);var projection:=World.road_projection(pos);var edge: Dictionary=World.data.edges[projection.edge]
		if edge.a<World.data.main_route.size() and edge.b==edge.a+1:best_progress=maxf(best_progress,lerpf(lengths[edge.a],lengths[edge.b],projection.t))
		var target_distance: float=lengths[World.data.pickup_index] if s.phase==0 else lengths[-1]
		var at:=World.point_on_main(minf(target_distance,best_progress+9));var target: Vector2=at.point
		var objective: Array=World.data.pickup if s.phase==0 else World.data.hospital
		var distance:=pos.distance_to(Vector2(objective[0],objective[1]))
		var error:=wrapf(atan2(target.x-s.x,target.y-s.z)-s.angle,-PI,PI)
		var desired_speed:=9.5 if absf(error)<.6 else 6.0
		if distance<18:desired_speed=minf(desired_speed,maxf(0,(distance-2)*1.2))
		var inputs:={"up":s.speed<desired_speed-.3,"down":s.speed>desired_speed+1.0,"left":error>.1,"right":error<-.1}
		if population and s.cooldown<=0:
			for ped in s.pedestrians:
				if pos.distance_to(Vector2(ped.x,ped.z))<18:s.siren();break
		s.advance(1.0/60,inputs);minimum_health=minf(minimum_health,s.health)
	var passed: bool=s.state==Sim.WON
	var f=FileAccess.open("res://../artifacts/godot/route-drive-population.json" if population else "res://../artifacts/godot/route-drive.json",FileAccess.WRITE)
	f.store_string(JSON.stringify({"passed":passed,"state":s.state,"active_seconds":s.clock,"deadline_used":150-s.time,"health":s.health,"minimum_health":minimum_health,"position":[s.x,s.z],"progress":best_progress,"population":population,"pedestrian_hits":s.ped_hits,"bumps":s.bumps,"note":"Input-driven primary route, no teleports or replenishment. Full population with proximity siren." if population else "Input-driven route with pedestrians/carts removed to isolate geometry. Neither mode certifies five-player balance."},"  "))
	print("Input-driven route: ",s.state," in ",s.clock," s; health ",s.health);quit(0 if passed else 1)
