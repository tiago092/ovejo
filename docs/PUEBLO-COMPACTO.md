# Pueblo compacto · implementación por revisión

Preferencia confirmada: **más urbano y compacto**. Se trabaja en `feat/compact-village`; no se actualiza master ni Pages con el tramo provisional.

## Datos y distribución

80 edificios: disco 12, costa 18, comercio 26, plaza 14 y puesto 10. Se incluyen la disco y el puesto existentes, que conservan posición y acceso. Los otros 78 edificios forman 22 conjuntos de tres o cuatro parcelas, con huecos de 2,6 metros. Se corrige la exclusión anterior del interior de la primera curva; las aperturas al mar son polígonos reservados explícitos.

`scripts/build_story_layout.py` usa la biblioteca local `compact_village.py` para componer los conjuntos. El orden, las anclas de recorrido, el lado, el tamaño y las cuotas son explícitos y deterministas; el rechazo nunca elimina una casa suelta de un conjunto. La búsqueda mantiene el conjunto unido y prefiere los menores retiros antes de desplazarlo hacia el fondo.

Cada edificio entrega `id`, `parcel_id`, `district`, `block`, `family`, `yaw`, dimensiones y `polygon`. Las coordenadas locales se transforman con el mismo convenio de rotación de Godot. La simulación ya consume esos polígonos; no se cambia la autoridad ni las ecuaciones del movimiento. Los sólidos de cámara y las fachadas aplican la misma orientación.

Las parcelas reservan al menos tres metros respecto del ancho completo de las carreteras. Los extremos de acceso de los dos hitos antiguos se comprueban como cintas con extremo plano, coincidiendo con el pavimento, y no como cápsulas que sobresalgan dentro de la entrada. Plaza, recogida, llegada, amigos de la salida y tres aperturas al mar tienen áreas protegidas.

## Presentación

La primera revisión incluye disco y primera curva, con casas más estrechas, puertas y ventanas dirigidas al camino, cubiertas variadas, balcones, toldos y plantas dentro de las parcelas. Las cuatro familias utilizan las mallas editables existentes de Blender. Las viviendas no llevan rótulos; comercio y bar tienen un solo cartel frontal.

Los espacios entre parcelas pueden tener jardines pequeños. Los grupos verdes que interfieren con las nuevas casas se recolocan; detrás de los conjuntos se añaden arbustos y árboles de copa redondeada con troncos registrados. Los adornos se agrupan mediante instancias; Baja conserva los edificios y masas verdes y omite accesorios pequeños.

La escena del vendedor usa un ancla local de su parcela, sin depender de la antigua orientación o de coordenadas absolutas del local. Los 30 peatones, cinco carritos, patrulla y reglas de la partida permanecen.

## Revisión y extensión

`urban_extent: reference-slice` y `art_extent: reference-slice` identifican el estado actual. Las 80 parcelas y colisiones están completas, pero el resto del pueblo muestra volúmenes provisionales. La revisión artística no se atribuye al usuario por el hecho de pasar pruebas técnicas.

[Galería de revisión](../artifacts/godot/urban-review.html), con antes/después, plano superior y seis puntos de un recorrido de 75 m. Esos puntos de presentación no certifican fluidez; la conducción real se prueba por separado.

Al resolver la revisión se podrá ejecutar `python3 scripts/build_story_layout.py --complete-urban`, extender los acabados y validar el mundo completo. El guardia de publicación rechaza explícitamente el estado provisional. La rama solo se incorpora a master al completar esa fase y las verificaciones finales.

## Validación

- `python3 scripts/validate_village.py`: cuotas, IDs, rotaciones, huellas, separaciones, carretera, zonas protegidas, vegetación y anclas de actores. Genera el plano desde los datos compartidos.
- `python3 scripts/build_godot.py --all`: incluye la validación del plano antes de las regresiones y exportaciones. Las pruebas de simulación cubren también las cuotas y los actores fuera de sólidos.
- Presentación: contratos de transformación de geometría, carteles y consultas de cámara, además de reinicio y movimiento reducido.
- Navegador: flujo y cuatro resoluciones, en secuencia, con la exportación detenida durante las pruebas.
- `node scripts/capture_urban.cjs`: encuadres controlados y cámara alternativa, sin sobrescribir las imágenes aprobadas del protagonista.
- Medición con cámaras abiertas/cerradas y perfiles Alta/Baja. El benchmark del tramo provisional no sustituye el del mundo completo; GPU y móviles físicos quedan expresamente pendientes.

Se mantienen los límites de 300/150 llamadas de dibujo y 25 MiB comprimidos. Antes de publicar el mundo terminado se comprobarán el paquete real y su manifest por HTTPS.
