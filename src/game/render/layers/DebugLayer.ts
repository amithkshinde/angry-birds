/** Dev-only FPS readout used to verify the loop holds a stable frame rate. */
export function drawDebugLayer(ctx: CanvasRenderingContext2D, fps: number, canvasWidth: number): void {
  const text = `${fps} FPS`;
  ctx.save();
  ctx.font = '14px monospace';
  ctx.textBaseline = 'alphabetic';

  const paddingX = 8;
  const boxHeight = 22;
  const textWidth = ctx.measureText(text).width;
  const boxWidth = textWidth + paddingX * 2;
  const x = canvasWidth - boxWidth - 10;
  const y = 10;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x, y, boxWidth, boxHeight);

  ctx.fillStyle = fps >= 55 ? '#7CFC00' : fps >= 30 ? '#FFD166' : '#FF5C5C';
  ctx.fillText(text, x + paddingX, y + boxHeight - 6);
  ctx.restore();
}

/** Top-left "birds left" readout — the visible proof of the bird queue advancing. */
export function drawBirdsRemainingLayer(ctx: CanvasRenderingContext2D, birdsRemaining: number): void {
  const text = `Birds left: ${birdsRemaining}`;
  ctx.save();
  ctx.font = '14px monospace';
  ctx.textBaseline = 'alphabetic';

  const paddingX = 8;
  const boxHeight = 22;
  const boxWidth = ctx.measureText(text).width + paddingX * 2;
  const x = 10;
  const y = 10;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.fillStyle = '#f5f5f5';
  ctx.fillText(text, x + paddingX, y + boxHeight - 6);
  ctx.restore();
}
