'use strict';

const STORAGE_PREFIX = 'gdc';
let orientationOverlayDismissed = false;
const storage = window.GdcStorage;

const UPGRADE_DEFS = [
  {
    key: 'atk',
    label: '공격력',
    max: 20,
    currency: 'fragments',
    baseCost: 50,
    costScale: 1.22,
    effectLabel: '+2%/레벨',
    effectValue: (level) => `${level * 2}%`,
  },
  {
    key: 'fireRate',
    label: '공속',
    max: 15,
    currency: 'fragments',
    baseCost: 60,
    costScale: 1.22,
    effectLabel: '+2%/레벨',
    effectValue: (level) => `${level * 2}%`,
  },
  {
    key: 'range',
    label: '사거리',
    max: 10,
    currency: 'fragments',
    baseCost: 40,
    costScale: 1.22,
    effectLabel: '+2%/레벨',
    effectValue: (level) => `${level * 2}%`,
  },
  {
    key: 'maxHp',
    label: '최대 HP',
    max: 10,
    currency: 'fragments',
    baseCost: 70,
    costScale: 1.22,
    effectLabel: '+3%/레벨',
    effectValue: (level) => `${level * 3}%`,
  },
  {
    key: 'pickup',
    label: '자원 획득량',
    max: 10,
    currency: 'fragments',
    baseCost: 80,
    costScale: 1.22,
    effectLabel: '+2%/레벨',
    effectValue: (level) => `${level * 2}%`,
  },
  {
    key: 'startLevel',
    label: '시작 레벨',
    max: 3,
    currency: 'cores',
    baseCost: 2,
    costScale: 1.35,
    effectLabel: '+1/레벨',
    effectValue: (level) => `+${level}`,
  },
  {
    key: 'startChoices',
    label: '시작 카드 선택지',
    max: 2,
    currency: 'cores',
    baseCost: 3,
    costScale: 1.35,
    effectLabel: '+1/레벨',
    effectValue: (level) => `+${level}`,
  },
  {
    key: 'rerolls',
    label: '리롤',
    max: 3,
    currency: 'cores',
    baseCost: 2,
    costScale: 1.35,
    effectLabel: '+1/레벨',
    effectValue: (level) => `+${level}`,
  },
];

const BASE_PLAYER = {
  damage: 10,
  fireRate: 1,
  range: 120,
  maxHp: 100,
};

let savedData = storage ? storage.getSaveData() : { resources: { fragments: 0, cores: 0 } };
let metaUpgrades = storage ? storage.getMetaUpgrades() : {};
let playerState = { ...BASE_PLAYER };
let gameInfo = {
  maxHp: BASE_PLAYER.maxHp,
  hp: BASE_PLAYER.maxHp,
  startChoices: 3,
  rerolls: 0,
  level: 1,
};

const startChoiceTemplates = [
  '에너지 실드',
  '폭발 화살',
  '재생 부스트',
  '레이저 슬래시',
  '체력 회복',
  '치명타 강화',
  '속도 강화',
];

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

function persistSaveData() {
  if (!storage) return;
  storage.setSaveData(savedData);
}

function updateLobbyResources() {
  const fragmentsEl = document.getElementById('lobby-fragments');
  const coresEl = document.getElementById('lobby-cores');
  if (fragmentsEl) fragmentsEl.textContent = savedData.resources.fragments;
  if (coresEl) coresEl.textContent = savedData.resources.cores;
}

function updateRunStats() {
  const statsEl = document.getElementById('run-stats');
  if (!statsEl) return;
  statsEl.innerHTML = `
    현재 레벨: ${gameInfo.level}<br />
    공격력: ${playerState.damage.toFixed(1)} | 공속: ${playerState.fireRate.toFixed(2)}<br />
    사거리: ${playerState.range.toFixed(0)} | 최대 HP: ${playerState.maxHp.toFixed(0)}<br />
    시작 선택지: ${gameInfo.startChoices}장 | 리롤: ${gameInfo.rerolls}
  `;
}

function getUpgradeCost(def, level) {
  return Math.round(def.baseCost * def.costScale ** level);
}

function renderUpgradeModal() {
  const fragmentsEl = document.getElementById('upgrade-fragments');
  const coresEl = document.getElementById('upgrade-cores');
  const listEl = document.getElementById('upgrade-list');
  if (!listEl) return;

  metaUpgrades = storage ? storage.getMetaUpgrades() : metaUpgrades;
  if (fragmentsEl) fragmentsEl.textContent = savedData.resources.fragments;
  if (coresEl) coresEl.textContent = savedData.resources.cores;

  listEl.innerHTML = '';
  UPGRADE_DEFS.forEach((def) => {
    const level = metaUpgrades[def.key] ?? 0;
    const atMax = level >= def.max;
    const nextCost = getUpgradeCost(def, level);
    const canAfford = savedData.resources[def.currency] >= nextCost;

    const item = document.createElement('div');
    item.className = 'upgrade-item';

    const meta = document.createElement('div');
    meta.className = 'upgrade-meta';
    meta.innerHTML = `
      <div class="upgrade-name">${def.label}</div>
      <div>Lv ${level} / ${def.max} · 효과 ${def.effectLabel} (현재 ${def.effectValue(level)})</div>
      <div class="upgrade-cost">${atMax ? '최대 레벨 도달' : `다음 비용: ${nextCost} ${def.currency}`}</div>
    `;

    const action = document.createElement('div');
    action.className = 'upgrade-action';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'upgrade-btn';
    button.textContent = atMax ? 'MAX' : '구매';
    button.disabled = atMax || !canAfford;
    button.addEventListener('click', () => {
      tryBuyUpgrade(def.key);
    });

    const reason = document.createElement('div');
    reason.className = 'upgrade-reason';
    if (atMax) {
      reason.textContent = 'MAX';
    } else if (!canAfford) {
      reason.textContent = '재화 부족';
    }

    action.append(button, reason);
    item.append(meta, action);
    listEl.append(item);
  });
}

function openUpgradeModal() {
  const overlay = document.getElementById('upgrade-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  renderUpgradeModal();
}

function closeUpgradeModal() {
  const overlay = document.getElementById('upgrade-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
}

function tryBuyUpgrade(key) {
  const def = UPGRADE_DEFS.find((item) => item.key === key);
  if (!def) return;

  metaUpgrades = storage ? storage.getMetaUpgrades() : metaUpgrades;
  const currentLevel = metaUpgrades[key] ?? 0;
  if (currentLevel >= def.max) return;

  const cost = getUpgradeCost(def, currentLevel);
  if (savedData.resources[def.currency] < cost) return;

  savedData = {
    ...savedData,
    resources: {
      ...savedData.resources,
      [def.currency]: savedData.resources[def.currency] - cost,
    },
  };
  metaUpgrades = { ...metaUpgrades, [key]: currentLevel + 1 };

  if (storage) {
    storage.setMetaUpgrades(metaUpgrades);
    persistSaveData();
  }

  updateLobbyResources();
  renderUpgradeModal();
}

function addResources(kind, amount) {
  const multiplier = 1 + 0.02 * (metaUpgrades.pickup ?? 0);
  const finalAmount = Math.round(amount * multiplier);
  savedData = {
    ...savedData,
    resources: {
      ...savedData.resources,
      [kind]: savedData.resources[kind] + finalAmount,
    },
  };
  persistSaveData();
  updateLobbyResources();
}

function resetGameData() {
  playerState = { ...BASE_PLAYER };
  gameInfo = {
    maxHp: BASE_PLAYER.maxHp,
    hp: BASE_PLAYER.maxHp,
    startChoices: 3,
    rerolls: 0,
    level: 1,
  };
}

function applyMetaUpgrades() {
  metaUpgrades = storage ? storage.getMetaUpgrades() : metaUpgrades;

  const atkMult = 1 + 0.02 * (metaUpgrades.atk ?? 0);
  const fireRateMult = 1 + 0.02 * (metaUpgrades.fireRate ?? 0);
  const rangeMult = 1 + 0.02 * (metaUpgrades.range ?? 0);
  const maxHpMult = 1 + 0.03 * (metaUpgrades.maxHp ?? 0);

  playerState = {
    ...playerState,
    damage: playerState.damage * atkMult,
    fireRate: playerState.fireRate * fireRateMult,
    range: playerState.range * rangeMult,
    maxHp: playerState.maxHp * maxHpMult,
  };

  gameInfo = {
    ...gameInfo,
    maxHp: playerState.maxHp,
    hp: playerState.maxHp,
    startChoices: Math.min(5, gameInfo.startChoices + (metaUpgrades.startChoices ?? 0)),
    rerolls: metaUpgrades.rerolls ?? 0,
    level: 1 + (metaUpgrades.startLevel ?? 0),
  };
}

function buildStartChoices() {
  const list = document.getElementById('selection-list');
  if (!list) return;
  list.innerHTML = '';
  const choices = Math.max(3, gameInfo.startChoices);
  for (let i = 0; i < choices; i += 1) {
    const card = document.createElement('div');
    const pick = startChoiceTemplates[(Math.random() * startChoiceTemplates.length) | 0];
    card.className = 'selection-card';
    card.textContent = pick;
    list.append(card);
  }
}

function updateRerollButton() {
  const button = document.getElementById('selection-reroll');
  if (!button) return;
  button.textContent = `REROLL (${gameInfo.rerolls})`;
  button.disabled = gameInfo.rerolls <= 0;
}

function openSelectionOverlay() {
  const overlay = document.getElementById('selection-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  buildStartChoices();
  updateRerollButton();
}

function closeSelectionOverlay() {
  const overlay = document.getElementById('selection-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
}

function startRun() {
  resetGameData();
  applyMetaUpgrades();
  updateRunStats();
  openSelectionOverlay();
}

function init() {
  const versionEl = document.getElementById('version');
  if (versionEl && window.GDC_VERSION) {
    versionEl.textContent = window.GDC_VERSION;
  }

  if (storage) {
    storage.ensureMetaUpgrades();
  }

  const rotateContinueBtn = document.getElementById('rotate-continue');
  if (rotateContinueBtn) {
    rotateContinueBtn.addEventListener('click', () => {
      orientationOverlayDismissed = true;
      const overlay = document.getElementById('rotate-overlay');
      if (overlay) overlay.classList.add('hidden');
    });
  }

  const upgradeOpen = document.getElementById('upgrade-open');
  if (upgradeOpen) {
    upgradeOpen.addEventListener('click', openUpgradeModal);
  }

  const upgradeClose = document.getElementById('upgrade-close');
  if (upgradeClose) {
    upgradeClose.addEventListener('click', closeUpgradeModal);
  }

  const upgradeBackdrop = document.getElementById('upgrade-backdrop');
  if (upgradeBackdrop) {
    upgradeBackdrop.addEventListener('click', closeUpgradeModal);
  }

  const startBtn = document.getElementById('start-run');
  if (startBtn) {
    startBtn.addEventListener('click', startRun);
  }

  const selectionClose = document.getElementById('selection-close');
  if (selectionClose) {
    selectionClose.addEventListener('click', closeSelectionOverlay);
  }

  const selectionBackdrop = document.getElementById('selection-backdrop');
  if (selectionBackdrop) {
    selectionBackdrop.addEventListener('click', closeSelectionOverlay);
  }

  const rerollBtn = document.getElementById('selection-reroll');
  if (rerollBtn) {
    rerollBtn.addEventListener('click', () => {
      if (gameInfo.rerolls <= 0) return;
      gameInfo = { ...gameInfo, rerolls: gameInfo.rerolls - 1 };
      buildStartChoices();
      updateRerollButton();
    });
  }

  updateLobbyResources();
  updateRunStats();

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  void addResources;
}

window.addEventListener('DOMContentLoaded', init);

void STORAGE_PREFIX;
