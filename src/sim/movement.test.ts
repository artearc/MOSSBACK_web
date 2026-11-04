import { describe, expect, it } from 'vitest';
import { applyRadialDeadzone, normalizeDigital } from '../core/input';
import { createCameraFollow, smoothingFactor, updateCameraFollow } from './cameraFollow';
import { steerVelocity, type MovementTuning } from './movement';

const tuning: MovementTuning = {
  maxSpeed: 5,
  acceleration: 50,
  deceleration: 25,
  turnAcceleration: 100,
  verticalFactor: 1,
};
const dt = 1 / 60;

describe('steerVelocity', () => {
  it('acelera hasta la velocidad máxima sin pasarse', () => {
    const v = { x: 0, y: 0 };
    steerVelocity(v, { x: 1, y: 0 }, tuning, dt);
    expect(v.x).toBeCloseTo(50 * dt, 6);
    for (let i = 0; i < 60; i++) steerVelocity(v, { x: 1, y: 0 }, tuning, dt);
    expect(v.x).toBe(5);
  });

  it('frena hasta parar al soltar', () => {
    const v = { x: 5, y: 0 };
    steerVelocity(v, { x: 0, y: 0 }, tuning, dt);
    expect(v.x).toBeCloseTo(5 - 25 * dt, 6);
    for (let i = 0; i < 60; i++) steerVelocity(v, { x: 0, y: 0 }, tuning, dt);
    expect(v).toEqual({ x: 0, y: 0 });
  });

  it('usa la aceleración de giro al invertir el sentido', () => {
    const v = { x: 5, y: 0 };
    steerVelocity(v, { x: -1, y: 0 }, tuning, dt);
    expect(v.x).toBeCloseTo(5 - 100 * dt, 6);
  });

  it('en diagonal no va más rápido que en recto', () => {
    const v = { x: 0, y: 0 };
    const diag = normalizeDigital(1, 1, { x: 0, y: 0 });
    for (let i = 0; i < 120; i++) steerVelocity(v, diag, tuning, dt);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(5, 6);
  });

  it('aplica el factor vertical', () => {
    const v = { x: 0, y: 0 };
    for (let i = 0; i < 120; i++)
      steerVelocity(v, { x: 0, y: 1 }, { ...tuning, verticalFactor: 0.8 }, dt);
    expect(v.y).toBeCloseTo(4, 6);
  });
});

describe('entrada', () => {
  it('la zona muerta da 0 y reescala el resto a 0–1', () => {
    const out = { x: 0, y: 0 };
    expect(applyRadialDeadzone(0.1, 0.1, 0.2, out)).toEqual({ x: 0, y: 0 });
    applyRadialDeadzone(0.6, 0, 0.2, out);
    expect(out.x).toBeCloseTo(0.5, 6);
    applyRadialDeadzone(0, -1, 0.2, out);
    expect(out.y).toBeCloseTo(-1, 6);
    applyRadialDeadzone(1, 1, 0.2, out); // esquina del stick: no pasa de 1
    expect(Math.hypot(out.x, out.y)).toBeCloseTo(1, 6);
  });

  it('las direcciones digitales se normalizan', () => {
    const out = normalizeDigital(1, -1, { x: 0, y: 0 });
    expect(Math.hypot(out.x, out.y)).toBeCloseTo(1, 6);
    expect(normalizeDigital(0, 0, out)).toEqual({ x: 0, y: 0 });
  });
});

describe('cámara que sigue', () => {
  const camTuning = { followRate: 6, lookAhead: 2, lookAheadRate: 3 };

  it('el suavizado no depende de la frecuencia de pasos', () => {
    // 1 paso de 1/30 s ≈ 2 pasos de 1/60 s.
    const one = smoothingFactor(5, 1 / 30);
    const halfStep = smoothingFactor(5, 1 / 60);
    expect(1 - (1 - halfStep) ** 2).toBeCloseTo(one, 10);
  });

  it('alcanza al objetivo parado', () => {
    const cam = createCameraFollow(0, 0);
    for (let i = 0; i < 600; i++) updateCameraFollow(cam, 10, 4, 0, 0, 5, camTuning, dt);
    expect(cam.x).toBeCloseTo(10, 4);
    expect(cam.y).toBeCloseTo(4, 4);
  });

  it('se adelanta en la dirección del movimiento', () => {
    const cam = createCameraFollow(0, 0);
    for (let i = 0; i < 600; i++) updateCameraFollow(cam, 0, 0, 5, 0, 5, camTuning, dt);
    expect(cam.leadX).toBeCloseTo(2, 3);
    expect(cam.x).toBeCloseTo(2, 3);
    expect(cam.prevX).toBeLessThanOrEqual(cam.x);
  });
});
