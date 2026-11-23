import {buscarControlador} from '../xr/fuentes.js';

AFRAME.registerComponent('mando-visible', {
  schema: {
    hand: {default: 'right', oneOf: ['left', 'right']},
    rayo: {default: false}
  },

  init: function () {
    this.modeloListo = false;
    this.eventosNativos = false;
    this.botones = {trigger: false, grip: false};
    this.matriz = new THREE.Matrix4();
    this.escala = new THREE.Vector3();
    this.onModelLoaded = this.onModelLoaded.bind(this);
    this.onModelError = this.onModelError.bind(this);
    this.onConnected = this.onConnected.bind(this);
    this.onDisconnected = this.onDisconnected.bind(this);
    this.alSalir = this.alSalir.bind(this);
    this.el.addEventListener('model-loaded', this.onModelLoaded);
    this.el.addEventListener('model-error', this.onModelError);
    this.el.addEventListener('controllerconnected', this.onConnected);
    this.el.addEventListener('controllerdisconnected', this.onDisconnected);
    if (this.el.sceneEl) this.el.sceneEl.addEventListener('exit-vr', this.alSalir);
    this.el.object3D.visible = false;
    this.cargarModeloOficial();
  },

  remove: function () {
    if (this.timer) window.clearTimeout(this.timer);
    if (this.el.sceneEl) this.el.sceneEl.removeEventListener('exit-vr', this.alSalir);
  },

  urlModelo: function () {
    const mano = this.data.hand === 'left' ? 'left' : 'right';
    return 'https://cdn.aframe.io/controllers/meta/quest-touch-plus-' + mano + '.glb';
  },

  cargarModeloOficial: function () {
    if (this.pedido) return;
    this.pedido = true;
    this.el.setAttribute('gltf-model', this.urlModelo());
    this.timer = window.setTimeout(() => {
      if (!this.modeloListo) this.crearRespaldo();
    }, 3000);
  },

  onModelLoaded: function (evt) {
    if (evt.target !== this.el) return;
    const model = (evt.detail && evt.detail.model) || this.el.getObject3D('mesh');
    let tieneMalla = false;
    if (model) model.traverse((node) => { if (node.isMesh) tieneMalla = true; });
    if (!tieneMalla) {
      this.crearRespaldo();
      return;
    }
    this.modeloListo = true;
    if (this.timer) window.clearTimeout(this.timer);
    this.quitarRespaldo();
    this.opacar(model);
    model.visible = true;
  },

  onModelError: function (evt) {
    if (evt.target !== this.el) return;
    this.modeloListo = false;
    this.crearRespaldo();
  },

  opacar: function (root) {
    root.traverse((node) => {
      if (!node.isMesh) return;
      node.visible = true;
      node.frustumCulled = false;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => {
        if (!m) return;
        m.transparent = false;
        m.opacity = 1;
        m.depthWrite = true;
        m.alphaTest = 0;
        m.needsUpdate = true;
      });
    });
  },

  crearCaja: function (ancho, alto, profundo, posicion, color) {
    const caja = document.createElement('a-box');
    caja.setAttribute('width', ancho);
    caja.setAttribute('height', alto);
    caja.setAttribute('depth', profundo);
    caja.setAttribute('position', posicion);
    caja.setAttribute('material', 'shader: flat; color: ' + color);
    return caja;
  },

  crearRespaldo: function () {
    if (this.respaldo || this.modeloListo) return;
    const root = document.createElement('a-entity');
    root.setAttribute('class', 'mando-respaldo');
    root.appendChild(this.crearCaja(0.05, 0.04, 0.12, '0 -0.005 -0.02', '#f4f7fb'));
    const anillo = document.createElement('a-cylinder');
    anillo.setAttribute('radius', 0.018);
    anillo.setAttribute('height', 0.028);
    anillo.setAttribute('position', '0 0.028 -0.03');
    anillo.setAttribute('material', 'shader: flat; color: #c9d4e4');
    root.appendChild(anillo);
    if (this.data.rayo) {
      root.appendChild(this.crearCaja(0.006, 0.006, 0.5, '0 0 -0.32', '#7ec8ff'));
      const punta = document.createElement('a-sphere');
      punta.setAttribute('radius', 0.014);
      punta.setAttribute('position', '0 0 -0.58');
      punta.setAttribute('material', 'shader: flat; color: #ffffff');
      root.appendChild(punta);
    }
    this.el.appendChild(root);
    this.respaldo = root;
  },

  quitarRespaldo: function () {
    if (!this.respaldo) return;
    if (this.respaldo.parentNode) this.respaldo.parentNode.removeChild(this.respaldo);
    this.respaldo = null;
  },

  onConnected: function (evt) {
    const nombre = evt.detail && evt.detail.name;
    if (nombre === 'meta-touch-controls' || nombre === 'oculus-touch-controls') this.eventosNativos = true;
  },

  onDisconnected: function (evt) {
    const nombre = evt.detail && evt.detail.name;
    if (nombre === 'meta-touch-controls' || nombre === 'oculus-touch-controls') this.eventosNativos = false;
  },

  alSalir: function () {
    this.el.object3D.visible = false;
    this.botones.trigger = false;
    this.botones.grip = false;
  },

  pulsar: function (nombre, pressed) {
    pressed = !!pressed;
    if (this.botones[nombre] === pressed) return;
    this.botones[nombre] = pressed;
    this.el.emit(nombre + (pressed ? 'down' : 'up'));
  },

  emitirBotones: function (source) {
    const pad = source.gamepad;
    if (!pad || !pad.buttons) return;
    this.pulsar('trigger', pad.buttons[0] && pad.buttons[0].pressed);
    this.pulsar('grip', pad.buttons[1] && pad.buttons[1].pressed);
  },

  tock: function () {
    const scene = this.el.sceneEl;
    const session = scene && scene.xrSession;
    const frame = scene && scene.frame;
    const renderer = scene && scene.renderer;
    if (!session || !frame || !renderer || !renderer.xr) return;
    const ref = renderer.xr.getReferenceSpace();
    if (!ref) return;
    const source = buscarControlador(session, this.data.hand);
    if (!source) return;
    let pose = frame.getPose(source.gripSpace, ref);
    if (!pose && source.targetRaySpace) pose = frame.getPose(source.targetRaySpace, ref);
    if (!pose || !pose.transform) return;

    this.matriz.fromArray(pose.transform.matrix);
    const obj = this.el.object3D;
    this.matriz.decompose(obj.position, obj.quaternion, this.escala);
    obj.scale.set(1, 1, 1);
    obj.visible = true;
    obj.matrixAutoUpdate = true;
    obj.updateMatrixWorld(true);
    const mesh = this.el.getObject3D('mesh');
    if (mesh) mesh.visible = true;
    const ray = this.el.components.raycaster;
    if (this.data.rayo && ray && !ray.data.showLine) this.el.setAttribute('raycaster', 'showLine', true);
    if (!this.eventosNativos) this.emitirBotones(source);
    if (ray && ray.checkIntersections) ray.checkIntersections();
  }
});
