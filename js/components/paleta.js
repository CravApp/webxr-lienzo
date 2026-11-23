import {COLORES} from '../config.js';
import {actualizar, estado, suscribir} from '../estado.js';
import {comandoDeBoton, crearBotones, dibujarPaleta, PALETA_ALTO, PALETA_ANCHO, botonEn} from '../drawing/paleta-ui.js';

AFRAME.registerComponent('paleta', {
  init: function () {
    this.botones = crearBotones();
    this.canvas = document.createElement('canvas');
    this.canvas.width = PALETA_ANCHO;
    this.canvas.height = PALETA_ALTO;
    this.ctx = this.canvas.getContext('2d');
    this.panel = document.createElement('a-entity');
    this.panel.classList.add('ui-paleta');
    this.panel.setAttribute('geometry', 'primitive: plane; width: 0.24; height: 0.36');
    this.panel.setAttribute('position', '0 0.1 0.04');
    this.panel.setAttribute('rotation', '-65 0 0');
    this.el.appendChild(this.panel);
    this.alMesh = this.aplicarTextura.bind(this);
    this.panel.addEventListener('object3dset', this.alMesh);
    this.bajaSuscripcion = suscribir(() => this.redibujar());
    this.redibujar();
    this.aplicarTextura();
  },

  remove: function () {
    if (this.bajaSuscripcion) this.bajaSuscripcion();
    this.panel.removeEventListener('object3dset', this.alMesh);
  },

  aplicarTextura: function () {
    const mesh = this.panel.getObject3D('mesh');
    if (!mesh || this.textura) return;
    this.textura = new THREE.CanvasTexture(this.canvas);
    if ('colorSpace' in this.textura && THREE.SRGBColorSpace) this.textura.colorSpace = THREE.SRGBColorSpace;
    this.textura.needsUpdate = true;
    mesh.material = new THREE.MeshBasicMaterial({map: this.textura, side: THREE.DoubleSide});
  },

  redibujar: function () {
    dibujarPaleta(this.ctx, this.botones, estado);
    if (this.textura) this.textura.needsUpdate = true;
  },

  pulsar: function (u, v) {
    const boton = botonEn(u, v, this.botones);
    const comando = comandoDeBoton(boton, estado);
    if (!comando) return;
    if (comando.tipo !== 'borrar-todo' && comando.tipo !== 'confirmar-borrado' && estado.confirmarBorrado) {
      actualizar({confirmarBorrado: false});
    }
    const acciones = this.el.sceneEl && this.el.sceneEl.sistemasLienzo;
    if (comando.tipo === 'color') {
      actualizar({color: COLORES[comando.indice], borrador: false, confirmarBorrado: false, mensaje: 'Color elegido.'});
    } else if (comando.tipo === 'tipo') {
      actualizar({tipo: comando.valor, borrador: false, mensaje: 'Pincel cambiado.'});
    } else if (comando.tipo === 'opacidad') {
      actualizar({opacidad: comando.valor, mensaje: 'Opacidad ' + Math.round(comando.valor * 100) + '%.'});
    } else if (comando.tipo === 'borrador') {
      actualizar({borrador: comando.valor, mensaje: comando.valor ? 'Borrador activado.' : 'Borrador desactivado.'});
    } else if (comando.tipo === 'confirmar-borrado') {
      actualizar({confirmarBorrado: true, mensaje: 'Pulsa otra vez para borrar todo.'});
    } else if (comando.tipo === 'borrar-todo' && acciones) {
      acciones.borrarTodo();
    } else if (comando.tipo === 'deshacer' && acciones) {
      acciones.deshacer();
    } else if (comando.tipo === 'exportar' && acciones) {
      acciones.exportar();
    } else if (comando.tipo === 'guardar' && acciones) {
      acciones.guardar();
    } else if (comando.tipo === 'cargar' && acciones) {
      acciones.cargar();
    }
  }
});
