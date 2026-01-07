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

const STAGE_NAMES = ['STAGE 1', 'STAGE 2', 'STAGE 3'];

let savedData = storage ? storage.getSaveData() : { resources: { fragments: 0, cores: 0 } };
savedData = {
  ...savedData,
  clearData: {
    NORMAL: savedData.clearData?.NORMAL ?? [],
    HARD: savedData.clearData?.HARD ?? [],
  },
};
let metaUpgrades = storage ? storage.getMetaUpgrades() : {};
let pickupMult = 1;
let startChoicesBonus = 0;
let startLevelBonus = 0;
let playerState = { ...BASE_PLAYER };
let gameInfo = {
  maxHp: BASE_PLAYER.maxHp,
  hp: BASE_PLAYER.maxHp,
  startChoices: 3,
  rerolls: 0,
  level: 1,
};
let isGodMode = false;
let isTestStage = false;
let devTapCount = 0;
let devTapTimer = null;

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

  if (!isLandscape) {
    orientationOverlayDismissed = false;
  }

  const shouldShow = isLandscape && !orientationOverlayDismissed;
  overlay.classList.toggle('hidden', !shouldShow);
}

function resize() {
  updateOrientationOverlay();
}

function persistSaveData() {
  if (!storage) return;
  storage.setSaveData(savedData);
}

function saveSavedData(nextData) {
  savedData = nextData;
  persistSaveData();
}

function updateLobbyResources() {
  const fragmentsEl = document.getElementById('lobby-fragments');
  const coresEl = document.getElementById('lobby-cores');
  if (fragmentsEl) fragmentsEl.textContent = savedData.resources.fragments;
  if (coresEl) coresEl.textContent = savedData.resources.cores;
}

function updateLobbyUI() {
  updateLobbyResources();
  updateRunStats();
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

function renderMetaUpgradeList() {
  const fragmentsEl = document.getElementById('meta-upgrade-fragments');
  const coresEl = document.getElementById('meta-upgrade-cores');
  const listEl = document.getElementById('meta-upgrade-list');
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
      tryBuyMetaUpgrade(def.key);
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

function openMetaUpgradeModal() {
  const overlay = document.getElementById('meta-upgrade-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  renderMetaUpgradeList();
}

function closeMetaUpgradeModal() {
  const overlay = document.getElementById('meta-upgrade-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
}

function tryBuyMetaUpgrade(key) {
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
    saveSavedData(savedData);
  }

  updateLobbyUI();
  renderMetaUpgradeList();
}

function addResources(kind, amount) {
  const finalAmount = Math.round(amount * pickupMult);
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
  applyMetaUpgrades();
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
    fireRate: playerState.fireRate * (1 / fireRateMult),
    range: playerState.range * rangeMult,
    maxHp: playerState.maxHp * maxHpMult,
  };

  startLevelBonus = metaUpgrades.startLevel ?? 0;
  startChoicesBonus = metaUpgrades.startChoices ?? 0;
  pickupMult = 1 + 0.02 * (metaUpgrades.pickup ?? 0);

  gameInfo = {
    ...gameInfo,
    maxHp: playerState.maxHp,
    hp: playerState.maxHp,
    startChoices: Math.min(5, 3 + startChoicesBonus),
    rerolls: metaUpgrades.rerolls ?? 0,
    level: 1 + startLevelBonus,
  };
}

function buildStartChoices() {
  const list = document.getElementById('selection-list');
  if (!list) return;
  list.innerHTML = '';
  const choices = Math.min(5, 3 + startChoicesBonus);
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
  updateRunStats();
  openSelectionOverlay();
}

function setupDevPanelToggle() {
  const versionEl = document.getElementById('version');
  const devPanel = document.getElementById('dev-panel');
  if (!versionEl || !devPanel) return;

  versionEl.addEventListener('click', () => {
    devTapCount += 1;
    if (devTapTimer) {
      window.clearTimeout(devTapTimer);
    }
    devTapTimer = window.setTimeout(() => {
      devTapCount = 0;
    }, 1500);

    if (devTapCount >= 5) {
      devTapCount = 0;
      devPanel.classList.remove('hidden');
    }
  });
}

function activateGodMode() {
  const stageCount = STAGE_NAMES.length;
  const stageIds = Array.from({ length: stageCount }, (_, index) => index + 1);
  savedData = {
    ...savedData,
    clearData: {
      NORMAL: stageIds,
      HARD: stageIds,
    },
    resources: {
      ...savedData.resources,
      fragments: (savedData.resources.fragments ?? 0) + 100000,
      cores: (savedData.resources.cores ?? 0) + 100000,
    },
  };
  saveSavedData(savedData);
  updateLobbyUI();
  isGodMode = true;
  isTestStage = false;
  alert('GOD MODE ENABLED\nALL STAGES UNLOCKED\n+100000 FRAGMENTS / +100000 CORES');
}

function openTestConfig() {
  const overlay = document.getElementById('test-config-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  isTestStage = true;
}

function closeTestConfig() {
  const overlay = document.getElementById('test-config-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  isTestStage = false;
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

  const upgradeOpen = document.getElementById('btn-upgr');
  if (upgradeOpen) {
    upgradeOpen.addEventListener('click', openMetaUpgradeModal);
  }

  const metaUpgradeClose = document.getElementById('meta-upgrade-close');
  if (metaUpgradeClose) {
    metaUpgradeClose.addEventListener('click', closeMetaUpgradeModal);
  }

  const metaUpgradeBackdrop = document.getElementById('meta-upgrade-backdrop');
  if (metaUpgradeBackdrop) {
    metaUpgradeBackdrop.addEventListener('click', closeMetaUpgradeModal);
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

  setupDevPanelToggle();

  const devGodBtn = document.getElementById('dev-god-btn');
  const devTestBtn = document.getElementById('dev-test-btn');
  if (devGodBtn) {
    devGodBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      activateGodMode();
    });
  }
  if (devTestBtn) {
    devTestBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openTestConfig();
    });
  }

  const testConfigClose = document.getElementById('test-config-close');
  if (testConfigClose) {
    testConfigClose.addEventListener('click', closeTestConfig);
  }

  const testConfigBackdrop = document.getElementById('test-config-backdrop');
  if (testConfigBackdrop) {
    testConfigBackdrop.addEventListener('click', closeTestConfig);
  }

  updateLobbyUI();

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  void addResources;
}

window.addEventListener('DOMContentLoaded', init);

void STORAGE_PREFIX;
