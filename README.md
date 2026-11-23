# webxr-lienzo

Lienzo WebXR para Meta Quest 3. Se pinta con los mandos como pinceles y el passthrough se ve en todo lo que no es el lienzo. La aplicación evoluciona el spike de passthrough: el cubo de prueba ya no está.

https://cravapp.github.io/webxr-lienzo/

## Controles

En el Quest 3, con Meta Quest Browser:

- **Entrar en AR** abre una sesión `immersive-ar` con el suelo de referencia `local-floor`.
- **Gatillo derecho:** pinta donde apunta el rayo. La presión cambia el grosor (de 2 a 40 px).
- **Grip** de un mando, apuntando al lienzo: lo mueve y lo orienta. **Los dos grips** a la vez lo escalan entre 0,5× y 2×.
- **Paleta del mando izquierdo:** apúntala con el rayo derecho y pulsa el gatillo para elegir color (12), pincel (redondo, cuadrado o aerógrafo), opacidad, borrador, deshacer, borrar todo, exportar PNG, guardar o cargar.
- **Botón B** del mando derecho: deshace el último trazo (hasta 20).
- **Dedo índice:** si el visor tiene el seguimiento de manos activo, tocar el lienzo a menos de 1 cm pinta con la configuración actual.
- En el escritorio se puede probar el mismo lienzo con el ratón, y exportar, guardar o cargar desde la página.

Al salir de AR el dibujo sigue en la página. Si el PNG no se descarga dentro de la sesión, **Exportar PNG** queda disponible en la página 2D.

## GitHub Pages

En **Settings > Pages > Source** hay que elegir **GitHub Actions**. Cada push a `main` publica la raíz del repositorio, sin paso de compilación. A-Frame 1.8.0 está en `vendor/aframe-1.8.0.min.js`.
