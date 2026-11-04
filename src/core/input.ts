/**
 * Entrada: teclado + mando (Gamepad API, mapeo estándar).
 *
 * El juego no pregunta por teclas sino por acciones. De momento solo hay `move`, un vector
 * con longitud 0–1 (teclado: 0 o 1; stick: proporcional, con zona muerta).
 */

export interface MoveInput {
  x: number;
  y: number;
}

/**
 * Zona muerta radial con reescalado: por debajo de `deadzone` da 0 y por encima reparte el
 * resto del recorrido en 0–1, así el stick a medio camino da media velocidad. Escribe en `out`.
 */
export function applyRadialDeadzone(
  x: number,
  y: number,
  deadzone: number,
  out: MoveInput,
): MoveInput {
  const length = Math.hypot(x, y);
  if (length <= deadzone || length === 0) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const scaled = Math.min((length - deadzone) / (1 - deadzone), 1);
  out.x = (x / length) * scaled;
  out.y = (y / length) * scaled;
  return out;
}

/** Normaliza un vector de direcciones digitales (teclado, cruceta) a longitud 0 o 1. */
export function normalizeDigital(x: number, y: number, out: MoveInput): MoveInput {
  const length = Math.hypot(x, y);
  out.x = length > 0 ? x / length : 0;
  out.y = length > 0 ? y / length : 0;
  return out;
}

const KEYS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
} as const;

// Mapeo estándar de la Gamepad API (el que da Steam Input en la Deck).
const PAD_AXIS_X = 0;
const PAD_AXIS_Y = 1;
const PAD_UP = 12;
const PAD_DOWN = 13;
const PAD_LEFT = 14;
const PAD_RIGHT = 15;

export class Input {
  /** Zona muerta del stick (0–1). Ajustable en Tweakpane. */
  deadzone = 0.2;
  /** Último dispositivo usado, para la interfaz. */
  lastDevice: 'keyboard' | 'gamepad' = 'keyboard';
  private readonly held = new Set<string>();
  private readonly keyboardMove: MoveInput = { x: 0, y: 0 };
  private readonly padMove: MoveInput = { x: 0, y: 0 };
  private readonly target: EventTarget;

  constructor(target: EventTarget = window) {
    this.target = target;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  isHeld(code: string): boolean {
    return this.held.has(code);
  }

  /** Lee la acción `move` combinando teclado y mando. Llamar una vez por paso de simulación. */
  readMove(out: MoveInput): MoveInput {
    const any = (codes: readonly string[]): number => (codes.some((c) => this.held.has(c)) ? 1 : 0);
    normalizeDigital(
      any(KEYS.right) - any(KEYS.left),
      any(KEYS.down) - any(KEYS.up),
      this.keyboardMove,
    );
    this.readGamepad(this.padMove);

    // Gana el que más empuja; así un stick en reposo no anula el teclado.
    const kb = Math.hypot(this.keyboardMove.x, this.keyboardMove.y);
    const pad = Math.hypot(this.padMove.x, this.padMove.y);
    const source = pad > kb ? this.padMove : this.keyboardMove;
    if (pad > kb) this.lastDevice = 'gamepad';
    else if (kb > 0) this.lastDevice = 'keyboard';
    out.x = source.x;
    out.y = source.y;
    return out;
  }

  private readGamepad(out: MoveInput): void {
    out.x = 0;
    out.y = 0;
    const pads =
      typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      const btn = (i: number): number => (pad.buttons[i]?.pressed ? 1 : 0);
      const dx = btn(PAD_RIGHT) - btn(PAD_LEFT);
      const dy = btn(PAD_DOWN) - btn(PAD_UP);
      if (dx !== 0 || dy !== 0) {
        normalizeDigital(dx, dy, out);
        return;
      }
      applyRadialDeadzone(pad.axes[PAD_AXIS_X] ?? 0, pad.axes[PAD_AXIS_Y] ?? 0, this.deadzone, out);
      if (out.x !== 0 || out.y !== 0) return;
    }
  }

  private readonly onKeyDown = (event: Event): void => {
    this.held.add((event as KeyboardEvent).code);
  };

  private readonly onKeyUp = (event: Event): void => {
    this.held.delete((event as KeyboardEvent).code);
  };

  private readonly onBlur = (): void => {
    this.held.clear();
  };

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
  }
}
