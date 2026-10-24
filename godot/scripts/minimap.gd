extends Control
const World=preload("res://scripts/world_data.gd")
var sim
var path: Array=[]
func map_point(p: Vector2) -> Vector2:return Vector2((p.x-World.data.bounds[0])/(World.data.bounds[1]-World.data.bounds[0])*size.x,(World.data.bounds[3]-p.y)/(World.data.bounds[3]-World.data.bounds[2])*size.y)
func _draw() -> void:
	if not sim:return
	draw_style_box(get_theme_stylebox("panel","Panel"),Rect2(Vector2.ZERO,size))
	var plaza:=PackedVector2Array()
	for p in World.data.plaza_paving:plaza.append(map_point(Vector2(p[0],p[1])))
	draw_colored_polygon(plaza,Color("6a7b73"))
	var points:=World.nodes()
	for edge in World.data.edges:draw_line(map_point(points[edge.a]),map_point(points[edge.b]),Color("8e9f93") if edge.section=="desvio" else Color("647c80"),2)
	for i in range(1,path.size()):draw_line(map_point(path[i-1]),map_point(path[i]),Color("79d6c0"),2)
	var pos:=map_point(Vector2(sim.x,sim.z));draw_circle(pos,4,Color("ffda68"));draw_line(pos,pos+Vector2(sin(sim.angle),-cos(sim.angle))*12,Color("ffda68"),2)
	var target: Array=World.data.hospital if sim.phase else World.data.pickup
	draw_circle(map_point(Vector2(target[0],target[1])),4,Color("ef77a5"))
