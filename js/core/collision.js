export function circlesOverlap(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy <= r * r;
}

export function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Sweep the complete segment so fast shots cannot skip small targets between frames.
export function sweptOverlap(shot, target) {
  const x = shot.previousX ?? shot.x, y = shot.previousY ?? shot.y;
  const dx = shot.x - x, dy = shot.y - y, lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? clamp(((target.x - x) * dx + (target.y - y) * dy) / lengthSquared, 0, 1) : 0;
  const ex = target.x - (x + t * dx);
  const ey = target.y - (y + t * dy);
  const r = shot.radius + target.radius;
  return ex * ex + ey * ey <= r * r;
}
