const STORAGE_PREFIX = 'gdc';
const SAVE_KEY = `${STORAGE_PREFIX}:save`;
const META_UPGRADES_KEY = `${STORAGE_PREFIX}:metaUpgrades`;

const DEFAULT_META_UPGRADES = {
  atk: 0,
  fireRate: 0,
  range: 0,
  maxHp: 0,
  pickup: 0,
  startLevel: 0,
  startChoices: 0,
  rerolls: 0,
};

const DEFAULT_SAVE_DATA = {
  resources: {
    fragments: 0,
    cores: 0,
  },
};

function readJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (error) {
    console.warn(`[storage] Failed to parse ${key}`, error);
    return fallback;
  }
}

function getSaveData() {
  const data = readJSON(SAVE_KEY, {});
  return {
    ...DEFAULT_SAVE_DATA,
    ...data,
    resources: {
      ...DEFAULT_SAVE_DATA.resources,
      ...(data.resources ?? {}),
    },
  };
}

function setSaveData(data) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function getMetaUpgrades() {
  const data = readJSON(META_UPGRADES_KEY, {});
  return {
    ...DEFAULT_META_UPGRADES,
    ...data,
  };
}

function setMetaUpgrades(data) {
  localStorage.setItem(META_UPGRADES_KEY, JSON.stringify(data));
}

function ensureMetaUpgrades() {
  if (!localStorage.getItem(META_UPGRADES_KEY)) {
    setMetaUpgrades(DEFAULT_META_UPGRADES);
  }
}

window.GdcStorage = {
  getSaveData,
  setSaveData,
  getMetaUpgrades,
  setMetaUpgrades,
  ensureMetaUpgrades,
};
