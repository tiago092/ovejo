# Pueblo compacto y paseo costero

La dirección **más urbana y compacta** se revisó en disco/primera curva. Después de pedir casas más próximas y aportar una fotografía de playa, el usuario indicó «Perfecto, continua». El acabado se extendió a todo el pueblo y se preparó su publicación.

## Distribución

80 edificios: disco 12, costa 18, comercio 26, plaza 14 y puesto 10. Disco y puesto conservan posición y acceso. Los otros 78 edificios forman 22 conjuntos de tres o cuatro parcelas. La separación entre parcelas es 1,2 m; entre paredes de la primera hilera, aproximadamente 1,8 m. El hueco entre los dos conjuntos interiores del primer tramo se redujo de 8,22 a 2,79 m.

La autoría determinista vive en `scripts/build_story_layout.py` y la biblioteca `compact_village.py`. Cada edificio tiene ID estable, parcela, zona, conjunto, familia, orientación y polígono. Presentación, colisiones y cámara consumen esos datos. Los conjuntos mantienen sus casas juntas al buscar un lugar válido. Los retiros respetan el ancho de carretera y al menos tres metros de margen.

Se conservan el grafo, desvío, destinos, 150 segundos, manejo, daños, puntuación y reparto de actores. El vendedor usa un ancla local de su parcela. Los jardines estrechos almacenan su polígono girado y las fachadas, toldos y techos se comprueban contra su huella.

## Referencia de playa

La fotografía nocturna aportada en la conversación guía el paseo: arena abierta, madera, postes con estructura triangular, cuerdas, cartelería rústica y plantas agrupadas. Se conserva el amanecer. La foto no se copia como textura ni se incorpora un logotipo municipal.

`coastal_layout.py` coloca los sólidos del paseo fuera del margen vial y de las áreas protegidas. La presentación usa las mallas editables existentes de Blender y un módulo local de Godot, `coast_presentation.gd`, sin backend ni API pública nueva.

La franja de madera mide 7,5 m, dentro del ancho transitable existente. Tablas, juntas y vetas se generan mediante shader siguiendo la longitud del camino. `surface_at` distingue madera, piedra y arena; cambia el apoyo visual y el tono de rodadura, sin modificar fricción, velocidad o reglas. Los peatones conservan contacto con el piso.

El escenario completo incluye seis postes de luz, tres tramos de cuerda, dos guías de madera y grupos verdes adicionales en la costa. Las áreas verdes detrás de los edificios usan copas redondeadas agrupadas. Los nuevos sólidos comparten sus huellas con simulación y consultas de cámara; no se ocupan la plaza, recogida, llegada ni las aperturas reservadas al mar.

## Calidad

Alta y Baja mantienen las mismas casas, masas verdes y simulación. Baja omite accesorios pequeños, acorta la distancia de rótulos y reduce sombras de elementos finos y techos. Las siluetas, los cuerpos de los edificios y las sombras principales de palmeras permanecen. El terreno suave, el agua y la orilla no generan sombras que no aportan una silueta útil. Las pequeñas bombillas siguen visibles; los rellenos cálidos adicionales se reservan para Alta.

Se mantienen los presupuestos de 300/150 llamadas por cuadro, contando cámaras y sombras, y 25 MiB comprimidos. Los resultados actuales están en `artifacts/godot/benchmark.json`; SwiftShader se identifica como software y no certifica FPS físicos.

## Reproducción y publicación

```bash
python3 scripts/build_story_layout.py --complete-urban
python3 scripts/build_godot.py --all
node scripts/capture_urban.cjs
GODOT_TEST_PART=flow node scripts/browser_godot.cjs
GODOT_TEST_PART=screens node scripts/browser_godot.cjs
node scripts/test_urban_cameras.cjs
node tests/godot/story.cjs
node scripts/distribution_godot.cjs
python3 scripts/clean_import.py
node scripts/benchmark_godot.cjs
python3 scripts/package_godot.py
python3 scripts/prepare_pages.py
```

Las pruebas nativas se ejecutan en procesos independientes tras importar; la exportación web sigue sin hilos. Ejecutar los corredores de navegador en secuencia, sin exportar durante su carga. El benchmark requiere el resto de las pestañas del juego inactivas y ninguna importación/modelado concurrente.

La galería `artifacts/godot/urban-review.html` contiene comparativas, vistas de las cinco zonas, plano superior y recorrido visual controlado. Los informes se enlazan al SHA del paquete o a su huella de fuentes. Los originales aprobados del protagonista permanecen intactos.

`urban_extent: complete` y `art_extent: complete` habilitan la publicación. El guardia y el preparador rechazan exportaciones provisionales. Pages distribuye únicamente Godot en la raíz; la auditoría HTTPS comprueba HTML, WebAssembly, PCK real, huella de fuentes, 80 edificios y estilo costero actual.

Pendientes externos: GPU física, Chrome Android y Safari iPhone reales, y la prueba humana de balance con cinco jugadores. Las pruebas de software y la conducción automática no sustituyen esas comprobaciones.
