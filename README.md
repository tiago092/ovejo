# Código Rosa — La última vuelta (3D)

Juego de navegador basado en las fotos del conductor y del buggy amarillo de emergencias.

## Jugar

Descomprimí todos los archivos y abrí `index.html`. También se entrega un HTML independiente con gráficos y juego incorporados. No necesitás instalar nada. El navegador debe permitir WebGL (gráficos 3D). La canción enlazada necesita internet; si no carga, suena la pista local original.

Tenés 90 segundos para recoger al paciente en la Segunda Praia y llevarlo al puesto de salud. Detené el buggy dentro del círculo durante 1,3 segundos para recoger o entregar. La línea verde del minimapa marca una ruta por las calles; la flecha junto al destino indica hacia dónde doblar respecto de la dirección del buggy.

- **Flechas / WASD:** acelerar, frenar/retroceder y girar con los controles originales.
- **Espacio:** sirena durante 2,2 segundos; recarga de 7 segundos. Aparta peatones y ralentiza carritos de equipaje cercanos.
- **C / botón Cámara:** alternar entre la vista frontal original (vista inicial) y seguimiento desde atrás. La cámara pequeña muestra al conductor durante la partida.
- **P / Escape / Pausa:** pausar y continuar.
- **Celular:** botones táctiles. Se recomienda horizontal.

Una patrulla ficticia te sigue durante ambas etapas, se ve en el minimapa y cambia su ruta para perseguirte. Si te alcanza, perdés 12% de resistencia y 3 segundos; después retrocede y tarda 2,8 segundos en volver a golpear. Los choques dañan el buggy. Atropellar descuenta 8 segundos y 5% de resistencia, sin violencia gráfica. Perdés al agotar el tiempo o la resistencia. Se pausa al cambiar de pestaña. El récord se guarda localmente, cuando el navegador permite almacenamiento. Al iniciar, el juego pide reproducir “Magalenha (Frankie G Rio Dub)” desde el reproductor oficial de SoundCloud; puede requerir tocar ▶ si el navegador bloquea la reproducción automática. El botón Magalenha silencia la música y se pausa con el juego. Si el reproductor no está disponible, suena la pista original sintetizada.

La página de SoundCloud de thedjfrankieg marca la grabación como [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Se acredita y enlaza al artista en el juego. La pista es un remix de “Magalenha”, atribuida a Sérgio Mendes en esa página; esa licencia del remix no permite concluir por sí sola que todos los derechos de la composición o grabación original estén liberados. Por eso el juego usa el reproductor oficial y no incluye ni redistribuye el archivo de audio.

La puntuación al ganar es tiempo restante × 100 + resistencia × 20 + 1500 − atropellos × 500, con mínimo cero. Tres estrellas: cero atropellos y 85% o más de resistencia. Dos: cero atropellos y 50% o más.

## GitHub Pages

1. Subí el contenido de esta carpeta a la raíz de tu repositorio, incluyendo las carpetas `assets` y `vendor`. No subas el ZIP sin descomprimir.
2. En Settings → Pages, elegí Deploy from a branch.
3. Seleccioná tu rama (por ejemplo `main`) y /(root), y guardá.

Documentación oficial: https://docs.github.com/es/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Ambientación: Morro de São Paulo, Bahia

Interpretación arcade inspirada en la Segunda Praia y la vila: mar turquesa, arena, pasarela de madera, palmeras, pousadas de colores, faro sobre una elevación, pasajes angostos y colinas transitables. El buggy y la patrulla acompañan las pendientes, y los edificios se apoyan sobre el terreno. El trazado y las distancias se adaptan al juego. El luau y el puesto de salud son ficticios; el mapa no sirve para orientarse en el destino real.

Referencias consultadas:
- https://www.morrodesaopaulobrasil.com.br/segunda-praia/
- https://viagemeturismo.abril.com.br/destinos/morro-de-sao-paulo/
- https://www.pousadavilanova.com.br/informacoes-uteis

## Diseño e implementación

- Mundo, buggy, personajes y cámaras en 3D mediante Three.js / WebGL. Arena, empedrado, estuco, tejas, madera, vegetación y agua usan texturas generadas dentro del juego; no requieren descargas externas.
- Buggy amarillo, cabina abierta, ruedas grandes y cartel AMBULANCIA inspirados en la foto.
- El parecido facial utiliza un retrato generado a partir de las fotos como textura frontal sobre un cuerpo 3D. Es una representación híbrida; el rostro no es un escaneo ni un modelo facial tridimensional completo.
- Cámara cercana del conductor siempre visible durante la partida.
- Una misión, dos etapas, peatones, carritos de equipaje, minimapa, sirena, colisiones y puntuación.
- Sin cuentas, analíticas, compilación ni backend. El reproductor oficial de SoundCloud y su API son los únicos recursos externos; los gráficos y la pista alternativa están incluidos. No se publicaron estos archivos automáticamente.

Archivos: `index.html` (interfaz y reproductor), `style.css` (diseño), `game.js` (escena y lógica), `track.js` (control de SoundCloud y respaldo), `music.js` (pista alternativa sintetizada), `assets/driver.png` (retrato), `assets/driver-texture.js` (textura autocontenida para apertura local), `vendor/three.min.js` (Three.js r160, licencia MIT en THREE-LICENSE.txt).

Pruebas: comprobación de sintaxis y simulación de la lógica de giro, cámara inicial, recogida, entrega, victoria, pausa y ruta. La experiencia visual y la velocidad final dependen del navegador y del dispositivo.
