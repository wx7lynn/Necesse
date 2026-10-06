const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 700;
canvas.height = 700;

let camera = {
  x: 0,
  y: 0,
  zoom: 1,
  tileSize: 100
};

let isDragging = false;
let startX = 0, startY = 0;
let mousePos = { x: -1, y: -1, gridX: null, gridY: null };

// Biomas con paleta detallada estilo Necesse
const BIOMES = {
  0: { name: 'Bosque', land: [52, 110, 22], sand: [212, 180, 115], water: [41, 137, 216], river: [55, 150, 230], deepWater: [25, 90, 160] },
  1: { name: 'Desierto', land: [218, 165, 32], sand: [238, 207, 131], water: [35, 120, 190], river: [45, 130, 200], deepWater: [20, 80, 140] },
  2: { name: 'Nieve', land: [210, 225, 238], sand: [170, 190, 210], water: [25, 100, 180], river: [35, 115, 195], deepWater: [15, 65, 130] },
  3: { name: 'Pantano', land: [35, 75, 20], sand: [75, 85, 45], water: [28, 75, 100], river: [38, 85, 110], deepWater: [15, 50, 75] }
};

// Implementación rápida de Perlin / Simplex Noise 2D
const Permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
const p = new Array(512);
for (let i = 0; i < 256; i++) p[256 + i] = p[i] = Permutation[i];

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t, a, b) { return a + t * (b - a); }
function grad(hash, x, y) {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function perlin2D(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x);
  const v = fade(y);
  const A = p[X] + Y, B = p[X + 1] + Y;
  return lerp(v, lerp(u, grad(p[A], x, y), grad(p[B], x - 1, y)),
                 lerp(u, grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1)));
}

// FNT de Octavas para detalles orgánicos (costas, bahías, ríos)
function octavePerlin(x, y, octaves, persistence, seedOffset) {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    total += perlin2D((x + seedOffset) * frequency, (y + seedOffset) * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  return total / maxValue;
}

// Convertir semilla String a entero para offset de ruido
function seedToNumber(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getBiomeId(seedNum, worldX, worldY) {
  if (worldX === 0 && worldY === 0) return 0; // Centro = Bosque
  let val = octavePerlin(worldX * 0.1, worldY * 0.1, 2, 0.5, seedNum);
  let id = Math.floor(Math.abs(val) * 8) % 4;
  return id;
}

function render() {
  const seedInput = document.getElementById('seed').value || '123456';
  const seedNum = seedToNumber(seedInput);

  ctx.fillStyle = '#0f1b29';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const currentSize = Math.floor(camera.tileSize * camera.zoom);
  if (currentSize <= 8) return;

  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;

  const cols = Math.ceil(canvas.width / currentSize) + 2;
  const rows = Math.ceil(canvas.height / currentSize) + 2;

  const startCol = Math.floor(camera.x - cols / 2);
  const endCol = Math.ceil(camera.x + cols / 2);
  const startRow = Math.floor(camera.y - rows / 2);
  const endRow = Math.ceil(camera.y + rows / 2);

  mousePos.gridX = null;
  mousePos.gridY = null;

  for (let gx = startCol; gx <= endCol; gx++) {
    for (let gy = startRow; gy <= endRow; gy++) {
      const screenX = Math.floor(halfW + (gx - camera.x) * currentSize);
      const screenY = Math.floor(halfH + (gy - camera.y) * currentSize);

      drawOrganicIsland(seedNum, gx, gy, screenX, screenY, currentSize);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, currentSize, currentSize);

      if (
        mousePos.x >= screenX && mousePos.x < screenX + currentSize &&
        mousePos.y >= screenY && mousePos.y < screenY + currentSize
      ) {
        mousePos.gridX = gx;
        mousePos.gridY = gy;

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, currentSize, currentSize);
      }
    }
  }

  if (mousePos.gridX !== null && mousePos.gridY !== null) {
    drawTooltip(seedInput, seedNum);
  }
}

function drawOrganicIsland(seedNum, worldX, worldY, screenX, screenY, size) {
  const biomeId = getBiomeId(seedNum, worldX, worldY);
  const biome = BIOMES[biomeId];
  const center = size / 2;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Offset único para cada isla basado en su posición
  const islandOffset = (worldX * 31) + (worldY * 57) + (seedNum % 1000);

  for (let px = 0; px < size; px++) {
    for (let py = 0; py < size; py++) {
      // Normalizar coordenadas locales (-1 a 1)
      let nx = (px - center) / center;
      let ny = (py - center) / center;
      let dist = Math.sqrt(nx * nx + ny * ny);

      // Ruido de terreno orgánico (varias octavas para irregularidad costera)
      let noiseX = (worldX * 5) + (px / size) * 2.5;
      let noiseY = (worldY * 5) + (py / size) * 2.5;
      
      let coastNoise = octavePerlin(noiseX, noiseY, 4, 0.5, islandOffset);

      // Deformación del contorno de la isla (costas irregulares, bahías y penínsulas)
      let islandMask = 1.0 - Math.pow(dist, 1.8) + (coastNoise * 0.45 - 0.2);

      // Ruido para ríos serpenteantes
      let riverNoise = Math.abs(octavePerlin(noiseX * 2 + 10, noiseY * 2 + 10, 2, 0.5, islandOffset));

      let color = biome.water;

      if (islandMask <= 0.05 && islandMask > -0.15) {
        color = biome.water; // Agua somera
      } else if (islandMask <= -0.15) {
        color = biome.deepWater; // Océano profundo
      } else {
        // Tierra o playa
        if (islandMask < 0.18) {
          color = biome.sand; // Costa/Playa de arena
        } else {
          if (riverNoise < 0.05 && islandMask < 0.55) {
            color = biome.river; // Río navegable
          } else {
            color = biome.land; // Tierra con vegetación
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

  ctx.putImageData(imgData, screenX, screenY);
}

function drawTooltip(seedStr, seedNum) {
  const biomeId = getBiomeId(seedNum, mousePos.gridX, mousePos.gridY);
  const biomeName = BIOMES[biomeId].name;

  const text = `Isla (${mousePos.gridX}, ${mousePos.gridY}) - ${biomeName}`;

  ctx.font = 'bold 13px sans-serif';
  const textWidth = ctx.measureText(text).width;

  let tooltipX = mousePos.x + 12;
  let tooltipY = mousePos.y - 12;

  if (tooltipX + textWidth + 16 > canvas.width) tooltipX = mousePos.x - textWidth - 20;
  if (tooltipY - 24 < 0) tooltipY = mousePos.y + 24;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(tooltipX, tooltipY - 20, textWidth + 16, 26);
  ctx.strokeStyle = '#475569';
  ctx.strokeRect(tooltipX, tooltipY - 20, textWidth + 16, 26);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, tooltipX + 8, tooltipY - 3);
}

function generateMap() {
  camera.x = 0;
  camera.y = 0;
  render();
}

// Eventos de usuario
canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mousePos.x = e.clientX - rect.left;
  mousePos.y = e.clientY - rect.top;

  if (isDragging) {
    const dx = (e.clientX - startX) / (camera.tileSize * camera.zoom);
    const dy = (e.clientY - startY) / (camera.tileSize * camera.zoom);

    camera.x -= dx;
    camera.y -= dy;

    startX = e.clientX;
    startY = e.clientY;
  }

  render();
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  canvas.style.cursor = 'crosshair';
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  camera.zoom = Math.min(Math.max(camera.zoom * zoomFactor, 0.4), 2.8);
  render();
});

document.getElementById('seed').addEventListener('input', () => {
  render();
});

canvas.style.cursor = 'crosshair';
render();
