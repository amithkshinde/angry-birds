export function drawBackgroundLayer(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#8ecae6');
  gradient.addColorStop(1, '#d7f0fa');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
