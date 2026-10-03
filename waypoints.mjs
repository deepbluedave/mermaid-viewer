// Manual routing points are diagram coordinates, independent of endpoint pins.
export const MAX_WAYPOINTS = 100;

export function waypointConflicts(model, edge) {
  return (edge.waypoints || []).map((point, index) => ({
    point,
    index,
    node: model.nodes.find(n => !n.container &&
      point.x >= n.x - 8 && point.x <= n.x + n.width + 8 &&
      point.y >= n.y - 8 && point.y <= n.y + n.height + 8),
  })).filter(conflict => conflict.node);
}

export function waypointInsertionIndex(points, waypoints, point) {
  // Order a new point by its nearest segment in the current routed polyline.
  const distanceAlong = p => {
    let length = 0, best = { distance: Infinity, along: 0 };
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const dx = b.x - a.x, dy = b.y - a.y, size = Math.hypot(dx, dy);
      const t = size ? Math.max(0, Math.min(1,
        ((p.x - a.x) * dx + (p.y - a.y) * dy) / (size * size))) : 0;
      const distance = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
      if (distance < best.distance) best = { distance, along: length + t * size };
      length += size;
    }
    return best.along;
  };
  const along = distanceAlong(point);
  const index = (waypoints || []).findIndex(p => distanceAlong(p) > along + .01);
  return index < 0 ? (waypoints || []).length : index;
}

export function translateWaypoints(before, model) {
  const previous = new Map([...before.nodes, ...before.zones].map(n => [n.id, n]));
  const current = new Map([...model.nodes, ...model.zones].map(n => [n.id, n]));
  const edges = new Map(before.edges.map(e => [e.id, e]));
  const delta = id => {
    const a = previous.get(id), b = current.get(id);
    if (!a || !b) return null;
    // Resizing from the top/left also changes x/y, but must not carry a route.
    const sameSize = a.width === b.width && a.height === b.height;
    return { x: sameSize ? b.x - a.x : 0, y: sameSize ? b.y - a.y : 0 };
  };
  for (const edge of model.edges) {
    const old = edges.get(edge.id);
    if (!old?.waypoints?.length || edge.source !== old.source || edge.target !== old.target) continue;
    const a = delta(edge.source), b = delta(edge.target);
    if (!a || !b || (!a.x && !a.y && !b.x && !b.y)) continue;
    const together = Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
    // Derive from the action's initial points, so clearance adjustments and
    // individually aligned roots cannot double-translate a shared route.
    edge.waypoints = old.waypoints.map(p => ({
      x: p.x + (together ? a.x : 0),
      y: p.y + (together ? a.y : 0),
    }));
  }
}
