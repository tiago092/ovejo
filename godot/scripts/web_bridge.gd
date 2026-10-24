extends RefCounted
var host
var callback
var listener: Callable
var native_settings: Dictionary={}
func setup(receive: Callable) -> void:
	listener=receive
	if OS.has_feature("web"):
		host=JavaScriptBridge.get_interface("RosaHost")
		if host:
			callback=JavaScriptBridge.create_callback(_receive)
			host.connectGame(callback,OS.has_feature("verification"))
func _receive(args: Array) -> void:
	if args.size():listener.call(JSON.parse_string(str(args[0])))
func preferences() -> Dictionary:
	if host:
		var data=JSON.parse_string(str(host.preferences()))
		if data is Dictionary:return data
	var f=ConfigFile.new()
	if f.load("user://settings.cfg")==OK:
		return {"quality":f.get_value("game","quality","auto"),"best":f.get_value("game","best",0),"reduced":f.get_value("game","reduced",false),"reduced_explicit":f.get_value("game","reduced_explicit",false),"touch":false,"dpr":1.0}
	return {"quality":"auto","best":0,"reduced":false,"touch":false,"dpr":1.0}
func save(data: Dictionary) -> void:
	if host:host.save(JSON.stringify(data));return
	var f=ConfigFile.new()
	for key in data:f.set_value("game",key,data[key])
	f.save("user://settings.cfg")
func announce(text: String) -> void:
	if host:host.announce(text)
func music(active: bool) -> void:
	if host:host.music(active)
func snapshot(data: Dictionary) -> void:
	if host and OS.has_feature("verification"):host.report(JSON.stringify(data))
