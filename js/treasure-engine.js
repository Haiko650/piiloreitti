/* Pathle Treasure Hunt – TH.1 (rules engine, no UI or persistence).
 *
 * Rectangular boards; variable start and goal; orthogonal movement;
 * backtracking; treasure collection; move cost; completion detection.
 *
 * Future extension points:
 *   - level.effects + resolveEffects: currents, whirlpools, gates, etc.
 *   - an independent environment event controller: waves, creatures, tides.
 * TH.1 intentionally rejects effects until the corresponding rules exist.
 *
 * Browser: window.PathleTreasureEngine
 * Node tests: require('./treasure-engine.js')
 */
(function (root) {
  'use strict';

  const ENGINE_VERSION = 1;
  const MAX_WIDTH = 10;
  const MAX_HEIGHT = 15;
  const MAX_TREASURES = 5;
  const DIRECTIONS = Object.freeze({
    up: [0, -1],
    right: [1, 0],
    down: [0, 1],
    left: [-1, 0]
  });
  const hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
  const isPlainObject = value => value !== null && typeof value === 'object' &&
    !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const isTile = (tile, count) => Number.isInteger(tile) && tile >= 0 && tile < count;
  const validUniqueTiles = (items, count) => Array.isArray(items) && items.every(tile => isTile(tile, count)) &&
    new Set(items).size === items.length;

  function neighborsOnBoard(width, height, blocked, from) {
    const x = from % width;
    const y = Math.floor(from / width);
    const answer = [];
    // Stable order: up, right, down, left.
    for (const [dx, dy] of Object.values(DIRECTIONS)) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const next = ny * width + nx;
      if (!blocked.has(next)) answer.push(next);
    }
    return answer;
  }

  function validateLevel(level) {
    const errors = [];
    if (!isPlainObject(level)) return { valid: false, errors: ['Level must be an object'] };

    if (level.engineVersion !== ENGINE_VERSION) errors.push('Unsupported engineVersion');
    if (typeof level.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(level.id)) {
      errors.push('Invalid level id');
    }
    if (typeof level.environment !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(level.environment)) {
      errors.push('Invalid environment id');
    }
    if (!Number.isInteger(level.width) || level.width < 2 || level.width > MAX_WIDTH ||
        !Number.isInteger(level.height) || level.height < 2 || level.height > MAX_HEIGHT) {
      errors.push(\`Board dimensions must be 2..\${MAX_WIDTH} wide and 2..\${MAX_HEIGHT} high\`);
      return { valid: false, errors };
    }

    const count = level.width * level.height;
    if (!isTile(level.start, count)) errors.push('Invalid start tile');
    if (!isTile(level.goal, count)) errors.push('Invalid goal tile');
    if (level.start === level.goal) errors.push('Start and goal must be different tiles');
    if (!validUniqueTiles(level.blocked, count)) errors.push('Blocked tiles must be unique valid tile ids');
    if (!validUniqueTiles(level.treasures, count) || level.treasures.length < 1 || level.treasures.length > MAX_TREASURES) {
      errors.push(\`Treasures must contain 1..\${MAX_TREASURES} unique valid tile ids\`);
    }
    // Do not silently accept effects that TH.1 cannot simulate or score.
    if (!Array.isArray(level.effects) || level.effects.length !== 0) {
      errors.push('TH.1 only supports an empty effects array');
    }
    if (errors.length) return { valid: false, errors };

    const blocked = new Set(level.blocked);
    if (blocked.has(level.start)) errors.push('Start is blocked');
    if (blocked.has(level.goal)) errors.push('Goal is blocked');
    if (level.treasures.includes(level.start) || level.treasures.includes(level.goal)) {
      errors.push('Treasures must not overlap start or goal');
    }
    if (level.treasures.some(tile => blocked.has(tile))) errors.push('A treasure is blocked');
    if (errors.length) return { valid: false, errors };

    // All traversable cells are undirected in TH.1. Reachability from start
    // therefore guarantees a route through all treasures and back to the goal.
    const seen = new Set([level.start]);
    const pending = [level.start];
    for (let head = 0; head < pending.length; head++) {
      for (const tile of neighborsOnBoard(level.width, level.height, blocked, pending[head])) {
        if (!seen.has(tile)) {
          seen.add(tile);
          pending.push(tile);
        }
      }
    }
    if (!seen.has(level.goal)) errors.push('Goal cannot be reached from start');
    if (level.treasures.some(tile => !seen.has(tile))) errors.push('Not all treasures are reachable from start');
    return { valid: errors.length === 0, errors };
  }

  function assertLevel(level) {
    const result = validateLevel(level);
    if (!result.valid) throw new TypeError(\`Invalid Treasure Hunt level: \${result.errors.join('; ')}\`);
  }

  function getNeighbors(level, from) {
    assertLevel(level);
    const count = level.width * level.height;
    if (!isTile(from, count)) throw new RangeError('Position outside level');
    if (level.blocked.includes(from)) throw new RangeError('Position is blocked');
    return neighborsOnBoard(level.width, level.height, new Set(level.blocked), from);
  }

  function createRun(level) {
    assertLevel(level);
    return {
      position: level.start,
      collected: [],
      moves: 0,
      penalties: 0,
      completed: false
    };
  }

  function checkCompletion(level, state) {
    assertLevel(level);
    if (!isPlainObject(state) || !Array.isArray(state.collected)) return false;
    return state.position === level.goal &&
      level.treasures.every(tile => state.collected.includes(tile));
  }

  function validateRun(level, state) {
    const levelStatus = validateLevel(level);
    if (!levelStatus.valid) return { valid: false, errors: levelStatus.errors };
    const errors = [];
    if (!isPlainObject(state)) return { valid: false, errors: ['Run must be an object'] };
    const count = level.width * level.height;
    if (!isTile(state.position, count) || level.blocked.includes(state.position)) errors.push('Invalid run position');
    if (!Array.isArray(state.collected) || new Set(state.collected).size !== state.collected.length ||
        state.collected.some(tile => !level.treasures.includes(tile))) errors.push('Invalid collected treasures');
    if (!Number.isSafeInteger(state.moves) || state.moves < 0) errors.push('Invalid move count');
    if (!Number.isSafeInteger(state.penalties) || state.penalties < 0) errors.push('Invalid penalty count');
    if (typeof state.completed !== 'boolean') errors.push('Invalid completed flag');
    if (!errors.length && state.completed !== checkCompletion(level, state)) {
      errors.push('Completed flag disagrees with run state');
    }
    return { valid: errors.length === 0, errors };
  }

  function getScore(state) {
    if (!isPlainObject(state) || !Number.isSafeInteger(state.moves) || state.moves < 0 ||
        !Number.isSafeInteger(state.penalties) || state.penalties < 0 ||
        !Number.isSafeInteger(state.moves + state.penalties)) {
      throw new TypeError('Invalid score values');
    }
    return state.moves + state.penalties;
  }

  // Explicit extension boundary. In TH.1 there are no valid level effects,
  // so this function returns the already-resolved base movement unchanged.
  function resolveEffects(level, state, events) {
    assertLevel(level);
    return { state, events };
  }

  function tileFromAction(level, position, action) {
    if (!isPlainObject(action) || action.type !== 'move') return null;
    const hasTo = hasOwn(action, 'to');
    const hasDirection = hasOwn(action, 'direction');
    if (hasTo === hasDirection) return null;
    if (hasTo) return Number.isInteger(action.to) ? action.to : null;
    if (!hasOwn(DIRECTIONS, action.direction)) return null;
    const offset = DIRECTIONS[action.direction];
    const x = position % level.width + offset[0];
    const y = Math.floor(position / level.width) + offset[1];
    return x >= 0 && x < level.width && y >= 0 && y < level.height ? y * level.width + x : -1;
  }

  function applyAction(level, state, action) {
    assertLevel(level);
    const stateStatus = validateRun(level, state);
    if (!stateStatus.valid) throw new TypeError(\`Invalid Treasure Hunt run: \${stateStatus.errors.join('; ')}\`);

    function rejected(reason) { return { accepted: false, reason, state, events: [] }; }
    if (state.completed) return rejected('already-completed');
    const to = tileFromAction(level, state.position, action);
    if (to === null) return rejected('invalid-action');
    if (!isTile(to, level.width * level.height)) return rejected('out-of-bounds');
    const fromX = state.position % level.width;
    const fromY = Math.floor(state.position / level.width);
    const toX = to % level.width;
    const toY = Math.floor(to / level.width);
    if (Math.abs(toX - fromX) + Math.abs(toY - fromY) !== 1) return rejected('not-adjacent');
    if (level.blocked.includes(to)) return rejected('blocked');

    const foundTreasure = level.treasures.includes(to) && !state.collected.includes(to);
    const next = {
      ...state,
      position: to,
      collected: foundTreasure ? [...state.collected, to] : [...state.collected],
      moves: state.moves + 1
    };
    if (!Number.isSafeInteger(next.moves) || !Number.isSafeInteger(next.moves + next.penalties)) {
      return rejected('score-overflow');
    }
    const events = [{ type: 'moved', from: state.position, to, source: 'player', cost: 1 }];
    if (foundTreasure) events.push({ type: 'treasure-collected', tile: to });
    const resolved = resolveEffects(level, next, events);
    resolved.state.completed = checkCompletion(level, resolved.state);
    if (resolved.state.completed) {
      resolved.events.push({ type: 'level-completed', score: getScore(resolved.state) });
    }
    return { accepted: true, reason: null, state: resolved.state, events: resolved.events };
  }

  const engine = Object.freeze({
    ENGINE_VERSION,
    MAX_WIDTH,
    MAX_HEIGHT,
    validateLevel,
    validateRun,
    getNeighbors,
    createRun,
    applyAction,
    resolveEffects,
    checkCompletion,
    getScore
  });
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.PathleTreasureEngine = engine;
})(typeof window !== 'undefined' ? window : null);
