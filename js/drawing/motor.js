import {ALTO, ANCHO, grosorPorPresion, HISTORIAL_MAX, uvAPixel} from '../config.js';

function hexARgb (hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255};
}

function indice (ancho, x, y) {
  return (y * ancho + x) * 4;
}

function mezclar (data, i, r, g, b, a) {
  const inv = 1 - a;
  data[i] = r * a + data[i] * inv;
  data[i + 1] = g * a + data[i + 1] * inv;
  data[i + 2] = b * a + data[i + 2] * inv;
  data[i + 3] = 255;
}

function pintarDisco (motor, cx, cy, radio, rgb, alpha) {
  const r = Math.max(0.5, radio);
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(motor.ancho - 1, Math.ceil(cx + r));
  const y1 = Math.min(motor.alto - 1, Math.ceil(cy + r));
  const r2 = r * r;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) mezclar(motor.data, indice(motor.ancho, x, y), rgb.r, rgb.g, rgb.b, alpha);
    }
  }
  ampliarSucio(motor, x0, y0, x1, y1);
}

function pintarCuadrado (motor, cx, cy, radio, rgb, alpha) {
  const lado = Math.max(1, radio * 2);
  const x0 = Math.max(0, Math.floor(cx - lado / 2));
  const y0 = Math.max(0, Math.floor(cy - lado / 2));
  const x1 = Math.min(motor.ancho - 1, Math.ceil(cx + lado / 2));
  const y1 = Math.min(motor.alto - 1, Math.ceil(cy + lado / 2));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) mezclar(motor.data, indice(motor.ancho, x, y), rgb.r, rgb.g, rgb.b, alpha);
  }
  ampliarSucio(motor, x0, y0, x1, y1);
}

function pintarSpray (motor, cx, cy, radio, rgb, alpha) {
  const puntos = 7;
  for (let i = 0; i < puntos; i++) {
    const ang = motor.azar() * Math.PI * 2;
    const dist = Math.sqrt(motor.azar()) * radio;
    const x = cx + Math.cos(ang) * dist;
    const y = cy + Math.sin(ang) * dist;
    pintarDisco(motor, x, y, Math.max(0.8, radio * 0.18), rgb, alpha * 0.35);
  }
}

function sello (motor, x, y, radio, cfg) {
  const alpha = Math.min(1, Math.max(0, cfg.opacidad || 0));
  if (alpha <= 0) return false;
  const rgb = hexARgb(cfg.color);
  if (cfg.tipo === 'cuadrado') pintarCuadrado(motor, x, y, radio, rgb, alpha);
  else if (cfg.tipo === 'aerografo') pintarSpray(motor, x, y, radio, rgb, alpha);
  else pintarDisco(motor, x, y, radio, rgb, alpha);
  return true;
}

function ampliarSucio (motor, x0, y0, x1, y1) {
  motor.sucio = true;
  motor.sucioRect.x0 = Math.min(motor.sucioRect.x0, x0);
  motor.sucioRect.y0 = Math.min(motor.sucioRect.y0, y0);
  motor.sucioRect.x1 = Math.max(motor.sucioRect.x1, x1);
  motor.sucioRect.y1 = Math.max(motor.sucioRect.y1, y1);
}

function limpiarSucio (motor) {
  motor.sucio = false;
  motor.sucioRect.x0 = motor.ancho;
  motor.sucioRect.y0 = motor.alto;
  motor.sucioRect.x1 = 0;
  motor.sucioRect.y1 = 0;
}

function llenar (motor, r, g, b) {
  const data = motor.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  motor.sucio = true;
  motor.sucioRect.x0 = 0;
  motor.sucioRect.y0 = 0;
  motor.sucioRect.x1 = motor.ancho - 1;
  motor.sucioRect.y1 = motor.alto - 1;
}

function marco (motor) {
  const g = 8;
  const rgb = hexARgb('#c5cad3');
  for (let y = 0; y < motor.alto; y++) {
    for (let x = 0; x < motor.ancho; x++) {
      if (x < g || y < g || x >= motor.ancho - g || y >= motor.alto - g) {
        const i = indice(motor.ancho, x, y);
        motor.data[i] = rgb.r;
        motor.data[i + 1] = rgb.g;
        motor.data[i + 2] = rgb.b;
        motor.data[i + 3] = 255;
      }
    }
  }
}

function dentro (u, v) {
  return u >= 0 && u <= 1 && v >= 0 && v <= 1 && Number.isFinite(u) && Number.isFinite(v);
}

export function crearMotor (ancho = ANCHO, alto = ALTO, opciones = {}) {
  const motor = {
    ancho,
    alto,
    data: new Uint8ClampedArray(ancho * alto * 4),
    historial: [],
    trazo: null,
    sucio: true,
    sucioRect: {x0: 0, y0: 0, x1: ancho - 1, y1: alto - 1},
    _semilla: 1,
    azar () {
      this._semilla = (1664525 * this._semilla + 1013904223) >>> 0;
      return this._semilla / 4294967296;
    }
  };
  llenar(motor, 255, 255, 255);
  if (opciones.marco) marco(motor);

  function segmentar (x0, y0, x1, y1, radio, cfg) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const paso = Math.max(1, radio * 0.5);
    const n = Math.max(1, Math.ceil(dist / paso));
    let pinto = false;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pinto = sello(motor, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radio, cfg) || pinto;
    }
    return pinto;
  }

  return {
    ancho,
    alto,
    data: motor.data,
    get sucio () { return motor.sucio; },
    get sucioRect () { return motor.sucioRect; },
    consumirSucio () {
      const rect = Object.assign({}, motor.sucioRect);
      const estaba = motor.sucio;
      limpiarSucio(motor);
      return estaba ? rect : null;
    },
    trazoAbierto () { return !!motor.trazo; },
    origenTrazo () { return motor.trazo ? motor.trazo.origen : null; },
    comenzarTrazo (origen, cfg) {
      if (motor.trazo) return;
      motor.trazo = {
        origen,
        cfg: Object.assign({}, cfg),
        antes: motor.data.slice(),
        ultimo: null,
        dibujo: false
      };
    },
    muestra (u, v, presion) {
      if (!motor.trazo) return false;
      if (!dentro(u, v)) {
        motor.trazo.ultimo = null;
        return false;
      }
      const {x, y} = uvAPixel(u, v, ancho, alto);
      const radio = grosorPorPresion(presion) / 2;
      const cfg = motor.trazo.cfg;
      const pinto = !motor.trazo.ultimo
        ? sello(motor, x, y, radio, cfg)
        : segmentar(motor.trazo.ultimo.x, motor.trazo.ultimo.y, x, y, radio, cfg);
      motor.trazo.ultimo = {x, y};
      if (pinto) motor.trazo.dibujo = true;
      return pinto;
    },
    terminarTrazo () {
      if (!motor.trazo) return false;
      const hecho = motor.trazo.dibujo;
      if (hecho) {
        motor.historial.push(motor.trazo.antes);
        if (motor.historial.length > HISTORIAL_MAX) motor.historial.shift();
      }
      motor.trazo = null;
      return hecho;
    },
    deshacer () {
      if (motor.trazo) this.terminarTrazo();
      const antes = motor.historial.pop();
      if (!antes) return false;
      motor.data.set(antes);
      motor.sucio = true;
      motor.sucioRect.x0 = 0;
      motor.sucioRect.y0 = 0;
      motor.sucioRect.x1 = ancho - 1;
      motor.sucioRect.y1 = alto - 1;
      return true;
    },
    puedeDeshacer () {
      return motor.historial.length > 0;
    },
    borrarTodo () {
      if (motor.trazo) motor.trazo = null;
      llenar(motor, 255, 255, 255);
      if (opciones.marco) marco(motor);
      motor.historial = [];
    },
    reemplazar (origen) {
      if (motor.trazo) motor.trazo = null;
      const src = origen.data ? origen.data : origen;
      if (src.length !== motor.data.length) throw new Error('El dibujo guardado no tiene el tamaño del lienzo.');
      motor.data.set(src);
      motor.historial = [];
      motor.sucio = true;
      motor.sucioRect.x0 = 0;
      motor.sucioRect.y0 = 0;
      motor.sucioRect.x1 = ancho - 1;
      motor.sucioRect.y1 = alto - 1;
    },
    leer (x, y) {
      const px = Math.round(x);
      const py = Math.round(y);
      const i = indice(ancho, px, py);
      return [motor.data[i], motor.data[i + 1], motor.data[i + 2], motor.data[i + 3]];
    }
  };
}

export function volcar (motor, canvas) {
  const rect = motor.consumirSucio();
  if (!rect || typeof ImageData === 'undefined') return false;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  if (canvas.width !== motor.ancho) canvas.width = motor.ancho;
  if (canvas.height !== motor.alto) canvas.height = motor.alto;
  ctx.putImageData(new ImageData(motor.data, motor.ancho, motor.alto), 0, 0);
  return true;
}
