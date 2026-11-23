import {crearAcciones} from './acciones.js';
import {configuracionPincel, suscribir} from './estado.js';
import './components/mando-visible.js';
import './components/lienzo-pintable.js';
import './components/paleta.js';
import './components/pincel.js';
import './components/pincel-indice.js';

const escenaHtml = `
  <a-entity light="type: ambient; intensity: 0.85"></a-entity>
  <a-entity light="type: directional; intensity: 0.7; color: #fff4e5" position="0.4 2 0.6"></a-entity>

  <a-entity id="indicador-punta" geometry="primitive: circle; radius: 0.5" material="shader: flat; color: #1a1a1a" visible="false"></a-entity>

  <a-entity id="lienzo" class="pintable"
    geometry="primitive: plane; width: 1; height: 0.7"
    position="0 1.2 -1"
    lienzo-pintable></a-entity>

  <a-entity id="mando-der"
    meta-touch-controls="hand: right; model: true"
    laser-controls="hand: right; model: true"
    raycaster="objects: .pintable, .ui-paleta; far: 8; showLine: true; lineColor: #7ec8ff; lineOpacity: 0.95"
    mando-visible="hand: right; rayo: true"
    pincel></a-entity>

  <a-entity id="mando-izq"
    meta-touch-controls="hand: left; model: true"
    raycaster="objects: .pintable; far: 4; showLine: false"
    mando-visible="hand: left; rayo: false"
    paleta></a-entity>

  <a-entity id="mano-der" hand-tracking-controls="hand: right" pincel-indice></a-entity>
  <a-entity id="mano-izq" hand-tracking-controls="hand: left" pincel-indice></a-entity>

  <a-entity id="camara-rig" position="0 0 0">
    <a-entity camera look-controls wasd-controls position="0 1.6 0"></a-entity>
  </a-entity>
`;

function uvDesdePuntero (ev, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    u: (ev.clientX - rect.left) / rect.width,
    v: 1 - (ev.clientY - rect.top) / rect.height
  };
}

function arrancar () {
  const vista = document.getElementById('vista-lienzo');
  const escena = document.createElement('a-scene');
  escena.setAttribute('xr-mode-ui', 'XRMode: ar; enterARButton: #entrar-ar');
  escena.setAttribute('webxr', 'requiredFeatures: local-floor; optionalFeatures: hand-tracking; referenceSpaceType: local-floor');
  escena.setAttribute('background', 'transparent: true');
  escena.setAttribute('renderer', 'alpha: true; colorManagement: true; antialias: true');
  escena.setAttribute('loading-screen', 'dotsColor: #7ec8ff; backgroundColor: #12141c');
  escena.innerHTML = escenaHtml;
  document.body.appendChild(escena);

  escena.addEventListener('enter-vr', () => document.body.classList.add('en-xr'));
  escena.addEventListener('exit-vr', () => {
    document.body.classList.remove('en-xr');
    if (escena.sistemasLienzo) escena.sistemasLienzo.alSalirDeAR();
  });

  const alCargar = async () => {
    const lienzo = document.getElementById('lienzo').components['lienzo-pintable'];
    const acciones = crearAcciones({
      motor: lienzo.motor,
      canvas: vista,
      volcar: () => lienzo.volcar(),
      enSesion: () => !!(escena.xrSession)
    });
    escena.sistemasLienzo = acciones;
    const mensaje = document.getElementById('mensaje');
    const aviso = document.getElementById('aviso');
    suscribir((estadoActual) => { mensaje.textContent = estadoActual.mensaje || ''; });

    document.getElementById('btn-deshacer').addEventListener('click', () => acciones.deshacer());
    document.getElementById('btn-borrar').addEventListener('click', () => acciones.borrarTodo());
    document.getElementById('btn-exportar').addEventListener('click', () => acciones.exportar());
    document.getElementById('btn-guardar').addEventListener('click', () => acciones.guardar());
    document.getElementById('btn-cargar').addEventListener('click', () => acciones.cargar());

    let pintando = false;
    const mover = (ev) => {
      if (!pintando) return;
      const uv = uvDesdePuntero(ev, vista);
      if (!lienzo.motor.trazoAbierto()) lienzo.motor.comenzarTrazo('raton', configuracionPincel());
      if (lienzo.motor.origenTrazo() === 'raton') lienzo.motor.muestra(uv.u, uv.v, 0.55);
      lienzo.volcar();
    };
    vista.addEventListener('pointerdown', (ev) => {
      pintando = true;
      vista.setPointerCapture(ev.pointerId);
      mover(ev);
    });
    vista.addEventListener('pointermove', mover);
    const soltar = () => {
      if (!pintando) return;
      pintando = false;
      if (lienzo.motor.origenTrazo() === 'raton') lienzo.motor.terminarTrazo();
      lienzo.volcar();
    };
    vista.addEventListener('pointerup', soltar);
    vista.addEventListener('pointercancel', soltar);

    let ar = false;
    try {
      ar = !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar'));
    } catch (err) {
      ar = false;
    }
    if (!ar && aviso) {
      aviso.textContent = 'Se requiere Meta Quest Browser en un Quest 3 para la sesión de realidad aumentada.';
    }
  };
  if (escena.hasLoaded) alCargar();
  else escena.addEventListener('loaded', alCargar);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
else arrancar();
