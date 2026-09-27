export function drawSkillDiagram(context: CanvasRenderingContext2D, index: number) {
  context.strokeStyle = context.fillStyle = "#665039";
  context.lineWidth = 3;
  context.lineCap = "round";
  context.lineJoin = "round";
  const die = (x: number, value = 0) => {
    context.beginPath();
    context.roundRect(x - 36, 92, 72, 72, 8);
    context.stroke();
    const points: [number, number][] = [];
    if (value % 2) points.push([0, 0]);
    if (value >= 2) points.push([-19, -19], [19, 19]);
    if (value >= 4) points.push([19, -19], [-19, 19]);
    if (value === 6) points.push([-19, 0], [19, 0]);
    for (const [dx, dy] of points) {
      context.beginPath();
      context.arc(x + dx, 128 + dy, 5, 0, Math.PI * 2);
      context.fill();
    }
  };
  const arrow = (from: number, to: number, both = false) => {
    context.beginPath();
    context.moveTo(from, 128);
    context.lineTo(to, 128);
    context.moveTo(to - 8, 120);
    context.lineTo(to, 128);
    context.lineTo(to - 8, 136);
    if (both) {
      context.moveTo(from + 8, 120);
      context.lineTo(from, 128);
      context.lineTo(from + 8, 136);
    }
    context.stroke();
  };
  if (index === 0) {
    die(224);
    arrow(282, 358);
    die(416, 6);
  } else if (index === 1) {
    die(320);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "44px Georgia, serif";
    context.fillText("−1", 320, 131);
  } else {
    for (let i = 0; i < 3; i++) {
      const x = 70 + i * 194;
      die(x, i + 1);
      arrow(x + 43, x + 67, true);
      die(x + 110, 6 - i);
    }
  }
}
