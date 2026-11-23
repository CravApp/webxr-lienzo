export const VERSION_AFRAME = '1.8.0';

export const ANCHO = 2048;
export const ALTO = 1434;
export const ANCHO_M = 1;
export const ALTO_M = 0.7;
export const POSICION_INICIAL = {x: 0, y: 1.2, z: -1};

export const ESCALA_MIN = 0.5;
export const ESCALA_MAX = 2;

export const GROSOR_MIN = 2;
export const GROSOR_MAX = 40;

export const HISTORIAL_MAX = 20;

export const UMBRAL_INDICE_M = 0.01;

export const CLAVE_STORAGE = 'webxr-lienzo:dibujo:v1';

export const COLORES = [
  '#1a1a1a',
  '#f7f7f7',
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#1e88e5',
  '#8e24aa',
  '#6d4c41',
  '#ec407a',
  '#00acc1',
  '#607d8b'
];

export const TIPOS_PINCEL = [
  {id: 'redondo', nombre: 'Redondo'},
  {id: 'cuadrado', nombre: 'Cuadrado'},
  {id: 'aerografo', nombre: 'Aerógrafo'}
];

export function grosorPorPresion (presion) {
  const t = Math.min(1, Math.max(0, Number(presion) || 0));
  return GROSOR_MIN + (GROSOR_MAX - GROSOR_MIN) * t;
}

export function limitarEscala (escala) {
  return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala));
}

export function contactoIndice (distanciaMetros) {
  return distanciaMetros >= 0 && distanciaMetros <= UMBRAL_INDICE_M;
}

export function uvAPixel (u, v, ancho = ANCHO, alto = ALTO) {
  return {
    x: u * ancho,
    y: (1 - v) * alto
  };
}
