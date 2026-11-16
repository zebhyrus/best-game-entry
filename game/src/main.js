// LUMEN MOTH — bootstrap. Finds the canvas, builds the game,
// and hands it the animation frame loop.

import { Game } from './game.js';
import { VIEW } from './config.js';

const canvas = document.getElementById('reef');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const game = new Game(canvas);
game.run();

// Debug handle for automated checks (state, player, input).
window.__lumen = game;
