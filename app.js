const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Ajustar resolución del canvas para mejor detalle
canvas.width = 600;
canvas.height = 600;

// Implementación simplificada de Perlin Noise 2D
const FastNoise = {
  perm: new Uint8Array(512),
  init(seed) {
    let p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Mezclar permutación basada en la semilla
    let s = Number(seed) || 12345;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      let j = Math.floor((s / 2147483647) * (i + 1));
      let temp = p[i];
      p[i] = p[j];
      p[j] = temp;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  },
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); },
  lerp(t, a, b) { return a + t * (b - a); },
  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  },
  noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.perm[X] + Y, B = this.perm[X + 1] + Y;

    return this.lerp(v, 
      this.lerp(u, this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y)),
      this.lerp(u, this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1))
    );
  }
};

// Paleta de colores al estilo Necesse
const COLOR_WATER = [41, 137, 216];     // Azul océano
const COLOR_SAND = [218, 185, 122];     // Arena/Playa
const COLOR_GRASS = [62, 128, 25];      // Pasto verde
const COLOR_FOREST = [42, 92, 16];      // Bosque denso
const COLOR_RIVER = [55, 150, 230];     // Agua de ríos internos

function generateMap() {
  const seedInput = document.getElementById('seed').value;
  FastNoise.init(seedInput);

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  const scale = 0.012; // Escala del terreno (cuán grande es la isla)
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  for (let x = 0; x < canvas.width; x++) {
    for (let y = 0; y < canvas.height; y++) {
      
      // 1. Obtener ruido de elevación
      let nx = x * scale;
      let ny = y * scale;
      let elevation = FastNoise.noise(nx, ny) + 0.5 * FastNoise.noise(nx * 2, ny * 2);

      // 2. Crear una isla circular reduciendo la altura cerca de los bordes
      let dx = (x - centerX) / centerX;
      let dy = (y - centerY) / centerY;
      let distanceToCenter = Math.sqrt(dx * dx + dy * dy);
      elevation = elevation - Math.pow(distanceToCenter, 1.8);

      // 3. Ruido secundario para simular ríos internos
      let riverNoise = Math.abs(FastNoise.noise(nx * 3 + 50, ny * 3 + 50));

      let color = COLOR_WATER;

      if (elevation > -0.15) {
        if (elevation < -0.05) {
          color = COLOR_SAND; // Costas y orillas
        } else {
          // Si está en tierra firme, verificar si hay un río pasando
          if (riverNoise < 0.04) {
            color = COLOR_RIVER; // Río serpenteante
          } else if (elevation > 0.25) {
            color = COLOR_FOREST; // Zonas más altas/boscosas
          } else {
            color = COLOR_GRASS; // Pasto principal
          }
        }
      }

      // Pintar píxel en el ImageData
      const index = (y * canvas.width + x) * 4;
      data[index] = color[0];     // R
      data[index + 1] = color[1]; // G
      data[index + 2] = color[2]; // B
      data[index + 3] = 255;      // Opacidad Alpha
    }
  }

  // Dibujar los píxeles generados en el Canvas
  ctx.putImageData(imgData, 0, 0);
}

// Generar el mapa inmediatamente al cargar
generateMap();
