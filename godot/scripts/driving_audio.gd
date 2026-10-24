extends Node
const World=preload("res://scripts/world_data.gd")
var players: Dictionary={}
func build() -> void:
	for name in ["engine","road","sand","surf","club"]:
		var player:=AudioStreamPlayer.new();var sound: AudioStreamWAV=load("res://assets/"+name+".wav").duplicate()
		sound.loop_mode=AudioStreamWAV.LOOP_FORWARD;sound.loop_begin=0;sound.loop_end=int(sound.get_length()*sound.mix_rate)
		player.stream=sound;player.volume_db=-60;add_child(player);players[name]=player
func update(sim,dt: float,muted: bool,_remote_music: bool) -> void:
	var active: bool=not muted and sim.state in ["playing","cinematic"]
	var speed: float=absf(sim.speed)/24
	var sand: bool=World.surface_at(Vector2(sim.x,sim.z))=="sand"
	var club_distance: float=Vector2(sim.x-World.data.landmarks.club[0],sim.z-World.data.landmarks.club[1]).length()
	var gains: Dictionary={"engine":-28+speed*9+(3 if sim.keys.up else 0),"road":-45+speed*23+sim.drift_amount*4 if not sand else -65,"sand":-45+speed*22 if sand else -65,"surf":lerpf(-30,-65,clampf((sim.x-World.shore_at(sim.z))/60,0,1)),"club":lerpf(-19,-65,clampf(club_distance/65,0,1))}
	for name in players:
		var player: AudioStreamPlayer=players[name]
		if active:
			if not player.playing:player.play()
			player.volume_db=lerpf(player.volume_db,float(gains[name]),minf(dt*5,1))
		else:player.stop();player.volume_db=-60
	players.engine.pitch_scale=.8+speed*1.05+(.08 if sim.keys.up else 0)
	players.road.pitch_scale=.7+speed*.6
	# Club is nonverbal crowd-like noise, never a second musical track.
