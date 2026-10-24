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
