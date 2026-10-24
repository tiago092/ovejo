extends RefCounted
# Editable templates live in art-source/tropical-kit.blend. All geometry is local.
static var meshes: Dictionary={}
static func mesh(name: String) -> Mesh:
	if meshes.is_empty():
		var source=load("res://assets/tropical-kit.glb").instantiate()
		for node in source.find_children("*","MeshInstance3D",true,false):
			var copy: Mesh=node.mesh.duplicate()
			var paint:=StandardMaterial3D.new();paint.vertex_color_use_as_albedo=true;paint.vertex_color_is_srgb=true;paint.roughness=.88
			if str(node.name)=="TropicalLeaf":paint.cull_mode=BaseMaterial3D.CULL_DISABLED
			for surface in range(copy.get_surface_count()):copy.surface_set_material(surface,paint)
			meshes[str(node.name)]=copy
		source.free()
	return meshes[name]
