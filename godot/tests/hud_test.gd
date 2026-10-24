extends SceneTree
func _init() -> void:call_deferred("run_checks")
func run_checks() -> void:
	root.size=Vector2i(1280,720)
	var scene=load("res://scenes/main.tscn").instantiate();root.add_child(scene)
	for _i in range(5):await process_frame
	scene.start_game(true);scene.sim.skip_intro()
	for _i in range(12):await process_frame
	var checks: Array=[{"name":"first real start keeps HUD below 180px","passed":scene.hud.size.y<180},{"name":"HUD keeps a usable width","passed":scene.hud.size.x>=360}]
	var passed: bool=checks.all(func(c):return c.passed)
	var output=FileAccess.open("res://../artifacts/godot/hud.json",FileAccess.WRITE);output.store_string(JSON.stringify({"passed":passed,"hud_size":[scene.hud.size.x,scene.hud.size.y],"checks":checks},"  "))
	print("Live HUD: ",scene.hud.size,"; ","PASSED" if passed else "FAILED");scene.muted=true;scene.sync_audio();await create_timer(.15).timeout;scene.free();await create_timer(.05).timeout;quit(0 if passed else 1)
