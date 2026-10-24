# Estado actual: «Yo manejo» v2

Ver [reglas y entrega por etapas](../docs/YO-MANEJO.md). El recorrido y balance anteriores son referencias históricas; la versión activa usa 150 segundos, grafo artesanal, derrape y récord separado. Las capturas de pruebas usan el prefijo `story-` por defecto.

# Código Rosa · Godot

Proyecto editable en **Godot 4.7.2**, GDScript y Compatibility. La versión Three.js de la raíz se conserva intacta. El paquete web se genera en `dist/godot/`; requiere HTTP/HTTPS, no apertura directa del HTML.

## Ejecutar y exportar

Desde la raíz del repositorio:

```bash
# Solo si faltan las herramientas locales; descarga y verifica los hashes fijados.
python3 scripts/setup_tools.py
scripts/godot.sh --editor

# Importa, ejecuta 1.056 comprobaciones de simulación y nueve de presentación, y exporta.
python3 scripts/build_godot.py
python3 scripts/serve_godot.py --port 8767
```

Abrir `http://127.0.0.1:8767/dist/godot/`. El servidor sirve las versiones gzip cuando el navegador las admite y conserva el MIME original, incluido `application/wasm`. Para alojar el juego, copiar **toda** la carpeta `dist/godot/`, con sus licencias. No requiere cabeceras COOP/COEP ni backend. Las versiones `.gz` necesitan `Content-Encoding: gzip`; si el alojamiento no permite configurarlo, los archivos normales también funcionan, con una descarga mayor.

Para plataformas distintas de Linux x86_64, instalar el editor estándar y las plantillas de la misma versión, y abrir `project.godot`. Los presets Web y Verification son portables; el instalador de herramientas incluido es específico de Linux x86_64. `GODOT_BIN` permite elegir otro ejecutable local.

## Controles y preferencias

WASD/flechas para conducir, Espacio para sirena, C para cámara, P/Escape para pausa. En celular se puede acelerar y girar simultáneamente. La primera partida reproduce siete segundos de historia; botón Omitir, Enter y Espacio la terminan sin gastar tiempo. Reintentar entra directamente a conducir.

Automática selecciona Baja con puntero táctil. Alta limita resolución 3D a 1,5× CSS y sombras a 1024; Baja usa 1× y 512, menos polvo y un conductor de menor detalle. Los cambios afectan presentación, no población ni balance. El recuadro comienza cerrado, las reacciones automáticas en Alta duran tres segundos y se puede fijar o cerrar manualmente. El recuadro cerrado no renderiza. Movimiento reducido omite introducción, oscilaciones y animación ambiental decorativa.

El panel inferior reúne instrucciones, créditos y el reproductor opcional de SoundCloud. Se carga al solicitarlo; el juego utiliza la música propia local sin servicios externos. Pausar o silenciar tiene prioridad sobre eventos tardíos del reproductor.

Preferencias y récord usan `codigo-rosa-godot-v1` en `localStorage`. El primer inicio importa calidad y récord de la versión anterior cuando están disponibles en el mismo origen. Las claves antiguas se conservan. Sin almacenamiento se puede jugar; los cambios solo duran la sesión. El editor utiliza `user://settings.cfg`.

## Arquitectura

- `simulation.gd`: reglas puras, entradas, aleatoriedad reproducible y eventos; ninguna física de Godot decide colisiones o daño.
- `world_data.gd` y `data/`: trazado, obstáculos, alturas y balance compartidos por simulación y presentación.
- `visual_kit.gd`: plantillas de malla del kit editable Blender/GLB.
- `driving_audio.gd`: motor, superficies y ambientes locales, sin modificar simulación.
- `world_visual.gd`, `vehicle_visual.gd`, `actors_visual.gd`: geometría, instancias, modelos, expresiones y manos ligadas al volante.
- `main.gd`: estados de presentación, cámaras, controles y HUD. `web_bridge.gd` y `web/`: integración de navegador, audio externo y persistencia.

Las piezas opacas repetidas comparten geometría y usan colores por instancia. El escenario se agrupa por sectores para conservar el descarte de elementos fuera de cámara; los peatones y vehículos mantienen la misma población y animación.

Las coordenadas conservan +Y arriba y +Z hacia adelante. El movimiento mantiene pasos de hasta 25 ms, con recuperación máxima de 250 ms y descuento del tiempo real activo excedente. Pausar elimina el tiempo transcurrido fuera de juego. Tiempo/resistencia agotados se comprueban antes de recogida/entrega.

El giro de la patrulla en un rumbo exactamente opuesto resuelve el empate usando el signo del ángulo sin normalizar. Evita que pequeñas diferencias entre JavaScript y las funciones matemáticas nativas elijan sentidos opuestos. Las trazas verifican patrulla, actores y vehículo con tolerancia absoluta de 0,001, más estricta que el 5% inicialmente previsto.

## Arte editable

Las fuentes están en `art-source/`, fuera de los recursos importados. El proyecto usa GLB locales, gafas independientes, UV convencionales y una expresión facial. `driver.png` permanece intacto. La textura de piel se horneó desde el atlas generado existente; ese atlas **no sustituye las referencias reales para aceptar el parecido**.

El parecido del modelo editable en Blender fue aprobado por el usuario en las comparativas presentadas; la evidencia y la versión exacta están en `artifacts/godot/art-review.json`. Las fotografías adicionales de la conversación todavía no forman parte de los archivos de autoría. Ver `art-source/README.md` para preservar retoques manuales al exportar. La exportación web normal nunca reconstruye las fuentes artísticas.

## Pruebas y evidencias

```bash
node scripts/reference.cjs
scripts/godot.sh --headless --script tests/simulation_test.gd
python3 scripts/build_godot.py --verification
```

La referencia ejecuta funciones extraídas del JavaScript original en memoria; no reescribe el juego publicado. Incluye 18 secuencias de diez segundos a 30/60/120 FPS. La suite añade misión, prioridades terminales, tiempo activo, reinicios, sirena y rutas.

Para verificar el navegador, iniciar Chrome en un perfil temporal:

```bash
google-chrome --headless --no-sandbox --disable-dev-shm-usage --enable-unsafe-swiftshader --use-angle=swiftshader --remote-debugging-port=9228 --user-data-dir=/tmp/rosa-godot-browser about:blank
# En otra terminal, con el servidor local activo:
GODOT_TEST_PART=flow node scripts/browser_godot.cjs
GODOT_TEST_PART=screens node scripts/browser_godot.cjs
```

`CHROME_DEBUG_URL` selecciona otra sesión de depuración y `GODOT_TEST_URL` otra URL. El preset Verification habilita instrumentación; Web no la registra. Las pruebas comprueban comportamiento, controles y capturas, no equivalencia de FPS con teléfonos físicos. Usar un perfil temporal: las pruebas escriben preferencias y récord de prueba en ese origen.

Los informes se guardan en `artifacts/godot/`. Allí se distinguen resultados aprobados, fallidos y pendientes. El parecido de la versión revisada está aprobado. Safari/iPhone y Android reales, rendimiento físico y alojamiento HTTPS externo siguen pendientes como criterios de aceptación separados.

Para exportar ambos presets con una sola pasada de importación/pruebas: `python3 scripts/build_godot.py --all`. El ZIP de ejecución se genera con `python3 scripts/package_godot.py`; el informe consolidado, con `python3 scripts/report_godot.py`. Ver [comparativas](../artifacts/godot/comparison.html) y [protocolo de aceptación](../artifacts/godot/README.md).

## Renovación tropical

[Comparación de escenarios](../artifacts/godot/tropical-comparison.html), con cámara anterior y semilla fija para separar cambios de arte y cámara. Las capturas nuevas utilizan el prefijo `tropical-` para conservar las comparativas del rostro aprobado.

```bash
GODOT_CAPTURE_PREFIX=tropical- GODOT_TEST_PART=flow node scripts/browser_godot.cjs
GODOT_CAPTURE_PREFIX=tropical- GODOT_TEST_PART=screens node scripts/browser_godot.cjs
node tests/godot/tropical.cjs
node scripts/capture_tropical.cjs
```

Ejecutar en secuencia sobre la misma sesión CDP. Las pruebas específicas comprueban reacciones, fijado/cierre, sonido según superficie, pausa/silencio y movimiento reducido.
