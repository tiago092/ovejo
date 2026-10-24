# Evolución posterior: «Yo manejo»

La propuesta histórica de migración que sigue no define el balance actual. El usuario autorizó rediseñar mapa, duración y manejo. La especificación vigente y los pendientes de revisión/publicación se documentan en [YO-MANEJO.md](YO-MANEJO.md). El parecido aprobado permanece intacto.

# Código Rosa: migración a Godot con validación temprana

Plan aprobado e implementación Godot activa. Base de comparación: Three.js del commit `aa4418e79118ab8187a2514cab1a78a8f22ac0ac`. La versión original se conserva. La aceptación completa requiere tanto las comprobaciones técnicas como la revisión del parecido y pruebas en dispositivos físicos.

## 1. Objetivo y decisiones

Rehacer el juego conservando la anécdota, el manejo arcade, las dos etapas, los 90 segundos, puntuación y balance. Prioridad visual: protagonista con gafas de `assets/driver.png`, ambulancia amarilla, amanecer tropical y Morro.

- Godot **4.7.2 estable**, GDScript, Compatibility y exportación web sin hilos. Motor, plantillas y hashes fijados en `scripts/toolchain.json`.
- Navegador de escritorio y celular, alojamiento estático y sin backend. Godot necesita HTTP/HTTPS; la apertura directa del HTML se mantiene en Three.js.
- Blender 4.5.3 LTS y revisión visual para producir el personaje. Fuentes editables fuera de Godot; GLB y texturas locales para ejecución.
- Proyecto paralelo en `godot/`; distribuciones en `dist/godot/`; evidencias en `artifacts/godot/`.
- Fuera de esta entrega: versiones nativas distribuidas, nuevas misiones, multijugador, físicas realistas y cambios de balance.

La versión y las restricciones se contrastaron con el [archivo oficial](https://godotengine.org/download/archive/) y la [documentación de exportación web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).

## 2. Simulación y arquitectura

La simulación GDScript está desacoplada del árbol visual: recibe entradas y tiempo; devuelve estado y eventos. Las escenas animan vehículos, personajes, cámaras, interfaz y audio. No se introduce `CharacterBody3D` ni `VehicleBody3D` como autoridad del movimiento.

Se conservan ecuaciones, colisiones rectangulares X/Z, resolución por eje, rebotes, alturas y grafo vial. Los cuerpos estáticos de Godot solo intervienen en consultas de cámara. El mundo visual y la simulación leen los mismos datos de distribución y obstáculos.

Contrato temporal:

- Reloj monotónico activo; máximo de 250 ms de simulación por actualización en pasos de hasta 25 ms.
- El exceso de tiempo activo descuenta misión sin acumular recuperación ilimitada de movimiento.
- Pausa y pestaña oculta congelan el juego y reinician la referencia temporal al continuar.
- Derrota comprobada antes del movimiento y después de los daños; recogida y entrega se resuelven después.
- Estados MENU, CINEMATIC, PLAYING, PAUSED, WON y LOST; etapa de misión independiente. Una sola transición terminal.

| Sistema | Contrato preservado |
|---|---|
| Misión | 90 s, resistencia 100%, posiciones originales; distancia <4,6, velocidad <2 y permanencia continua de 1,3 s. |
| Manejo | Avance/reversa 24/−7, aceleración 16, frenado 34, giro 1,85; amortiguaciones y rebote −0,4 originales. |
| Daños | Edificios 12%, carritos 15%, peatones 5% y −8 s, patrulla 12% y −3 s; umbrales e inmunidades originales. |
| Población | 30 peatones, cinco carritos, una patrulla; mismos criterios de recorrido y persecución. |
| Sirena | Activa 2,2 s; recarga de 7 s desde activación; efectos originales sobre agentes próximos. |
| Resultados | Derrota antes de entrega, redondeo JavaScript, puntuación y estrellas originales. |
| Reinicio | Restaura todos los actores, entradas, temporizadores, ruta, cámara y audio. |

Interfaces privadas: reinicio con semilla, avance con entradas/tiempo, instantánea de estado y eventos; presentación lectora del estado; puente web para foco, visibilidad, preferencias, almacenamiento y audio externo. La instrumentación de control del estado solo se registra en el preset Verification.

Las comparaciones ejecutan funciones extraídas del JavaScript original en memoria. Un empate de giro exactamente a 180° en la patrulla se resuelve por el signo del ángulo sin normalizar para evitar diferencias entre implementaciones matemáticas. No cambia velocidades ni decisiones de persecución.

## 3. Arte, presentación y navegador

El personaje se revisa en tres pasadas: volumen; identidad; integración/animación. Comparar frente, tres cuartos y perfil contra fotos originales, bajo iluminación neutra y del juego. Mantener gafas independientes, cabeza continua, UV convencionales, sonrisa y reacción a golpes. El atlas generado existente sirve para preparar textura, no para aceptar identidad.

Las fuentes Blender y exportaciones iniciales están implementadas. El usuario aprobó el parecido de las comparativas presentadas: «Me parece correcto todo». La evidencia se guarda en `artifacts/godot/art-review.json`, vinculada a los hashes de esa versión. La incorporación de las fotografías originales adicionales sigue pendiente como tarea documental; esta aprobación no certifica pruebas técnicas ni autoriza publicación. El generador de base no se ejecuta durante una compilación normal ni sustituye retoques manuales.

La ambulancia conserva frente amarillo, capó inclinado, faros, defensa negra, ruedas grandes, parabrisas transparente, techo, baliza y cartel blanco espejado. Las referencias estables de cabeza, volante, ruedas y agarres permiten animar sin acoplar la simulación a la topología.

Morro mantiene trazado y zonas transitables. La presentación incluye disco, costa, puesto, fachadas, arena, empedrado, palmeras curvas, mar, espuma y polvo. Luz cálida y relleno frío con materiales económicos; sin horneado de iluminación en esta entrega.

- Introducción de siete segundos: disco/ambulancia, «Yo manejo», conductor sentado y seguimiento. Omitir mediante botón, Enter o Espacio; consumir esa entrada sin activar sirena.
- Reintento directo; historia repetible desde menú. Cámara trasera suavizada, mirada adelantada y obstáculos; C conserva frontal.
- Recuadro del conductor comparte mundo y se desactiva al cerrarlo. Primeros planos completos en introducción/resultados.
- HUD amarillo, rosa y turquesa; tiempo, destino, resistencia, carga y sirena. Controles táctiles separados, multitáctil y cancelación.
- Movimiento reducido omite introducción y efectos decorativos. Cambio de pestaña pausa; continuar no acumula tiempo ni conserva aceleración.
- Música propia renderizada a bucle local; efectos locales. SoundCloud opcional, una sola fuente musical activa, eventos tardíos subordinados a pausa/silencio.
- Preferencias/record en `codigo-rosa-godot-v1`, importación inicial de claves antiguas al mismo origen sin borrarlas; memoria de sesión cuando el almacenamiento falla.
- Plantilla HTML con carga, errores, instrucciones, anuncios accesibles, créditos y panel musical. Distribución en subdirectorio, MIME y gzip correctos.

## 4. Entregas y dependencias

| Etapa | Entrega | Criterio de cierre |
|---|---|---|
| F0 · Base | Herramientas fijadas, referencia reproducible, datos del mundo y exportación mínima. | Importación/exportación limpias y arranque HTTP, entrada, foco y audio. |
| F1 · Juego completo | Misión, manejo, población, patrulla, daños, sirena, resultados y reinicios con arte provisional. | Ganar/perder y comparaciones reproducibles aprobadas. |
| F2 · Personaje y ambulancia | Fuentes editables, GLB, animación y comparativas. | Correcciones de parecido revisadas por el usuario e integración sin intersecciones. |
| F3 · Tramo visual | Disco y costa, cámaras, materiales y calidad. | Capturas comparables y recorrido con población completa dentro del presupuesto. |
| F4 · Presentación | Mundo completo, introducción, HUD, audio, ajustes y accesibilidad. | Flujos y pantallas comprobados, también sin servicios externos. |
| F5 · Entrega | Optimización, paquete, pruebas, licencias y documentación. | Aceptación completa, dispositivos reales y exportación reproducible. |

La preparación artística puede avanzar durante F1; expandir el arte depende del tramo representativo F3. La falta de teléfonos no bloquea tareas independientes, pero deja su aceptación pendiente. La estimación original de 19–35 jornadas era orientativa, no una certificación de terminación ni una fecha comprometida.

## 5. Verificación y cierre

Los informes separan aprobada, fallida y pendiente. Pruebas de reglas sin render, regresión visual de navegador y rendimiento físico son evidencias diferentes.

- Manejo a 30/60/120 FPS y cuadros largos; entradas y aleatoriedad controladas. Tolerancia prevista 5%; las trazas implementadas comprueban diferencias absolutas <0,001, además de estados y penalizaciones exactas.
- Recogida interrumpida, entrega, derrotas simultáneas, puntuación, estrellas, sirena y tres reinicios.
- Introducción completa/omitida, pausa, foco/pestaña, entradas liberadas y movimiento reducido.
- Capturas del personaje en tres vistas y de disco, costa y puesto. La prueba de software no acepta por sí sola el parecido.
- Pantallas 1280×720, 1920×1080, 390×844 y 844×390; rotación, multitáctil, controles completos y ausencia de desplazamiento.
- SoundCloud bloqueado/lento/error, almacenamiento denegado, errores de carga y falta de WebGL 2.

| Ajuste | Alta | Baja |
|---|---|---|
| Resolución 3D máxima | 1,5× CSS, limitada por DPR | 1× CSS, limitada por DPR |
| Sombras | 1024 | 512 |
| Polvo | 48 | 18 |
| Recuadro | Reacciones automáticas | Cerrado inicialmente |
| Detalle | Completo | Simplifica piezas pequeñas y sombras; misma simulación |

Medir tres recorridos de 60 s tras calentamiento, con toda la población y recuadro abierto/cerrado. Registrar hardware, navegador, calidad, resolución, tiempos de cuadro, llamadas, triángulos y memoria observable.

Objetivos: 60 FPS escritorio / 30 celular; umbrales prácticos ≥58/29 FPS y p95 ≤33,3/50 ms. Presupuesto 300/150 llamadas incluyendo vistas y sombras. Descarga ≤25 MiB gzip y ≤15 s con caché fría, 20 Mbit/s y 100 ms de latencia. Verificar Chrome/Firefox escritorio, Chrome Android y Safari iPhone. SwiftShader y emulación no certifican esos objetivos físicos.

La entrega incluye proyecto, fuentes Blender, GLB, scripts, paquete estático, licencias y evidencias. Por decisión posterior del usuario, el paquete de Pages publica únicamente Godot en la raíz. Three.js permanece como fuente histórica para regresiones y no se copia al sitio publicado. Las comprobaciones físicas pendientes se siguen registrando sin declararlas aprobadas. Consultar [las instrucciones ejecutables](../godot/README.md) y [el estado verificable de aceptación](../artifacts/godot/README.md).

## Revisión tropical implementada

La siguiente iteración conserva las reglas y el protagonista aprobado y renueva disco, fachadas, costa, puesto, peatones, materiales, cámara, suspensión visual, audio y HUD. El kit modular tiene fuente Blender y GLB locales. Las comparativas se guardan en [tropical-comparison.html](../artifacts/godot/tropical-comparison.html), aparte de las capturas aprobadas de identidad. La aprobación del rostro no se extiende automáticamente al escenario nuevo.

Las pruebas añaden contratos de reinicio visual, presentación sin modificación de simulación, reacciones temporales/fijadas, superficies sonoras, pausa y silencio. Los informes de navegador y rendimiento se vinculan al hash del paquete que realmente se ejecutó; una medición anterior no se presenta como aprobación de una exportación nueva.
