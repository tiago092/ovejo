# Código Rosa — La última vuelta

Morro de São Paulo, 05:47 AM. Salió de la disco, vio una ambulancia y dijo «yo manejo». Sátira de una anécdota entre amigos, convertida en un arcade de conducción 3D al amanecer.

## Jugar

Abrí **index.html** con la carpeta completa. No hay instalación, compilación ni backend. También funciona en alojamiento estático, como GitHub Pages. Se necesita WebGL.

La primera partida tiene una introducción de siete segundos. **Omitir**, **Enter** o **Espacio** llevan directamente al volante. El reloj de 90 segundos y la patrulla empiezan después. Los reintentos omiten la historia; **Ver historia** permite repetirla desde el inicio.

Recogé al paciente en Segunda Praia y llevalo al puesto de salud. Detené la ambulancia dentro del círculo durante 1,3 segundos para recoger o entregar. La barra indica el avance; la flecha y el minimapa comparten una ruta comprobada contra los edificios.

- **WASD / flechas:** acelerar, frenar/retroceder y girar.
- **Espacio:** sirena durante 2,2 segundos, con recarga de siete segundos. Aparta peatones y ralentiza carritos cercanos.
- **C / Cámara:** alternar seguimiento trasero y vista frontal.
- **Ver conductor:** abrir o plegar el primer plano. En alta aparece brevemente al iniciar y ante reacciones; en baja empieza cerrado.
- **P / Escape / Pausa:** pausar o continuar, también durante la introducción. Cambiar de pestaña pausa el juego.
- **Celular:** botones táctiles; se puede acelerar y girar a la vez. Soltar o cancelar un contacto libera el control. Funciona vertical y horizontal.

La patrulla conserva la persecución del juego original: sus impactos descuentan 12% de resistencia y tres segundos, con 2,8 segundos entre golpes. Los atropellos descuentan ocho segundos y 5% de resistencia, sin violencia gráfica. Tiempo o resistencia agotados producen derrota, incluso si coinciden con la entrega.

Puntos al ganar: `max(0, redondear(tiempo × 100 + resistencia × 20 + 1500 − atropellos × 500))`. Tres estrellas: cero atropellos y al menos 85% de resistencia; dos: cero atropellos y al menos 50%. El récord se guarda localmente cuando el navegador permite almacenamiento.

## Dirección visual y calidad

El protagonista usa una malla facial continua con nariz, pómulos y mandíbula propios, mapa facial generado desde las referencias, rulos y anteojos tridimensionales. Las manos acompañan el volante. La ambulancia toma el frente amarillo, defensa negra, parabrisas, ruedas, cartel espejado y baliza roja de la foto aportada. El mundo mantiene el trazado original, con fachadas, vegetación, empedrado, mar animado y luz cálida al amanecer.

- **Automática:** baja con puntero táctil y alta en escritorio.
- **Alta:** resolución de render limitada a 1,5 veces la pantalla, sombras de 1024 y hasta 48 partículas de polvo.
- **Baja:** resolución limitada a 1, sombras de 512 y hasta 18 partículas. El recuadro del conductor comienza cerrado.

La elección manual se guarda localmente. La preferencia del sistema de **movimiento reducido** omite la introducción, las oscilaciones de cámara/vehículo y los efectos ambientales móviles. Los recursos gráficos y la música alternativa son locales. El atlas facial está embebido para permitir apertura con `file://`.

## Revisar los resultados

- [Comparación del personaje: frente, tres cuartos y perfil](artifacts/character.html).
- [Capturas y resultados de las pruebas](artifacts/README.md).
- [Origen de los recursos](ASSETS.md) y [prompt del atlas facial](assets/IMAGE-PROMPTS.md).

La forma facial es una interpretación modelada a partir de las referencias; no es un escaneo. Las fotografías originales de perfil y ambulancia se consultaron en la conversación y no se incluyen como recursos del juego.

## Música

Al jugar se intenta reproducir **Magalenha (Frankie G Rio Dub)** mediante el reproductor oficial de SoundCloud. Si no está disponible, suena la pista original sintetizada de `music.js`. **Música** silencia o activa música y efectos; el panel **La banda sonora** contiene reproductor y créditos. Puede ser necesario pulsar reproducir por las restricciones del navegador.

La página de SoundCloud de thedjfrankieg marca el remix como CC BY 3.0. Se conserva el crédito y el enlace original. Esa indicación no permite concluir que los derechos de la composición o grabación original estén liberados: el juego enlaza el reproductor oficial y no distribuye su audio.

## Migración a Godot

La implementación paralela está en [godot/](godot/README.md), con fuentes editables de Blender, simulación GDScript y exportación web. Ejecutá `python3 scripts/build_godot.py` y `python3 scripts/serve_godot.py` para abrir `http://127.0.0.1:8767/dist/godot/`. Las herramientas locales se preparan con `python3 scripts/setup_tools.py` si faltan.

El [plan y estado de migración](docs/MIGRACION-GODOT.md) y las [evidencias](artifacts/godot/README.md) distinguen lo comprobado de lo pendiente: parecido aprobado y pruebas físicas móviles pendientes. Esta versión Three.js sigue disponible para jugar, comparar y volver atrás.

## Desarrollo y verificación

`visuals.js` construye y anima modelos, materiales, iluminación, instancias y efectos. `game.js` conserva simulación, misión, navegación, cámaras y controles. `index.html` y `style.css` contienen la presentación. Three.js r160 se conserva en `vendor`, con licencia MIT incluida.

No hay dependencias de desarrollo. Con **Node.js 24 y Chrome**:

```bash
node --check visuals.js
node --check game.js
node tests/browser.cjs
node tests/browser.cjs --benchmark
```

El último comando añade un recorrido de 60 segundos. Las pruebas lanzan Chrome temporal, bloquean SoundCloud para verificar el respaldo, prueban apertura local y HTTP y regeneran las capturas. Las funciones de inspección se inyectan en memoria por las pruebas; no se exponen en el juego distribuido. `CHROME_PATH` permite seleccionar el ejecutable y `CHROME_DEBUG_URL` reutilizar una instancia de depuración.

El entorno automatizado utiliza **SwiftShader, renderizado por software**, y emulación móvil. Los presupuestos de llamadas de dibujo se comprueban automáticamente. Los objetivos de 60 FPS en PC y 30 FPS en teléfono necesitan medición con GPU y dispositivo reales; el benchmark de software no los certifica. Los valores medidos están en `artifacts/verification.json`.

## Publicar en GitHub Pages

GitHub Pages publicará únicamente Godot en la dirección principal. Seguir [la guía de Pages](docs/GITHUB-PAGES.md): el workflow se ejecuta con cada push a `master` o manualmente y el paquete local se prepara con `python3 scripts/prepare_pages.py`. No utilizar la publicación desde la raíz de la rama, porque allí permanece el HTML histórico de Three.js.
