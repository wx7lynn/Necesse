const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Ajustar tamaño del canvas al contenedor
canvas.width = 700;
canvas.height = 700;

// Estado de cámara y navegación
let camera = {
  x: 0, // Coordenada isla X central
  y: 0, // Coordenada isla Y central
  zoom: 1, // Nivel de zoom (0.5x a 3x)
  tileSize: 80 // Tamaño base de una isla en píxeles
};

let isDragging = false;
let startX = 0, startY = 0;
let mousePos = { x: -1, y: -1, gridX: null, gridY: null };

// Biomas de Necesse
const BIOMES = {
  0: { name: 'Bosque', land: '#3E8019', sand: '#DAB97A', water: '#2989D8', river: '#3796E6' },
  1: { name: 'Desierto', land: '#DAA520', sand: '#EECF83', water: '#2378BE', river: '#2D82C8' },
  2: { name: 'Nieve', land: '#DCE6F0', sand: '#B4C8DC', water: '#195AFA', river: '#2364FA' },
  3: { name: 'Pantano', land: '#234B14', sand: '#505A32', water: '#1E506E', river: '#285A78' }
};

// Generador de ruido/hash determinista simple
function pseudoNoise(seed, x, y) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + Number(seed)) * 43758.5453;
  return n - Math.floor(n);
}

// Obtener bioma determinista según coordenadas absolutas de la isla
function getBiomeId(seed, worldX, worldY) {
  if (worldX === 0 && worldY === 0) return 0; // Isla inicial siempre bosque
  let hash = Math.floor(pseudoNoise(seed, worldX * 0.12 + 5, worldY * 0.12 + 5) * 4);
  return Math.abs(hash) % 4;
}

// Dibujar una isla individual en un Canvas temporal y cachearla (para rendimiento)
const islandCache = new Map();

function getIslandTexture(seed, worldX, worldY, size) {
  const biomeId = getBiomeId(seed, worldX, worldY);
  const cacheKey = `${seed}_${worldX}_${worldY}_${biomeId}_${size}`;

  if (islandCache.has(cacheKey)) {
    return islandCache.get(cacheKey);
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const offCtx = offscreen.getContext('2d');
  const imgData = offCtx.createImageData(size, size);
  const data = imgData.data;

  const biome = BIOMES[biomeId];

  // Convertir color HEX a RGB
  const hexToRgb = (hex) => {
    let c = parseInt(hex.substring(1), 16);
    return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  };

  const cLand = hexToRgb(biome.land);
  const cSand = hexToRgb(biome.sand);
  const cWater = hexToRgb(biome.water);
  const cRiver = hexToRgb(biome.river);

  const center = size / 2;

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

      let color = cWater;
      if (elevation > -0.2) {
        if (elevation < -0.05) {
          color = cSand;
        } else {
          if (river < 0.06 && elevation < 0.3) {
            color = cRiver;
          } else {
            color = cLand;
          }
        }
      }

      const index = (py * size + px) * 4;
      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = 255;
    }
  }

  offCtx.putImageData(imgData, 0, 0);
  islandCache.set(cacheKey, offscreen);
  return offscreen;
}

// Renderizado principal del mapa
function render() {
  const seedInput = document.getElementById('seed').value || '123456';
  
  ctx.fillStyle = '#0F1B29'; // Fondo del océano profundo
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const currentTileSize = Math.floor(camera.tileSize * camera.zoom);
  if (currentTileSize <= 0) return;

  const halfWidth = canvas.width / 2;
  const halfHeight = canvas.height / 2;

  // Cantidad de islas visibles en pantalla
  const visibleCols = Math.ceil(canvas.width / currentTileSize) + 2;
  const visibleRows = Math.ceil(canvas.height / currentTileSize) + 2;

  const startCol = Math.floor(camera.x - visibleCols / 2);
  const endCol = Math.ceil(camera.x + visibleCols / 2);
  const startRow = Math.floor(camera.y - visibleRows / 2);
  const endRow = Math.ceil(camera.y + visibleRows / 2);

  // Limpiar selección previa de hover
  mousePos.gridX = null;
  mousePos.gridY = null;

  for (let gx = startCol; gx <= endCol; gx++) {
    for (let gy = startRow; gy <= endRow; gy++) {
      // Posición de la isla en pantalla
      const screenX = halfWidth + (gx - camera.x) * currentTileSize;
      const screenY = halfHeight + (gy - camera.y) * currentTileSize;

      // Dibujar textura de la isla
      const islandCanvas = getIslandTexture(seedInput, gx, gy, Math.min(Math.max(currentTileSize, 20), 120));
      ctx.drawImage(islandCanvas, screenX, screenY, currentTileSize, currentTileSize);

      // Línea de la cuadrícula
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, currentTileSize, currentTileSize);

      // Detección de isla bajo el cursor del ratón
      if (
        mousePos.x >= screenX && mousePos.x < screenX + currentTileSize &&
        mousePos.y >= screenY && mousePos.y < screenY + currentTileSize
      ) {
        mousePos.gridX = gx;
        mousePos.gridY = gy;

        // Resaltado de selección
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, currentTileSize, currentTileSize);
      }
    }
  }

  // Dibujar Tooltip / Info flotante
  if (mousePos.gridX !== null && mousePos.gridY !== null) {
    drawTooltip(seedInput);
  }
}

// Mostrar Tooltip con coordenadas y bioma
function drawTooltip(seed) {
  const biomeId = getBiomeId(seed, mousePos.gridX, mousePos.gridY);
  const biomeName = BIOMES[biomeId].name;
  
  const text = `Isla (${mousePos.gridX}, ${mousePos.gridY}) - ${biomeName}`;
  
  ctx.font = 'bold 13px sans-serif';
  const textWidth = ctx.measureText(text).width;
  
  let tooltipX = mousePos.x + 12;
  let tooltipY = mousePos.y - 12;

  // Prevenir que se salga de la pantalla
  if (tooltipX + textWidth + 16 > canvas.width) tooltipX = mousePos.x - textWidth - 20;
  if (tooltipY - 24 < 0) tooltipY = mousePos.y + 24;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(tooltipX, tooltipY - 20, textWidth + 16, 26);
  ctx.strokeStyle = '#475569';
  ctx.strokeRect(tooltipX, tooltipY - 20, textWidth + 16, 26);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, tooltipX + 8, tooltipY - 3);
}

// --- CONTROLES Y EVENTOS DEL MOUSE ---

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

// Zoom con Rueda de Ratón
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  camera.zoom = Math.min(Math.max(camera.zoom * zoomFactor, 0.4), 3.0);
  render();
});

// Forzar actualización si cambia la semilla
document.getElementById('seed').addEventListener('input', () => {
  islandCache.clear();
  render();
});

// Botón de generación
function generateMap() {
  islandCache.clear();
  camera.x = 0;
  camera.y = 0;
  render();
}

// Iniciar
canvas.style.cursor = 'crosshair';
render();
