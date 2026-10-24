extends RefCounted
## Single source for geometry, routing, road materials and arcade collision queries.
static var data: Dictionary=JSON.parse_string(FileAccess.get_file_as_string("res://data/world.json"))
static var cached_segments: Array=[]
static var cached_polygons: Array=[]
static var cached_boundary:=PackedVector2Array()
static var cached_nodes: Array=[]
static var cached_adjacency: Array=[]

static func height_at(x: float,z: float) -> float:
	return .6*sin(z*.009)+1.4*exp(-pow((x-100)/110,2)-pow((z-130)/130,2))

static func shore_at(z: float) -> float:
	return -185+sin(z*.013)*7+sin(z*.034)*3

static func nodes() -> Array:
	if cached_nodes.is_empty():
		for p in data.nodes:cached_nodes.append(Vector2(p[0],p[1]))
	return cached_nodes

static func adjacency() -> Array:
	if cached_adjacency.is_empty():
		for _p in nodes():cached_adjacency.append([])
		for edge in data.edges:
			cached_adjacency[edge.a].append(edge.b);cached_adjacency[edge.b].append(edge.a)
	return cached_adjacency

static func polygons() -> Array:
	if not cached_polygons.is_empty():return cached_polygons
	var result: Array=[]
	for wall in data.buildings+data.obstacles:
		var poly:=PackedVector2Array()
		if wall.has("polygon"):
			for p in wall.polygon:poly.append(Vector2(p[0],p[1]))
		else:
			for p in [Vector2(-1,-1),Vector2(1,-1),Vector2(1,1),Vector2(-1,1)]:poly.append(Vector2(wall.x,wall.z)+p*Vector2(wall.w,wall.d)*.5)
		result.append(poly)
	cached_polygons=result
	return result

static func segments() -> Array:
	if cached_segments.is_empty():
		var all:=polygons().duplicate();var boundary:=PackedVector2Array()
		for p in data.boundary:boundary.append(Vector2(p[0],p[1]))
		all.append(boundary)
		for poly in all:
			for i in range(poly.size()):cached_segments.append([poly[i],poly[(i+1)%poly.size()]])
	return cached_segments

static func blocked(x: float,z: float,radius: float=1.6) -> bool:
	var p:=Vector2(x,z)
	if cached_boundary.is_empty():
		for point in data.boundary:cached_boundary.append(Vector2(point[0],point[1]))
	if not Geometry2D.is_point_in_polygon(p,cached_boundary):return true
	for poly in polygons():
		if Geometry2D.is_point_in_polygon(p,poly):return true
	for segment in segments():
		if p.distance_to(Geometry2D.get_closest_point_to_segment(p,segment[0],segment[1]))<radius-.0001:return true
	return false

static func sweep(origin: Vector2,delta: Vector2,radius: float=1.6) -> Dictionary:
	var earliest:=1.0;var normal:=Vector2.ZERO
	var low:=origin.min(origin+delta)-Vector2.ONE*radius
	var high:=origin.max(origin+delta)+Vector2.ONE*radius
	if delta.length_squared()<.00000001:return {"fraction":1.0,"normal":normal}
	for segment in segments():
		var a: Vector2=segment[0];var b: Vector2=segment[1]
		if maxf(a.x,b.x)<low.x or minf(a.x,b.x)>high.x or maxf(a.y,b.y)<low.y or minf(a.y,b.y)>high.y:continue
		var line:=b-a;var length:=line.length();var tangent:=line/length;var n:=Vector2(-tangent.y,tangent.x)
		for side in [-1,1]:
			var face: Vector2=n*side;var approach:=delta.dot(face)
			if approach>=-.000001:continue
			var t: float=(radius-(origin-a).dot(face))/approach
			if t<-.00001 or t>earliest:continue
			var along: float=(origin+delta*t-a).dot(tangent)
			if along>=0 and along<=length:earliest=maxf(0,t);normal=face
		for vertex in [a,b]:
			var offset: Vector2=origin-vertex;var qa:=delta.length_squared();var qb:=2*offset.dot(delta);var qc:=offset.length_squared()-radius*radius;var disc:=qb*qb-4*qa*qc
			if disc<0:continue
			var t:=(-qb-sqrt(disc))/(2*qa)
			if t<-.00001 or t>earliest:continue
			var contact: Vector2=(origin+delta*t-vertex).normalized()
			if delta.dot(contact)<0:earliest=maxf(0,t);normal=contact
	return {"fraction":earliest,"normal":normal}

static func move_circle(origin: Vector2,delta: Vector2,radius: float=1.6) -> Dictionary:
	var position:=origin;var remaining:=delta;var normals: Array=[]
	for _iteration in range(4):
		var hit:=sweep(position,remaining,radius)
		position+=remaining*maxf(0,hit.fraction-.0001)
		if hit.normal==Vector2.ZERO:break
		normals.append(hit.normal);position+=hit.normal*.001
		remaining*=1-hit.fraction
		remaining-=hit.normal*minf(0,remaining.dot(hit.normal))
		if remaining.length()<.0001:break
	return {"position":position,"normals":normals}

static func clear_segment(a: Vector2,b: Vector2) -> bool:
	return not blocked(a.x,a.y) and sweep(a,b-a).normal==Vector2.ZERO

static func road_projection(p: Vector2) -> Dictionary:
	var best: Dictionary={"distance":INF,"point":p,"edge":0,"t":0.0}
	var points:=nodes()
	for i in range(data.edges.size()):
		var edge: Dictionary=data.edges[i];var a: Vector2=points[edge.a];var b: Vector2=points[edge.b];var q:=Geometry2D.get_closest_point_to_segment(p,a,b);var distance:=p.distance_to(q)
		if distance<best.distance:best={"distance":distance,"point":q,"edge":i,"t":(q-a).length()/a.distance_to(b)}
	return best

static func surface_at(p: Vector2) -> String:
	var plaza:=PackedVector2Array()
	for point in data.plaza_paving:plaza.append(Vector2(point[0],point[1]))
	if Geometry2D.is_point_in_polygon(p,plaza):return "stone"
	var projection:=road_projection(p);var edge: Dictionary=data.edges[projection.edge]
	return edge.surface if projection.distance<=edge.width*.5 else "sand"

static func route(a: Vector2,b: Vector2) -> Array:
	if a.distance_to(b)<4.6 and clear_segment(a,b):return [a,b]
	var points:=nodes();var first:=road_projection(a);var last:=road_projection(b)
	var ea: Dictionary=data.edges[first.edge];var eb: Dictionary=data.edges[last.edge]
	if first.edge==last.edge:return [a,first.point,last.point,b]
	var distances: Array=[];var previous: Array=[];var done: Array=[]
	distances.resize(points.size());distances.fill(INF);previous.resize(points.size());previous.fill(-1);done.resize(points.size());done.fill(false)
	for node in [ea.a,ea.b]:distances[node]=a.distance_to(first.point)+first.point.distance_to(points[node])
	for _k in range(points.size()):
		var u:=-1
		for i in range(points.size()):
			if not done[i] and (u<0 or distances[i]<distances[u]):u=i
		if u<0 or not is_finite(distances[u]):break
		done[u]=true
		for v in adjacency()[u]:
			var next: float=distances[u]+points[u].distance_to(points[v])
			if next<distances[v]:distances[v]=next;previous[v]=u
	var end: int=eb.a if distances[eb.a]+points[eb.a].distance_to(last.point)<=distances[eb.b]+points[eb.b].distance_to(last.point) else eb.b
	var path: Array=[last.point,b];var at:=end
	while at>=0:path.push_front(points[at]);at=previous[at]
	path.push_front(first.point);path.push_front(a)
	var clean: Array=[]
	for p in path:
		if clean.is_empty() or clean[-1].distance_to(p)>.1:clean.append(p)
	return clean

static func path_length(path: Array) -> float:
	var distance:=0.0
	for i in range(1,path.size()):distance+=path[i-1].distance_to(path[i])
	return distance

static func point_on_main(distance: float) -> Dictionary:
	var points:=nodes()
	for i in range(1,data.main_route.size()):
		var a: Vector2=points[data.main_route[i-1]];var b: Vector2=points[data.main_route[i]];var length:=a.distance_to(b)
		if distance<=length:return {"point":a.lerp(b,clampf(distance/length,0,1)),"heading":atan2(b.x-a.x,b.y-a.y),"node":data.main_route[i]}
		distance-=length
	return {"point":points[data.main_route[-1]],"heading":PI/2,"node":data.main_route[-1]}

static func next_maneuver(path: Array,heading: float) -> Dictionary:
	var distance:=0.0
	if path.size()<2:return {"text":"Frená en el círculo","distance":0.0}
	var initial: Vector2=path[1]-path[0]
	if initial.length()<.1 and path.size()>2:initial=path[2]-path[1]
	var reference:=atan2(initial.x,initial.y)
	var relative:=wrapf(reference-heading,-PI,PI)
	if absf(relative)>PI*.65:return {"text":"Dá la vuelta con cuidado","distance":0.0}
	for i in range(1,path.size()):
		distance+=path[i-1].distance_to(path[i])
		if distance<12:continue
		if i<path.size()-1:
			var direction: Vector2=path[i+1]-path[i];var change:=wrapf(atan2(direction.x,direction.y)-reference,-PI,PI)
			if absf(change)>.55:return {"text":"Curva a la izquierda" if change>0 else "Curva a la derecha","distance":distance}
	return {"text":"Seguí hasta el objetivo","distance":distance}
