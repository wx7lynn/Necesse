const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 700;
canvas.height = 700;

// Estado de cámara
let camera = {
  x: 0,
  y: 0,
  zoom: 1,
  tileSize: 80
};

let isDragging = false;
let startX = 0, startY = 0;
let mousePos = { x: -1, y: -1, gridX: null, gridY: null };

// Biomas de Necesse
const BIOMES = {
  0: { name: 'Bosque', land: [62, 128, 25], sand: [218, 185, 122], water: [41, 137, 216], river: [55, 150, 230] },
  1: { name: 'Desierto', land: [218, 165, 32], sand: [238, 207, 131], water: [35, 120, 190], river: [45, 130, 200] },
  2: { name: 'Nieve', land: [220, 230, 240], sand: [180, 200, 220], water: [25, 90, 160], river: [35, 100, 170] },
  3: { name: 'Pantano', land: [35, 75, 20], sand: [80, 90, 50], water: [30, 80, 110], river: [40, 90, 120] }
};

function pseudoNoise(seed, x, y) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + Number(seed)) * 43758.5453;
  return n - Math.floor(n);
}

function getBiomeId(seed, worldX, worldY) {
  if (worldX === 0 && worldY === 0) return 0;
  let hash = Math.floor(pseudoNoise(seed, worldX * 0.12 + 5, worldY * 0.12 + 5) * 4);
  return Math.abs(hash) % 4;
}

// Renderizado directo en el Canvas principal
function render() {
  const seedInput = document.getElementById('seed').value || '123456';

  // Fondo azul oscuro para el océano
  ctx.fillStyle = '#0f1b29';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const currentSize = Math.floor(camera.tileSize * camera.zoom);
  if (currentSize <= 5) return;

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

  // Dibujar cada isla visible
  for (let gx = startCol; gx <= endCol; gx++) {
    for (let gy = startRow; gy <= endRow; gy++) {
      const screenX = Math.floor(halfW + (gx - camera.x) * currentSize);
      const screenY = Math.floor(halfH + (gy - camera.y) * currentSize);

      drawIsland(seedInput, gx, gy, screenX, screenY, currentSize);

      // Rejilla
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, currentSize, currentSize);

      // Detectar hover
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

  // Dibujar Tooltip flotante si el ratón está sobre una isla
  if (mousePos.gridX !== null && mousePos.gridY !== null) {
    drawTooltip(seedInput);
  }
}

function drawIsland(seed, worldX, worldY, screenX, screenY, size) {
  const biomeId = getBiomeId(seed, worldX, worldY);
  const biome = BIOMES[biomeId];
  const center = size / 2;

  // Creamos un buffer discreto de píxeles para la isla
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let px = 0; px < size; px++) {
    for (let py = 0; py < size; py++) {
      let nx = (px + worldX * 100) * 0.08;
      let ny = (py + worldY * 100) * 0.08;

      let elevation = pseudoNoise(seed, nx, ny) + pseudoNoise(seed, nx * 2, ny * 2) * 0.5;

      let dx = (px - center) / center;
      let dy = (py - center) / center;
      let dist = Math.sqrt(dx * dx + dy * dy);
      elevation -= Math.pow(dist, 1.6);

      let river = Math.abs(pseudoNoise(seed, nx * 2 + 50, ny * 2 + 50));

      let color = biome.water;
      if (elevation > -0.2) {
        if (elevation < -0.05) {
          color = biome.sand;
        } else {
          if (river < 0.06 && elevation < 0.3) {
            color = biome.river;
          } else {
            color = biome.land;
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

function drawTooltip(seed) {
  const biomeId = getBiomeId(seed, mousePos.gridX, mousePos.gridY);
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

// Función compatible con el botón del HTML
function generateMap() {
  camera.x = 0;
  camera.y = 0;
  render();
}

// Eventos de ratón (Navegación y Zoom)
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
  camera.zoom = Math.min(Math.max(camera.zoom * zoomFactor, 0.5), 2.5);
  render();
});

document.getElementById('seed').addEventListener('input', () => {
  render();
});

canvas.style.cursor = 'crosshair';

// Renderizar inmediatamente
render();
