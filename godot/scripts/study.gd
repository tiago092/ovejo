extends Node3D
## Review scene uses the exact exported game mesh, with neutral illumination.
func _ready() -> void:
	var world:=WorldEnvironment.new();var env:=Environment.new();env.background_mode=Environment.BG_COLOR;env.background_color=Color("d4d0c6");env.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR;env.ambient_light_color=Color("c9d7e3");env.ambient_light_energy=.5;env.tonemap_mode=Environment.TONE_MAPPER_ACES;world.environment=env;add_child(world)
	var light:=DirectionalLight3D.new();light.rotation_degrees=Vector3(-30,-25,0);light.light_energy=.65;add_child(light)
	var camera:=Camera3D.new();camera.position=Vector3(0,1.3,7);camera.projection=Camera3D.PROJECTION_ORTHOGONAL;camera.size=2.8;add_child(camera);camera.look_at(Vector3(0,1.25,0));camera.current=true
	for i in range(3):
		var driver=load("res://assets/driver.glb").instantiate();driver.position=Vector3((i-1)*1.4,0,0);driver.rotation.y=[0,-PI/4,-PI/2][i];add_child(driver)
		var label:=Label3D.new();label.text=["FRENTE","TRES CUARTOS","PERFIL"][i];label.position=Vector3((i-1)*1.4,.27,.7);label.font=load("res://assets/DejaVuSans.ttf");label.font_size=48;label.pixel_size=.003;label.outline_size=0;label.modulate=Color("172d38");add_child(label)
