import {COLORES} from '../config.js';

export const PALETA_ANCHO = 512;
export const PALETA_ALTO = 768;

export function crearBotones () {
  const botones = [];
  const sw = 108;
  const sh = 68;
  const gap = 10;
  const ox = 22;
  const oy = 58;
  for (let i = 0; i < COLORES.length; i++) {
    const columna = i % 4;
    const fila = Math.floor(i / 4);
    botones.push({
      id: 'color-' + i,
      tipo: 'color',
      indice: i,
      x: ox + columna * (sw + gap),
      y: oy + fila * (sh + gap),
      w: sw,
      h: sh
    });
  }
  const yTipo = 310;
  [
    {id: 'tipo-redondo', valor: 'redondo', texto: 'Redondo', x: 16, w: 156},
    {id: 'tipo-cuadrado', valor: 'cuadrado', texto: 'Cuadrado', x: 178, w: 156},
    {id: 'tipo-aerografo', valor: 'aerografo', texto: 'Aero', x: 340, w: 156}
  ].forEach((item) => {
    botones.push({tipo: 'tipo', y: yTipo, h: 52, ...item});
  });
  botones.push({id: 'opacidad-menos', tipo: 'opacidad', delta: -0.1, texto: '−', x: 16, y: 374, w: 76, h: 52});
  botones.push({id: 'opacidad-mas', tipo: 'opacidad', delta: 0.1, texto: '+', x: 420, y: 374, w: 76, h: 52});
  botones.push({id: 'borrador', tipo: 'borrador', texto: 'Borrador', x: 16, y: 440, w: 480, h: 48});
  botones.push({id: 'deshacer', tipo: 'deshacer', texto: 'Deshacer', x: 16, y: 498, w: 480, h: 48});
  botones.push({id: 'borrar', tipo: 'borrar', texto: 'Borrar todo', x: 16, y: 556, w: 480, h: 48});
  botones.push({id: 'exportar', tipo: 'exportar', texto: 'Exportar PNG', x: 16, y: 616, w: 480, h: 46});
  botones.push({id: 'guardar', tipo: 'guardar', texto: 'Guardar', x: 16, y: 670, w: 234, h: 46});
  botones.push({id: 'cargar', tipo: 'cargar', texto: 'Cargar', x: 262, y: 670, w: 234, h: 46});
  return botones;
}

export function botonEn (u, v, botones, ancho = PALETA_ANCHO, alto = PALETA_ALTO) {
  if (!Number.isFinite(u) || !Number.isFinite(v) || u < 0 || u > 1 || v < 0 || v > 1) return null;
  const x = u * ancho;
  const y = (1 - v) * alto;
  for (let i = 0; i < botones.length; i++) {
    const b = botones[i];
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b;
  }
  return null;
}

export function comandoDeBoton (boton, estadoActual) {
  if (!boton) return null;
  if (boton.tipo === 'color') return {tipo: 'color', indice: boton.indice};
  if (boton.tipo === 'tipo') return {tipo: 'tipo', valor: boton.valor};
  if (boton.tipo === 'opacidad') {
    const siguiente = Math.min(1, Math.max(0, Math.round((estadoActual.opacidad + boton.delta) * 10) / 10));
    return {tipo: 'opacidad', valor: siguiente};
  }
  if (boton.tipo === 'borrador') return {tipo: 'borrador', valor: !estadoActual.borrador};
  if (boton.tipo === 'borrar') {
    return estadoActual.confirmarBorrado ? {tipo: 'borrar-todo'} : {tipo: 'confirmar-borrado'};
  }
  return {tipo: boton.tipo};
}

export function dibujarPaleta (ctx, botones, estadoActual) {
  const w = PALETA_ANCHO;
  const h = PALETA_ALTO;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#171b27';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f3f4f8';
  ctx.font = '700 28px sans-serif';
  ctx.fillText('Paleta', 22, 38);
  ctx.font = '600 22px sans-serif';
  botones.forEach((b) => {
    let fondo = '#2a3144';
    let texto = '#f3f4f8';
    if (b.tipo === 'color') {
      fondo = COLORES[b.indice];
      texto = b.indice === 1 || b.indice === 4 ? '#1a1a1a' : '#ffffff';
      if (estadoActual.color === COLORES[b.indice] && !estadoActual.borrador) {
        ctx.strokeStyle = '#7ec8ff';
        ctx.lineWidth = 6;
      }
    } else if (b.tipo === 'tipo' && estadoActual.tipo === b.valor && !estadoActual.borrador) {
      fondo = '#7ec8ff';
      texto = '#101218';
    } else if (b.tipo === 'borrador' && estadoActual.borrador) {
      fondo = '#f0d48a';
      texto = '#101218';
    } else if (b.tipo === 'borrar' && estadoActual.confirmarBorrado) {
      fondo = '#e53935';
    }
    ctx.fillStyle = fondo;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (b.tipo === 'color' && estadoActual.color === COLORES[b.indice] && !estadoActual.borrador) {
      ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
    }
    if (b.tipo !== 'color') {
      ctx.fillStyle = texto;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const etiqueta = b.tipo === 'borrar' && estadoActual.confirmarBorrado ? '¿Borrar todo?' : b.texto;
      ctx.fillText(etiqueta, b.x + b.w / 2, b.y + b.h / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  });
  ctx.fillStyle = '#f3f4f8';
  ctx.font = '600 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Opacidad ' + Math.round(estadoActual.opacidad * 100) + '%', w / 2, 408);
  ctx.font = '500 18px sans-serif';
  ctx.fillStyle = '#d5d8e2';
  const mensaje = estadoActual.mensaje || 'Gatillo derecho para pintar';
  ctx.fillText(mensaje.slice(0, 42), w / 2, 748);
  ctx.textAlign = 'left';
}
