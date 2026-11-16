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
  fireInterval: 0.32,
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
  thornling: { hp: 26, speed: 86, radius: 14, score: 50, touch: 11, color: '#ff7a6b' },
  dart: { hp: 20, speed: 104, radius: 12, score: 80, touch: 10, color: '#ffb347' },
  spitter: { hp: 36, speed: 62, radius: 15, score: 120, touch: 12, color: '#b78cff' },
  splitter: { hp: 40, speed: 68, radius: 19, score: 140, touch: 14, color: '#ff6fd8' },
  monarch: { hp: 1100, speed: 50, radius: 48, score: 1500, touch: 20, color: '#ff4d6d' },
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
  {
    id: 'storm',
    name: 'STORM CALL',
    desc: 'Every 3 seconds, lightning zaps the nearest thorns.',
    apply: (p) => { p.storm = p.storm ? p.storm + 1 : 2; p.stormTimer = Math.min(p.stormTimer, 1); },
  },
  {
    id: 'frost',
    name: 'FROST NOVA',
    desc: 'Every few seconds, a freezing wave slows nearby thorns.',
    apply: (p) => { p.frost += 1; p.frostTimer = Math.min(p.frostTimer, 1); },
  },
  {
    id: 'orbit',
    name: 'ORBIT WISPS',
    desc: 'Two glowing wisps orbit you, shredding thorns on contact.',
    apply: (p) => { p.orbit = p.orbit ? p.orbit + 1 : 2; },
  },
  {
    id: 'meteor',
    name: 'METEOR RAIN',
    desc: 'Every 4 seconds a meteor crashes down on a random thorn.',
    apply: (p) => { p.meteor += 1; p.meteorTimer = Math.min(p.meteorTimer, 1); },
  },
  {
    id: 'chill',
    name: 'FROSTBITE BOLTS',
    desc: 'Your bolts chill thorns, slowing them for a second.',
    apply: (p) => { p.chill += 1; },
  },
  {
    id: 'explosive',
    name: 'EXPLOSIVE ROUNDS',
    desc: 'Bolts explode on impact, splashing nearby thorns.',
    apply: (p) => { p.explosive += 1; },
  },
  {
    id: 'leech',
    name: 'VAMPIRIC GLOW',
    desc: 'Every kill mends 3 health.',
    apply: (p) => { p.leech += 3; },
  },
  {
    id: 'crit',
    name: 'CRITICAL SPARKS',
    desc: '+15% chance your bolts hit for double damage.',
    apply: (p) => { p.crit += 0.15; },
  },
  {
    id: 'swift',
    name: 'SWIFT CURRENT',
    desc: 'Move 25% faster through the reef.',
    apply: (p) => { p.speed *= 1.25; },
  },
  {
    id: 'regen',
    name: 'REGENERATION',
    desc: 'Regenerate 2 health every second.',
    apply: (p) => { p.regen += 2; },
  },
  {
    id: 'wide',
    name: 'WIDE LANTERN',
    desc: 'Your bolts grow bigger and hit a wider arc.',
    apply: (p) => { p.bulletRadius += 4; },
  },
  {
    id: 'wisdom',
    name: 'OLD WISDOM',
    desc: 'XP gems are worth 50% more.',
    apply: (p) => { p.xpMul += 0.5; },
  },
  {
    id: 'thornmail',
    name: 'THORNMAIL',
    desc: 'Attackers take 15 damage when they hit you.',
    apply: (p) => { p.thorns += 15; },
  },
  {
    id: 'revive',
    name: 'SECOND WIND',
    desc: 'Once per run, cheat death and rise with 50 health.',
    apply: (p) => { if (p.revive) { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 30); } else { p.revive = true; } },
  },
];

export const WAVES = {
  baseCount: 14,
  perWave: 5,
  spawnGap: 0.45,
  bossEvery: 5,
};
