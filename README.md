# Código Rosa · Yo manejo

Morro de São Paulo, 05:47. Salió de la disco, vio una ambulancia y dijo «yo manejo». Un arcade de conducción con humor, amanecer tropical y 150 segundos para recoger al paciente y llegar al puesto de salud.

La versión actual se desarrolla en **Godot 4.7.2**, GDScript y Compatibility. El despliegue de GitHub Pages está configurado para distribuir únicamente el paquete Godot en la dirección principal. El HTML Three.js de la raíz se conserva como fuente histórica de las regresiones; abrir ese archivo muestra el juego anterior.

## Jugar y desarrollar

```bash
python3 scripts/setup_tools.py  # Solo si faltan las herramientas fijadas.
python3 scripts/build_godot.py
python3 scripts/serve_godot.py --port 8767
```

Abrir **http://127.0.0.1:8767/dist/godot/**. La versión Godot requiere HTTP/HTTPS, WebAssembly y WebGL 2. No usa backend. Para editar escenas y scripts: `scripts/godot.sh --editor`. [Instrucciones técnicas y pruebas](godot/README.md).

- **WASD / flechas:** acelerar, frenar/retroceder y girar.
- **Espacio:** sirena de 2,2 s; recarga de siete segundos desde la activación.
- **C / Cámara:** alternar seguimiento trasero y frontal.
- **P / Escape / Pausa:** pausar; cambiar de pestaña también pausa y libera las entradas.
- **Cara:** abrir/fijar o cerrar el recuadro del conductor. En Alta las reacciones duran tres segundos; Baja empieza cerrado. El recuadro tiene botones Fijar/Automático y cerrar.
- **Ajustes:** calidad y audio. Movimiento reducido está disponible en el menú inicial.
- **Celular:** controles simultáneos, orientación vertical y horizontal y cancelación de contactos.

La introducción dura siete segundos y se omite con botón, Enter o Espacio. El reloj y la persecución empiezan después. Reintentar lleva directamente al volante; Ver historia repite la introducción.

Detenerse a menos de 4,6 m y a velocidad inferior a 2 durante 1,3 s recoge o entrega al paciente. La barra y el texto junto al objetivo muestran el progreso. Tiempo o resistencia agotados tienen prioridad sobre la entrega.

Puntos: `max(0, redondear(tiempo × 100 + resistencia × 20 + 1500 − atropellos × 500))`. Tres estrellas requieren cero atropellos y resistencia ≥75%; dos requieren cero atropellos y resistencia ≥50%. Ajustes y récord se guardan localmente cuando el navegador lo permite.

## «Yo manejo»: nueva partida

Recorrido artesanal de 954,4 m y un desvío 60 m más largo; derrape automático al girar rápido, daños más perdonables y patrulla que empieza tras recoger al paciente. Diálogos de cuatro segundos y cierre omitible de seis. Los récords v2 se guardan separados del récord histórico. [Reglas, arquitectura y pruebas](docs/YO-MANEJO.md).

El acabado se extendió al comercio, la plaza y el puesto después de revisar capturas y recorrido del primer tramo. La [galería](artifacts/godot/story-review.html) conserva esa referencia y muestra el mundo completo. La revisión artística del usuario y las pruebas en dispositivos reales siguen pendientes.

## Renovación tropical

Disco con entrada propia, madera y luces rosas; cuatro familias de fachadas, puesto identificable y costa con palmeras, vegetación, sombrillas cerradas y embarcaciones. Peatones redondeados, reacción a la sirena, suspensión visual y sonido de motor y rodadura según la superficie. El protagonista mantiene su rostro y sus gafas aprobados.

- **Automática:** Baja con puntero táctil; Alta en escritorio.
- **Alta:** resolución 3D hasta 1,5× CSS, sombras de 1024 y hasta 48 partículas.
- **Baja:** resolución hasta 1× CSS, sombras de 512 y hasta 18 partículas; misma simulación.

Movimiento reducido omite la introducción y desactiva oscilaciones y animación ambiental decorativa. Los recursos gráficos y sonidos son locales. SoundCloud es opcional y se carga al solicitarlo; su ausencia no bloquea el juego y solo hay una fuente musical activa.

## Revisar y publicar

- [Comparativa antes/después de la renovación tropical](artifacts/godot/tropical-comparison.html).
- [Personaje y aprobación del parecido](artifacts/godot/comparison.html).
- [Pruebas, mediciones y pendientes](artifacts/godot/README.md).
- [Fuentes artísticas editables](art-source/README.md) y [recursos/licencias](ASSETS.md).
- [Publicar Godot en GitHub Pages](docs/GITHUB-PAGES.md).

El workflow publica al subir cambios a `master` o ejecutarlo manualmente; Pages debe usar **GitHub Actions** como fuente. `python3 scripts/prepare_pages.py` prepara únicamente Godot en `dist/pages/`.

Las pruebas automatizadas de navegador utilizan SwiftShader y emulación móvil. No certifican los objetivos de 60 FPS en escritorio y 30 FPS en teléfono: esas mediciones requieren GPU y dispositivos reales.
