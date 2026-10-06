const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 600;

// Configuración de la cuadrícula (9x9 islas)
const GRID_SIZE = 9; 
const CELL_SIZE = canvas.width / GRID_SIZE;

// Paleta de Biomas de Necesse
const BIOMES = {
  0: { name: 'Bosque', land: [62, 128, 25], sand: [218, 185, 122], water: [41, 137, 216], river: [55, 150, 230] },
  1: { name: 'Desierto', land: [218, 165, 32], sand: [238, 207, 131], water: [35, 120, 190], river: [45, 130, 200] },
  2: { name: 'Nieve', land: [220, 230, 240], sand: [180, 200, 220], water: [25, 90, 160], river: [35, 100, 170] },
  3: { name: 'Pantano', land: [35, 75, 20], sand: [80, 90, 50], water: [30, 80, 110], river: [40, 90, 120] }
};

// Generador de ruido simple determinista
function pseudoNoise(seed, x, y) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + Number(seed)) * 43758.5453;
  return n - Math.floor(n);
}

function getBiomeId(seed, worldX, worldY) {
  let hash = Math.floor(pseudoNoise(seed, worldX * 0.15 + 10, worldY * 0.15 + 10) * 4);
  return Math.abs(hash) % 4;
}

function generateMap() {
  const seedInput = document.getElementById('seed').value || '123456';
  
  // Crear imagen completa para todo el Canvas
  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let px = 0; px < canvas.width; px++) {
    for (let py = 0; py < canvas.height; py++) {
      
      // Determinar en qué celda/isla de la cuadrícula estamos
      const gx = Math.floor(px / CELL_SIZE);
      const gy = Math.floor(py / CELL_SIZE);
      
      const worldX = gx - Math.floor(GRID_SIZE / 2);
      const worldY = gy - Math.floor(GRID_SIZE / 2);

      // Coordenadas locales dentro de la celda de la isla
      const localX = px % CELL_SIZE;
      const localY = py % CELL_SIZE;
      const center = CELL_SIZE / 2;

      const biomeId = getBiomeId(seedInput, worldX, worldY);
      const biome = BIOMES[biomeId];

      // Ruido de terreno
      let nx = (localX + worldX * 100) * 0.08;
      let ny = (localY + worldY * 100) * 0.08;
      let elevation = pseudoNoise(seedInput, nx, ny) + pseudoNoise(seedInput, nx * 2, ny * 2) * 0.5;

      // Forma circular para delimitar la isla y dejar océano alrededor
      let dx = (localX - center) / center;
      let dy = (localY - center) / center;
      let dist = Math.sqrt(dx * dx + dy * dy);
      elevation -= Math.pow(dist, 1.6);

      // Ruido para ríos internos
      let river = Math.abs(pseudoNoise(seedInput, nx * 2 + 50, ny * 2 + 50));

      let color = biome.water;

      if (elevation > -0.2) {
        if (elevation < -0.05) {
          color = biome.sand; // Costa
        } else {
          if (river < 0.06 && elevation < 0.3) {
            color = biome.river; // Río
          } else {
            color = biome.land; // Tierra firme
          }
        }
      }

      // Indice absoluto de píxel dentro del canvas (4 canales: R, G, B, A)
      const index = (py * canvas.width + px) * 4;
      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = 255;
    }
  }

  // Renderizar la imagen completa en el Canvas
  ctx.putImageData(imgData, 0, 0);

  // Dibujar las líneas de cuadrícula encima
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(canvas.width, i * CELL_SIZE);
    ctx.stroke();
  }
}

// Generar mapa al cargar la página
generateMap();
