# Código Rosa · Evidencias de la migración

Versión jugable paralela en Godot 4.7.2. **La aceptación completa sigue pendiente**: el parecido del personaje ya fue aprobado por el usuario, pero faltan pruebas en Android/iPhone y GPU física. El juego Three.js y `assets/driver.png` se conservan intactos.

- [Comparación visual y personaje](comparison.html).
- [Informe de aceptación: aprobada, fallida o pendiente](acceptance.json).
- [Aprobación del parecido y recursos revisados](art-review.json): «Me parece correcto todo».
- [Proyecto e instrucciones](../../godot/README.md).
- [Paquete web estático](codigo-rosa-web.zip), generado mediante `python3 scripts/package_godot.py` después de exportar.

## Alcance de las evidencias

La base es el commit `aa4418e79118ab8187a2514cab1a78a8f22ac0ac`. Esta implementación aún no está confirmada en Git: `source-manifest.json` identifica por SHA-256 las fuentes exactas y `release-build.json` identifica el paquete exportado. `acceptance.json` registra herramientas y entorno. Los hashes de motor, plantillas y Blender están en `scripts/toolchain.json`.

| Evidencia | Qué verifica | Límite |
|---|---|---|
| `layout.json` | 12 obstáculos y grafo vial construidos por el Three.js real; 42 alturas de referencia. | La comparación no acepta el arte. |
| `simulation.json` | 1.056 comprobaciones; 18 trazas a 30/60/120 FPS, daños, misión, sirena, reloj, derrotas y reinicios. | Prueba de reglas, sin render. |
| `host.json` | 12 comprobaciones de migración de preferencias, almacenamiento denegado, audio tardío y liberación de entradas. | SoundCloud simulado; no certifica disponibilidad del servicio externo. |
| `browser.json` | Flujo y pantallas en Chrome, introducción, pausa, reintentos, dos etapas, multitáctil/cancelación y calidad. | Emulación y SwiftShader; no es un teléfono real. |
| `firefox.json` | Arranque HTTP y primer fotograma jugable sin errores. | Firefox portable en Linux; no es una suite completa de regresión. |
| `distribution.json`, `download.json` | Paquete sin API de pruebas, subdirectorio, gzip, caché fría, almacenamiento bloqueado y errores legibles. | La latencia y ancho de banda se emulan; la compilación WASM usa este equipo. |
| `clean-import.json` | Importación y exportación desde una copia sin `.godot/`. | Linux x86_64 con herramientas fijadas. |
| `benchmark.json` | Recorridos diagnósticos de 60 s tras 5 s de calentamiento; perfiles Alta/Baja, recuadro abierto/cerrado. | Render por software: sus FPS **no** certifican los objetivos de GPU física. |
| `package.json` | SHA-256 del ZIP y manifest de archivos de ejecución. | No se ha publicado ni sustituido el enlace principal. |

El contador de dibujo es `RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME`: incluye vistas y pasadas de sombras. El recuadro cerrado usa `UPDATE_DISABLED`. Las primitivas del diagnóstico se muestrean una vez por segundo; la memoria JS observable no incluye toda la memoria de WASM/GPU.

El recorrido diagnóstico fija la posición de la ambulancia por una ruta reproducible, mantiene activos los 30 peatones, cinco carritos y patrulla, y restablece tiempo/resistencia para terminar la medición. **No sirve para probar balance**; esa función corresponde a las trazas de simulación. La instrumentación solo se registra en Verification.

## Reproducción

```bash
python3 scripts/build_godot.py --all
python3 scripts/serve_godot.py --port 8767
# Iniciar Chrome con el comando documentado en godot/README.md.
GODOT_TEST_PART=flow node scripts/browser_godot.cjs
GODOT_TEST_PART=screens node scripts/browser_godot.cjs
node scripts/distribution_godot.cjs
node scripts/benchmark_godot.cjs
python3 scripts/clean_import.py
python3 scripts/package_godot.py
python3 scripts/report_godot.py
```

Ejecutar las pruebas CDP **en secuencia**, ya que usan la misma pestaña. El corredor combina los informes de flujo y pantallas solo cuando corresponden al mismo SHA-256 de paquete. No regenerar la exportación mientras se carga en el navegador. Para el diagnóstico de rendimiento, cerrar otras pestañas del juego y evitar importación/modelado simultáneos.

Firefox se puede iniciar con `firefox --headless --remote-debugging-port 9229 --profile /tmp/rosa-firefox-test`; luego ejecutar `node scripts/firefox_godot.cjs`. Usar un perfil de prueba dedicado, no el perfil personal. Su informe registra la versión realmente ejecutada.

## Pendientes para la aceptación completa

1. Incorporar los originales de las fotos adicionales al archivo de autoría. El parecido de la versión presentada ya está aprobado; no se requieren retoques por esta revisión. Si cambia el personaje, regenerar las comparativas y solicitar revisión de esa nueva versión.
2. Probar Chrome Android y Safari iPhone reales: audio tras gesto, giro de pantalla, multitáctil/cancelación, cambio de pestaña, safe areas, preferencias y memoria. Registrar modelo, sistema, navegador y calidad.
3. En escritorio con GPU y cada teléfono, medir tres recorridos de 60 s por perfil y recuadro abierto/cerrado después del calentamiento. Registrar promedio, p95, llamadas, primitivas y memoria observable. Objetivos ≥58/29 FPS y p95 ≤33,3/50 ms; 300/150 llamadas. No reducir la población para cumplirlos.
4. Comprobar el reproductor externo real disponible, bloqueado y lento; verificar una sola fuente musical y prioridad de pausa/silencio. La pista local ya permite jugar sin el servicio.
5. Publicar una prueba HTTPS separada, repetir caché fría a 20 Mbit/s y 100 ms, comprobar cabeceras/MIME y aprobar antes de sustituir el enlace principal.

F0/F1 cuentan con evidencia técnica y el parecido presentado cuenta con aprobación del usuario. El cierre de las tareas restantes depende de los criterios anteriores y de los resultados detallados del informe; no se presupone acceso a dispositivos físicos.

La exportación limpia también inicia el proceso de empaquetado correctamente. Su PCK no es idéntico byte a byte al obtenido con la caché de trabajo; ambos hashes quedan registrados. Esta comprobación certifica reconstrucción desde fuentes, no reproducibilidad binaria estricta.

## Resultado de esta ejecución

Se aprobaron 1.056 comprobaciones de simulación, 36 de Chrome y 12 del puente web; Firefox arrancó sin errores. La distribución pasó sus ocho comprobaciones. Tamaño transferible: **14.89 MiB gzip**; carga fría local emulada: **9.22 s** a 20 Mbit/s y 100 ms.

| Perfil | Recuadro | Máximo de llamadas | FPS de software | p95 de software |
|---|---|---:|---:|---:|
| Baja | Cerrado | 108 | 3.06 | 379.5 ms |
| Baja | Abierto | 123 | 2.80 | 414.2 ms |
| Alta | Cerrado | 149 | 2.30 | 605.3 ms |
| Alta | Abierto | 159 | 2.11 | 581.1 ms |

Los FPS de esta tabla pertenecen a **SwiftShader**, sin GPU física disponible; son diagnósticos y quedan por debajo de los objetivos de juego. No se consideran una certificación de rendimiento de escritorio o móvil. La campaña de tres repeticiones por configuración en dispositivos reales sigue pendiente.

La primera medición de Baja alcanzaba 181 llamadas. Agrupar las piezas por geometría/sector y color por instancia redujo ese pico a 123 manteniendo los actores y las reglas. `benchmark-before-batching.json` conserva la medición anterior.

## Alojamiento de prueba preparado

Se preparó un [workflow manual para GitHub Pages](../../docs/GITHUB-PAGES.md). `pages-package.json` registra el sitio local: Three.js en la raíz y Godot en `godot-preview/`. La publicación HTTPS continúa pendiente; este paquete no constituye un despliegue remoto.
