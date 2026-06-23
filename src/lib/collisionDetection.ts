import type { CollisionDetection } from '@dnd-kit/core';

function distanceBetween(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Igual que closestCenter pero usando el borde superior del overlay
 * en vez del centro, para que la marca coincida con la arista superior del bloque.
 */
export const topEdgeClosestCenter: CollisionDetection = ({
  collisionRect,
  droppableRects,
  droppableContainers,
}) => {
  const topEdge = {
    x: collisionRect.left + collisionRect.width / 2,
    y: collisionRect.top,
  };

  const collisions: { id: string | number; data: { droppableContainer: (typeof droppableContainers)[number]; value: number } }[] = [];

  for (const droppable of droppableContainers) {
    const rect = droppableRects.get(droppable.id);
    if (!rect) continue;

    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    collisions.push({
      id: droppable.id,
      data: { droppableContainer: droppable, value: distanceBetween(topEdge, center) },
    });
  }

  return collisions.sort((a, b) => a.data.value - b.data.value);
};
