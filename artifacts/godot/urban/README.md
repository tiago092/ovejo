# Pueblo compacto · tramo de revisión

Preferencia del usuario: **más urbano y compacto**. Rama `feat/compact-village`, sin publicación en master.

- Plano completo de 80 edificios: 12 disco, 18 costa, 26 comercio, 14 plaza y 10 puesto.
- 22 conjuntos con 3–4 parcelas y separación de 1,2 m. Las dos construcciones de misión conservan su posición.
- Identificadores, familia, orientación y polígonos compartidos por presentación y colisiones; posiciones del vendedor derivadas de la parcela del bar.
- Acabado nuevo en disco y primera curva. Los otros barrios se muestran como volúmenes provisionales hasta resolver esta revisión visual.
- Se mantienen 150 segundos, reglas, grafo, reparto de actores y archivos aprobados del protagonista.

`layout.json` registra comprobaciones de cuotas, separación, huellas, margen vial y zonas reservadas. `site-plan.svg` se genera desde los mismos datos. `captures.json` enlaza las capturas al PCK probado; el recorrido visual usa posiciones controladas y no mide FPS.

```bash
python3 scripts/build_story_layout.py
python3 scripts/validate_village.py
python3 scripts/build_godot.py --all
node scripts/capture_urban.cjs
```

La orden `--complete-urban` se reserva para extender la presentación al resolver la revisión del tramo. El verificador de publicación rechaza `urban_extent: reference-slice`; esta entrega provisional no debe reemplazar Pages.

Pendientes: revisión artística del tramo, extensión al resto del pueblo, verificación final de render y publicación. GPU y móviles reales siguen sin certificar.

Revisión posterior solicitada por el usuario: «Acercar más las casas y cerrar huecos». Las parcelas pasan de 2,6 a 1,2 m de separación; la anchura de las fachadas aumenta dentro de la huella existente y el hueco entre los dos conjuntos interiores del primer tramo se reduce de 8,22 a 2,79 m. Los jardines estrechos se adaptan a las nuevas separaciones. Sigue pendiente la revisión del tramo antes de extenderlo.
