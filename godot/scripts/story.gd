extends RefCounted
## Presentation-only dialogue queue. Mission/danger announcements preempt jokes.
const LINES={
	"departure":["Nico","Él dijo «yo manejo». Nadie le había preguntado."],
	"coast":["Lau","Qué lindo el amanecer. Mirá el camino también."],
	"first_siren":["Fede","La sirena funciona. El permiso lo vemos después."],
	"first_drift":["Nico","Era una curva, no una demostración."],
	"pickup":["Conductor","Ahora sí. Servicio casi oficial."],
	"patrol":["Lau","Creo que esos también quieren hablar con vos."],
	"plaza":["Fede","El puesto está ahí. Estacionar también cuenta."]}
var queue: Array=[]
var seen: Dictionary={}
var speaker:=""
var text:=""
var remaining:=0.0
var gap:=0.0
var priority:=false
func reset() -> void:
	queue.clear();seen.clear();speaker="";text="";remaining=0;gap=0;priority=false
func consume(event: Dictionary) -> void:
	if event.type=="moment" and LINES.has(event.id) and not seen.has(event.id):
		seen[event.id]=true
		if queue.size()<3:queue.append(LINES[event.id])
	elif event.type in ["notice","damage","pickup"] and event.has("text"):
		speaker="OBJETIVO" if event.type in ["notice","pickup"] else "CUIDADO"
		text=event.text;remaining=4;gap=10;priority=true
func update(dt: float,active: bool) -> void:
	if not active:return
	remaining=maxf(0,remaining-dt);gap=maxf(0,gap-dt)
	if remaining<=0 and gap<=0 and not queue.is_empty():
		var line: Array=queue.pop_front();speaker=line[0];text=line[1];remaining=4;gap=10;priority=false
