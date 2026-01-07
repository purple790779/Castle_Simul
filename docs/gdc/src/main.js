'use strict';

const STORAGE_PREFIX = 'gdc';
let orientationOverlayDismissed = false;

function updateOrientationOverlay() {
  const overlay = document.getElementById('rotate-overlay');
  if (!overlay) return;

  const isLandscape = window.innerWidth > window.innerHeight;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);

  if (shortSide >= 600) {
    orientationOverlayDismissed = false;
    overlay.classList.add('hidden');
    return;
  }

  const shouldShow = isLandscape && !orientationOverlayDismissed;

  if (!isLandscape) {
    orientationOverlayDismissed = false;
  }

  overlay.classList.toggle('hidden', !shouldShow);
}

function resize() {
  updateOrientationOverlay();
}

function init() {
  const versionEl = document.getElementById('version');
  if (versionEl && window.GDC_VERSION) {
    versionEl.textContent = window.GDC_VERSION;
  }

  const rotateContinueBtn = document.getElementById('rotate-continue');
  if (rotateContinueBtn) {
    rotateContinueBtn.addEventListener('click', () => {
      orientationOverlayDismissed = true;
      const overlay = document.getElementById('rotate-overlay');
      if (overlay) overlay.classList.add('hidden');
    });
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
}

window.addEventListener('DOMContentLoaded', init);

void STORAGE_PREFIX;
