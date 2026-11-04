/* Pathle Treasure Hunt TH.3C – modal results UI.
 * Session best scores only; persistent IndexedDB records are a later step.
 * This module never changes the board layout or game rules.
 */
(function (root) {
  'use strict';
  const grading = root.PathleTreasureGrading;
  const levels = root.PathleTreasureLevels;
  if (!grading || !Array.isArray(levels)) {
    throw new Error('TH.3C requires treasure-grading.js and treasure-levels.js');
  }

  const $ = id => document.getElementById(id);
  const dialog = $('thVictory');
  const game = document.querySelector('.th-shell');
  const finsEl = $('thWinFins');
  const next = $('thWinNext');
  const replay = $('thWinReplay');
  const sessionBest = new Map();
  let completedIndex = 0;

  const FIN_SVG = '<svg viewBox="0 0 56 66" aria-hidden="true" focusable="false"><path d="M5 56C18 46 23 18 32 7C42 18 44 40 51 56C34 50 19 51 5 56Z" fill="currentColor" stroke="var(--fin-edge)" stroke-width="2"/><path d="M30 19Q23 37 17 48" fill="none" stroke="var(--fin-shine)" stroke-width="3.5" stroke-linecap="round"/></svg>';

  function closeDialog() {
    dialog.hidden = true;
    game.inert = false;
  }

  function openDialog(event) {
    const detail = event.detail || {};
    const level = detail.level;
    const run = detail.run;
    const index = detail.levelIndex;
    if (!level || !run || !Number.isInteger(index) || levels[index]?.id !== level.id) {
      throw new TypeError('TH.3C received invalid level completion data');
    }
    const rating = grading.rateRun(level, run);
    completedIndex = index;
    const oldBest = sessionBest.get(level.id);
    const improved = oldBest === undefined || rating.score < oldBest;
    if (improved) sessionBest.set(level.id, rating.score);

    $('thWinMoves').textContent = String(rating.score);
    $('thWinOptimal').textContent = String(rating.optimalMoves);
    $('thWinBest').textContent = 'Best this session: ' + sessionBest.get(level.id) + ' moves';
    $('thWinRecord').textContent = oldBest === undefined ? 'FIRST CLEAR!' : improved ? 'NEW BEST!' : 'WELL DONE!';
    const tierNames = {gold:'GOLDEN PERFORMANCE!', silver:'SILVER PERFORMANCE!', blue:'LEVEL COMPLETE!'};
    $('thWinTier').textContent = tierNames[rating.tier];
    $('thWinLevel').textContent = 'LEVEL ' + (index + 1) + ' / ' + levels.length;
    finsEl.className = 'th-win-fins th-win-' + rating.tier;
    finsEl.setAttribute('aria-label', rating.fins + ' ' + rating.tier + ' fins');
    finsEl.replaceChildren();
    for (let i = 0; i < rating.fins; i++) {
      const fin = document.createElement('span');
      fin.className = 'th-win-fin';
      fin.innerHTML = FIN_SVG;
      finsEl.append(fin);
    }
    next.hidden = index === levels.length - 1;
    $('thWinFinal').hidden = index !== levels.length - 1;

    // The modal overlays rather than reflows the board. Inert also removes
    // the underlying level buttons from keyboard/assistive-tech interaction.
    game.inert = true;
    dialog.hidden = false;
    (next.hidden ? replay : next).focus();
  }

  next.addEventListener('click', () => {
    const to = completedIndex + 1;
    if (to >= levels.length) return;
    closeDialog();
    document.querySelector('[data-th-level="' + to + '"]').click();
  });
  replay.addEventListener('click', () => {
    closeDialog();
    $('thRestart').click();
  });
  document.addEventListener('pathle:treasure-complete', openDialog);
  document.addEventListener('pathle:treasure-level-change', closeDialog);
  document.addEventListener('keydown', event => {
    if (dialog.hidden) return;
    if (event.key === 'Escape') {
      // A completed run must be followed by an explicit choice; do not hide
      // the only way to proceed and leave the player on a finished board.
      event.preventDefault();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('a[href], button:not([hidden])')].filter(x => !x.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})(window);
