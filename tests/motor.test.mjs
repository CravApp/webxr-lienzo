import assert from 'node:assert/strict';
import test from 'node:test';
import {contactoIndice, grosorPorPresion, limitarEscala, uvAPixel} from '../js/config.js';
import {crearMotor} from '../js/drawing/motor.js';
import {botonEn, comandoDeBoton, crearBotones, PALETA_ALTO, PALETA_ANCHO} from '../js/drawing/paleta-ui.js';
import {guardarEn} from '../js/storage.js';

test('el grosor sigue la presión entre 2 y 40 px', () => {
  assert.equal(grosorPorPresion(0), 2);
  assert.equal(grosorPorPresion(1), 40);
  assert.equal(grosorPorPresion(0.5), 21);
  assert.equal(grosorPorPresion(-2), 2);
  assert.equal(grosorPorPresion(4), 40);
});

test('la escala del lienzo queda entre 0,5× y 2×', () => {
  assert.equal(limitarEscala(1), 1);
  assert.equal(limitarEscala(0.1), 0.5);
  assert.equal(limitarEscala(3), 2);
});

test('el índice pinta solo a 1 cm o menos', () => {
  assert.equal(contactoIndice(0.01), true);
  assert.equal(contactoIndice(0.0101), false);
  assert.equal(contactoIndice(0), true);
});

test('el UV del plano pasa a píxeles con el origen arriba', () => {
  assert.deepEqual(uvAPixel(0, 1, 100, 50), {x: 0, y: 0});
  assert.deepEqual(uvAPixel(1, 0, 100, 50), {x: 100, y: 50});
});

test('un trazo pinta y deshacer lo borra', () => {
  const motor = crearMotor(64, 32, {marco: false});
  const cfg = {color: '#000000', tipo: 'redondo', opacidad: 1, borrador: false};
  motor.comenzarTrazo('mando', cfg);
  motor.muestra(0.5, 0.5, 0);
  motor.terminarTrazo();
  const pintado = motor.leer(32, 16);
  assert.ok(pintado[0] < 40, 'el centro del trazo debe oscurecerse');
  assert.equal(motor.deshacer(), true);
  assert.deepEqual(motor.leer(32, 16), [255, 255, 255, 255]);
  assert.equal(motor.deshacer(), false);
});

test('salir del lienzo corta el trazo', () => {
  const motor = crearMotor(64, 32, {marco: false});
  motor.comenzarTrazo('mando', {color: '#000000', tipo: 'redondo', opacidad: 1});
  motor.muestra(0.1, 0.5, 0);
  assert.equal(motor.muestra(1.4, 0.5, 0), false);
  motor.muestra(0.85, 0.5, 0);
  motor.terminarTrazo();
  assert.ok(motor.leer(6, 16)[0] < 40);
  assert.ok(motor.leer(54, 16)[0] < 40);
  assert.deepEqual(motor.leer(32, 16), [255, 255, 255, 255]);
});

test('no se dibuja fuera del lienzo', () => {
  const motor = crearMotor(32, 32, {marco: false});
  motor.comenzarTrazo('mando', {color: '#ff0000', tipo: 'redondo', opacidad: 1});
  assert.equal(motor.muestra(-0.2, 0.5, 1), false);
  assert.equal(motor.muestra(0.5, 1.2, 1), false);
  motor.terminarTrazo();
  assert.equal(motor.puedeDeshacer(), false);
  assert.deepEqual(motor.leer(16, 16), [255, 255, 255, 255]);
});

test('el borrador restaura el blanco y la opacidad 0 no pinta', () => {
  const motor = crearMotor(40, 40, {marco: false});
  motor.comenzarTrazo('mando', {color: '#000000', tipo: 'cuadrado', opacidad: 1});
  motor.muestra(0.5, 0.5, 1);
  motor.terminarTrazo();
  assert.ok(motor.leer(20, 20)[0] < 10);
  motor.comenzarTrazo('mando', {color: '#ffffff', tipo: 'cuadrado', opacidad: 1, borrador: true});
  motor.muestra(0.5, 0.5, 1);
  motor.terminarTrazo();
  assert.ok(motor.leer(20, 20)[0] > 250);

  const limpio = crearMotor(40, 40, {marco: false});
  limpio.comenzarTrazo('mando', {color: '#000000', tipo: 'redondo', opacidad: 0});
  limpio.muestra(0.5, 0.5, 1);
  limpio.terminarTrazo();
  assert.deepEqual(limpio.leer(20, 20), [255, 255, 255, 255]);
  assert.equal(limpio.puedeDeshacer(), false);
});

test('el historial conserva solo 20 trazos', () => {
  const motor = crearMotor(80, 16, {marco: false});
  for (let i = 0; i < 21; i++) {
    motor.comenzarTrazo('mando', {color: '#000000', tipo: 'redondo', opacidad: 1});
    motor.muestra((i + 0.5) / 80, 0.5, 0);
    motor.terminarTrazo();
  }
  let deshechos = 0;
  while (motor.deshacer()) deshechos += 1;
  assert.equal(deshechos, 20);
  assert.ok(motor.leer(0, 8)[0] < 80);
  assert.deepEqual(motor.leer(40, 8), [255, 255, 255, 255]);
});

test('la paleta resuelve color, opacidad y la confirmación de borrar', () => {
  const botones = crearBotones();
  const primero = botones[0];
  const u = (primero.x + 2) / PALETA_ANCHO;
  const v = 1 - (primero.y + 2) / PALETA_ALTO;
  assert.equal(botonEn(u, v, botones).tipo, 'color');
  assert.equal(botonEn(-1, 0.5, botones), null);
  const menos = botones.find((b) => b.id === 'opacidad-menos');
  assert.deepEqual(comandoDeBoton(menos, {opacidad: 1}), {tipo: 'opacidad', valor: 0.9});
  const borrar = botones.find((b) => b.id === 'borrar');
  assert.equal(comandoDeBoton(borrar, {confirmarBorrado: false}).tipo, 'confirmar-borrado');
  assert.equal(comandoDeBoton(borrar, {confirmarBorrado: true}).tipo, 'borrar-todo');
});

test('guardar avisa si localStorage está lleno y no lanza', () => {
  const almacen = {
    setItem () {
      const err = new Error('quota');
      err.name = 'QuotaExceededError';
      throw err;
    }
  };
  const resultado = guardarEn(almacen, 'datos');
  assert.equal(resultado.ok, false);
  assert.equal(resultado.lleno, true);
});
