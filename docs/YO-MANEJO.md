# «Yo manejo»: reglas y entrega por etapas

Una única partida Godot, 150 segundos activos y dos etapas: recoger en Segunda Praia y entregar en el puesto. Introducción de siete segundos y cierre de seis, omitibles con botón, Enter o Espacio. Pausa, foco y movimiento reducido se aplican a ambas secuencias. Los reintentos entran directamente al volante.

## Recorrido y manejo

`godot/data/world.json` es la fuente compartida de nodos, aristas, anchuras, superficies, obstáculos, hitos y objetivos. El generador `scripts/build_story_layout.py` contiene los puntos de control artesanales y reproduce el archivo de datos: 954,4 metros de ruta principal y un desvío 60 metros más largo. No se modifica el rostro ni se regenera arte Blender al ejecutar el generador.

La simulación usa barrido de círculo contra segmentos de edificios/polígonos y límite exterior, resuelve contactos de esquina y desliza sobre superficies. No utiliza físicas Godot para mover actores. El grafo alimenta tráfico, patrulla, mapa, orientación y sonidos de rodadura. La patrulla espera la recogida, no se teletransporta cerca del jugador.

El giro sostenido 0,2 s por encima de velocidad 10 inicia el derrape. La amortiguación lateral pasa de 6 a 3; al enderezar o bajar de velocidad 8 recupera agarre en 0,35 s. Ángulo lateral máximo 18°. Sin botones nuevos ni puntos por derrapar. Movimiento reducido conserva esta simulación y elimina sus movimientos decorativos.

Daños: edificio 6, carrito 8, peatón 5 y −4 s, patrulla 4 sin quitar segundos. Inmunidad 1,5 s. Sirena 2,2 s / recarga 7 s. Recogida/entrega: distancia <4,6, velocidad <2, permanencia continua 1,3 s. La animación de subida lee ese progreso y se cancela al salir. Derrota prioritaria y resultado único.

Puntuación: `max(0, floor(tiempo*100 + resistencia*20 + 1500 - atropellos*500 + 0.5))`. Tres estrellas: sin atropellos y resistencia ≥75; dos: sin atropellos y ≥50; otra victoria: una. Derrota: cero puntos/estrellas.

## Relato y ajustes

Nico, Lau y Fede son secundarios ficticios. Siete comentarios posibles, cuatro segundos visibles, seis segundos libres entre frases y cola máxima de tres. Los avisos de misión/peligro interrumpen comentarios. La cola y sus tiempos se congelan al pausar y se limpian al reiniciar. No se añaden voces.

Persistencia `codigo-rosa-godot-v2`: importa calidad, silencio y movimiento reducido desde v1, conserva `legacy_best` y comienza `best` en cero. Mantiene intactas las claves antiguas. Si se deniega almacenamiento, funciona durante la sesión. Los récords de reglas distintas nunca se comparan.

## Revisión artística y publicación

El primer tramo se revisó mediante capturas y un recorrido con entradas antes de extender el acabado al comercio, la plaza y el puesto. El registro de esa revisión técnica está en `artifacts/godot/story-reference/review.json`; no atribuye aprobación al usuario. [Galería del mundo completo](../artifacts/godot/story-review.html).

`art_extent: complete` significa que la extensión está implementada, no que haya sido aprobada por el usuario. El generador admite `--reference-slice` para reproducir el prototipo. El workflow impide publicar accidentalmente esa fase provisional. La publicación entrega solo Godot en la raíz de Pages y se verifica con `scripts/audit_pages.py`.

La revisión humana del mundo sigue abierta. El parecido aprobado se conserva por separado y sus hashes permanecen intactos.

## Validación

- Pruebas de simulación v2 y presentación: `scripts/build_godot.py --all`.
- Recorrido con entradas reales, sin teleport/reposición: `scripts/godot.sh --headless --script tests/route_drive_test.gd`. Se retiran peatones/carritos para aislar geometría; añadir `-- --population` prueba también todos los actores y sirena por proximidad. Ningún modo certifica balance humano.
- Navegador: `node scripts/browser_godot.cjs` y `node tests/godot/story.cjs`, en secuencia con Chrome CDP.
- Capturas: `node scripts/capture_story.cjs`. Prefijo de capturas genéricas por defecto `story-`, preservando las imágenes aprobadas.
- Diagnóstico de render: `node scripts/benchmark_godot.cjs`, 60 s por configuración tras calentamiento. GPU y teléfonos reales se registran separados de SwiftShader.
- Referencias históricas v1 bajo `artifacts/godot/archive-v1/` y `godot/tests/archive-v1/`; no se usan como expectativas de las reglas nuevas.

Pendientes externos: revisión artística, prueba con cinco jugadores nuevos (≥4 victorias iniciales, mediana 90–130 s), GPU física, Android/iPhone, SoundCloud real y comprobación del paquete final en HTTPS.

## Revisión de detalle y vida

El usuario pidió «Añadir más detalle y vida antes de extender». El nuevo pase de escenas y objetos se concentra en disco y primera curva. La revisión está registrada en `artifacts/godot/detail-review.json` sin atribuir aprobación al usuario. Se mantienen los 30 peatones, cinco carritos, patrulla y reglas de la misión.

Cada peatón utiliza una sola malla articulada con once huesos y tres arquetipos locales editables en Blender. Las poses conservan las rotaciones de reposo importadas; caminar, esperar, saludar y sostener objetos son presentación. Baja desactiva sus sombras proyectadas y utiliza contacto suave; Alta mantiene sombras. Las posiciones de las escenas se comparten con los datos del mundo y se comprueba que nazcan fuera de los sólidos.
