# Código Rosa · Evidencias de «Yo manejo» v2

La nueva partida es jugable localmente: **150 segundos, ruta de 954,4 m, desvío +60 m, derrape automático y patrulla posterior a la recogida**. El parecido aprobado sigue intacto. El acabado se extendió al mundo completo después de revisar el primer tramo con capturas y recorrido. La revisión artística del usuario y la validación física siguen pendientes.

- [Galería del tramo de referencia](story-review.html).
- [Reglas, arquitectura y reproducción](../../docs/YO-MANEJO.md).
- [Aceptación: aprobada, fallida o pendiente](acceptance.json).
- [Identidad aprobada y hashes conservados](art-review.json).
- [Auditoría del sitio público](pages-audit.json): compara el PCK real por HTTPS.

## Estado artístico y publicación

`world.json` marca `art_extent: complete`: disco, costa, comercio, plaza y puesto tienen el acabado implementado. `story-reference/` conserva capturas y revisión técnica anteriores a extenderlo, sin atribuir aprobación al usuario. La galería distingue el prototipo del mundo completo.

El workflow impide publicar por accidente una exportación `reference-slice` provisional. La exportación local está en `http://127.0.0.1:8767/dist/godot/`. El estado público se comprueba por HTTPS en `pages-audit.json`, verificando la huella de fuentes y el hash real del PCK servido. La caché de importación y una exportación limpia pueden producir PCK distintos; esto no cambia las fuentes ni las reglas.

## Evidencias actuales

| Informe | Verificación | Límite |
|---|---|---|
| `simulation.json` | 440 comprobaciones: grafo, despeje de caminos, barrido/esquinas, derrape a 30/60/120 FPS, reloj, misión, daños, estrellas, diálogos y reinicios. | Reglas v2; las referencias Three.js quedan archivadas. |
| `route-drive.json` | Ruta principal completada con entradas en 108,23 s y 96% de resistencia, sin teleport ni reposición. | Se retiran peatones/carritos para aislar geometría; no certifica balance humano. |
| `route-drive-population.json` | Recorrido con todos los actores, 112,05 s, 72% de resistencia, cero atropellos y sin reposición. | Control automático, no prueba con cinco personas. |
| `presentation.json` | Nueve contratos de reinicio, movimiento reducido y presentación sin mutación lógica. | Sin render. |
| `host.json` | 15 contratos de persistencia v2, récord histórico separado y prioridad de audio externo. | Reproductor simulado. |
| `browser.json` | 42 comprobaciones del flujo, introducción/cierre, pausa, reinicios, cuatro resoluciones, calidad y multitáctil. | Chrome con SwiftShader y emulación móvil. |
| `story-tests.json` | 16 contratos de reacciones, motor, superficie compartida, pausa/silencio y subida cancelable del paciente. | Consultar `passed` y hash del paquete; no prueba percepción sonora física. |
| `story/captures.json` | Disco, costa, plaza y puesto, 1280×720, Alta y semilla 27. | Mundo completo; la revisión humana es independiente. |
| `clean-import.json` | Importación/exportación sin caché previa. | Reconstrucción desde fuentes, sin exigir identidad binaria. |
| `distribution.json`, `download.json` | Carga comprimida, recursos locales, errores y ausencia de API de pruebas en release. | Solo válidos si el hash coincide con `release-build.json`. |
| `benchmark.json` | Recorridos de 60 s por configuración, tras calentamiento. | Solo válidos si coincide el hash; SwiftShader no certifica GPU ni teléfono. |

El contador `RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME` incluye cámaras y sombras. El recuadro cerrado usa `UPDATE_DISABLED`. Los recorridos de render reponen tiempo/resistencia únicamente en Verification para medir toda la ruta; no son pruebas de balance.

Las capturas `story-*.png` corresponden a la nueva partida. Las imágenes `tropical-*` documentan la renovación anterior y no son evidencia de aceptación del mapa nuevo. Las capturas aprobadas del protagonista se conservan sin sobrescribir.

## Reproducción

```bash
python3 scripts/build_godot.py --all
python3 scripts/serve_godot.py --port 8767
# Con Chrome CDP iniciado según godot/README.md, ejecutar en secuencia:
node scripts/browser_godot.cjs
node tests/godot/story.cjs
node scripts/capture_story.cjs
node scripts/distribution_godot.cjs
node scripts/benchmark_godot.cjs
python3 scripts/clean_import.py
python3 scripts/report_godot.py
```

No exportar mientras el navegador carga el paquete ni ejecutar varios corredores CDP a la vez. El benchmark debe ejecutarse sin otras pestañas del juego ni importación/modelado concurrente.

## Pendientes de aceptación

Revisión artística del usuario; cinco jugadores nuevos (≥4 victorias en primera partida, mediana 90–130 s); Chrome Android y Safari iPhone reales; GPU física (tres recorridos por configuración); reproductor externo real; y publicación/verificación del paquete final por HTTPS. Los objetivos son ≥58/29 FPS y p95 ≤33,3/50 ms, 300/150 llamadas y descarga comprimida ≤25 MiB.

`source-manifest.json` registra las fuentes locales exactas. Los informes están ligados al SHA-256 del paquete probado cuando usan navegador. No se trasladan automáticamente resultados de la exportación anterior a esta nueva versión.

## Resultado de la exportación final

Tamaño transferible local: **15.14 MiB gzip**; carga fría local emulada a 20 Mbit/s y 100 ms: **9.38 s**. No extrapolar estas cifras a dispositivos físicos.

| Perfil | Recuadro | Máximo de llamadas |
|---|---|---:|
| Baja | Cerrado | 118 |
| Baja | Abierto | 133 |
| Alta | Cerrado | 154 |
| Alta | Abierto | 170 |

Medición por SwiftShader, cuatro recorridos de 60 s con todos los actores activos. Los FPS y p95 de software están en el JSON diagnóstico; no certifican los objetivos físicos.
