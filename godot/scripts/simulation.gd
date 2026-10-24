extends RefCounted
## Pure arcade simulation. No physics engine, visual nodes, audio or browser access.
const World = preload("res://scripts/world_data.gd")
const MENU = "menu"
const CINEMATIC = "cinematic"
const PLAYING = "playing"
const PAUSED = "paused"
const WON = "won"
const LOST = "lost"
var balance: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/balance.json"))
var state := MENU
var paused_from := PLAYING
var phase := 0
var time := 90.0
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
	x=World.data.start[0]; z=World.data.start[1]; angle=0; vx=0; vz=0; speed=0
	clock=0; cooldown=0; siren_left=0; impact=0; load_progress=0; ped_hits=0; bumps=0
	cinematic_time=0; score=0; stars=0; events.clear(); clear_input()
	pedestrians.clear(); carts.clear()
	for i in range(30):
		var club := i < 18
		pedestrians.append({"x":random_between(-46,-13) if club else World.data.road_x[i%3]+random_between(-5,5),"z":random_between(-121,-103) if club else World.data.road_z[i%4]+random_between(-5,5),"dx":random_between(-1,1),"dz":random_between(-1,1),"change":random_between(1,4),"cool":0.0,"club":club})
	for i in range(5):
		carts.append({"x":random_between(10,105),"z":float(World.data.road_z[i%4]+(4 if i%2 else -4)),"dir":-1 if i%2 else 1,"speed":1.1+i*.15,"stop":0.0,"next":float(3+i)})
	police={"x":-60.0,"z":-150.0,"angle":0.0,"speed":0.0,"cool":0.0,"waypoint":0,"warning":false}

func start(force_intro: bool = false, reduced: bool = false, seed_number: int = 27) -> void:
	reset(seed_number)
	if (force_intro or not intro_seen) and not reduced: state=CINEMATIC
	else: begin_playing()
	events.append({"type":"state","value":state})

func begin_playing() -> void:
	intro_seen=true; state=PLAYING; clear_input()
	events.append({"type":"notice","text":"Frená en Segunda Praia para subir al paciente"})

func skip_intro() -> void:
	if state==CINEMATIC: begin_playing()

func clear_input() -> void:
	for key in keys: keys[key]=false

func pause() -> void:
	if state==PLAYING or state==CINEMATIC:
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
	elif state==PLAYING:
		var remaining := minf(active,.25)
		time=maxf(0,time-maxf(0,active-remaining))
		while remaining>0 and state==PLAYING:
			var slice := minf(remaining,.025)
			step(slice); remaining-=slice

func siren() -> void:
	if state!=PLAYING or cooldown>0: return
	cooldown=balance.siren_cooldown; siren_left=balance.siren_duration
	events.append({"type":"siren","text":"¡Paso al buggy!"})

func damage(amount: float, pedestrian: bool = false) -> void:
	if impact>0: return
	health=maxf(0,health-amount); impact=balance.immunity
	if pedestrian:
		ped_hits+=1; time=maxf(0,time-balance.ped_penalty)
	else: bumps+=1
	events.append({"type":"damage","text":"¡Cuidado con la gente! −8 segundos" if pedestrian else "¡Choque! −%d%% del buggy" % amount})

func finish(win: bool) -> void:
	if state!=PLAYING: return
	state=WON if win else LOST; clear_input()
	# Math.round for the original non-negative final result.
	score=maxi(0,int(floor(time*100+health*20+1500-ped_hits*500+.5))) if win else 0
	stars=(3 if ped_hits==0 and health>=85 else (2 if ped_hits==0 and health>=50 else 1)) if win else 0
	events.append({"type":"result","value":state,"score":score})

func closest_node(px: float,pz: float) -> int:
	var best := 0; var distance := INF
	for i in range(route_nodes.size()):
		var next: float = hypot(px-route_nodes[i].x,pz-route_nodes[i].y)
		if next<distance: distance=next; best=i
	return best

func next_route_node(from: int,to: int) -> int:
	if from==to: return from
	var queue := [from]; var parents := {}; var seen := {from:true}; var i := 0
	while i<queue.size():
		var node: int=queue[i]; var row: int=node/3; var col: int=node%3
		for n in [node-1 if col>0 else -1,node+1 if col<2 else -1,node-3 if row>0 else -1,node+3 if row<3 else -1]:
			if n<0 or seen.has(n): continue
			seen[n]=true; parents[n]=node; queue.append(n)
		i+=1
	if not seen.has(to): return from
	var next:=to
	while parents[next]!=from: next=parents[next]
	return next

func update_police(dt: float) -> void:
	police.cool=maxf(0,police.cool-dt)
	if hypot(x-police.x,z-police.z)>115:
		var n: Vector2=route_nodes[closest_node(x,z)]
		police.x=n.x; police.z=n.y-18; police.waypoint=closest_node(police.x,police.z); police.speed=0.0
	var at: Vector2=route_nodes[police.waypoint]
	if hypot(police.x-at.x,police.z-at.y)<3.1: police.waypoint=next_route_node(police.waypoint,closest_node(x,z))
	var destination_x: float=x if hypot(x-police.x,z-police.z)<17 else route_nodes[police.waypoint].x
	var destination_z: float=z if hypot(x-police.x,z-police.z)<17 else route_nodes[police.waypoint].y
	var desired:=atan2(destination_x-police.x,destination_z-police.z)
	var delta_angle:=atan2(sin(desired-police.angle),cos(desired-police.angle))
	if absf(absf(delta_angle)-PI)<1e-12: delta_angle=PI if desired-police.angle>=0 else -PI # Stable antipodal tie across JS/libm.
	police.angle+=clampf(delta_angle,-1.75*dt,1.75*dt)
	var slow:=clampf(hypot(destination_x-police.x,destination_z-police.z)*1.8,4,17 if phase else 14.5)
	police.speed+=(slow-police.speed)*minf(1,dt*2.2)
	var nx: float=police.x+sin(police.angle)*police.speed*dt
	var nz: float=police.z+cos(police.angle)*police.speed*dt
	if not World.blocked(nx,nz,1.35): police.x=nx; police.z=nz
	elif not World.blocked(nx,police.z,1.35): police.x=nx
	elif not World.blocked(police.x,nz,1.35): police.z=nz
	else: police.speed=0.0; police.waypoint=closest_node(police.x,police.z)
	var distance:=hypot(x-police.x,z-police.z)
	if distance<20 and not police.warning:
		police.warning=true; events.append({"type":"notice","text":"¡La patrulla te sigue!"})
	if distance<3.5 and police.cool<=0 and impact<=0:
		police.cool=balance.police_cooldown; impact=balance.immunity; bumps+=1
		health=maxf(0,health-balance.police_damage); time=maxf(0,time-balance.police_penalty)
		var dx: float=(x-police.x)/maxf(distance,.1); var dz: float=(z-police.z)/maxf(distance,.1)
		vx+=dx*5; vz+=dz*5; police.x-=dx*3.8; police.z-=dz*3.8
		events.append({"type":"damage","text":"¡Te alcanzó la patrulla! −12% y −3 segundos"})

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
	var lateral: float=(vx*cos(angle)-vz*sin(angle))*exp(-balance.drag_lateral*dt)
	vx=forward*sin(angle)+lateral*cos(angle); vz=forward*cos(angle)-lateral*sin(angle); speed=hypot(vx,vz)
	var nx:=x+vx*dt; var nz:=z+vz*dt
	if not World.blocked(nx,z): x=nx
	else:
		if speed>3: damage(balance.wall_damage)
		vx*=balance.bounce
	if not World.blocked(x,nz): z=nz
	else:
		if speed>3: damage(balance.wall_damage)
		vz*=balance.bounce
	update_police(dt)
	for t in carts:
		t.next-=dt
		if t.next<0: t.stop=random_between(.2,1.3); t.next=random_between(3,7)
		t.stop=maxf(0,t.stop-dt)
		t.x+=t.dir*t.speed*(.05 if t.stop>0 else 1)*(.2 if siren_left>0 and hypot(x-t.x,z-t.z)<20 else 1)*dt
		if t.x>113: t.x=-85.0
		if t.x< -85: t.x=113.0
		if absf(x-t.x)<2.4 and absf(z-t.z)<1.7:
			damage(balance.cart_damage); vx*=balance.bounce; vz*=balance.bounce; z+= -.5 if z<t.z else .5
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
				phase=1; events.append({"type":"pickup","text":"¡Paciente a bordo! Al puesto de salud."})
			else: finish(true)
	else: load_progress=0

func snapshot() -> Dictionary:
	return {"state":state,"phase":phase,"time":time,"health":health,"x":x,"z":z,"angle":angle,"vx":vx,"vz":vz,"speed":speed,"clock":clock,"cooldown":cooldown,"siren_left":siren_left,"impact":impact,"load":load_progress,"ped_hits":ped_hits,"bumps":bumps,"cinematic_time":cinematic_time,"score":score,"stars":stars,"police":police.duplicate(true),"pedestrians":pedestrians.duplicate(true),"carts":carts.duplicate(true)}

func take_events() -> Array:
	var result:=events.duplicate(); events.clear(); return result

static func hypot(a: float, b: float) -> float:
	return sqrt(a*a+b*b)
