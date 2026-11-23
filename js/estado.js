import {COLORES} from './config.js';

const oyentes = new Set();

export const estado = {
  color: COLORES[0],
  tipo: 'redondo',
  opacidad: 1,
  borrador: false,
  mensaje: '',
  confirmarBorrado: false
};

export function actualizar (parcial) {
  Object.assign(estado, parcial);
  oyentes.forEach((fn) => fn(estado));
}

export function suscribir (fn) {
  oyentes.add(fn);
  fn(estado);
  return () => oyentes.delete(fn);
}

export function configuracionPincel () {
  return {
    color: estado.borrador ? '#ffffff' : estado.color,
    tipo: estado.tipo,
    opacidad: estado.borrador ? 1 : estado.opacidad,
    borrador: estado.borrador
  };
}
