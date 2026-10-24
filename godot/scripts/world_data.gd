extends RefCounted
## One authoritative layout for rendering, camera blockers and arcade simulation.

static var data: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/world.json"))

static func height_at(x: float, z: float) -> float:
	var coast := clampf((x + 94.0) / 32.0, 0.0, 1.0)
	return coast * (hill(x,z,-25,-35,65,65,2.5) + hill(x,z,55,77,76,83,10) + hill(x,z,-70,-150,38,40,5))

static func hill(x: float,z: float,cx: float,cz: float,rx: float,rz: float,h: float) -> float:
	return h * exp(-((x-cx)*(x-cx)/(rx*rx) + (z-cz)*(z-cz)/(rz*rz)))

static func blocked(x: float, z: float, radius: float = 1.6) -> bool:
	var b: Array = data.bounds
	if x < b[0] or x > b[1] or z < b[2] or z > b[3]: return true
	for wall in data.buildings + data.obstacles:
		if abs(x-wall.x) < wall.w/2.0+radius and abs(z-wall.z) < wall.d/2.0+radius: return true
	return false

static func nodes() -> Array:
	var result: Array = []
	for z in data.road_z:
		for x in data.road_x: result.append(Vector2(x,z))
	return result

static func clear_segment(a: Vector2, b: Vector2) -> bool:
	var count := maxi(1, ceili(a.distance_to(b)/0.8))
	for i in range(count+1):
		var p := a.lerp(b, float(i)/count)
		if blocked(p.x,p.y): return false
	return true

static func route(a: Vector2, b: Vector2) -> Array:
	if clear_segment(a,b): return [a,b]
	var points := nodes()
	var grid_count := points.size()
	points.append_array([a,b])
	var n := points.size()
	var distances := []; var previous := []; var done := []
	distances.resize(n); distances.fill(INF)
	previous.resize(n); previous.fill(-1)
	done.resize(n); done.fill(false)
	distances[n-2] = 0.0
	for _k in range(n):
		var u := -1
		for i in range(n):
			if not done[i] and (u == -1 or distances[i] < distances[u]): u = i
		if u < 0 or not is_finite(distances[u]) or u == n-1: break
		done[u] = true
		for v in range(n):
			if v == u or done[v]: continue
			if u < grid_count and v < grid_count:
				if not ((u/3 == v/3 and absi(u-v)==1) or (u%3==v%3 and absi(u-v)==3)): continue
			if not clear_segment(points[u],points[v]): continue
			var next: float = distances[u] + points[u].distance_to(points[v])
			if next < distances[v]: distances[v] = next; previous[v] = u
	if not is_finite(distances[n-1]): return [a]
	var path := []; var at := n-1
	while at >= 0:
		path.push_front(points[at])
		if at == n-2: break
		at = previous[at]
	return path
