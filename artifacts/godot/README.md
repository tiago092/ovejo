# Código Rosa · Evidencias del pueblo compacto

La rama `feat/compact-village` contiene el **plano de 80 parcelas y el acabado de disco/primera curva**. El resto del pueblo tiene volúmenes provisionales. La revisión visual del usuario precede a la extensión del acabado y a la publicación, según el plan.

- [Comparativas, plano superior y recorrido visual](urban-review.html).
- [Implementación y reproducción](../../docs/PUEBLO-COMPACTO.md).
- [Aceptación del estado actual](urban/acceptance.json).
- [Comprobaciones del plano](urban/layout.json).
- [Protagonista aprobado: archivos conservados](art-review.json).

## Comprobaciones del tramo provisional

| Informe | Resultado | Alcance |
|---|---|---|
| `urban/layout.json` | 3.715 comprobaciones aprobadas. | 80 edificios, cuotas por zona, huellas orientadas, separación, carretera completa y espacios protegidos. |
| `simulation.json` | 595 comprobaciones aprobadas. | Reglas, reloj, colisiones, misión, población, estrellas y reinicios. |
| `presentation.json` | 22 contratos aprobados. | Animación sin mutación lógica, articulación, reinicio y transformaciones de fachadas/carteles/cámara. |
| `hud.json` | Dos comprobaciones aprobadas. | Primer inicio real y HUD compacto. |
| `host.json` | 15 contratos aprobados. | Persistencia y prioridad de audio. |
| `route-drive-population.json` | Victoria en 112,42 s activos y 67% de resistencia. | Recorrido con entradas y todos los actores, sin teleport ni reposición; no certifica balance humano. |
| `browser.json` | 47 comprobaciones aprobadas. | Chrome, flujo, cuatro resoluciones, calidad y multitáctil con emulación. |
| `story-tests.json` | 16 comprobaciones aprobadas. | Audio, reacciones, pausa y recogida cancelable. |
| `urban/cameras.json` | Ambas cámaras fuera de fachadas en escritorio y vertical. | Muestras cada ocho nodos a lo largo del grafo principal. |
| `urban/release-guard.json` | Cuatro casos aprobados. | La bandera antigua de mundo completo no permite publicar el tramo urbano provisional. |
| `clean-import.json` | Aprobada. | Importación y exportación desde fuentes sin caché. |
| `urban/captures.json` | Aprobada. | Capturas ligadas al PCK; galería sin sustituir aprobación artística humana. |

El `runtime_source_sha256` o SHA del paquete de cada informe debe coincidir con la exportación actual. `source-manifest.json` registra las fuentes exactas. `acceptance.json` refleja esta fase; no declara el mundo completo aceptado.

## Render y descarga del prototipo

| Perfil | Recuadro | Máximo de llamadas |
|---|---|---:|
| Baja | Cerrado | 120 |
| Baja | Abierto | 137 |
| Alta | Cerrado | 157 |
| Alta | Abierto | 172 |

Cuatro recorridos de 60 s tras calentamiento. El contador `RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME` incluye cámaras y sombras. Los recorridos de render reponen tiempo/resistencia únicamente en Verification; no son pruebas de balance.

Exportación: **15,41 MiB gzip**. Son mediciones del prototipo: el coste debe comprobarse otra vez al terminar el resto del pueblo. El render usa SwiftShader y no certifica FPS en GPU ni teléfonos reales.

## Revisión y publicación

La [galería nueva](urban-review.html) está preparada para resolver la revisión artística prevista antes de extender el acabado. `urban/review.json` no atribuye aprobación al usuario. La rama y el guardia de exportación impiden que este tramo sustituya la versión pública.

`pages-audit.json`, `pages-browser.json` y las capturas `pages-*.png` documentan la versión publicada anterior de vegetación, con su propia huella de fuentes. No son evidencia de publicación de este prototipo.

Las galerías `comparison.html`, `story-review.html` y `tropical-comparison.html` conservan las revisiones anteriores. Las imágenes aprobadas del protagonista siguen intactas. `urban-before/` guarda las comparativas previas a densificar el pueblo; `urban-spaced/` conserva la revisión anterior de 80 parcelas, antes de acercar más las casas.

Pendientes: revisión del tramo, extensión del acabado, validación final del mundo completo, GPU/móviles reales y publicación final por HTTPS.
