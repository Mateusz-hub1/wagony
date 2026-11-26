// Płynna animacja rozkładania i zdejmowania części.
// Położenie części = położenie bazowe + explode × (stopień rozłożenia rodzica)
//                                      + remove  × (stopień zdjęcia)
import { walk } from './dataLoader.js';

const SPEED = 5; // im większe, tym szybciej (wykładnicze dochodzenie do celu)

export class Animator {
  constructor(root) {
    this.root = root;
  }

  // Wywoływane co klatkę. Zwraca true, gdy któraś część właśnie skończyła się zdejmować
  // (wtedy trzeba odświeżyć widoczność).
  update(dt) {
    const k = 1 - Math.exp(-dt * SPEED);
    let removalChanged = false;
    for (const n of walk(this.root)) {
      if (!n.parent) continue;
      const o = n.object, u = o.userData;
      const targetE = n.parent.exploded ? 1 : 0;
      const targetR = n.removed ? 1 : 0;
      const wasDone = u.curR > 0.97;
      u.curE = approach(u.curE, targetE, k);
      u.curR = approach(u.curR, targetR, k);
      if ((u.curR > 0.97) !== wasDone) removalChanged = true;
      o.position.copy(u.basePos)
        .addScaledVector(u.explode, u.curE)
        .addScaledVector(u.remove, u.curR);
    }
    return removalChanged;
  }

  // Czy coś się jeszcze rusza
  isMoving() {
    for (const n of walk(this.root)) {
      if (!n.parent) continue;
      const u = n.object.userData;
      if (Math.abs(u.curE - (n.parent.exploded ? 1 : 0)) > 0.002) return true;
      if (Math.abs(u.curR - (n.removed ? 1 : 0)) > 0.002) return true;
    }
    return false;
  }
}

function approach(cur, target, k) {
  const v = cur + (target - cur) * k;
  return Math.abs(target - v) < 0.0005 ? target : v;
}
