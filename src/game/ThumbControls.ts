import { worldXFromScreenRatio, type Controls } from './core';

/** Converts the active thumb into absolute horizontal positioning. Lift = jump. */
export class ThumbControls {
  readonly state: Controls = { targetX: null, left: false, right: false, jump: false };
  private pointerId: number | null = null;
  private enabled = false;
  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.down, { passive: false });
    canvas.addEventListener('pointermove', this.move, { passive: false });
    canvas.addEventListener('pointerup', this.up, { passive: false });
    canvas.addEventListener('pointercancel', this.cancel);
    canvas.addEventListener('lostpointercapture', this.lost);
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.reset);
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }
  private point = (event: PointerEvent): void => {
    const bounds = this.canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
    this.state.targetX = worldXFromScreenRatio(ratio);
  };
  private down = (event: PointerEvent): void => {
    if (!this.enabled || this.pointerId !== null) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const bounds = this.canvas.getBoundingClientRect();
    if (event.clientY - bounds.top < bounds.height * .55) return;
    event.preventDefault();
    this.pointerId = event.pointerId;
    this.point(event);
    this.canvas.setPointerCapture(event.pointerId);
  };
  private move = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    event.preventDefault(); this.point(event);
  };
  private up = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    event.preventDefault();
    this.point(event);
    this.state.jump = this.enabled;
    this.pointerId = null;
    this.state.targetX = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
  };
  private cancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.pointerId = null; this.state.targetX = null;
  };
  private lost = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.pointerId = null; this.state.targetX = null;
  };
  private keyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    if (['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    if (event.code === 'ArrowLeft'||event.code === 'KeyA') this.state.left = true;
    if (event.code === 'ArrowRight'||event.code === 'KeyD') this.state.right = true;
    if (event.code === 'Space'||event.code === 'ArrowUp'||event.code === 'KeyW') this.state.jump = true;
  };
  private keyUp = (event: KeyboardEvent): void => {
    if (event.code === 'ArrowLeft'||event.code === 'KeyA') this.state.left = false;
    if (event.code === 'ArrowRight'||event.code === 'KeyD') this.state.right = false;
  };
  private reset = (): void => {
    this.pointerId = null;this.state.targetX = null;this.state.left = false;this.state.right = false;this.state.jump = false;
  };
  dispose(): void {
    this.canvas.removeEventListener('pointerdown',this.down);
    this.canvas.removeEventListener('pointermove',this.move);
    this.canvas.removeEventListener('pointerup',this.up);
    this.canvas.removeEventListener('pointercancel',this.cancel);
    this.canvas.removeEventListener('lostpointercapture',this.lost);
    window.removeEventListener('keydown',this.keyDown);
    window.removeEventListener('keyup',this.keyUp);
    window.removeEventListener('blur',this.reset);
    this.reset();
  }
}
