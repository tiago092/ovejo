# Godot en GitHub Pages

Por decisión del usuario, el sitio publicará únicamente Godot en la dirección principal: `https://tiago092.github.io/ovejo/`. No se incluirá Three.js ni una ruta `godot-preview/` en el paquete publicado. Las fuentes históricas permanecen en el repositorio como referencia de las pruebas de migración.

La configuración está preparada localmente; esto no confirma un despliegue remoto. Si existe un dominio personalizado, conservarlo en Settings → Pages; el preparador conserva un archivo `CNAME` local cuando existe.

## Preparación local

```bash
python3 scripts/build_godot.py
python3 scripts/prepare_pages.py
python3 scripts/serve_godot.py --port 8767
```

Revisar `http://127.0.0.1:8767/dist/pages/`. `artifacts/godot/pages-package.json` registra los hashes del paquete preparado y mantiene `published: false` hasta verificar la publicación.

Solo se copian recursos de ejecución y licencias. Se excluyen herramientas, fuentes Blender, pruebas, capturas e instrumentación Verification. El script verifica que la exportación sea de distribución y que coincidan sus hashes. No necesita Blender en CI: utiliza los GLB guardados en el repositorio.

## Publicación

1. Subir los cambios a la rama predeterminada, incluyendo `godot/`, `scripts/`, `tests/godot/` y `.github/workflows/pages.yml`. No subir `.tools/`, `godot/.godot/` ni `dist/`.
2. En Settings → Pages → Build and deployment → Source, seleccionar **GitHub Actions**. Publicar desde la raíz de la rama seguiría mostrando el HTML histórico de Three.js.
3. En Actions, elegir **Publicar Godot en Pages → Run workflow** sobre la rama revisada. El flujo es manual.
4. Revisar el resultado del despliegue y abrir la dirección principal. Godot sustituye al juego anterior.

El flujo descarga Godot y plantillas con versiones/hashes fijados, ejecuta pruebas de reglas y del puente web, exporta y prepara el sitio antes de desplegar. Las regresiones de navegador y mediciones físicas son comprobaciones separadas.

## Comprobaciones después de publicar

- Confirmar que la dirección principal carga Godot por HTTPS.
- Verificar `.wasm` y `.pck`, MIME, `Content-Encoding` y tamaño transferido. No se suben archivos `.gz` hermanos: su presencia no configura compresión. El resultado local de 14,9 MiB gzip no se traslada automáticamente a Pages.
- Medir caché fría a 20 Mbit/s y 100 ms y registrar tiempo hasta menú interactivo.
- Probar Android Chrome e iPhone Safari reales, audio, rotación, multitáctil, pausa y partida completa; medir los perfiles de calidad con GPU física. Estas comprobaciones siguen pendientes.

Referencia: [workflows de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
