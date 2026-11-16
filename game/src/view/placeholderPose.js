// Poses a greybox person from its gameplay state, so every state is visible:
// a lean, an arm or leg swing, and a coloured ring under the feet.
// When real models arrive, an AnimationMixer replaces this file's job; gameplay stays the same.

import { CONFIG } from '../config.js';
import { attackOf } from '../game/game.js';

export const STATE_COLORS = {
  idle: 0x9fd3a6, run: 0x5aa9ff, enter: 0x7fe0ff, circle: 0x3fc7b0, approach: 0xff5ad1,
  jab: 0xff4040, cross: 0xff4040, kick: 0xff4040, swing: 0xff4040, backswing: 0xff4040, overhead: 0xff4040, windup: 0xffd23f, attack: 0xff4040,
  roll: 0x00e5ff, hurt: 0xffffff, knocked_down: 0xa070ff, defeated: 0x222222, win: 0xffe066,
};

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const ease = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const GUARD = -0.75;

// three phases of an attack: 0..1 within windup, active, recovery
function phases(f) {
  const a = attackOf(f);
  const p = f.stateTime / a.length;
  return { p, w: p / a.lands, act: p >= a.lands && p < a.ends, r: (p - a.ends) / (1 - a.ends), a };
}

function swingLimb(limb, from, strike, ph) {
  if (ph.p < ph.a.lands) limb.rotation.x = lerp(from, from + 0.45, ease(ph.w));
  else if (ph.act) limb.rotation.x = strike;
  else limb.rotation.x = lerp(strike, from, ease(ph.r));
}

export function posePlaceholder(obj, f, label, vis, dt, now) {
  const P = obj.userData.parts;
  const { pose, body, head, arm_l, arm_r, leg_l, leg_r, state_ring } = P;
  pose.rotation.set(0, 0, 0); pose.position.set(0, 0, 0);
  body.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0);
  arm_l.rotation.set(GUARD, 0, 0.12); arm_r.rotation.set(GUARD, 0, -0.12);
  leg_l.rotation.set(0, 0, 0); leg_r.rotation.set(0, 0, 0);

  const moving = ['run', 'enter', 'circle', 'approach'].includes(label);
  if (moving) {
    vis.stride += f.speedNow * dt * 2.4;
    const s = Math.sin(vis.stride), amp = Math.min(1, f.speedNow / 3) * 0.8;
    leg_l.rotation.x = s * amp; leg_r.rotation.x = -s * amp;
    arm_l.rotation.x = GUARD - s * amp * 0.4; arm_r.rotation.x = GUARD + s * amp * 0.4;
    body.rotation.x = 0.08 + Math.min(1, f.speedNow / 4.5) * 0.12;
    pose.position.y = Math.abs(Math.cos(vis.stride)) * 0.04 * amp;
    if (label === 'approach') body.rotation.x += 0.12;
  } else if (label === 'idle') {
    pose.position.y = Math.sin(now * 2.2) * 0.008;
    body.rotation.x = 0.04 + Math.sin(now * 2.2) * 0.015;
  }

  if (f.state === 'attack' && f.weapon) {
    // weapon in the right hand: swing across, swing back, then overhead with both hands
    const ph = phases(f);
    const into = ph.p < ph.a.lands ? ease(ph.w) : 1, out = ph.p < ph.a.ends ? 0 : ease(ph.r);
    if (f.attack === 'junoKick') {
      const up = lerp(GUARD, -3.0, into), down = ph.p >= ph.a.lands ? lerp(-3.0, -1.1, Math.min(1, (ph.p - ph.a.lands) / 0.06)) : up;
      arm_l.rotation.x = arm_r.rotation.x = lerp(ph.p >= ph.a.lands ? down : up, GUARD, out);
      arm_l.rotation.z = 0.25; arm_r.rotation.z = -0.25;
      body.rotation.x = ph.p < ph.a.lands ? -0.2 * into : lerp(0.35, 0, out);
    } else {
      const dir = f.attack === 'junoJab' ? 1 : -1; // swing right-to-left, then back
      arm_r.rotation.x = lerp(GUARD, -1.5, into);
      const sweep = ph.p < ph.a.lands ? -0.9 * dir * into : lerp(0.9 * dir, 0, out);
      arm_r.rotation.z = -0.12 + sweep * 0.6;
      body.rotation.y = sweep * 0.7;
    }
  } else if (f.state === 'attack') {
    const ph = phases(f);
    switch (f.attack) {
      case 'junoJab': case 'crowJab': case 'eliteJab': case 'grudgeJab':
        swingLimb(arm_l, GUARD, -1.57, ph);
        body.rotation.y = ph.act ? -0.25 : 0;
        body.rotation.x = ph.p < ph.a.lands ? -0.1 * ease(ph.w) : 0.12;
        break;
      case 'junoCross':
        swingLimb(arm_r, GUARD, -1.57, ph);
        body.rotation.y = ph.p < ph.a.lands ? -0.3 * ease(ph.w) : (ph.act ? 0.4 : lerp(0.4, 0, ph.r));
        break;
      case 'junoKick':
        if (ph.p < ph.a.lands) leg_r.rotation.x = lerp(0, 0.5, ease(ph.w));
        else if (ph.act) leg_r.rotation.x = -1.45;
        else leg_r.rotation.x = lerp(-1.45, 0, ease(ph.r));
        body.rotation.x = ph.p >= ph.a.lands && (ph.act || ph.r < 0.5) ? -0.3 : 0;
        break;
      case 'grudgeSmash': {
        let arms;
        if (ph.p < ph.a.lands) { arms = lerp(GUARD, -3.0, ease(ph.w)); body.rotation.x = lerp(0, -0.25, ease(ph.w)); }
        else if (ph.act) { arms = -1.0; body.rotation.x = 0.4; }
        else { arms = lerp(-1.0, GUARD, ease(ph.r)); body.rotation.x = lerp(0.4, 0, ease(ph.r)); }
        arm_l.rotation.x = arm_r.rotation.x = arms;
        arm_l.rotation.z = 0.05; arm_r.rotation.z = -0.05;
        break;
      }
    }
  } else if (label === 'hurt') {
    const t = f.stateTime / Math.max(0.01, (f.team === 'player' ? CONFIG.juno : CONFIG.enemies[f.kind]).hurtTime);
    const k = Math.sin(Math.min(1, t) * Math.PI);
    body.rotation.x = -0.4 * k;
    if (f.hurtBy === 'junoKick') head.rotation.x = -0.5 * k;
    arm_l.rotation.z = 0.5 * k; arm_r.rotation.z = -0.5 * k;
  } else if (label === 'knocked_down' || label === 'defeated') {
    const down = f.team === 'player' ? CONFIG.juno.downTime : CONFIG.enemies[f.kind].downTime;
    const fall = ease(f.stateTime / 0.3);
    let lie = fall;
    if (label === 'knocked_down' && down > 0) {
      const p = f.stateTime / down;
      if (p > 0.7) lie = 1 - ease((p - 0.7) / 0.3);
    }
    pose.rotation.x = -Math.PI / 2 * lie * 0.97;
    pose.position.y = 0.12 * lie;
    arm_l.rotation.set(-2.6 * lie, 0, 0.3 * lie); arm_r.rotation.set(-2.6 * lie, 0, -0.3 * lie);
  } else if (label === 'roll') {
    // forward somersault around a point at hip height, tucked and low
    const p = Math.min(1, f.stateTime / CONFIG.juno.roll.time), a = Math.PI * 2 * ease(p), h = 0.55;
    pose.rotation.x = a;
    pose.position.y = h - h * Math.cos(a) - 0.35 * Math.sin(p * Math.PI);
    pose.position.z = -h * Math.sin(a);
    body.rotation.x = 0.6; head.rotation.x = 0.4;
    arm_l.rotation.set(-1.2, 0, 0.2); arm_r.rotation.set(-1.2, 0, -0.2);
    leg_l.rotation.x = leg_r.rotation.x = -1.3;
  } else if (label === 'win') {
    arm_l.rotation.set(-2.9, 0, 0.3); arm_r.rotation.set(-2.9, 0, -0.3);
    pose.position.y = Math.abs(Math.sin(now * 6)) * 0.18;
  }

  // invulnerable after getting up: blink
  const blink = f.team === 'player' && f.invuln > 0.26 && Math.floor(now * 16) % 2 === 0;
  pose.visible = !blink;

  state_ring.visible = !!CONFIG.look.showStateRings;
  state_ring.material.color.setHex(STATE_COLORS[label] ?? 0xffffff);
}
