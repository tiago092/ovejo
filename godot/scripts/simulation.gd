extends RefCounted
## Pure arcade simulation. No physics engine, visual nodes, audio or browser access.
const World = preload("res://scripts/world_data.gd")
const MENU = "menu"
const CINEMATIC = "cinematic"
const PLAYING = "playing"
const PAUSED = "paused"
const ENDING = "ending"
const WON = "won"
const LOST = "lost"
var balance: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/balance.json"))
var state := MENU
var paused_from := PLAYING
var phase := 0
var time := 150.0
var health := 100.0
var x := -78.0
var z := -112.0
var angle := 0.0
var vx := 0.0
var vz := 0.0
var speed := 0.0
var clock := 0.0
var cooldown := 0.0
var siren_left := 0.0
var impact := 0.0
var load_progress := 0.0
var ped_hits := 0
var bumps := 0
var cinematic_time := 0.0
var intro_seen := false
var ending_time := 0.0
var outcome := ""
var presentation_reduced := false
var drift_hold := 0.0
var drift_amount := 0.0
var moments: Dictionary={}
var police_path: Array=[]
var police_route_timer := 0.0
var score := 0
var stars := 0
var seed_value: int = 27
var pedestrians: Array = []
var carts: Array = []
var police: Dictionary = {}
var events: Array = []
var keys := {"up":false,"down":false,"left":false,"right":false}
var route_nodes := World.nodes()

func _init() -> void:
	reset(27)

func random_between(a: float,b: float) -> float:
	seed_value = (1664525*seed_value + 1013904223) & 0xffffffff
	return a + float(seed_value)/4294967296.0*(b-a)

func reset(seed_number: int = 27) -> void:
	seed_value = seed_number
	phase=0; time=balance.duration; health=balance.health
	x=World.data.start[0]; z=World.data.start[1]; angle=World.data.start_angle; vx=0; vz=0; speed=0
	clock=0; cooldown=0; siren_left=0; impact=0; load_progress=0; ped_hits=0; bumps=0
	cinematic_time=0; ending_time=0; outcome=""; score=0; stars=0; drift_hold=0; drift_amount=0;moments.clear();police_path.clear();police_route_timer=0;events.clear();clear_input()
	pedestrians.clear(); carts.clear()
	for i in range(30):
		var at:=World.point_on_main(12+i*4 if i<12 else (World.data.route_length-4 if i>=28 else 260+(i-12)*34))
		var point: Vector2=at.point+Vector2(cos(at.heading),-sin(at.heading))*(5.4 if i%2 else -5.4)
		if i<3:point=Vector2(World.data.start[0]+6+i*1.5,World.data.start[1]+2+i*3)
		var role: String="friend" if i<3 else ("staff" if i>=28 else "walker")
		var scene_spawn: Dictionary=World.data.get("scene_spawns",{}).get(str(i),{})
		if not scene_spawn.is_empty():point=Vector2(scene_spawn.point[0],scene_spawn.point[1]);role=scene_spawn.role
		var dx:=random_between(-1,1);var dz:=random_between(-1,1);var change:=random_between(1,4)
		if role in ["venue_staff","vendor","photographer"]:dx=0;dz=0;change=200
		pedestrians.append({"x":point.x,"z":point.y,"dx":dx,"dz":dz,"change":change,"cool":0.0,"club":i<12,"role":role})

	for i in range(5):
		var at:=World.point_on_main(180+i*140)
		carts.append({"x":at.point.x,"z":at.point.y,"angle":at.heading,"distance":180.0+i*140,"dir":-1 if i%2 else 1,"speed":1.1+i*.15,"stop":0.0,"next":float(3+i)})
	var at:=World.point_on_main(210)
	police={"x":at.point.x,"z":at.point.y,"angle":at.heading,"speed":0.0,"cool":0.0,"waypoint":at.node,"warning":false}

func moment(id: String) -> void:
	if moments.has(id):return
	moments[id]=true;events.append({"type":"moment","id":id})

func start(force_intro: bool = false, reduced: bool = false, seed_number: int = 27) -> void:
	reset(seed_number)
	presentation_reduced=reduced
	if (force_intro or not intro_seen) and not reduced: state=CINEMATIC
	else: begin_playing()
	events.append({"type":"state","value":state})

func begin_playing() -> void:
	intro_seen=true; state=PLAYING; clear_input()
	events.append({"type":"notice","text":"Seguí la costa hasta Segunda Praia. Frená para subir al paciente."})
	moment("departure")

func skip_intro() -> void:
	if state==CINEMATIC: begin_playing()

func clear_input() -> void:
	for key in keys: keys[key]=false

func pause() -> void:
	if state in [PLAYING,CINEMATIC,ENDING]:
		paused_from=state; state=PAUSED; clear_input()
	elif state==PAUSED:
		state=paused_from; clear_input()

func menu() -> void:
	reset(seed_value); state=MENU

func advance(raw_dt: float, inputs: Dictionary = {}) -> void:
	for key in keys:
		if inputs.has(key): keys[key]=bool(inputs[key])
	var active := maxf(0,raw_dt)
	if state==CINEMATIC:
		cinematic_time=minf(7,cinematic_time+active)
		if cinematic_time>=7: begin_playing()
	elif state==ENDING:
		ending_time=minf(6,ending_time+active)
		if ending_time>=6:skip_ending()
	elif state==PLAYING:
		var remaining := minf(active,.25)
		time=maxf(0,time-maxf(0,active-remaining))
		while remaining>0 and state==PLAYING:
			var slice := minf(remaining,.025)
			step(slice); remaining-=slice

func siren() -> void:
	if state!=PLAYING or cooldown>0: return
	cooldown=balance.siren_cooldown; siren_left=balance.siren_duration
	events.append({"type":"siren","text":"¡Paso al buggy!"});moment("first_siren")

func damage(amount: float, pedestrian: bool = false) -> void:
	if impact>0: return
	health=maxf(0,health-amount); impact=balance.immunity
	if pedestrian:
		ped_hits+=1; time=maxf(0,time-balance.ped_penalty)
	else: bumps+=1
	events.append({"type":"damage","text":"¡Cuidado con la gente! −4 segundos" if pedestrian else "¡Choque! −%d%% del buggy" % amount})

func finish(win: bool) -> void:
	if state!=PLAYING:return
	outcome=WON if win else LOST;clear_input();ending_time=0
	score=maxi(0,int(floor(time*100+health*20+1500-ped_hits*500+.5))) if win else 0
	stars=(3 if ped_hits==0 and health>=balance.three_star_health else (2 if ped_hits==0 and health>=50 else 1)) if win else 0
	state=ENDING
	events.append({"type":"ending","value":outcome})
	if presentation_reduced:skip_ending()

func skip_ending() -> void:
	if state!=ENDING:return
	state=outcome;clear_input();events.append({"type":"result","value":state,"score":score})

func update_police(dt: float) -> void:
	if phase==0:return
	police.cool=maxf(0,police.cool-dt);police_route_timer-=dt
	if police_route_timer<=0 or police_path.is_empty():
		police_path=World.route(Vector2(police.x,police.z),Vector2(x,z));police_route_timer=.5
	while police_path.size()>1 and Vector2(police.x,police.z).distance_to(police_path[0])<2:police_path.pop_front()
	var target: Vector2=police_path[0] if not police_path.is_empty() else Vector2(x,z)
	var desired:=atan2(target.x-police.x,target.y-police.z)
	police.angle+=clampf(wrapf(desired-police.angle,-PI,PI),-1.75*dt,1.75*dt)
	police.speed+=(minf(14.5,target.distance_to(Vector2(police.x,police.z))*2)-police.speed)*minf(1,dt*2.2)
	var move:=World.move_circle(Vector2(police.x,police.z),Vector2(sin(police.angle),cos(police.angle))*police.speed*dt,1.35)
	police.x=move.position.x;police.z=move.position.y
	var distance:=hypot(x-police.x,z-police.z)
	if distance<24 and not police.warning:
		police.warning=true;moment("patrol")
	if distance<3.5 and police.cool<=0 and impact<=0:
		police.cool=balance.police_cooldown;damage(balance.police_damage)
		var push:=Vector2(x-police.x,z-police.z).normalized()*3
		vx+=push.x;vz+=push.y

func step(dt: float) -> void:
	if state!=PLAYING: return
	clock+=dt; time=maxf(0,time-dt); cooldown=maxf(0,cooldown-dt); siren_left=maxf(0,siren_left-dt); impact=maxf(0,impact-dt)
	if time<=0 or health<=0: finish(false); return
	var turn:=int(keys.left)-int(keys.right); var drive:=int(keys.up)-int(keys.down)
	var forward:=vx*sin(angle)+vz*cos(angle)
	angle+=turn*balance.turn*clampf(absf(forward)/5,0,1)*(-1 if forward<-.1 else 1)*dt
	forward+=drive*(balance.braking if drive<0 and forward>0 else balance.acceleration)*dt
	forward*=exp(-(balance.drag_drive if drive else balance.drag_coast)*dt)
	forward=clampf(forward,balance.max_reverse,balance.max_forward)
	if turn!=0 and forward>balance.drift_entry_speed:drift_hold+=dt
	else:drift_hold=0
	var wants_drift: bool=drift_hold>=balance.drift_hold and forward>balance.drift_exit_speed
	var previous_drift:=drift_amount
	drift_amount=move_toward(drift_amount,1.0 if wants_drift else 0.0,dt/(.2 if wants_drift else balance.drift_recovery))
	if previous_drift==0 and drift_amount>0:events.append({"type":"drift","active":true});moment("first_drift")
	if previous_drift>0 and drift_amount==0:events.append({"type":"drift","active":false})
	var lateral: float=(vx*cos(angle)-vz*sin(angle))*exp(-lerpf(balance.drag_lateral,balance.drift_drag,drift_amount)*dt)
	var limit: float=absf(forward)*tan(deg_to_rad(balance.drift_limit_degrees))
	lateral=clampf(lateral,-limit,limit)
	vx=forward*sin(angle)+lateral*cos(angle); vz=forward*cos(angle)-lateral*sin(angle); speed=hypot(vx,vz)
	var move:=World.move_circle(Vector2(x,z),Vector2(vx,vz)*dt)
	x=move.position.x;z=move.position.y
	for normal in move.normals:
		if speed>3:damage(balance.wall_damage)
		var velocity:=Vector2(vx,vz);velocity-=normal*minf(0,velocity.dot(normal))*1.08;vx=velocity.x;vz=velocity.y
	update_police(dt)
	for t in carts:
		t.next-=dt
		if t.next<0: t.stop=random_between(.2,1.3); t.next=random_between(3,7)
		t.stop=maxf(0,t.stop-dt)
		t.distance=clampf(t.distance+t.dir*t.speed*(.05 if t.stop>0 else 1)*(.2 if siren_left>0 and hypot(x-t.x,z-t.z)<20 else 1)*dt,2,World.data.route_length-2)
		if t.distance<=2 or t.distance>=World.data.route_length-2:t.dir=-t.dir
		var at:=World.point_on_main(t.distance);var shoulder: Vector2=Vector2(cos(at.heading),-sin(at.heading))*2.6*t.dir
		t.x=at.point.x+shoulder.x;t.z=at.point.y+shoulder.y;t.angle=at.heading+(PI if t.dir<0 else 0)
		if absf(x-t.x)<2.4 and absf(z-t.z)<1.7:
			damage(balance.cart_damage); vx*=balance.bounce; vz*=balance.bounce
	for p in pedestrians:
		p.cool=maxf(0,p.cool-dt); p.change-=dt
		if p.change<=0: p.dx=random_between(-1,1); p.dz=random_between(-1,1); p.change=random_between(1,3)
		var d:=hypot(x-p.x,z-p.z)
		var dx: float=p.dx*.85; var dz: float=p.dz*.85
		if d<5 or (siren_left>0 and d<20):
			dx=(p.x-x)/maxf(d,.1)*(5.3 if siren_left>0 else 2.6); dz=(p.z-z)/maxf(d,.1)*(5.3 if siren_left>0 else 2.6)
		var px: float=p.x+dx*dt; var pz: float=p.z+dz*dt
		if not World.blocked(px,pz,.4): p.x=px; p.z=pz
		else: p.dx=-p.dx; p.dz=-p.dz
		p["angle"]=atan2(dx,dz)
		if d<1.65 and speed>3 and p.cool<=0 and impact<=0:
			damage(balance.ped_damage,true); p.cool=balance.ped_cooldown; vx*=.4; vz*=.4
	if time<=0 or health<=0: finish(false); return
	var destination: Array=World.data.hospital if phase else World.data.pickup
	if hypot(x-destination[0],z-destination[1])<balance.pickup_radius and speed<balance.pickup_speed:
		load_progress+=dt
		if load_progress>=balance.pickup_hold:
			load_progress=0
			if phase==0:
				phase=1; moment("pickup");events.append({"type":"pickup","text":"¡Paciente a bordo! Al puesto de salud."})
			else: finish(true)
	else: load_progress=0
	if Vector2(x,z).distance_to(Vector2(World.data.landmarks.coast[0],World.data.landmarks.coast[1]))<16:moment("coast")
	if phase==1 and Vector2(x,z).distance_to(Vector2(World.data.landmarks.plaza[0],World.data.landmarks.plaza[1]))<20:moment("plaza")

func snapshot() -> Dictionary:
	return {"rules_version":2,"drift":drift_amount,"drift_hold":drift_hold,"ending_time":ending_time,"outcome":outcome,"moments":moments.duplicate(),"state":state,"phase":phase,"time":time,"health":health,"x":x,"z":z,"angle":angle,"vx":vx,"vz":vz,"speed":speed,"clock":clock,"cooldown":cooldown,"siren_left":siren_left,"impact":impact,"load":load_progress,"ped_hits":ped_hits,"bumps":bumps,"cinematic_time":cinematic_time,"score":score,"stars":stars,"police":police.duplicate(true),"pedestrians":pedestrians.duplicate(true),"carts":carts.duplicate(true)}

func take_events() -> Array:
	var result:=events.duplicate(); events.clear(); return result

static func hypot(a: float, b: float) -> float:
	return sqrt(a*a+b*b)
