/* Pathle Treasure Hunt – TH.3A optimal route solver (static levels only).
 *
 * Exact shortest route through every treasure and then the goal.
 * Each adjacent player step costs 1; backtracking is allowed.
 *
 * Uses breadth-first search over (cell position, collected-treasure bitmask).
 * The current TH.1 rules permit <=5 treasures and <=10x15 cells, so the
 * complete search space is at most 150*2^5 = 4800 states.
 *
 * Browser: window.PathleTreasureSolver (load after treasure-engine.js).
 * Node: require('./treasure-solver.js')
 *
 * NOTE: This solver is deliberately limited to *static TH.1 levels*.
 * Do not apply these optimal scores to future currents/waves, moving entities,
 * keys or other effects until a solver using those rules is implemented.
 */
(function (root) {
  'use strict';

  function getEngine() {
    if (root && root.PathleTreasureEngine) return root.PathleTreasureEngine;
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      return require('./treasure-engine.js');
    }
    throw new Error('PathleTreasureEngine must load before PathleTreasureSolver');
  }

  function solve(level) {
    const engine = getEngine();
    const validation = engine.validateLevel(level);
    if (!validation.valid) {
      throw new TypeError('Cannot solve invalid or unsupported TH.1 level: ' + validation.errors.join('; '));
    }

    const cellCount = level.width * level.height;
    const totalMasks = 1 << level.treasures.length;
    const fullMask = totalMasks - 1;
    const totalStates = cellCount * totalMasks;
    const blocked = new Set(level.blocked);
    const treasureBits = new Uint8Array(cellCount);
    level.treasures.forEach((cell, index) => { treasureBits[cell] = 1 << index; });

    // Get legal movement from the same TH.1 rules engine as gameplay.
    // Precomputing avoids repeated board validation in the main BFS loop.
    const neighbors = Array(cellCount);
    for (let cell = 0; cell < cellCount; cell++) {
      if (!blocked.has(cell)) neighbors[cell] = engine.getNeighbors(level, cell);
    }

    const visited = new Uint8Array(totalStates);
    const parent = new Int32Array(totalStates);
    parent.fill(-1);
    const queue = new Int32Array(totalStates);
    let head = 0;
    let tail = 0;
    let exploredStates = 0;
    const startState = level.start; // no treasure may overlap start in TH.1
    queue[tail++] = startState;
    visited[startState] = 1;
    let targetState = -1;

    while (head < tail) {
      const stateKey = queue[head++];
      exploredStates++;
      const cell = stateKey % cellCount;
      const mask = Math.floor(stateKey / cellCount);
      if (cell === level.goal && mask === fullMask) {
        targetState = stateKey;
        break;
      }
      for (const destination of neighbors[cell]) {
        const nextMask = mask | treasureBits[destination];
        const nextState = nextMask * cellCount + destination;
        if (visited[nextState]) continue;
        visited[nextState] = 1;
        parent[nextState] = stateKey;
        queue[tail++] = nextState;
      }
    }

    // validateLevel() guarantees all treasures and the goal are reachable
    // under these undirected TH.1 rules. This guards any future mismatch.
    if (targetState === -1) {
      throw new Error('No solution found for a valid TH.1 level');
    }

    const path = [];
    for (let key = targetState; key !== -1; key = parent[key]) {
      path.push(key % cellCount);
    }
    path.reverse();
    return {
      optimalMoves: path.length - 1,
      path,
      exploredStates
    };
  }

  const api = Object.freeze({ solve });
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PathleTreasureSolver = api;
})(typeof window !== 'undefined' ? window : null);
