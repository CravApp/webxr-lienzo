import {CLAVE_STORAGE} from './config.js';

export function guardarEn (almacen, valor, clave = CLAVE_STORAGE) {
  try {
    almacen.setItem(clave, valor);
    return {ok: true};
  } catch (err) {
    const lleno = !!(err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014));
    return {ok: false, lleno, error: err};
  }
}

export function cargarDe (almacen, clave = CLAVE_STORAGE) {
  try {
    const valor = almacen.getItem(clave);
    if (!valor) return {ok: false, vacio: true};
    return {ok: true, valor};
  } catch (err) {
    return {ok: false, vacio: false, error: err};
  }
}

export function guardarDibujo (dataUrl) {
  return guardarEn(localStorage, dataUrl);
}

export function cargarDibujo () {
  return cargarDe(localStorage);
}
