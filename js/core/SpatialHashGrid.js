/**
 * High-performance 2D Spatial Hash Grid for fast spatial partitioning.
 * Reduces O(N^2) neighbor queries and collision checks to O(1) amortized.
 */
export class SpatialHashGrid {
  /**
   * @param {number} cellWidth Width of each grid cell.
   * @param {number} cellHeight Height of each grid cell.
   * @param {number} worldWidth Total world width.
   * @param {number} worldHeight Total world height.
   */
  constructor(cellWidth = 120, cellHeight = 120, worldWidth = 1920, worldHeight = 1080) {
    this.cellW = cellWidth;
    this.cellH = cellHeight;
    this.cols = Math.ceil(worldWidth / cellWidth) + 2;
    this.rows = Math.ceil(worldHeight / cellHeight) + 2;
    this.totalCells = this.cols * this.rows;
    this.totalEntities = 0;

    // Use a flat array of pre-allocated bucket arrays for fast indexing without string hashing
    this.buckets = new Array(this.totalCells);
    for (let i = 0; i < this.totalCells; i++) {
      this.buckets[i] = [];
    }
    this.activeBuckets = new Array(this.totalCells);
    this.activeCount = 0;
  }

  /**
   * Clear all active cells without reallocating arrays or scanning unused cells.
   */
  clear() {
    this.totalEntities = 0;
    for (let i = 0; i < this.activeCount; i++) {
      this.activeBuckets[i].length = 0;
    }
    this.activeCount = 0;
  }

  /**
   * Compute 1D bucket index from 2D coordinates.
   */
  _getIndex(x, y) {
    const col = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.cellW)));
    const row = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.cellH)));
    return row * this.cols + col;
  }

  /**
   * Insert an entity with .x and .y into the grid.
   * @param {any} entity
   */
  insert(entity) {
    const idx = this._getIndex(entity.x, entity.y);
    const bucket = this.buckets[idx];
    if (bucket.length === 0) {
      this.activeBuckets[this.activeCount++] = bucket;
    }
    bucket.push(entity);
    this.totalEntities++;
  }

  /**
   * Populate outList with entities within circular radius.
   * Reuses outList to prevent GC allocations.
   * @param {number} x Center X
   * @param {number} y Center Y
   * @param {number} radius Search radius
   * @param {Array} outList Output array buffer
   * @returns {Array}
   */
  queryRadius(x, y, radius, outList = []) {
    outList.length = 0;
    const minCol = Math.max(0, Math.floor((x - radius) / this.cellW));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellW));
    const minRow = Math.max(0, Math.floor((y - radius) / this.cellH));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellH));
    const rSq = radius * radius;

    for (let row = minRow; row <= maxRow; row++) {
      const rowOffset = row * this.cols;
      for (let col = minCol; col <= maxCol; col++) {
        const bucket = this.buckets[rowOffset + col];
        const len = bucket.length;
        for (let i = 0; i < len; i++) {
          const entity = bucket[i];
          const dx = entity.x - x;
          const dy = entity.y - y;
          if (dx * dx + dy * dy <= rSq) {
            outList.push(entity);
          }
        }
      }
    }
    return outList;
  }

  /**
   * Query bounding box.
   */
  queryBox(minX, minY, maxX, maxY, outList = []) {
    outList.length = 0;
    const minCol = Math.max(0, Math.floor(minX / this.cellW));
    const maxCol = Math.min(this.cols - 1, Math.floor(maxX / this.cellW));
    const minRow = Math.max(0, Math.floor(minY / this.cellH));
    const maxRow = Math.min(this.rows - 1, Math.floor(maxY / this.cellH));

    for (let row = minRow; row <= maxRow; row++) {
      const rowOffset = row * this.cols;
      for (let col = minCol; col <= maxCol; col++) {
        const bucket = this.buckets[rowOffset + col];
        const len = bucket.length;
        for (let i = 0; i < len; i++) {
          const entity = bucket[i];
          if (entity.x >= minX && entity.x <= maxX && entity.y >= minY && entity.y <= maxY) {
            outList.push(entity);
          }
        }
      }
    }
    return outList;
  }
}
