// Color Clash Tiles - Match 3 Game with Phaser 3
// All game logic is here. Beginner-friendly comments throughout!

// ---- CONFIGURABLE CONSTANTS ----
const GRID_SIZE = 8; // 8x8 grid
const TILE_SIZE = 64; // Default, will scale for mobile
const COLORS = [0xff4c4c, 0x4c7cff, 0x47cf73, 0xffea47, 0xb94cff]; // Red, Blue, Green, Yellow, Purple
const INITIAL_MOVES = 30;

// ---- RESPONSIVE SCALING ----
function getScaleConfig() {
  // Calculate grid size + margin
  const minTileSize = 40;
  const maxTileSize = 80;
  const margin = 32;
  let w = window.innerWidth, h = window.innerHeight;
  let tileSize = Math.floor(Math.min(
    (w - margin) / GRID_SIZE,
    (h - margin - 100) / GRID_SIZE
  ));
  tileSize = Math.max(minTileSize, Math.min(maxTileSize, tileSize));
  let width = tileSize * GRID_SIZE;
  let height = tileSize * GRID_SIZE + 100; // extra for UI
  return { width, height, tileSize };
}

// ---- GAME SCENE ----
class Match3Scene extends Phaser.Scene {
  constructor() {
    super('Match3Scene');
    this.grid = [];
    this.selected = null;
    this.isSwapping = false;
    this.score = 0;
    this.moves = INITIAL_MOVES;
    this.ui = {};
    this.tileSize = TILE_SIZE;
    this.gameWidth = GRID_SIZE * TILE_SIZE;
    this.gameHeight = GRID_SIZE * TILE_SIZE + 100;
  }

  preload() {
    // No assets needed, using graphics
  }

  create() {
    this.setupScaling();
    this.createUI();
    this.createGrid();
    this.input.on('gameobjectdown', this.onTileClick, this);

    // Responsive resize
    window.addEventListener('resize', () => this.handleResize());
  }

  setupScaling() {
    // Get fresh scale config
    const { width, height, tileSize } = getScaleConfig();
    this.tileSize = tileSize;
    this.gameWidth = width;
    this.gameHeight = height;
    this.cameras.main.setBackgroundColor('#222');
    this.scale.resize(this.gameWidth, this.gameHeight);

    // Center game in container
    let container = document.getElementById('game-container');
    container.style.width = this.gameWidth + 'px';
    container.style.height = this.gameHeight + 'px';
  }

  createUI() {
    // Score
    this.ui.scoreText = this.add.text(
      20, 20,
      'Score: 0',
      { font: '24px Arial', fill: '#fff', fontStyle: 'bold' }
    ).setDepth(2);

    // Moves
    this.ui.movesText = this.add.text(
      this.gameWidth - 160, 20,
      `Moves: ${this.moves}`,
      { font: '24px Arial', fill: '#fff', fontStyle: 'bold' }
    ).setDepth(2);
  }

  updateUI() {
    this.ui.scoreText.setText(`Score: ${this.score}`);
    this.ui.movesText.setText(`Moves: ${this.moves}`);
  }

  createGrid() {
    // Clear old grid
    this.grid.forEach(row => row.forEach(tile => tile && tile.destroy()));
    this.grid = [];

    // Create new grid
    for (let y = 0; y < GRID_SIZE; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        let color = Phaser.Math.RND.pick(COLORS);
        let tile = this.createTile(x, y, color);
        this.grid[y][x] = tile;
      }
    }
    // Remove initial matches for fair start
    this.removeInitialMatches();
  }

  createTile(x, y, color) {
    // Create a colored rectangle as placeholder
    let size = this.tileSize;
    let pos = this.gridToPixel(x, y);
    let tile = this.add.rectangle(
      pos.x, pos.y, size - 6, size - 6, color
    ).setStrokeStyle(3, 0xffffff)
     .setOrigin(0)
     .setInteractive({ useHandCursor: true });

    tile.tileX = x;
    tile.tileY = y;
    tile.tileColor = color;
    return tile;
  }

  gridToPixel(x, y) {
    // Calculate pixel position with offset for centering
    let offsetX = (this.gameWidth - this.tileSize * GRID_SIZE) / 2;
    let offsetY = 60; // Leave space for UI
    return {
      x: offsetX + x * this.tileSize,
      y: offsetY + y * this.tileSize
    };
  }

  onTileClick(pointer, tile) {
    if (this.isSwapping || this.moves <= 0) return;
    if (this.selected) {
      // Second tile: check adjacency
      if (tile === this.selected) return;
      if (this.areAdjacent(tile, this.selected)) {
        this.swapTiles(tile, this.selected, true);
      } else {
        // Not adjacent, deselect
        this.deselectTile(this.selected);
        this.selectTile(tile);
      }
    } else {
      this.selectTile(tile);
    }
  }

  selectTile(tile) {
    tile.setStrokeStyle(5, 0xffff00); // highlight
    this.selected = tile;
  }

  deselectTile(tile) {
    tile.setStrokeStyle(3, 0xffffff);
    this.selected = null;
  }

  areAdjacent(a, b) {
    let dx = Math.abs(a.tileX - b.tileX);
    let dy = Math.abs(a.tileY - b.tileY);
    return (dx + dy === 1);
  }

  swapTiles(tileA, tileB, isPlayerMove = false) {
    this.isSwapping = true;
    // Animate swap
    let posA = this.gridToPixel(tileA.tileX, tileA.tileY);
    let posB = this.gridToPixel(tileB.tileX, tileB.tileY);

    this.tweens.add({
      targets: tileA,
      x: posB.x, y: posB.y,
      duration: 180,
      onComplete: () => {
        this.tweens.add({
          targets: tileB,
          x: posA.x, y: posA.y,
          duration: 180,
          onComplete: () => {
            // Swap positions in grid
            this.swapGridTiles(tileA, tileB);
            this.isSwapping = false;
            if (this.selected) this.deselectTile(this.selected);
            // Check for matches
            let matches = this.findAllMatches();
            if (matches.length > 0) {
              if (isPlayerMove) {
                this.moves--;
                this.updateUI();
              }
              this.handleMatches(matches);
            } else if (isPlayerMove) {
              // No match: revert swap
              this.swapTiles(tileA, tileB, false);
            }
          }
        });
      }
    });
  }

  swapGridTiles(tileA, tileB) {
    // Swap tileX/tileY
    let ax = tileA.tileX, ay = tileA.tileY;
    let bx = tileB.tileX, by = tileB.tileY;
    // Update grid
    this.grid[ay][ax] = tileB;
    this.grid[by][bx] = tileA;
    // Update tile objects
    tileA.tileX = bx; tileA.tileY = by;
    tileB.tileX = ax; tileB.tileY = ay;
  }

  findAllMatches() {
    // Returns array of {x, y, tile} to clear
    let matches = [];
    let checked = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));

    // Horizontal
    for (let y = 0; y < GRID_SIZE; y++) {
      let streak = 1;
      for (let x = 1; x < GRID_SIZE; x++) {
        let t1 = this.grid[y][x - 1], t2 = this.grid[y][x];
        if (t1.tileColor === t2.tileColor) {
          streak++;
        } else {
          if (streak >= 3) {
            for (let k = x - streak; k < x; k++) {
              if (!checked[y][k]) {
                matches.push({x: k, y: y, tile: this.grid[y][k]});
                checked[y][k] = true;
              }
            }
          }
          streak = 1;
        }
      }
      if (streak >= 3) {
        for (let k = GRID_SIZE - streak; k < GRID_SIZE; k++) {
          if (!checked[y][k]) {
            matches.push({x: k, y: y, tile: this.grid[y][k]});
            checked[y][k] = true;
          }
        }
      }
    }

    // Vertical
    for (let x = 0; x < GRID_SIZE; x++) {
      let streak = 1;
      for (let y = 1; y < GRID_SIZE; y++) {
        let t1 = this.grid[y - 1][x], t2 = this.grid[y][x];
        if (t1.tileColor === t2.tileColor) {
          streak++;
        } else {
          if (streak >= 3) {
            for (let k = y - streak; k < y; k++) {
              if (!checked[k][x]) {
                matches.push({x: x, y: k, tile: this.grid[k][x]});
                checked[k][x] = true;
              }
            }
          }
          streak = 1;
        }
      }
      if (streak >= 3) {
        for (let k = GRID_SIZE - streak; k < GRID_SIZE; k++) {
          if (!checked[k][x]) {
            matches.push({x: x, y: k, tile: this.grid[k][x]});
            checked[k][x] = true;
          }
        }
      }
    }
    return matches;
  }

  handleMatches(matches) {
    // Animate and clear matched tiles
    let delay = 140;
    matches.forEach(({tile}) => {
      // Fade out
      this.tweens.add({
        targets: tile,
        alpha: 0,
        scale: 0.7,
        duration: delay,
        onComplete: () => {
          tile.destroy();
        }
      });
    });

    this.time.delayedCall(delay + 30, () => {
      // Set grid positions to null
      matches.forEach(({x, y}) => {
        this.grid[y][x] = null;
      });
      this.score += matches.length * 10;
      this.updateUI();

      // Drop tiles down and fill new ones
      this.fillEmptyTiles().then(() => {
        // After filling, check for new matches (cascade)
        let newMatches = this.findAllMatches();
        if (newMatches.length > 0) {
          this.handleMatches(newMatches);
        }
      });
    });
  }

  async fillEmptyTiles() {
    // Drop tiles down & fill new at top
    let promises = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      let empty = 0;
      for (let y = GRID_SIZE - 1; y >= 0; y--) {
        if (this.grid[y][x] == null) {
          empty++;
        } else if (empty > 0) {
          // Move tile down by 'empty' cells
          let tile = this.grid[y][x];
          this.grid[y + empty][x] = tile;
          tile.tileY = y + empty;
          let target = this.gridToPixel(x, y + empty);
          promises.push(this.tweenTileTo(tile, target.x, target.y));
          this.grid[y][x] = null;
        }
      }
      // New tiles at top
      for (let i = 0; i < empty; i++) {
        let color = Phaser.Math.RND.pick(COLORS);
        let tile = this.createTile(x, i, color);
        tile.alpha = 0;
        this.grid[i][x] = tile;
        let target = this.gridToPixel(x, i);
        promises.push(this.tweenTileTo(tile, target.x, target.y, true));
      }
    }
    // Wait for animation to finish
    await Promise.all(promises);
  }

  tweenTileTo(tile, x, y, fadeIn = false) {
    return new Promise(resolve => {
      let tweens = [];
      tweens.push({
        targets: tile,
        x: x, y: y,
        duration: 140,
        onComplete: () => {
          if (fadeIn) {
            this.tweens.add({
              targets: tile,
              alpha: 1,
              duration: 120,
              onComplete: resolve
            });
          } else {
            resolve();
          }
        }
      });
      if (fadeIn) tile.alpha = 0;
      this.tweens.add(tweens[0]);
    });
  }

  removeInitialMatches() {
    // Remove matches so starting grid is fair
    let matches = this.findAllMatches();
    while (matches.length > 0) {
      matches.forEach(({x, y, tile}) => {
        let newColor;
        do {
          newColor = Phaser.Math.RND.pick(COLORS);
        } while (newColor === tile.tileColor);
        tile.tileColor = newColor;
        tile.fillColor = newColor;
      });
      matches = this.findAllMatches();
    }
  }

  handleResize() {
    // Called on window resize to adapt game
    this.setupScaling();
    // Update UI positions
    this.ui.scoreText.setPosition(20, 20);
    this.ui.movesText.setPosition(this.gameWidth - 160, 20);
    // Reposition all tiles
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        let tile = this.grid[y][x];
        if (tile) {
          let pos = this.gridToPixel(x, y);
          tile.setSize(this.tileSize - 6, this.tileSize - 6);
          tile.setPosition(pos.x, pos.y);
        }
      }
    }
    this.scale.resize(this.gameWidth, this.gameHeight);
    let container = document.getElementById('game-container');
    container.style.width = this.gameWidth + 'px';
    container.style.height = this.gameHeight + 'px';
  }

  update() {
    // Optionally, handle end game
    if (this.moves <= 0 && !this.isSwapping) {
      // Simple Game Over
      this.ui.movesText.setText('Moves: 0');
      this.add.text(
        this.gameWidth / 2, this.gameHeight / 2,
        `Game Over!\nScore: ${this.score}`,
        { font: '32px Arial', fill: '#fff', align: 'center' }
      ).setOrigin(0.5).setDepth(10);
      this.input.off('gameobjectdown', this.onTileClick, this);
    }
  }
}

// ---- GAME CONFIG ----
function launchGame() {
  const { width, height } = getScaleConfig();
  const config = {
    type: Phaser.AUTO,
    backgroundColor: '#222',
    parent: 'game-container',
    width,
    height,
    scene: [Match3Scene],
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: { pixelArt: false, antialias: true }
  };
  window.game = new Phaser.Game(config);
}

// ---- LAUNCH ----
window.addEventListener('DOMContentLoaded', () => {
  launchGame();
});
findAllMatches() {
    let matches = [];
    let checked = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));

    // Horizontal matches
    for (let y = 0; y < GRID_SIZE; y++) {
        let streak = 1;
        for (let x = 1; x < GRID_SIZE; x++) {
            let t1 = this.grid[y][x - 1], t2 = this.grid[y][x];
            if (t1.tileColor === t2.tileColor) {
                streak++;
            } else {
                if (streak >= 3) {
                    for (let k = x - streak; k < x; k++) {
                        if (!checked[y][k]) {
                            matches.push({x: k, y: y, tile: this.grid[y][k]});
                            checked[y][k] = true;
                        }
                    }
                }
                streak = 1;
            }
        }
        if (streak >= 3) {
            for (let k = GRID_SIZE - streak; k < GRID_SIZE; k++) {
                if (!checked[y][k]) {
                    matches.push({x: k, y: y, tile: this.grid[y][k]});
                    checked[y][k] = true;
                }
            }
        }
    }

    // Vertical matches
    for (let x = 0; x < GRID_SIZE; x++) {
        let streak = 1;
        for (let y = 1; y < GRID_SIZE; y++) {
            let t1 = this.grid[y - 1][x], t2 = this.grid[y][x];
            if (t1.tileColor === t2.tileColor) {
                streak++;
            } else {
                if (streak >= 3) {
                    for (let k = y - streak; k < y; k++) {
                        if (!checked[k][x]) {
                            matches.push({x: x, y: k, tile: this.grid[k][x]});
                            checked[k][x] = true;
                        }
                    }
                }
                streak = 1;
            }
        }
        if (streak >= 3) {
            for (let k = GRID_SIZE - streak; k < GRID_SIZE; k++) {
                if (!checked[k][x]) {
                    matches.push({x: x, y: k, tile: this.grid[k][x]});
                    checked[k][x] = true;
                }
            }
        }
    }

    return matches;
}
