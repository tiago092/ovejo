# Fuentes de arte · Código Rosa

`driver.blend` y `ambulance.blend` son fuentes editables de Blender 4.5.3 LTS. Contienen mallas, materiales, pivotes y UV; la cabeza incluye la forma `Smile`. El usuario aprobó el parecido de la propuesta presentada: «Me parece correcto todo». La aprobación y los hashes de los recursos revisados constan en `artifacts/godot/art-review.json`.

El script `scripts/build_art.py` documenta cómo se construyó la base y horneó la textura existente a UV convencionales. No importa automáticamente las fotografías adicionales de la conversación. No ejecutar ese generador sobre una fuente retocada: reconstruye la base, no integra modificaciones manuales. La exportación habitual del juego usa los GLB guardados y nunca ejecuta ese generador.

Para retocar, abrir el `.blend`, guardar los cambios y exportar mediante:

```bash
.tools/blender-4.5.3-linux-x64/blender --background art-source/driver.blend --python scripts/export_art.py -- driver
.tools/blender-4.5.3-linux-x64/blender --background art-source/ambulance.blend --python scripts/export_art.py -- ambulance
```

El exportador de personaje crea también la variante Baja sin sobrescribir el `.blend` retocado. Después ejecutar `python3 scripts/build_godot.py`.

Mantener nombres `Head`, `Face`, `ArmLeft`, `ArmRight`, `DriverMount`, `Steering`, `FrontLeft`, `FrontRight`, `RearLeft`, `RearRight`. Las piezas se agrupan por material dentro de cada articulación. El modelo trabaja en Y arriba y +Z adelante al exportar a glTF; en Blender eso corresponde a Z arriba y −Y adelante.

El controlador visual monta el personaje a escala 0,78 y ajusta brazos/manos hacia los puntos de agarre del volante. La simulación no depende de la topología del modelo. La textura original `assets/driver.png` no se altera ni se usa como sustituto plano del personaje.

El parecido de las comparativas actuales está aprobado. Sigue pendiente incorporar los originales adicionales al archivo de referencias de autoría. Los futuros cambios del personaje requieren una nueva revisión; el informe comprueba los hashes para evitar trasladar automáticamente esta aprobación a otra versión. Ver la escena `godot/scenes/study.tscn` y las capturas de `artifacts/godot/`.

La lámina de volumen neutro se reproduce con `blender --background --threads 2 --python scripts/render_volume.py`. Importa el GLB de ejecución, elimina las texturas para esa renderización y oculta las gafas desmontables; no guarda cambios en `.blend` ni `.glb`. La lámina de identidad de Godot conserva gafas, materiales y geometría del juego.

## Kit tropical

`tropical-kit.blend` contiene plantillas locales de caja redondeada, esfera, cilindro, extremidad, techo y casco de embarcación. `godot/assets/tropical-kit.glb` conserva sus nombres estables (`SoftBox`, `Round`, `Pole`, `Limb`, `Roof`, `Hull`, `Ring`). Godot utiliza las mallas como plantillas de instancias con colores por pieza. Las fachadas y sus posiciones se componen en el módulo visual; la distribución lógica procede de los datos existentes.

Para reconstruir explícitamente este kit: `blender --background --threads 2 --python scripts/build_tropical_art.py`. Sobrescribe únicamente la fuente y exportación del kit. Después de retocar el `.blend` manualmente, exportar el GLB directamente manteniendo nombres, tamaños unitarios y ejes; no ejecutar el generador sobre esos retoques.

La revisión tropical de la ambulancia añade tapicería, costuras, estribos, defensa, reflectores y placa médica trasera. `scripts/refine_ambulance.py` aplica esa revisión a la fuente existente y vuelve a exportarla; no carga ni guarda el protagonista. Los modelos `.blend` y `.glb` del protagonista aprobado permanecen intactos.

## Escenario «Yo manejo»

El nuevo pueblo reutiliza las mallas editables de `tropical-kit.blend` y la ambulancia revisada. Las posiciones, trazado y dimensiones se editan en `scripts/build_story_layout.py`, que produce el único `world.json` compartido por presentación y simulación. No ejecutar el generador de personaje para modificar el mundo. El kit incorpora `Ring`, un aro de 24×6 segmentos para la fuente. La extensión artística está implementada; la revisión humana del mundo sigue pendiente.

## Peatones articulados y detalle de disco

`pedestrians.blend` contiene tres arquetipos editables, cada uno con una sola superficie y un esqueleto de once huesos. `scripts/build_pedestrians.py` exporta `pedestrian-0/1/2.glb`; no abre ni modifica el protagonista. Los colores de vértice `Region` seleccionan piel, ropa, pantalón, pelo y calzado en el material local de Godot. Los modelos se conservan en el origen como biblioteca: seleccionar el rig del arquetipo en el Outliner para editarlo.

El kit incorpora también `Bird`, una silueta costera original de cuatro triángulos. Los objetos nuevos, carteles, mostrador y escenas de este pase se concentran en disco y primera curva.
