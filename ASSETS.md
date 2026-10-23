# Recursos visuales de Código Rosa

## Referencias aportadas

- `assets/driver.png`: retrato frontal existente, conservado sin modificar. Referencia de identidad, barba, anteojos negros y remera rosa; también se usa en el inicio.
- Foto de perfil adjunta en la conversación: referencia de nariz, frente, oreja, mandíbula y pelo rizado.
- Foto de ambulancia adjunta en la conversación: referencia de capó amarillo ancho, defensa negra, parabrisas, ruedas, cartel y baliza roja.

Las fotos adjuntas se consultaron como referencias y no se incluyen como archivos del juego. Las personas del fondo no se reprodujeron individualmente.

## Atlas generado

`assets/driver-atlas.png` se generó con la herramienta integrada de imágenes a partir de las referencias de identidad y perfil. Presenta frente, tres cuartos y perfil con iluminación suave, sin anteojos para permitir que los anteojos 3D se superpongan al rostro. El prompt íntegro está en `assets/IMAGE-PROMPTS.md`.

`assets/driver-texture.js` contiene una copia del mismo PNG como data URI. El juego carga esa copia para evitar las restricciones de texturas WebGL al abrir el HTML directamente. Para actualizar el atlas y conservar esta compatibilidad, regenerar también el archivo embebido.

El mapa se proyecta y mezcla sobre una malla cerrada de cabeza en `visuals.js`; frente, mejillas, nariz y mandíbula tienen geometría propia. Rulos, anteojos, orejas y cuello son tridimensionales. Las imágenes generadas no son modelos 3D ni escaneos. La página `artifacts/character.html` permite contrastar el resultado desde tres ángulos.

Las gafas se modelaron tomando `assets/driver.png` como referencia: montura negra brillante, lentes rectangulares con esquinas redondeadas y borde inferior levemente trapezoidal, puente curvo y patillas anchas que se apoyan sobre las orejas. Los cristales oscuros tienen reflejos suaves generados localmente; no se modificó el retrato de referencia.

## Mundo, vehículo y audio

Ambulancia, patrulla, peatones, carritos, fachadas y vegetación se construyen localmente con Three.js. Los elementos repetidos usan instancias con color por instancia. Arena, empedrado, madera y sombra de contacto usan texturas Canvas locales; el cielo y el mar usan shaders propios. No hay modelos descargados de terceros ni servicios de gráficos en tiempo de ejecución.

Three.js r160 conserva su licencia MIT en `vendor/THREE-LICENSE.txt`. `music.js` contiene la pista alternativa sintetizada. Magalenha se reproduce mediante el reproductor oficial de SoundCloud, con los créditos de la versión anterior; su audio no se incluye en el proyecto.
