// Local player storage - no server transmission, all data stays on device

const PLAYER_STORE_KEY = 'dramaton_player';

// Funny placeholder names for anonymous players
const PLACEHOLDER_NAMES = [
  'Mysterious Stranger',
  'Wandering Soul',
  'Anonymous Hero',
  'Shadow Player',
  'Incognito Adventurer',
  'Nameless Wanderer',
  'Silent Protagonist',
  'Enigmatic Visitor',
  'Quantum Observer',
  'Spectral Guest',
];

export interface PlayerData {
  name: string;
  createdAt: number;
  lastSeen: number;
  gamesPlayed: number;
  hasSeenSecurityDialog: boolean;
  hasChosenName: boolean;
}

const getRandomPlaceholder = (): string => {
  return PLACEHOLDER_NAMES[Math.floor(Math.random() * PLACEHOLDER_NAMES.length)];
};

export const createDefaultPlayer = (): PlayerData => ({
  name: getRandomPlaceholder(),
  createdAt: Date.now(),
  lastSeen: Date.now(),
  gamesPlayed: 0,
  hasSeenSecurityDialog: false,
  hasChosenName: false,
});

export const loadPlayerData = (): PlayerData => {
  try {
    const stored = localStorage.getItem(PLAYER_STORE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as PlayerData;
      // Update last seen
      data.lastSeen = Date.now();
      savePlayerData(data);
      return data;
    }
  } catch (e) {
    console.error('Failed to load player data:', e);
  }
  return createDefaultPlayer();
};

export const savePlayerData = (data: PlayerData): void => {
  try {
    localStorage.setItem(PLAYER_STORE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save player data:', e);
  }
};

export const updatePlayerName = (name: string): PlayerData => {
  const data = loadPlayerData();
  data.name = name;
  data.hasChosenName = true;
  savePlayerData(data);
  return data;
};

export const clearPlayerName = (): PlayerData => {
  const data = loadPlayerData();
  data.name = getRandomPlaceholder();
  data.hasChosenName = false;
  savePlayerData(data);
  return data;
};

export const markSecurityDialogSeen = (): void => {
  const data = loadPlayerData();
  data.hasSeenSecurityDialog = true;
  savePlayerData(data);
};

export const incrementGamesPlayed = (): void => {
  const data = loadPlayerData();
  data.gamesPlayed += 1;
  savePlayerData(data);
};

export const getPlaceholderName = getRandomPlaceholder;
