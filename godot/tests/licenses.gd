extends SceneTree
func _init() -> void:
	var file=FileAccess.open("res://licenses/Godot.txt",FileAccess.WRITE);file.store_string(Engine.get_license_text()+"\n\n")
	for name in Engine.get_license_info():file.store_string(name+"\n"+Engine.get_license_info()[name]+"\n\n")
	var notices=FileAccess.open("res://licenses/Godot-third-party.json",FileAccess.WRITE);notices.store_string(JSON.stringify(Engine.get_copyright_info(),"  "))
	quit()
