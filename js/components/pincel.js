import {grosorPorPresion} from '../config.js';
import {configuracionPincel, estado, suscribir} from '../estado.js';
import {leerBoton, leerGatillo, vibrar} from '../xr/fuentes.js';

AFRAME.registerComponent('pincel', {
  init: function () {
    this.prevGatillo = false;
    this.prevB = false;
    this.ultimaVibracion = 0;
    this.normal = new THREE.Vector3();
    this.hit = new THREE.Vector3();
    this.q = new THREE.Quaternion();
    this.colorChip = '';
    this.chip = document.createElement('a-entity');
    this.chip.setAttribute('geometry', 'primitive: circle; radius: 0.5');
    this.chip.setAttribute('position', '0 0.03 -0.09');
    this.el.appendChild(this.chip);
    this.indicador = document.getElementById('indicador-punta');
    suscribir(() => this.pintarIndicadores(leerGatillo(this.el.sceneEl && this.el.sceneEl.xrSession, 'right')));
  },

  lienzo: function () {
    const el = document.getElementById('lienzo');
    return el && el.components['lienzo-pintable'];
  },

  paleta: function () {
    const el = document.getElementById('mando-izq');
    return el && el.components.paleta;
  },

  interseccion: function () {
    const ray = this.el.components.raycaster;
    if (!ray || !ray.intersections || !ray.intersections.length) return null;
    return ray.intersections[0];
  },

  pintarIndicadores: function (presion) {
    const grosor = grosorPorPresion(presion || 0.35);
    const color = estado.borrador ? '#f4f7fb' : estado.color;
    const t = (grosor - 2) / 38;
    const s = 0.012 + t * 0.028;
    if (this.colorChip !== color) {
      this.colorChip = color;
      this.chip.setAttribute('material', 'shader: flat; color: ' + color);
      if (this.indicador) this.indicador.setAttribute('material', 'shader: flat; color: ' + color);
    }
    if (this.chip.object3D) this.chip.object3D.scale.set(s, s, s);
    if (!this.indicador) return;
    const api = this.lienzo();
    const diam = api ? Math.max(0.012, (grosor / 2048) * api.el.object3D.scale.x) : s;
    this.indicador.object3D.scale.set(diam, diam, diam);
  },

  colocarIndicador: function (punto, objeto) {
    if (!this.indicador || !punto) {
      if (this.indicador) this.indicador.object3D.visible = false;
      return;
    }
    objeto.updateWorldMatrix(true, false);
    this.normal.set(0, 0, 1).transformDirection(objeto.matrixWorld).normalize();
    this.hit.copy(punto).addScaledVector(this.normal, 0.006);
    const padre = this.indicador.object3D.parent;
    if (padre) padre.worldToLocal(this.hit);
    this.indicador.object3D.position.copy(this.hit);
    this.indicador.object3D.quaternion.copy(objeto.getWorldQuaternion(this.q));
    this.indicador.object3D.visible = true;
  },

  tock: function (tiempo) {
    const api = this.lienzo();
    if (!api) return;
    const session = this.el.sceneEl.xrSession;
    if (!session) {
      if (this.indicador) this.indicador.object3D.visible = false;
      return;
    }
    const presion = leerGatillo(session, 'right');
    const gatillo = presion > 0.02;
    const b = leerBoton(session, 'right', 5).pressed;
    if (b && !this.prevB && api.motor) {
      api.motor.terminarTrazo();
      const acciones = this.el.sceneEl.sistemasLienzo;
      if (acciones) acciones.deshacer();
    }
    this.prevB = b;

    const hit = this.interseccion();
    const esLienzo = !!(hit && hit.object && hit.object.el && hit.object.el.id === 'lienzo');
    const esPaleta = !!(hit && hit.object && hit.object.el && hit.object.el.classList.contains('ui-paleta'));
    this.pintarIndicadores(gatillo ? presion : 0.35);
    if (esLienzo) this.colocarIndicador(hit.point, api.el.object3D);
    else if (this.indicador) this.indicador.object3D.visible = false;

    const motor = api.motor;
    if (gatillo && !this.prevGatillo && esPaleta) {
      const paleta = this.paleta();
      const uv = hit.uv;
      if (paleta && uv) paleta.pulsar(uv.x, uv.y);
    }

    if (gatillo && esLienzo && uvValida(hit.uv)) {
      if (!motor.trazoAbierto()) motor.comenzarTrazo('mando', configuracionPincel());
      if (motor.origenTrazo() === 'mando') {
        const dibujo = motor.muestra(hit.uv.x, hit.uv.y, presion);
        api.volcar();
        if (dibujo && tiempo - this.ultimaVibracion > 90) {
          vibrar(session, 'right');
          this.ultimaVibracion = tiempo;
        }
      }
    } else if (motor.trazoAbierto() && motor.origenTrazo() === 'mando') {
      if (gatillo) motor.muestra(-1, 0, presion);
      else motor.terminarTrazo();
      api.volcar();
    }
    if (!gatillo && motor.trazoAbierto() && motor.origenTrazo() === 'mando') {
      motor.terminarTrazo();
      api.volcar();
    }
    this.prevGatillo = gatillo;
  }
});

function uvValida (uv) {
  return uv && Number.isFinite(uv.x) && Number.isFinite(uv.y);
}
