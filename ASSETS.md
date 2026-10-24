# Recursos visuales de Código Rosa

## Referencias aportadas

- `assets/driver.png`: retrato frontal existente, conservado sin modificar. Referencia de identidad, barba, anteojos negros y remera rosa; también se usa en el inicio.
- Tres fotos adicionales adjuntas: frontal, tres cuartos sonriendo y foto pequeña con gorra, para corregir cara ancha, mejillas, mandíbula y patrón de bigote/perilla. Se mantiene la remera rosa y las gafas de `driver.png`, sin gorra.
- Foto de perfil adjunta en la conversación: referencia de nariz, frente, oreja, mandíbula y pelo rizado.
- Foto de ambulancia adjunta en la conversación: referencia de capó amarillo ancho, defensa negra, parabrisas, ruedas, cartel y baliza roja.

Las fotos adjuntas se consultaron como referencias y no se incluyen como archivos del juego. Las personas del fondo no se reprodujeron individualmente.

## Atlas generado

`assets/driver-atlas-v2.png` es el atlas activo, generado con la herramienta integrada de imágenes a partir de `driver.png` y las tres fotos adicionales. `assets/driver-atlas.png` conserva la primera versión. Presenta frente, tres cuartos y perfil con iluminación suave, sin anteojos para permitir que los anteojos 3D se superpongan al rostro. El prompt íntegro está en `assets/IMAGE-PROMPTS.md`.

`assets/driver-texture.js` contiene una copia de `driver-atlas-v2.png` como data URI. El juego carga esa copia para evitar las restricciones de texturas WebGL al abrir el HTML directamente. Para actualizar el atlas y conservar esta compatibilidad, regenerar también el archivo embebido.

El mapa se proyecta y mezcla sobre una malla cerrada de cabeza en `visuals.js`; frente, mejillas, nariz y mandíbula tienen geometría propia. La revisión v2 usa secciones de cráneo más anchas, mejillas llenas, mandíbula redondeada, nariz integrada y proyección frontal/lateral calibrada para el nuevo atlas. Rulos cortos, anteojos, orejas y cuello son tridimensionales. El pelo combina una textura procedural local con dos conjuntos de instancias pequeñas para evitar los bucles sobredimensionados de la versión anterior. Las imágenes generadas no son modelos 3D ni escaneos. La página `artifacts/character.html` permite contrastar el resultado desde tres ángulos.

Las gafas se modelaron tomando `assets/driver.png` como referencia: montura negra brillante, lentes rectangulares con esquinas redondeadas y borde inferior levemente trapezoidal, puente curvo y patillas anchas que se apoyan sobre las orejas. Los cristales oscuros tienen reflejos suaves generados localmente; no se modificó el retrato de referencia.

## Mundo, vehículo y audio

Ambulancia, patrulla, peatones, carritos, fachadas y vegetación se construyen localmente con Three.js. Los elementos repetidos usan instancias con color por instancia. Arena, empedrado, madera y sombra de contacto usan texturas Canvas locales; el cielo y el mar usan shaders propios. No hay modelos descargados de terceros ni servicios de gráficos en tiempo de ejecución.

Three.js r160 conserva su licencia MIT en `vendor/THREE-LICENSE.txt`. `music.js` contiene la pista alternativa sintetizada. Magalenha se reproduce mediante el reproductor oficial de SoundCloud, con los créditos de la versión anterior; su audio no se incluye en el proyecto.

## Recursos de la migración a Godot

- `art-source/driver.blend` y `ambulance.blend`: modelos editables creados para este proyecto con Blender 4.5.3. `scripts/build_art.py` conserva la receta de autoría inicial; `scripts/export_art.py` exporta los retoques guardados sin sobrescribirlos.
- `godot/assets/driver.glb`, `driver-low.glb`, `ambulance.glb`: modelos de ejecución con articulaciones; cabeza continua y expresión de sonrisa. El parecido permanece pendiente de revisión humana.
- `godot/assets/driver-skin.png`: horneado a UV convencionales del atlas generado ya documentado arriba. No modifica `assets/driver.png` ni convierte las imágenes generadas en referencia de identidad.
- `godot/assets/music.wav`: bucle de la música original de `music.js`, renderizado con OfflineAudioContext a PCM mono de 22.050 Hz; `scripts/render_audio.cjs` documenta el procedimiento. Sirena, golpe y resultado son muestras sintetizadas locales. No se incluye audio descargado de SoundCloud.
- `godot/assets/DejaVuSans.ttf`: tipografía DejaVu Sans; licencia Bitstream Vera y cambios DejaVu en dominio público, incluidos en `godot/licenses/DejaVu.txt`.
- Godot Engine y dependencias: textos de licencia en `godot/licenses/`, copiados al paquete exportado. Blender se usa como herramienta de autoría; su ejecutable no se incluye en la distribución web.
