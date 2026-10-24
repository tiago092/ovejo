extends Node3D
const Sim=preload("res://scripts/simulation.gd")
const World=preload("res://scripts/world_data.gd")
const WorldVisual=preload("res://scripts/world_visual.gd")
const VehicleVisual=preload("res://scripts/vehicle_visual.gd")
const ActorsVisual=preload("res://scripts/actors_visual.gd")
const WebBridge=preload("res://scripts/web_bridge.gd")
const DrivingAudio=preload("res://scripts/driving_audio.gd")
const Story=preload("res://scripts/story.gd")
const Minimap=preload("res://scripts/minimap.gd")
var sim=Sim.new()
var story=Story.new()
var legacy_best:=0
var last_announcement:=""
var bridge=WebBridge.new()
var world_art: Node3D
var vehicle: Node3D
var actors: Node3D
var camera: Camera3D
var inset: SubViewport
var inset_camera: Camera3D
var inset_container: SubViewportContainer
var canvas: Control
var hud: PanelContainer
var stats: Label
var destination: Label
var health_label: Label
var health_bar: ProgressBar
var siren_label: Label
var mission_bar: ProgressBar
var settings_panel: PanelContainer
var inset_actions: HBoxContainer
var pin_button: Button
var objective_label: Label3D
var driving_audio: Node
var first_siren:=true
var capture_legacy:=false
var notice_label: Label
var controls: HBoxContainer
var menu_panel: PanelContainer
var menu_content: VBoxContainer
var menu_title: Label
var menu_description: Label
var menu_actions: VBoxContainer
var intro_label: Label
var skip_button: Button
var touch_controls: Control
var touch_buttons: Dictionary={}
var touch_pointers: Dictionary={}
var keyboard: Dictionary={"up":false,"down":false,"left":false,"right":false}
var minimap: Control
var quality_select: OptionButton
var reduced_button: CheckButton
var driver_button: Button
var pause_button: Button
var sound_button: Button
var marker: MeshInstance3D
var marker_material: StandardMaterial3D
var dust: CPUParticles3D
var music: AudioStreamPlayer
var effect: AudioStreamPlayer
var prefs: Dictionary={}
var quality:="auto"
var low:=false
var reduced:=false
var reduced_explicit:=false
var touch:=false
var best:=0
var muted:=false
var remote_music:=false
var panel_open:=false
var panel_manual:=false
var panel_remaining:=0.0
var camera_mode:=0
var visual_time:=0.0
var last_usec:=0
var previous_state:=""
var previous_phase:=-1
var hud_accum:=0.0
var notice_remaining:=0.0
var siren_tick:=0.0
var police_tick:=0.0
var route: Array=[]
var route_position:=Vector2(INF,INF)
var route_phase:=-1
var test_frozen:=false
var benchmark_active:=false
var benchmark_elapsed:=0.0
var benchmark_frames: Array=[]
var benchmark_calls: Array=[]
var last_size:=Vector2.ZERO
var report_accum:=0.0

func _ready() -> void:
	bridge.setup(_host_message);prefs=bridge.preferences();quality=prefs.get("quality","auto");reduced=prefs.get("reduced",false);reduced_explicit=prefs.get("reduced_explicit",false);touch=prefs.get("touch",false);best=int(prefs.get("best",0));legacy_best=int(prefs.get("legacy_best",0));muted=prefs.get("muted",false)
	low=quality=="low" or (quality=="auto" and touch)
	get_window().content_scale_factor=float(prefs.get("dpr",1))
	world_art=WorldVisual.new();add_child(world_art);world_art.build()
	vehicle=VehicleVisual.new();add_child(vehicle);vehicle.build(low)
	actors=ActorsVisual.new();add_child(actors)
	camera=Camera3D.new();camera.fov=52;camera.near=.08;camera.far=600;add_child(camera);camera.current=true
	make_marker();make_ui();make_audio();make_dust();apply_quality();layout()
	get_viewport().size_changed.connect(layout)
	update_visuals(0);update_camera(0,true);update_hud();refresh_menu();last_usec=Time.get_ticks_usec()

func make_marker() -> void:
	marker=MeshInstance3D.new();var mesh:=TorusMesh.new();mesh.inner_radius=4.5;mesh.outer_radius=4.8;mesh.rings=48;mesh.ring_segments=8;marker.mesh=mesh
	marker_material=StandardMaterial3D.new();marker_material.albedo_color=Color("ed5598");marker_material.emission_enabled=true;marker_material.emission=Color("ed5598");marker.material_override=marker_material;add_child(marker)
	objective_label=Label3D.new();objective_label.font_size=48;objective_label.pixel_size=.010;objective_label.billboard=BaseMaterial3D.BILLBOARD_ENABLED;objective_label.outline_size=8;objective_label.modulate=Color("fff0cd");add_child(objective_label)

func make_audio() -> void:
	music=AudioStreamPlayer.new();add_child(music);music.volume_db=-8
	if ResourceLoader.exists("res://assets/music.wav"):music.stream=load("res://assets/music.wav")
	effect=AudioStreamPlayer.new();effect.volume_db=-14;add_child(effect)
	driving_audio=DrivingAudio.new();add_child(driving_audio);driving_audio.build()

func make_dust() -> void:
	dust=CPUParticles3D.new();dust.amount=48;dust.lifetime=.65;dust.emitting=false;dust.local_coords=false;dust.direction=Vector3(0,1,0);dust.spread=35;dust.initial_velocity_min=.2;dust.initial_velocity_max=.9;dust.gravity=Vector3(0,.1,0);dust.scale_amount_min=.06;dust.scale_amount_max=.2
	var mesh:=SphereMesh.new();mesh.radius=.25;mesh.height=.5;mesh.radial_segments=6;mesh.rings=3;var mat:=StandardMaterial3D.new();mat.albedo_color=Color("dfc9a2");mesh.material=mat;dust.mesh=mesh;add_child(dust)

func style(bg: String,border: String="38525c") -> StyleBoxFlat:
	var s:=StyleBoxFlat.new();s.bg_color=Color(bg);s.border_color=Color(border);s.set_border_width_all(1);s.set_corner_radius_all(14);s.content_margin_left=18;s.content_margin_right=18;s.content_margin_top=14;s.content_margin_bottom=14;return s

func bar_style(color: String) -> StyleBoxFlat:
	var box:=StyleBoxFlat.new();box.bg_color=Color(color);box.set_corner_radius_all(4);return box

func label(text: String,font_size: int,parent: Node) -> Label:
	var l:=Label.new();l.text=text;l.add_theme_font_size_override("font_size",font_size);l.add_theme_color_override("font_color",Color("fff2d5"));parent.add_child(l);return l

func button(text: String,action: Callable,parent: Node) -> Button:
	var b:=Button.new();b.text=text;b.custom_minimum_size.y=40;b.add_theme_font_size_override("font_size",14);b.pressed.connect(action);parent.add_child(b);return b

func make_ui() -> void:
	var layer:=CanvasLayer.new();add_child(layer);canvas=Control.new();canvas.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);canvas.mouse_filter=Control.MOUSE_FILTER_IGNORE;layer.add_child(canvas)
	var theme:=Theme.new();theme.default_font_size=17;theme.default_font=load("res://assets/DejaVuSans.ttf");theme.set_stylebox("panel","PanelContainer",style("172d38e8"));theme.set_stylebox("panel","Panel",style("172d38dc"))
	for state in ["normal","hover","pressed","focus"]:
		var button_style:=style("304b56" if state=="normal" else "52707b","ffcc66" if state=="focus" else "587981");button_style.content_margin_left=10;button_style.content_margin_right=10;theme.set_stylebox(state,"Button",button_style)
	theme.set_color("font_color","Button",Color("fff2d5"));canvas.theme=theme
	hud=PanelContainer.new();canvas.add_child(hud);var v:=VBoxContainer.new();hud.add_child(v)
	var top:=HBoxContainer.new();top.add_theme_constant_override("separation",16);v.add_child(top)
	stats=label("",34,top);stats.add_theme_color_override("font_color",Color("ffcf79"));stats.custom_minimum_size.x=100
	var condition:=VBoxContainer.new();condition.size_flags_horizontal=Control.SIZE_EXPAND_FILL;top.add_child(condition)
	health_label=label("",13,condition);health_bar=ProgressBar.new();health_bar.show_percentage=false;health_bar.custom_minimum_size=Vector2(100,8);condition.add_child(health_bar)
	health_bar.add_theme_stylebox_override("background",bar_style("304b56"));health_bar.add_theme_stylebox_override("fill",bar_style("78cbb8"))
	destination=label("",15,v);destination.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	siren_label=label("",12,v);siren_label.add_theme_color_override("font_color",Color("91ddce"))
	mission_bar=ProgressBar.new();mission_bar.show_percentage=false;mission_bar.max_value=1.3;mission_bar.custom_minimum_size.y=5;mission_bar.add_theme_stylebox_override("fill",bar_style("eb8eb5"));v.add_child(mission_bar)
	controls=HBoxContainer.new();controls.add_theme_constant_override("separation",6);canvas.add_child(controls)
	pause_button=button("Pausa",toggle_pause,controls);pause_button.tooltip_text="P / Escape · Pausa"
	button("Cámara",func():camera_mode=1-camera_mode,controls)
	driver_button=button("Cara",toggle_panel,controls)
	button("Ajustes",func():settings_panel.visible=not settings_panel.visible,controls)
	settings_panel=PanelContainer.new();canvas.add_child(settings_panel);settings_panel.visible=false
	var settings:=VBoxContainer.new();settings_panel.add_child(settings);label("CALIDAD Y AUDIO",13,settings)
	sound_button=button("Audio",toggle_sound,settings)
	quality_select=OptionButton.new();quality_select.add_item("Auto");quality_select.add_item("Alta");quality_select.add_item("Baja");quality_select.item_selected.connect(func(i):quality=["auto","high","low"][i];apply_quality();save_preferences());settings.add_child(quality_select)
	menu_panel=PanelContainer.new();canvas.add_child(menu_panel);menu_content=VBoxContainer.new();menu_content.add_theme_constant_override("separation",12);menu_panel.add_child(menu_content)
	label("MORRO DE SÃO PAULO · 05:47",14,menu_content).add_theme_color_override("font_color",Color("80d6bf"))
	menu_title=label("CÓDIGO ROSA",38,menu_content);menu_title.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	menu_description=label("",17,menu_content);menu_description.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	menu_actions=VBoxContainer.new();menu_actions.add_theme_constant_override("separation",8);menu_content.add_child(menu_actions)
	reduced_button=CheckButton.new();reduced_button.text="Movimiento reducido";reduced_button.button_pressed=reduced;reduced_button.toggled.connect(func(on):reduced=on;reduced_explicit=true;if_reduced_changed();save_preferences());menu_content.add_child(reduced_button)
	intro_label=label("",28,canvas);intro_label.add_theme_color_override("font_outline_color",Color("172d38"));intro_label.add_theme_constant_override("outline_size",6);intro_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;intro_label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	skip_button=button("Omitir · Enter / Espacio",func():sim.skip_intro();sim.skip_ending();clear_inputs();last_usec=Time.get_ticks_usec(),canvas)
	notice_label=label("",18,canvas);notice_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;notice_label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;notice_label.add_theme_color_override("font_outline_color",Color("172d38"));notice_label.add_theme_constant_override("outline_size",5)
	minimap=Minimap.new();minimap.sim=sim;canvas.add_child(minimap)
	inset_container=SubViewportContainer.new();inset_container.stretch=true;inset_container.mouse_filter=Control.MOUSE_FILTER_IGNORE;canvas.add_child(inset_container)
	inset=SubViewport.new();inset.size=Vector2i(240,180);inset.transparent_bg=false;inset.world_3d=get_world_3d();inset_container.add_child(inset)
	inset_camera=Camera3D.new();inset_camera.fov=34;inset_camera.cull_mask=4;inset_camera.near=.05;inset.add_child(inset_camera);inset_camera.current=true
	inset_actions=HBoxContainer.new();canvas.add_child(inset_actions)
	pin_button=button("Fijar",func():panel_manual=not panel_manual;panel_remaining=3, inset_actions)
	button("×",func():panel_open=false;panel_manual=true,inset_actions)
	touch_controls=Control.new();touch_controls.mouse_filter=Control.MOUSE_FILTER_IGNORE;canvas.add_child(touch_controls)
	for entry in [["left","◀"],["right","▶"],["down","FRENO"],["up","ACEL."],["siren","SIRENA"]]:
		var b:=Button.new();b.text=entry[1];b.add_theme_font_size_override("font_size",12);b.focus_mode=Control.FOCUS_NONE;b.mouse_filter=Control.MOUSE_FILTER_IGNORE;touch_controls.add_child(b);touch_buttons[entry[0]]=b

func layout() -> void:
	if not canvas:return
	var screen:=get_viewport().get_visible_rect().size;last_size=screen;var narrow:=screen.x<650;var landscape:=screen.y<500
	var safe: Array=prefs.get("safe",[0,0,0,0])
	var margin:=maxf(12,maxf(safe[1],safe[3]))
	menu_content.get_child(0).visible=not landscape
	if sim.state==Sim.MENU:
		menu_title.text="CÓDIGO ROSA" if landscape else "CÓDIGO ROSA\nYo manejo"
		menu_description.text="Recogé al paciente y llegá al puesto en 150 segundos." if landscape else "Salió de la disco. Vio una ambulancia.\n«Yo manejo».\n\nRecogé al paciente y llegá al puesto en 150 segundos.\nWASD / flechas · Espacio: sirena · C: cámara"
	hud.position=Vector2(margin,maxf(12,safe[0]));hud.size=Vector2(minf(screen.x-24,440),0)
	stats.add_theme_font_size_override("font_size",26 if landscape else (29 if narrow else 36))
	var hud_style:=hud.get_theme_stylebox("panel").duplicate();hud_style.content_margin_top=8 if landscape else 14;hud_style.content_margin_bottom=8 if landscape else 14;hud.add_theme_stylebox_override("panel",hud_style)
	destination.add_theme_font_size_override("font_size",12 if landscape else 14)
	controls.position=Vector2(margin,158 if narrow else (129 if landscape else 156))
	settings_panel.position=controls.position+Vector2(0,48);settings_panel.size=Vector2(210,0)
	var mw:=minf(screen.x-32,570)
	menu_panel.position=Vector2(screen.x-mw-32 if screen.x>=1100 else (screen.x-mw)/2,maxf(12,(screen.y-(300 if landscape else 385))/2));menu_panel.size=Vector2(mw,0)
	menu_title.add_theme_font_size_override("font_size",26 if landscape else (32 if narrow else 40))
	menu_description.add_theme_font_size_override("font_size",14 if landscape else 17)
	intro_label.position=Vector2(20,screen.y-150);intro_label.size=Vector2(screen.x-40,55)
	skip_button.position=Vector2(screen.x/2-135,screen.y-80);skip_button.size=Vector2(270,44)
	notice_label.position=Vector2(12,211 if narrow else (186 if landscape else screen.y-115));notice_label.size=Vector2(minf(680,screen.x-(200 if landscape else 24)),70)
	notice_label.add_theme_font_size_override("font_size",14 if landscape else 16)
	var map_width:=110 if landscape else (125 if narrow else 162)
	var map_height:=100 if landscape else (140 if narrow else 170)
	minimap.position=Vector2(screen.x-map_width-12,12 if landscape else screen.y-(175 if touch else 22)-map_height);minimap.size=Vector2(map_width,map_height)
	var inset_width:=144 if narrow or landscape else 230
	var inset_height:=100 if landscape else (112 if narrow else 172)
	inset_container.position=Vector2(screen.x-inset_width-map_width-36 if landscape else screen.x-inset_width-12,12 if landscape else (265 if narrow else 16));inset_container.size=Vector2(inset_width,inset_height)
	inset_container.stretch_shrink=2 if low else 1
	inset_actions.position=inset_container.position+Vector2(0,inset_container.size.y+4)
	touch_controls.position=Vector2(0,screen.y-158-safe[2]);touch_controls.size=Vector2(screen.x,158)
	var bw:=clampf(screen.x*.16,55,84)
	for key in touch_buttons:touch_buttons[key].size=Vector2(bw,64)
	touch_buttons.left.position=Vector2(12+safe[3],66);touch_buttons.right.position=Vector2(20+bw+safe[3],66)
	touch_buttons.down.position=Vector2(screen.x-2*bw-20-safe[1],66);touch_buttons.up.position=Vector2(screen.x-bw-12-safe[1],66)
	touch_buttons.siren.position=Vector2(screen.x-bw*1.7-12,0);touch_buttons.siren.size=Vector2(bw*1.7,54)
	touch_controls.visible=touch and sim.state==Sim.PLAYING
	if screen!=Vector2.ZERO:apply_resolution()

func apply_resolution() -> void:
	var dpr:=maxf(1,float(prefs.get("dpr",1)))
	get_viewport().scaling_3d_scale=minf(dpr,1.0 if low else 1.5)/dpr

func apply_quality() -> void:
	var was_low:=low;low=quality=="low" or (quality=="auto" and touch)
	if vehicle and was_low!=low:vehicle.low=low;vehicle.load_driver()
	if vehicle:vehicle.quality(low)
	if quality_select:quality_select.select(["auto","high","low"].find(quality))
	RenderingServer.directional_shadow_atlas_set_size(512 if low else 1024,true)
	if world_art:world_art.quality(low)
	panel_open=false;panel_manual=false;panel_remaining=0
	if dust:dust.amount=18 if low else 48
	apply_resolution();layout_if_ready()

func layout_if_ready() -> void:
	if inset_container:layout()

func save_preferences() -> void:
	bridge.save({"version":2,"quality":quality,"best":best,"legacy_best":legacy_best,"reduced":reduced,"reduced_explicit":reduced_explicit,"muted":muted})

func if_reduced_changed() -> void:
	sim.presentation_reduced=reduced
	if reduced:sim.skip_intro();sim.skip_ending()
	clear_inputs()

func start_game(force_story: bool=false) -> void:
	vehicle.reset();actors.reset();story.reset();first_siren=true;settings_panel.visible=false
	sim.start(force_story,reduced,int(Time.get_ticks_usec() & 0xffffffff));camera_mode=0;route_phase=-1;panel_open=false;panel_manual=false;panel_remaining=0;visual_time=0;siren_tick=0;police_tick=0;clear_inputs();last_usec=Time.get_ticks_usec();update_visuals(0);update_camera(0,true);refresh_menu();sync_audio()

func clear_inputs() -> void:
	for key in keyboard:keyboard[key]=false
	touch_pointers.clear();sim.clear_input()

func toggle_pause() -> void:
	sim.pause();clear_inputs();last_usec=Time.get_ticks_usec();refresh_menu();sync_audio()

func toggle_panel() -> void:
	panel_open=not panel_open;panel_manual=true

func toggle_sound() -> void:
	muted=not muted;save_preferences();sync_audio()

func sync_audio() -> void:
	var active: bool=not muted and sim.state in [Sim.PLAYING,Sim.CINEMATIC]
	bridge.music(active)
	if music:
		if active and not remote_music and music.stream:
			if not music.playing:music.play()
		else:music.stop()
	if not active and effect:effect.stop()
	if driving_audio:driving_audio.update(sim,0,muted,remote_music)
	if sound_button:sound_button.text="♫" if not muted else "× ♫"

func play_effect(name: String) -> void:
	if muted or not effect:return
	var resource:="res://assets/"+name+".wav"
	if ResourceLoader.exists(resource):effect.stream=load(resource);effect.play()

func refresh_menu() -> void:
	for child in menu_actions.get_children():menu_actions.remove_child(child);child.queue_free()
	menu_panel.visible=sim.state in [Sim.MENU,Sim.PAUSED,Sim.WON,Sim.LOST]
	if menu_panel.visible:settings_panel.visible=false
	reduced_button.visible=sim.state==Sim.MENU
	match sim.state:
		Sim.MENU:
			menu_title.text="CÓDIGO ROSA\nYo manejo"
			menu_description.text="Salió de la disco. Vio una ambulancia.\n«Yo manejo».\n\nRecogé al paciente y llegá al puesto en 150 segundos.\nWASD / flechas · Espacio: sirena · C: cámara"
			button("JUGAR →",func():start_game(true),menu_actions)
			button("Ver historia",func():start_game(true),menu_actions)
		Sim.PAUSED:
			menu_title.text="TURNO EN PAUSA"
			menu_description.text="Hasta el caos necesita un respiro."
			button("VOLVER AL VOLANTE →",toggle_pause,menu_actions)
		Sim.WON,Sim.LOST:
			menu_title.text="DIJO «YO MANEJO».\nY LLEGÓ." if sim.state==Sim.WON else ("ERA PRESTADO…\nY LO ROMPISTE." if sim.health<=0 else "SE HIZO DE DÍA.")
			menu_description.text="%s\n%d PUNTOS · %d s RESTANTES · %d%% RESISTENCIA\n%d CHOQUES · %d ATROPELLOS · Récord: %d" % ["★".repeat(sim.stars)+"☆".repeat(3-sim.stars),sim.score,ceili(sim.time),ceili(sim.health),sim.bumps,sim.ped_hits,best]
			button("OTRA VUELTA ↻",func():start_game(),menu_actions)
			button("Volver al inicio",func():sim.menu();clear_inputs();refresh_menu();sync_audio(),menu_actions)
	if menu_panel.visible and menu_actions.get_child_count():menu_actions.get_child(0).grab_focus()
	layout()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and not event.echo:
		var code=event.physical_keycode
		if event.pressed and sim.state in [Sim.CINEMATIC,Sim.ENDING] and code in [KEY_ENTER,KEY_SPACE]:
			sim.skip_intro();sim.skip_ending();clear_inputs();last_usec=Time.get_ticks_usec();get_viewport().set_input_as_handled();return
		if event.pressed and code in [KEY_P,KEY_ESCAPE]:toggle_pause();get_viewport().set_input_as_handled();return
		if sim.state!=Sim.PLAYING:return
		var map={KEY_W:"up",KEY_UP:"up",KEY_S:"down",KEY_DOWN:"down",KEY_A:"left",KEY_LEFT:"left",KEY_D:"right",KEY_RIGHT:"right"}
		if map.has(code):keyboard[map[code]]=event.pressed;get_viewport().set_input_as_handled()
		if event.pressed and code==KEY_SPACE:sim.siren();get_viewport().set_input_as_handled()
		if event.pressed and code==KEY_C:camera_mode=1-camera_mode;get_viewport().set_input_as_handled()
	if event is InputEventScreenTouch:
		if not event.pressed or event.canceled:touch_pointers.erase(event.index);return
		if sim.state==Sim.PLAYING:
			for key in touch_buttons:
				if touch_buttons[key].get_global_rect().has_point(event.position):
					if key=="siren":sim.siren()
					else:touch_pointers[event.index]=key
					get_viewport().set_input_as_handled();break
	if event is InputEventScreenDrag and touch_pointers.has(event.index):
		var key: String=touch_pointers[event.index]
		if not touch_buttons[key].get_global_rect().grow(25).has_point(event.position):touch_pointers.erase(event.index)

func _notification(what: int) -> void:
	if what==NOTIFICATION_APPLICATION_FOCUS_OUT and not OS.has_feature("web"):
		if sim.state in [Sim.PLAYING,Sim.CINEMATIC,Sim.ENDING]:toggle_pause()

func _host_message(message: Dictionary) -> void:
	match message.get("type",""):
		"release":clear_inputs();bridge.snapshot(test_snapshot())
		"hidden","blur":
			clear_inputs()
			if sim.state in [Sim.PLAYING,Sim.CINEMATIC,Sim.ENDING]:toggle_pause()
		"preferences":
			var previous_touch:=touch
			prefs=bridge.preferences();touch=prefs.get("touch",false)
			get_window().content_scale_factor=float(prefs.get("dpr",1))
			if message.has("reduced"):reduced=message.reduced;if_reduced_changed()
			if quality=="auto" and touch!=previous_touch:apply_quality()
			else:layout()
		"audio":remote_music=message.get("playing",false);sync_audio()
		"test":
			if OS.has_feature("verification"):_test_command(message)

func _process(_delta: float) -> void:
	var now:=Time.get_ticks_usec();var raw:=maxf(0,float(now-last_usec)/1000000.0);last_usec=now
	var dt:=minf(raw,.25)
	if benchmark_active and OS.has_feature("verification"):_benchmark_tick(raw)
	if not test_frozen:
		var inputs:=keyboard.duplicate()
		for key in touch_pointers.values():inputs[key]=true
		sim.advance(raw,inputs)
		if sim.state!=Sim.PAUSED:visual_time+=dt
	if sim.state!=previous_state:
		previous_state=sim.state
		if sim.state==Sim.WON and sim.score>best:best=sim.score;save_preferences()
		if sim.state in [Sim.WON,Sim.LOST]:panel_open=false
		refresh_menu();sync_audio();update_camera(dt,true);bridge.announce("Turno en pausa" if sim.state==Sim.PAUSED else sim.state)
		if sim.state in [Sim.WON,Sim.LOST]:play_effect("win" if sim.state==Sim.WON else "hit")
	for event in sim.take_events():
		story.consume(event)
		if event.type in ["damage","pickup","siren","drift"]:
			if not low and not panel_manual:panel_open=true;panel_remaining=3
			if event.type=="damage":play_effect("hit")
	story.update(raw,sim.state==Sim.PLAYING and not test_frozen)
	if story.remaining>0:
		notice_label.text=story.speaker+" · "+story.text
		if notice_label.text!=last_announcement:bridge.announce(notice_label.text);last_announcement=notice_label.text
	if sim.state==Sim.PLAYING:
		panel_remaining-=raw
		if panel_remaining<=0 and not panel_manual:panel_open=false
		if sim.siren_left>0:
			siren_tick-=dt
			if siren_tick<=0:play_effect("siren");siren_tick=.35
	update_visuals(0 if sim.state==Sim.PAUSED else dt)
	update_camera(dt)
	hud_accum+=dt
	if hud_accum>=.1:update_hud();hud_accum=0
	report_accum+=dt
	if report_accum>.2:report_accum=0;bridge.snapshot(test_snapshot())

func update_visuals(dt: float) -> void:
	if sim.state!=Sim.PAUSED:
		vehicle.update(sim,dt,visual_time,reduced)
		actors.update(sim,visual_time,reduced)
		world_art.animate(0 if reduced else visual_time)
	driving_audio.update(sim,dt,muted,remote_music)
	var target: Array=World.data.hospital if sim.phase else World.data.pickup
	marker.position=Vector3(target[0],World.height_at(target[0],target[1])+.22,target[1]);marker.visible=sim.state==Sim.PLAYING
	marker_material.albedo_color=Color("79d6c0") if sim.phase else Color("ed5598");marker_material.emission=marker_material.albedo_color
	inset_container.visible=panel_open and sim.state==Sim.PLAYING
	inset_actions.visible=inset_container.visible;pin_button.text="Automático" if panel_manual else "Fijar"
	objective_label.position=marker.position+Vector3(0,3.6,0);objective_label.visible=sim.state==Sim.PLAYING and Vector2(sim.x-target[0],sim.z-target[1]).length()<35
	objective_label.text=("ENTREGANDO" if sim.phase else "SUBIENDO")+" · %d%%" % roundi(sim.load_progress/1.3*100) if sim.load_progress>0 else ("FRENÁ · PUESTO" if sim.phase else "FRENÁ · SEGUNDA PRAIA")
	inset.render_target_update_mode=SubViewport.UPDATE_ALWAYS if inset_container.visible else SubViewport.UPDATE_DISABLED
	var hp: Vector3=vehicle.head.global_position
	inset_camera.global_position=hp+vehicle.global_basis*Vector3(.1,.13,2.0);inset_camera.look_at(hp+Vector3(0,.05,0))
	if dust:
		dust.position=vehicle.position+Vector3(0,.25,0)
		var sand: bool=World.surface_at(Vector2(sim.x,sim.z))=="sand"
		dust.emitting=sim.state==Sim.PLAYING and not reduced and sim.speed>6 and (sand or sim.drift_amount>0)
		dust.speed_scale=0 if sim.state==Sim.PAUSED else 1

func update_camera(dt: float,snap: bool=false) -> void:
	if sim.state==Sim.PAUSED:return
	var origin:=vehicle.global_position;var basis:=Basis(Vector3.UP,sim.angle);var desired: Vector3;var target: Vector3
	var cinema: bool=sim.state==Sim.CINEMATIC
	if cinema and sim.cinematic_time<2.2:
		var t: float=sim.cinematic_time/2.2;desired=origin+Vector3(-20+t*4,10-t,20-t*4);target=Vector3(World.data.landmarks.club[0],World.height_at(World.data.landmarks.club[0],World.data.landmarks.club[1])+3,World.data.landmarks.club[1])
	elif cinema and sim.cinematic_time<4.6:
		target=vehicle.head.global_position+Vector3(0,.03,0);desired=target+basis*Vector3(.65,.2,2.6)
	elif cinema:
		var t: float=(sim.cinematic_time-4.6)/2.4;desired=origin+basis*Vector3(4*(1-t),lerpf(3.4,6,t),lerpf(4,-10,t));target=origin+Vector3(0,1.9,0)
	elif sim.state==Sim.ENDING:
		target=origin+Vector3(0,1.7,0) if sim.ending_time<3 else vehicle.head.global_position
		desired=target+basis*(Vector3(7,3.4,7) if sim.ending_time<3 else Vector3(.65,.2,2.8))
	elif sim.state in [Sim.MENU,Sim.WON,Sim.LOST]:
		target=vehicle.head.global_position+Vector3(0,-.14,0);desired=target+basis*(Vector3(2.8,1.0,6.5) if sim.state==Sim.MENU else Vector3(.65,.2,2.8))
		if last_size.x>=1100:target+=basis*Vector3(.9,0,0)
	else:
		var portrait_scale: float=1.35 if last_size.x<last_size.y else 1.0
		desired=origin+basis*Vector3(0,4.4*portrait_scale,(11.5 if camera_mode else -13.5)*portrait_scale)
		target=origin+basis*Vector3(0,1.9,0 if camera_mode else 6+minf(sim.speed*.16,3))
		if capture_legacy and OS.has_feature("verification"):
			desired=origin+basis*Vector3(0,5.7,-10.5);target=origin+basis*Vector3(0,1.9,4+minf(sim.speed*.15,3))
		var query:=PhysicsRayQueryParameters3D.create(origin+Vector3(0,2,0),desired,2)
		var hit=get_world_3d().direct_space_state.intersect_ray(query)
		if not hit.is_empty():desired=hit.position+hit.normal*.55
		desired.y=maxf(desired.y,World.height_at(desired.x,desired.z)+.8)
	camera.fov=48 if capture_legacy and OS.has_feature("verification") else 52
	camera.global_position=desired if snap or reduced or cinema or sim.state==Sim.ENDING else camera.global_position.lerp(desired,1-exp(-dt*6))
	if camera.global_position.distance_to(target)>.01:camera.look_at(target)

func update_hud() -> void:
	var seconds:=ceili(sim.time)
	stats.text="%02d:%02d" % [seconds/60,seconds%60]
	stats.add_theme_color_override("font_color",Color("f58da2") if seconds<=20 else Color("ffcf79"))
	health_label.text="BUGGY %d%% · %d km/h" % [ceili(sim.health),roundi(sim.speed*3.6)];health_bar.value=sim.health
	mission_bar.value=sim.load_progress;mission_bar.visible=sim.load_progress>0
	var target: Array=World.data.hospital if sim.phase else World.data.pickup
	var position2:=Vector2(sim.x,sim.z)
	if position2.distance_to(route_position)>1.5 or sim.phase!=route_phase:
		route=World.route(position2,Vector2(target[0],target[1]));route_position=position2;route_phase=sim.phase
	var cue:="◎"
	if route.size()>1:
		var point: Vector2=route[1];var bearing:=atan2(point.x-sim.x,point.y-sim.z);var relative:=atan2(sin(bearing-sim.angle),cos(bearing-sim.angle))
		cue=["↑","↗","→","↘","↓","↙","←","↖"][posmod(roundi(relative/(PI/4)),8)]
	destination.text="%s %s · %d m" % [cue,"POSTO DE SAÚDE" if sim.phase else "SEGUNDA PRAIA",roundi(World.path_length(route))]
	var maneuver:=World.next_maneuver(route,sim.angle)
	destination.text="%s · %d m\n%s" % [maneuver.text,roundi(maneuver.distance),destination.text]
	siren_label.text="SIRENA · "+("ACTIVA" if sim.siren_left>0 else ("RECARGA %d s" % ceili(sim.cooldown) if sim.cooldown>0 else "LISTA · ESPACIO"))
	if sim.load_progress>0:destination.text=("ENTREGANDO" if sim.phase else "SUBIENDO")+" · "+str(roundi(sim.load_progress/1.3*100))+"%"
	hud.visible=sim.state==Sim.PLAYING;controls.visible=sim.state==Sim.PLAYING;minimap.visible=sim.state==Sim.PLAYING;minimap.path=route;minimap.queue_redraw()
	intro_label.visible=sim.state in [Sim.CINEMATIC,Sim.ENDING];skip_button.visible=intro_label.visible
	intro_label.text="MORRO. SALIDA DE LA DISCO." if sim.cinematic_time<2.2 else ("«YO MANEJO»." if sim.cinematic_time<4.6 else "TRANQUILO. DIJO QUE SABÍA.")
	if sim.state==Sim.ENDING:intro_label.text=ending_line()
	notice_label.visible=story.remaining>0 and sim.state==Sim.PLAYING;touch_controls.visible=touch and sim.state==Sim.PLAYING
	touch_buttons.siren.text="ACTIVA" if sim.siren_left>0 else (str(ceili(sim.cooldown))+" s" if sim.cooldown>0 else "SIRENA")

func test_snapshot() -> Dictionary:
	var data: Dictionary=sim.snapshot();data["low"]=low;data["panel_open"]=panel_open;data["inset_rendering"]=inset.render_target_update_mode!=SubViewport.UPDATE_DISABLED;data["quality"]=quality;data["best"]=best;data["legacy_best"]=legacy_best;data["touch"]=touch;data["reduced"]=reduced
	data["ui_size"]=[last_size.x,last_size.y];data["inputs"]=sim.keys.duplicate();data["touch_inputs"]=touch_pointers.duplicate();data["music_local"]=music.playing if music else false
	data["presentation"]={"panel_manual":panel_manual,"panel_remaining":panel_remaining,"notice":notice_label.text,"settings_visible":settings_panel.visible,"suspension":vehicle.model.position.y,"braking_pitch":vehicle.model.rotation.x,"objective_visible":objective_label.visible,"camera_position":[camera.position.x,camera.position.y,camera.position.z],"camera_fov":camera.fov,"story_speaker":story.speaker,"story_remaining":story.remaining,"story_queue":story.queue.size(),"pickup_visual_progress":sim.load_progress/1.3}
	data["audio"]={}
	for name in driving_audio.players:
		var player: AudioStreamPlayer=driving_audio.players[name];data["audio"][name]={"playing":player.playing,"pitch":player.pitch_scale,"db":player.volume_db}
	data["benchmark"]={"active":benchmark_active,"elapsed":benchmark_elapsed,"frames":benchmark_frames if not benchmark_active else [],"calls":benchmark_calls if not benchmark_active else []}
	data["render"]={"calls":RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME),"primitives":RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)}
	return data

func _test_command(message: Dictionary) -> void:
	if not OS.has_feature("verification"):return
	match message.get("command",""):
		"benchmark":benchmark_active=true;benchmark_elapsed=-5;benchmark_frames.clear();benchmark_calls.clear();test_frozen=false;sim.start(false,true,27);clear_inputs()
		"capture_legacy":capture_legacy=message.get("value",true)
		"mute":muted=message.get("value",true);sync_audio()
		"pin":panel_manual=message.get("value",true);panel_open=true;panel_remaining=3
		"reduced":reduced=message.get("value",true);if_reduced_changed()
		"menu":sim.menu();clear_inputs();refresh_menu();sync_audio()
		"study":get_tree().change_scene_to_file("res://scenes/study.tscn");return
		"freeze":test_frozen=message.get("value",true)
		"start":sim.start(message.get("story",false),message.get("reduced",true),27);vehicle.reset();actors.reset();story.reset();first_siren=true;panel_open=false;panel_manual=false;panel_remaining=0;clear_inputs();refresh_menu();update_camera(0,true)
		"set":
			for key in message.values:sim.set(key,message.values[key])
		"advance":
			sim.advance(message.dt,message.get("keys",{}))
			for event in sim.take_events():story.consume(event)
			story.update(message.dt,sim.state==Sim.PLAYING)
		"skip":sim.skip_intro();sim.skip_ending()
		"pause":toggle_pause()
		"siren":sim.siren()
		"quality":quality=message.value;apply_quality();save_preferences()
		"panel":panel_open=message.value;panel_manual=true
	update_visuals(0);update_camera(0,true);update_hud();bridge.snapshot(test_snapshot())

func _benchmark_tick(dt: float) -> void:
	benchmark_elapsed+=dt
	if benchmark_elapsed>=0:
		benchmark_frames.append(dt)
		benchmark_calls.append(RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME))
	if benchmark_elapsed>=60:
		benchmark_active=false;test_frozen=true;bridge.snapshot(test_snapshot());return
	# Repeatable presentation route. Actors and collision code still run every step.
	# Health/time are reset only in verification builds to prevent premature termination.
	var points: Array=World.nodes().slice(0,World.data.main_route.size())
	var total:=0.0
	for i in range(1,points.size()):total+=points[i-1].distance_to(points[i])
	var distance:=clampf(benchmark_elapsed/60,0,1)*total
	for i in range(1,points.size()):
		var length: float=points[i-1].distance_to(points[i])
		if distance>length:distance-=length;continue
		var p: Vector2=points[i-1].lerp(points[i],distance/length)
		var heading: Vector2=(points[i]-points[i-1]).normalized()
		sim.x=p.x;sim.z=p.y;sim.angle=atan2(heading.x,heading.y);sim.vx=heading.x*16;sim.vz=heading.y*16;break
	sim.time=150;sim.health=100;sim.state=Sim.PLAYING;sim.phase=1 if benchmark_elapsed>15 else 0

func ending_line() -> String:
	if sim.outcome==Sim.LOST:
		return "Lau · «Bueno. La próxima pedimos un taxi»." if sim.health<=0 else "Nico · «Se hizo de día y todavía estamos en la anécdota»."
	if sim.stars==3:return "Fede · «Llegamos. Eso no significa que tuvieras permiso»."
	if sim.health<50:return "Lau · «El paciente está bien. La ambulancia pide turno»."
	return "Conductor · «¿Vieron? Yo les dije que manejaba»."
