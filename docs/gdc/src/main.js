'use strict';

const STORAGE_PREFIX = 'gdc';

function updateOrientationOverlay() {
  const overlay = document.getElementById('rotate-overlay');
  if (!overlay) return;

  const isLandscape = window.innerWidth > window.innerHeight;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const shouldShow = isLandscape && shortSide < 600;

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

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
}

window.addEventListener('DOMContentLoaded', init);

void STORAGE_PREFIX;
