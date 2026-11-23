import {ALTO, ALTO_M, ANCHO, ANCHO_M, limitarEscala} from '../config.js';
import {crearMotor, volcar} from '../drawing/motor.js';
import {leerBoton} from '../xr/fuentes.js';

AFRAME.registerComponent('lienzo-pintable', {
  init: function () {
    this.canvas = document.getElementById('vista-lienzo');
    this.motor = crearMotor(ANCHO, ALTO, {marco: true});
    this.volcar();
    this.modo = null;
    this.manoActiva = null;
    this.agarradas = {left: false, right: false};
    this.gripPrevio = {left: false, right: false};
    this.mundo = new THREE.Matrix4();
    this.manoM = new THREE.Matrix4();
    this.offset = new THREE.Matrix4();
    this.localM = new THREE.Matrix4();
    this.tmpEscala = new THREE.Vector3();
    this.punto = new THREE.Vector3();
    this.medio = new THREE.Vector3();
    this.medio0 = new THREE.Vector3();
    this.desfase = new THREE.Vector3();
    this.posA = new THREE.Vector3();
    this.posB = new THREE.Vector3();
    this.alMesh = this.aplicarTextura.bind(this);
    this.el.addEventListener('object3dset', this.alMesh);
    this.aplicarTextura();
  },

  remove: function () {
    this.el.removeEventListener('object3dset', this.alMesh);
  },

  volcar: function () {
    if (!this.canvas) return;
    const cambio = volcar(this.motor, this.canvas);
    if (cambio && this.textura) this.textura.needsUpdate = true;
  },

  aplicarTextura: function () {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh || this.textura || !this.canvas) return;
    this.textura = new THREE.CanvasTexture(this.canvas);
    if ('colorSpace' in this.textura && THREE.SRGBColorSpace) this.textura.colorSpace = THREE.SRGBColorSpace;
    this.textura.needsUpdate = true;
    mesh.material = new THREE.MeshBasicMaterial({map: this.textura, side: THREE.DoubleSide});
  },

  uvDesdeMundo: function (punto) {
    const obj = this.el.object3D;
    obj.updateWorldMatrix(true, false);
    this.punto.copy(punto);
    obj.worldToLocal(this.punto);
    return {
      u: this.punto.x / ANCHO_M + 0.5,
      v: this.punto.y / ALTO_M + 0.5,
      distancia: Math.abs(this.punto.z) * obj.scale.z
    };
  },

  mando: function (hand) {
    return document.getElementById(hand === 'left' ? 'mando-izq' : 'mando-der');
  },

  apunta: function (hand) {
    const mando = this.mando(hand);
    if (!mando) return false;
    const ray = mando.components.raycaster;
    if (ray && ray.checkIntersections) ray.checkIntersections();
    if (ray && ray.intersectedEls && ray.intersectedEls.indexOf(this.el) !== -1) return true;
    if (!mando.object3D) return false;
    mando.object3D.getWorldPosition(this.posA);
    const uv = this.uvDesdeMundo(this.posA);
    return uv.distancia < 0.2 && uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1;
  },

  aplicarMundo: function (matriz) {
    const obj = this.el.object3D;
    const padre = obj.parent;
    if (padre) {
      padre.updateWorldMatrix(true, false);
      this.localM.copy(padre.matrixWorld).invert().multiply(matriz);
    } else {
      this.localM.copy(matriz);
    }
    this.localM.decompose(obj.position, obj.quaternion, this.tmpEscala);
    obj.matrixAutoUpdate = true;
  },

  empezarUno: function (hand) {
    const mando = this.mando(hand);
    if (!mando) return;
    this.modo = 'uno';
    this.manoActiva = hand;
    mando.object3D.updateWorldMatrix(true, false);
    this.el.object3D.updateWorldMatrix(true, false);
    this.manoM.copy(mando.object3D.matrixWorld).invert();
    this.offset.copy(this.manoM).multiply(this.el.object3D.matrixWorld);
  },

  aplicarUno: function () {
    const mando = this.mando(this.manoActiva);
    if (!mando) return;
    mando.object3D.updateWorldMatrix(true, false);
    this.mundo.copy(mando.object3D.matrixWorld).multiply(this.offset);
    this.aplicarMundo(this.mundo);
  },

  empezarDos: function () {
    const izq = this.mando('left');
    const der = this.mando('right');
    if (!izq || !der) return;
    izq.object3D.getWorldPosition(this.posA);
    der.object3D.getWorldPosition(this.posB);
    this.dist0 = Math.max(0.05, this.posA.distanceTo(this.posB));
    this.escala0 = this.el.object3D.scale.x;
    this.medio0.copy(this.posA).add(this.posB).multiplyScalar(0.5);
    this.el.object3D.getWorldPosition(this.punto);
    this.desfase.copy(this.punto).sub(this.medio0);
    this.modo = 'dos';
  },

  aplicarDos: function () {
    const izq = this.mando('left');
    const der = this.mando('right');
    if (!izq || !der) return;
    izq.object3D.getWorldPosition(this.posA);
    der.object3D.getWorldPosition(this.posB);
    const dist = this.posA.distanceTo(this.posB);
    const escala = limitarEscala(this.escala0 * (dist / this.dist0));
    this.medio.copy(this.posA).add(this.posB).multiplyScalar(0.5);
    this.punto.copy(this.medio).add(this.desfase);
    const obj = this.el.object3D;
    if (obj.parent) obj.parent.worldToLocal(this.punto);
    obj.position.copy(this.punto);
    obj.scale.set(escala, escala, escala);
  },

  tock: function () {
    const session = this.el.sceneEl && this.el.sceneEl.xrSession;
    if (!session) return;
    ['left', 'right'].forEach((hand) => {
      const ahora = leerBoton(session, hand, 1).pressed;
      const antes = this.gripPrevio[hand];
      if (ahora && !antes) {
        const otra = hand === 'left' ? this.agarradas.right : this.agarradas.left;
        if (this.apunta(hand) || otra) this.agarradas[hand] = true;
      }
      if (!ahora) this.agarradas[hand] = false;
      this.gripPrevio[hand] = ahora;
    });

    const activas = ['left', 'right'].filter((hand) => this.agarradas[hand]);
    if (activas.length === 2) {
      if (this.modo !== 'dos') this.empezarDos();
      this.aplicarDos();
    } else if (activas.length === 1) {
      if (this.modo !== 'uno' || this.manoActiva !== activas[0]) this.empezarUno(activas[0]);
      this.aplicarUno();
    } else {
      this.modo = null;
      this.manoActiva = null;
    }
  }
});
