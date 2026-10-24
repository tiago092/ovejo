extends Control
const World=preload("res://scripts/world_data.gd")
var sim
var path: Array=[]
func map_point(p: Vector2) -> Vector2:return Vector2((p.x+105)/225*size.x,(160-p.y)/330*size.y)
func _draw() -> void:
	if not sim:return
	draw_style_box(get_theme_stylebox("panel","Panel"),Rect2(Vector2.ZERO,size))
	for x in World.data.road_x:draw_line(map_point(Vector2(x,-157)),map_point(Vector2(x,148)),Color("647c80"),2)
	for z in World.data.road_z:draw_line(map_point(Vector2(-93,z)),map_point(Vector2(117,z)),Color("647c80"),2)
	for i in range(1,path.size()):draw_line(map_point(path[i-1]),map_point(path[i]),Color("79d6c0"),2)
	var pos:=map_point(Vector2(sim.x,sim.z));draw_circle(pos,4,Color("ffda68"));draw_line(pos,pos+Vector2(sin(sim.angle),-cos(sim.angle))*12,Color("ffda68"),2)
	var target: Array=World.data.hospital if sim.phase else World.data.pickup
	draw_circle(map_point(Vector2(target[0],target[1])),4,Color("ef77a5"))
