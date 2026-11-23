import {contactoIndice} from '../config.js';
import {configuracionPincel} from '../estado.js';

const INDICE = 9;

AFRAME.registerComponent('pincel-indice', {
  init: function () {
    this.enContacto = false;
    this.punta = new THREE.Vector3();
  },

  lienzo: function () {
    const el = document.getElementById('lienzo');
    return el && el.components['lienzo-pintable'];
  },

  puntaIndice: function () {
    const mano = this.el.components['hand-tracking-controls'];
    const junta = mano && mano.jointEls && mano.jointEls[INDICE];
    if (!junta || !junta.object3D.visible) return null;
    junta.object3D.getWorldPosition(this.punta);
    if (this.punta.lengthSq() < 1e-8) return null;
    return this.punta;
  },

  tock: function () {
    const api = this.lienzo();
    if (!api || !api.motor) return;
    const punta = this.puntaIndice();
    const motor = api.motor;
    if (!punta) {
      if (this.enContacto && motor.origenTrazo() === 'indice') {
        motor.terminarTrazo();
        api.volcar();
      }
      this.enContacto = false;
      return;
    }
    const uv = api.uvDesdeMundo(punta);
    const toca = contactoIndice(uv.distancia) && uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1;
    if (toca) {
      if (motor.trazoAbierto() && motor.origenTrazo() !== 'indice') return;
      if (!motor.trazoAbierto()) motor.comenzarTrazo('indice', configuracionPincel());
      if (motor.origenTrazo() === 'indice') {
        motor.muestra(uv.u, uv.v, 0.5);
        api.volcar();
        this.enContacto = true;
      }
    } else if (this.enContacto && motor.origenTrazo() === 'indice') {
      motor.muestra(-1, 0.5, 0.5);
      if (uv.distancia > 0.03) {
        motor.terminarTrazo();
        this.enContacto = false;
      }
      api.volcar();
    }
  }
});
