/* Pathle Treasure Hunt – TH.3B fin grading for static Treasure Hunt levels.
 *
 * Three golden fins: optimal or within 5% (at least one extra move).
 * Two silver fins: within 25% (at least two extra moves).
 * One blue fin: any other completed level.
 *
 * Current TH.1 levels have no real-time effects. This module rejects future
 * unsupported level definitions via the TH.3A solver rather than inventing
 * grades for effects that the solver cannot model yet.
 *
 * Browser: window.PathleTreasureGrading (after treasure-engine + treasure-solver)
 * Node: require('./treasure-grading.js')
 */
(function (root) {
  'use strict';

  const GRADING_VERSION = 1;

  function requirePositiveSafeInteger(value, name) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new TypeError(name + ' must be a positive safe integer');
    }
  }

  function getThresholds(optimalMoves) {
    requirePositiveSafeInteger(optimalMoves, 'optimalMoves');
    const goldMaxMoves = optimalMoves + Math.max(1, Math.floor(optimalMoves * 0.05));
    const silverMaxMoves = optimalMoves + Math.max(2, Math.floor(optimalMoves * 0.25));
    if (!Number.isSafeInteger(goldMaxMoves) || !Number.isSafeInteger(silverMaxMoves)) {
      throw new RangeError('Grading thresholds exceed the safe integer range');
    }
    return { goldMaxMoves, silverMaxMoves };
  }

  function rateMoves(score, optimalMoves) {
    requirePositiveSafeInteger(score, 'score');
    const thresholds = getThresholds(optimalMoves);
    if (score < optimalMoves) {
      throw new RangeError('A static Treasure Hunt score cannot beat the exact optimum');
    }
    const fins = score <= thresholds.goldMaxMoves ? 3 :
      score <= thresholds.silverMaxMoves ? 2 : 1;
    const tier = fins === 3 ? 'gold' : fins === 2 ? 'silver' : 'blue';
    return {
      gradingVersion: GRADING_VERSION,
      score,
      optimalMoves,
      extraMoves: score - optimalMoves,
      fins,
      tier,
      thresholds
    };
  }

  function getModules() {
    if (root && root.PathleTreasureEngine && root.PathleTreasureSolver) {
      return { engine: root.PathleTreasureEngine, solver: root.PathleTreasureSolver };
    }
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      return { engine: require('./treasure-engine.js'), solver: require('./treasure-solver.js') };
    }
    throw new Error('Treasure grading requires Treasure Engine and Treasure Solver');
  }

  function rateRun(level, run) {
    const { engine, solver } = getModules();
    // The exact solver also validates the level and rejects unsupported effects.
    const { optimalMoves } = solver.solve(level);
    const validation = engine.validateRun(level, run);
    if (!validation.valid) {
      throw new TypeError('Cannot grade an invalid Treasure Hunt run: ' + validation.errors.join('; '));
    }
    if (!run.completed) {
      throw new Error('Cannot award fins before the level is completed');
    }
    return rateMoves(engine.getScore(run), optimalMoves);
  }

  const api = Object.freeze({ GRADING_VERSION, getThresholds, rateMoves, rateRun });
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PathleTreasureGrading = api;
})(typeof window !== 'undefined' ? window : null);
