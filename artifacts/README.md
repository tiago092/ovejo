# Revisión visual y verificación

- [Antes y después: inicio, costa, disco, puesto de salud y celular](comparison.html).
- [Personaje: referencia frontal y modelo de frente, tres cuartos y perfil](character.html).
- [Captura de la comparación del personaje](character-comparison.png).
- [Introducción, primer plano](after-intro-closeup.png).
- [Resultado de la misión](after-result.png).
- [Escritorio a 1920 × 1080](after-desktop-1920.png).
- [Celular vertical](after-mobile-portrait.png) y [horizontal](after-mobile-landscape.png).
- [Informe automático completo](verification.json).

## Verificación automática

37 comprobaciones pasaron. Sin excepciones JavaScript ni errores de shaders registrados.

Se probaron apertura local y HTTP; introducción completa y omitida con teclado/botón; pausa y cambio de pestaña; reintentos; recogida, entrega y derrotas simultáneas a la entrega; ruta sin atravesar edificios; reinicio del tráfico; calidad automática y persistida; acelerador táctil y cancelación sin desplazamiento de página; movimiento reducido y música local con SoundCloud bloqueado.

| Escena | Calidad | Llamadas de dibujo por cuadro | Presupuesto |
|---|---|---:|---:|
| coast | high | 189 | 300 |
| club | high | 195 | 300 |
| hospital | high | 172 | 300 |
| portrait | low | 97 | 150 |
| landscape | low | 111 | 150 |

Las capturas de alta incluyen la cámara principal y el recuadro del conductor; las de baja usan el recuadro cerrado inicialmente. Las cifras incluyen sombras y ambas cámaras activas.

## Recorrido de 60 segundos

Duración: **60.06 s**; 164 cuadros, **2.73 FPS**. Mediana de tiempo por cuadro: 366.6 ms; percentil 95: 466.6 ms. Rango de llamadas de dibujo durante el recorrido: 164–205.

Entorno: Chrome headless con ANGLE / SwiftShader, renderizado por software, a 1280 × 720 y calidad alta con cámara del conductor abierta. La ruta recorre calles a 12 unidades por segundo; las pruebas mantienen tiempo y resistencia para completar la medición. Este entorno no dispone de GPU ni teléfono físico.

**No se certificaron los objetivos de 60 FPS en PC y 30 FPS en celular.** Requieren medir el juego en hardware real. Las cifras de software anteriores quedan registradas como límite de esta validación, sin extrapolarlas al rendimiento de una GPU.

## Comparación y reproducción

Los archivos `before-*` corresponden a la versión guardada antes de implementar la renovación, basada en el commit `b8f897f`. Los `after-*` corresponden a esta versión. La comparación muestra también los cambios de cámara e interfaz; no es una comparación de píxeles con cámaras idénticas.

Para regenerar la verificación y las capturas de la nueva versión, ejecutar desde la raíz:

```bash
node tests/browser.cjs --benchmark
```

Las referencias originales del perfil y la ambulancia se consultaron en la conversación. La hoja multivista que aparece en el estudio del personaje es un recurso generado, identificado como tal; no se presenta como una fotografía original.
