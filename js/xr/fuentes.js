export function esControlador (source, hand) {
  if (!source || source.handedness !== hand || !source.gripSpace) return false;
  const profiles = source.profiles || [];
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    if (p.indexOf('hand') !== -1 && p.indexOf('touch') !== -1) continue;
    if (p.indexOf('hand') !== -1 && p.indexOf('touch') === -1) return false;
  }
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    if (p.indexOf('touch') !== -1 || p.indexOf('oculus') !== -1 || p.indexOf('meta-quest') !== -1) {
      return true;
    }
  }
  return !source.hand && !!source.gamepad;
}

export function buscarControlador (session, hand) {
  if (!session) return null;
  const inputs = session.inputSources || [];
  for (let i = 0; i < inputs.length; i++) {
    if (esControlador(inputs[i], hand)) return inputs[i];
  }
  let tracked = null;
  try { tracked = session.trackedSources; } catch (err) { tracked = null; }
  if (!tracked) return null;
  for (let i = 0; i < tracked.length; i++) {
    if (esControlador(tracked[i], hand)) return tracked[i];
  }
  return null;
}

export function leerGatillo (session, hand) {
  const source = buscarControlador(session, hand);
  const boton = source && source.gamepad && source.gamepad.buttons && source.gamepad.buttons[0];
  if (!boton) return 0;
  if (typeof boton.value === 'number') return boton.value;
  return boton.pressed ? 1 : 0;
}

export function leerBoton (session, hand, indice) {
  const source = buscarControlador(session, hand);
  const boton = source && source.gamepad && source.gamepad.buttons && source.gamepad.buttons[indice];
  if (!boton) return {pressed: false, value: 0};
  return {
    pressed: !!boton.pressed || boton.value > 0.5,
    value: typeof boton.value === 'number' ? boton.value : (boton.pressed ? 1 : 0)
  };
}

export function vibrar (session, hand) {
  const source = buscarControlador(session, hand);
  const pad = source && source.gamepad;
  if (!pad) return;
  const actuador = (pad.hapticActuators && pad.hapticActuators[0]) || pad.vibrationActuator;
  try {
    if (actuador && actuador.pulse) actuador.pulse(0.22, 18);
    else if (actuador && actuador.playEffect) {
      actuador.playEffect('dual-rumble', {duration: 18, strongMagnitude: 0.25, weakMagnitude: 0.15});
    }
  } catch (err) { /* el visor puede rechazar el pulso */ }
}
