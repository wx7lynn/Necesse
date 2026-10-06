const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

const GRID_SIZE = 15; // 15x15 islas visibles
const CELL_SIZE = canvas.width / GRID_SIZE;

// Colores de biomas simulados
const BIOMES = {
  0: { name: 'Plains / Forest', color: '#38761d' },
  1: { name: 'Desert', color: '#e69138' },
  2: { name: 'Snow', color: '#d9d9d9' },
  3: { name: 'Swamp', color: '#274e13' }
};

// Algoritmo Hash simple para determinar el bioma según la semilla y las coordenadas (X, Y)
function getBiome(seed, x, y) {
  let hash = 0;
  const str = `${seed}_${x}_${y}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 4;
}

function generateMap() {
  const seed = document.getElementById('seed').value;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      // Coordenadas relativas de la isla
      const worldX = x - Math.floor(GRID_SIZE / 2);
      const worldY = y - Math.floor(GRID_SIZE / 2);

      const biomeId = getBiome(seed, worldX, worldY);
      const biome = BIOMES[biomeId];

      // Dibujar bloque de la isla
      ctx.fillStyle = biome.color;
      ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);

      // Dibujar bordes de la cuadrícula
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

// Generar mapa al iniciar
generateMap();
