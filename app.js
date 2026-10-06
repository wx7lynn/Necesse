const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 600;

// Configuración de la cuadrícula de Necesse (11x11 islas visibles)
const GRID_SIZE = 9; 
const ISLAND_PIXEL_SIZE = canvas.width / GRID_SIZE;

// Definición de Biomas de Necesse y sus paletas de color
const BIOMES = {
  0: { name: 'Bosque / Llanuras', land: [62, 128, 25], sand: [218, 185, 122], water: [41, 137, 216], river: [55, 150, 230] },
  1: { name: 'Desierto', land: [218, 165, 32], sand: [238, 207, 131], water: [35, 120, 190], river: [45, 130, 200] },
  2: { name: 'Nieve', land: [220, 230, 240], sand: [180, 200, 220], water: [25, 90, 160], river: [35, 100, 170] },
  3: { name: 'Pantano', land: [35, 75, 20], sand: [80, 90, 50], water: [30, 80, 110], river: [40, 90, 120] }
};

// Generador de ruido para el terreno
function pseudoNoise(seed, x, y) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + Number(seed)) * 43758.5453;
  return n - Math.floor(n);
}

// Determina el bioma de una isla en la coordenada (worldX, worldY)
function getBiomeId(seed, worldX, worldY) {
  let hash = Math.floor(pseudoNoise(seed, worldX * 0.15 + 10, worldY * 0.15 + 10) * 4);
  return Math.abs(hash) % 4;
}

// Dibuja la cuadrícula completa de islas
function generateMap() {
  const seedInput = document.getElementById('seed').value || '123456';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      
      // Coordenadas del mundo para la isla
      const worldX = gx - Math.floor(GRID_SIZE / 2);
      const worldY = gy - Math.floor(GRID_SIZE / 2);

      // Dibujar la isla individual en su celda
      drawSingleIsland(seedInput, worldX, worldY, gx * ISLAND_PIXEL_SIZE, gy * ISLAND_PIXEL_SIZE, ISLAND_PIXEL_SIZE);
      
      // Dibujar bordes de cuadrícula
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(gx * ISLAND_PIXEL_SIZE, gy * ISLAND_PIXEL_SIZE, ISLAND_PIXEL_SIZE, ISLAND_PIXEL_SIZE);
    }
  }
}

// Genera los píxeles de una sola isla
function drawSingleIsland(seed, worldX, worldY, startX, startY, size) {
  const biomeId = getBiomeId(seed, worldX, worldY);
  const biome = BIOMES[biomeId];

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const center = size / 2;

  for (let px = 0; px < size; px++) {
    for (let py = 0; py < size; py++) {

      // Ruido de terreno relativo a la isla
      let nx = (px + worldX * 100) * 0.08;
      let ny = (py + worldY * 100) * 0.08;
      let elevation = pseudoNoise(seed, nx, ny) + pseudoNoise(seed, nx * 2, ny * 2) * 0.5;

      // Forma circular/orgánica de isla rodeada por agua
      let dx = (px - center) / center;
      let dy = (py - center) / center;
      let dist = Math.sqrt(dx * dx + dy * dy);
      elevation -= Math.pow(dist, 1.6);

      // Ruido para ríos
      let river = Math.abs(pseudoNoise(seed, nx * 2 + 50, ny * 2 + 50));

      let color = biome.water;

      if (elevation > -0.2) {
        if (elevation < -0.05) {
          color = biome.sand; // Costa
        } else {
          if (river < 0.06 && elevation < 0.3) {
            color = biome.river; // Río
          } else {
            color = biome.land; // Tierra firme del bioma
          }
        }
      }

      const idx = (py * size + px) * 4;
      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, startX, startY);
}

// Generar al cargar
generateMap();
