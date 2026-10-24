# Pueblo completo y paseo costero

La indicación «Perfecto, continua» resolvió la dirección del tramo compacto y autorizó extender el acabado tomando la fotografía de playa como referencia. `review.json` distingue esa dirección artística de las comprobaciones técnicas.

- 80 edificios: 12 disco, 18 costa, 26 comercio, 14 plaza y 10 puesto.
- 22 conjuntos de 3–4 parcelas. Separación de parcelas: 1,2 m; paredes de la primera hilera: aproximadamente 1,8 m.
- Familias completas y orientadas al camino, balcones, toldos, ropa, patios y vegetación.
- Paseo costero con tablas, plantas, madera, cuerdas, guías y luces cálidas al amanecer.
- Mismo grafo, misiones, 150 segundos, actores y reglas; protagonista aprobado intacto.

`layout.json` y `site-plan.svg` se generan desde los datos compartidos. `captures.json` enlaza las vistas al PCK; el recorrido visual controlado no mide FPS. `cameras.json` recorre ambas vistas en escritorio y vertical. `acceptance.json` marca cada comprobación como aprobada, fallida o pendiente.

[Galería](../urban-review.html) · [Implementación y comandos](../../../docs/PUEBLO-COMPACTO.md).

Las revisiones anteriores se conservan en `urban-before/`, `urban-spaced/` y `urban-reference/`. `density.json` documenta la reducción solicitada de huecos. No se reutiliza la aprobación del rostro para certificar el escenario o el rendimiento.

La exportación completa usa `python3 scripts/build_story_layout.py --complete-urban`. El guardia de publicación sigue rechazando cualquier `reference-slice`.
