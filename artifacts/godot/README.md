# Código Rosa · Pueblo completo y paseo costero

La dirección compacta se extendió a las cinco zonas tras la indicación «Perfecto, continua». Hay **80 edificios terminados**, con sus parcelas y colisiones, y un paseo costero inspirado en la fotografía aportada. El protagonista aprobado conserva todos sus archivos originales.

- [Antes/después, vistas de las cinco zonas y plano superior](urban-review.html).
- [Implementación y reproducción](../../docs/PUEBLO-COMPACTO.md).
- [Aceptación actual](urban/acceptance.json).
- [Comprobaciones geométricas](urban/layout.json).
- [Auditoría del paquete real en Pages](pages-audit.json).

## Evidencias

| Informe | Comprobación |
|---|---|
| `urban/layout.json` | 3.797 comprobaciones del plano, cuotas, orientaciones, márgenes y elementos costeros. |
| `simulation.json` | 622 comprobaciones de reglas, superficies, colisiones, misión y reinicios. |
| `presentation.json` | 26 contratos: articulación, reinicios, transformaciones y geometría dentro de las huellas. |
| `hud.json`, `host.json` | Primer inicio real, HUD compacto, persistencia y prioridad de audio. |
| `route-drive-population.json` | Victoria con entradas y toda la población: 112,42 s activos y 67% de resistencia; sin teleport ni reposición. No certifica balance humano. |
| `browser.json` | 47 comprobaciones en Chrome: flujo y cuatro resoluciones, calidad y multitáctil. |
| `urban/cameras.json` | 77 comprobaciones de ambas cámaras en escritorio y vertical. |
| `story-tests.json` | 16 contratos de audio, reacciones, pausa y recogida cancelable. |
| `distribution.json`, `download.json` | Release sin API de pruebas, recursos comprimidos y errores legibles ante fallos de carga. |
| `firefox.json` | Arranque de la exportación actual sin errores. |
| `clean-import.json` | Importación y exportación desde fuentes sin caché. |
| `urban/release-guard.json` | La bandera antigua no permite publicar una revisión urbana provisional. |
| `urban/captures.json` | Capturas actuales ligadas al SHA del PCK. |

Los informes deben coincidir con la huella de fuentes o el SHA del paquete actual. `source-manifest.json` registra las fuentes exactas. Las capturas y mediciones históricas no se transfieren a esta exportación.

## Render y descarga

| Perfil | Recuadro | Máximo de llamadas observado |
|---|---|---:|
| Baja | Cerrado | 135 |
| Baja | Abierto | 150 |
| Alta | Cerrado | 184 |
| Alta | Abierto | 198 |

Cuatro recorridos de 60 s tras calentamiento, con todos los actores activos. El contador `RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME` incluye cámaras y sombras. El recuadro cerrado usa `UPDATE_DISABLED`. La instrumentación de render repone tiempo y resistencia; ese recorrido no es una prueba de balance.

Exportación local: **15.41 MiB gzip**. Se conservan los límites de 300/150 llamadas y 25 MiB comprimidos. Las cifras de FPS y p95 de `benchmark.json` corresponden a SwiftShader y no certifican fluidez en GPU o teléfono real.

## Publicación y pendientes

El preparador acepta únicamente el mundo completo de 80 edificios y coloca Godot en la raíz de Pages. La auditoría comprueba por HTTPS el HTML, el tipo WebAssembly, el PCK servido, su manifest, la huella de fuentes y el estilo costero actual. La publicación se marca aprobada solamente al coincidir con las fuentes actuales.

`pages-browser.json` y `pages-*.png` documentan el arranque real desde el enlace público; su huella identifica la versión a la que pertenecen. Una importación limpia puede producir PCK distintos de la caché local, por lo que también se verifica la huella de fuentes.

Pendientes externos: GPU física, Chrome Android y Safari iPhone reales, y cinco jugadores nuevos para el protocolo de balance. No se simulan participantes ni se declara compatibilidad física a partir de emulación.

`urban-before/`, `urban-spaced/` y `urban-reference/` conservan las etapas visuales anteriores. La aprobación del rostro permanece en `art-review.json`; la dirección y continuación del escenario se registran en `urban/review.json`.

La primera importación limpia de esta revisión terminó con SIGABRT del editor, sin errores de importación registrados. La repetición aislada completó importación y exportación. Se conservan `clean-import-first-attempt.json` y su log; `clean-import.json` corresponde a la ejecución aprobada.
