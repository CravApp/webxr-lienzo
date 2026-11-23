import {actualizar} from './estado.js';
import {cargarDibujo, guardarDibujo} from './storage.js';

let exportacionPendiente = false;

function descargar (dataUrl, nombre) {
  const enlace = document.createElement('a');
  enlace.href = dataUrl;
  enlace.download = nombre;
  enlace.rel = 'noopener';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

export function hayExportacionPendiente () {
  return exportacionPendiente;
}

export function crearAcciones ({motor, canvas, volcar, enSesion}) {
  function decir (mensaje, extra) {
    actualizar(Object.assign({mensaje}, extra || {}));
  }

  return {
    decir,
    deshacer () {
      const ok = motor.deshacer();
      volcar();
      decir(ok ? 'Trazo deshecho.' : 'No hay nada que deshacer.');
    },
    borrarTodo () {
      motor.borrarTodo();
      volcar();
      decir('Lienzo borrado.', {confirmarBorrado: false, borrador: false});
    },
    exportar () {
      volcar();
      const url = canvas.toDataURL('image/png');
      const inmersiva = enSesion();
      exportacionPendiente = true;
      if (!inmersiva) {
        descargar(url, 'lienzo-webxr.png');
        exportacionPendiente = false;
        decir('PNG descargado.');
        return;
      }
      try { descargar(url, 'lienzo-webxr.png'); } catch (err) { /* Quest puede bloquear la descarga en AR */ }
      decir('Al salir de AR, pulsa Exportar PNG si la descarga no empezó.');
    },
    guardar () {
      volcar();
      const resultado = guardarDibujo(canvas.toDataURL('image/png'));
      if (resultado.ok) decir('Dibujo guardado en este navegador.');
      else if (resultado.lleno) decir('No hay espacio para guardar. El dibujo actual sigue en el lienzo.');
      else decir('No se pudo guardar. El dibujo actual sigue en el lienzo.');
    },
    cargar () {
      const guardado = cargarDibujo();
      if (!guardado.ok && guardado.vacio) {
        decir('No hay ningún dibujo guardado.');
        return Promise.resolve(false);
      }
      if (!guardado.ok) {
        decir('No se pudo leer el dibujo guardado.');
        return Promise.resolve(false);
      }
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const tmp = document.createElement('canvas');
          tmp.width = motor.ancho;
          tmp.height = motor.alto;
          const ctx = tmp.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, tmp.width, tmp.height);
          ctx.drawImage(img, 0, 0, tmp.width, tmp.height);
          motor.reemplazar(ctx.getImageData(0, 0, tmp.width, tmp.height));
          volcar();
          decir('Dibujo cargado.');
          resolve(true);
        };
        img.onerror = () => {
          decir('El dibujo guardado no se pudo abrir. El lienzo actual no cambió.');
          resolve(false);
        };
        img.src = guardado.valor;
      });
    },
    alSalirDeAR () {
      if (!exportacionPendiente) return;
      decir('Puedes descargar el PNG con Exportar PNG.');
    }
  };
}
