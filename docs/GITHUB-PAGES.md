# Prueba Godot en GitHub Pages

El remoto local apunta a `tiago092/ovejo`. Se preparó un flujo manual en `.github/workflows/pages.yml`; aún no se verificó ni modificó la configuración remota de Pages.

El paquete mantiene el juego Three.js actual en la raíz y añade Godot en `godot-preview/`. Si el repositorio utiliza su dirección predeterminada, las direcciones serán:

- Juego actual: `https://tiago092.github.io/ovejo/`
- Prueba Godot: `https://tiago092.github.io/ovejo/godot-preview/`

Son las direcciones previstas, no una confirmación de que la nueva versión ya esté publicada. Si existe un dominio personalizado, conservarlo en Settings → Pages; el preparador también conserva un archivo `CNAME` local cuando existe.

## Preparación local

```bash
python3 scripts/build_godot.py
python3 scripts/prepare_pages.py
python3 scripts/serve_godot.py --port 8767
```

Revisar `http://127.0.0.1:8767/dist/pages/` y `http://127.0.0.1:8767/dist/pages/godot-preview/`. `artifacts/godot/pages-package.json` registra los hashes del paquete preparado y mantiene `published: false`.

Solo se copian los recursos de ejecución y licencias. El paquete excluye herramientas, fuentes Blender, pruebas, capturas e instrumentación Verification. El script verifica que la exportación sea de distribución y que coincidan sus hashes antes de preparar el sitio. No necesita Blender en CI: utiliza los GLB revisados y guardados en el repositorio.

## Publicación manual

1. Revisar y subir los cambios del proyecto a la rama predeterminada, incluyendo `godot/`, `scripts/`, `tests/godot/` y el workflow. No subir `.tools/`, `godot/.godot/` ni `dist/`; están ignorados. Los archivos originales de Three.js también deben permanecer en el repositorio.
2. En Settings → Pages → Build and deployment → Source, seleccionar **GitHub Actions**. Esto cambia la fuente de publicación del sitio completo; el paquete está diseñado para conservar el juego original en la raíz.
3. En Actions, elegir **Publicar prueba Godot en Pages → Run workflow** sobre la rama revisada. El flujo no se ejecuta automáticamente al hacer push.
4. Revisar el resultado del despliegue y abrir su URL. Añadir `godot-preview/` para probar Godot. Conservar el dominio personalizado existente, si lo hubiera.

El flujo descarga Godot y las plantillas con versiones/hashes fijados, ejecuta las pruebas de reglas y del puente web, exporta y prepara el sitio antes de desplegar. Las regresiones de navegador y las mediciones físicas son comprobaciones separadas; este workflow no las certifica.

## Comprobaciones después de publicar

- Confirmar que el juego original sigue cargando y que Godot abre desde su subdirectorio por HTTPS.
- Verificar las respuestas de `.wasm` y `.pck`, MIME, `Content-Encoding` y tamaño transferido. No se suben los archivos `.gz` hermanos: su presencia por sí sola no configura cabeceras de compresión. El resultado local de 14,9 MiB gzip no se traslada automáticamente a Pages.
- Medir caché fría a 20 Mbit/s y 100 ms; registrar tiempo hasta menú interactivo.
- Probar Android Chrome e iPhone Safari reales, audio tras gesto, rotación, multitáctil, pausa y partida completa; medir los perfiles de calidad con GPU física.
- Mantener pendiente la sustitución del enlace principal hasta completar aceptación. Volver a ejecutar el workflow desde una revisión conocida permite restaurar un paquete anterior, siempre que esa revisión contenga el workflow y sus fuentes.

La configuración sigue la [documentación oficial de workflows de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
