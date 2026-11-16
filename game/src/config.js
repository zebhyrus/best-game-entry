// LUMEN MOTH — tuning constants and palette.
// One place for every number the game balances on, so tuning never
// means hunting through logic files.

export const VIEW = { width: 1280, height: 800 };

export const PALETTE = {
  deep: '#04141f',
  water: '#06283a',
  reef: '#0b3d4d',
  cyan: '#6ff7ff',
  softCyan: '#a5f3ff',
  magenta: '#ff6fd8',
  gold: '#ffd76a',
  coral: '#ff7a6b',
  violet: '#b78cff',
  white: '#f2feff',
  dim: '#7fb8c4',
};

export const PLAYER = {
  radius: 15,
  speed: 285,
  maxHp: 100,
  fireInterval: 0.16,
  bulletSpeed: 640,
  bulletDamage: 13,
  bulletRadius: 5,
  dashSpeed: 780,
  dashTime: 0.22,
  dashCooldown: 2.1,
  pickupRadius: 70,
  comboWindow: 3.0,
};

export const ENEMY_TYPES = {
  thornling: { hp: 22, speed: 78, radius: 14, score: 50, touch: 9, color: '#ff7a6b' },
  dart: { hp: 16, speed: 96, radius: 12, score: 80, touch: 8, color: '#ffb347' },
  spitter: { hp: 30, speed: 58, radius: 15, score: 120, touch: 10, color: '#b78cff' },
  splitter: { hp: 34, speed: 62, radius: 19, score: 140, touch: 12, color: '#ff6fd8' },
  monarch: { hp: 950, speed: 46, radius: 48, score: 1500, touch: 20, color: '#ff4d6d' },
};

export const UPGRADES = [
  {
    id: 'spread',
    name: 'TRIPLE BLOOM',
    desc: 'Fire three lantern bolts in a fan instead of one.',
    apply: (p) => { p.shots += 2; },
  },
  {
    id: 'rapid',
    name: 'SWIFT WINGS',
    desc: 'Shoot 25% faster. Your wings hum a higher note.',
    apply: (p) => { p.fireInterval *= 0.75; },
  },
  {
    id: 'aegis',
    name: 'AEGIS SHELL',
    desc: '+30 max health and mend 30 health right now.',
    apply: (p) => { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 30); },
  },
  {
    id: 'magnet',
    name: 'MOTE MAGNET',
    desc: 'Light motes fly to you from twice as far away.',
    apply: (p) => { p.pickupRadius *= 2; },
  },
  {
    id: 'pierce',
    name: 'PIERCING LIGHT',
    desc: 'Your bolts pass through one extra thorn-creature.',
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'dash',
    name: 'MOON DASH',
    desc: 'Dash recharges 35% faster and leaves a stinging trail.',
    apply: (p) => { p.dashCooldown *= 0.65; p.dashTrail = true; },
  },
  {
    id: 'heavy',
    name: 'HEAVY LANTERN',
    desc: 'Bolts hit 60% harder, but fly a little slower.',
    apply: (p) => { p.bulletDamage = Math.round(p.bulletDamage * 1.6); },
  },
  {
    id: 'combo',
    name: 'LONG GLOW',
    desc: 'Your combo lasts 2 seconds longer per kill.',
    apply: (p) => { p.comboWindow += 2; },
  },
  {
    id: 'seeker',
    name: 'SEEKER LIGHT',
    desc: 'Your bolts curve toward the nearest thorn-creature.',
    apply: (p) => { p.homing = p.homing ? p.homing + 1.2 : 2.4; },
  },
  {
    id: 'ricochet',
    name: 'RICOCHET GLOW',
    desc: 'After a hit, a bolt bounces to another nearby thorn.',
    apply: (p) => { p.bounce += 1; },
  },
  {
    id: 'nova',
    name: 'CORAL NOVA',
    desc: 'Every few seconds a ring of bolts bursts out in all directions.',
    apply: (p) => { p.nova = p.nova ? p.nova + 4 : 10; p.novaTimer = Math.min(p.novaTimer, 1.5); },
  },
];

export const WAVES = {
  baseCount: 5,
  perWave: 3,
  spawnGap: 0.85,
  bossEvery: 5,
};
