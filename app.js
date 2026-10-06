<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Necesse World Map Viewer</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    body {
      background-color: #0d1117;
      color: #c9d1d9;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }

    header {
      text-align: center;
      margin-bottom: 20px;
    }

    h1 {
      color: #58a6ff;
      font-size: 2rem;
      margin-bottom: 8px;
    }

    p.subtitle {
      color: #8b949e;
      font-size: 0.95rem;
    }

    .controls-panel {
      background-color: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 16px 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .input-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    label {
      font-weight: 600;
      font-size: 0.9rem;
      color: #f0f6fc;
    }

    input[type="text"] {
      background-color: #0d1117;
      border: 1px solid #30363d;
      color: #f0f6fc;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }

    input[type="text"]:focus {
      border-color: #58a6ff;
    }

    .btn-group {
      display: flex;
      gap: 8px;
    }

    button {
      background-color: #238636;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    button:hover {
      background-color: #2ea043;
    }

    button.btn-secondary {
      background-color: #21262d;
      color: #c9d1d9;
      border: 1px solid #30363d;
    }

    button.btn-secondary:hover {
      background-color: #30363d;
      border-color: #8b949e;
    }

    .canvas-container {
      position: relative;
      border: 2px solid #30363d;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      background-color: #0f1b29;
    }

    canvas {
      display: block;
      touch-action: none;
    }

    .instructions {
      margin-top: 16px;
      color: #8b949e;
      font-size: 0.85rem;
      text-align: center;
      line-height: 1.4;
    }

    .instructions span {
      background-color: #161b22;
      border: 1px solid #30363d;
      padding: 2px 6px;
      border-radius: 4px;
      color: #c9d1d9;
    }
  </style>
</head>
<body>

  <header>
    <h1>Necesse World Map Viewer</h1>
    <p class="subtitle">Explorador interactivo de semillas de mapas de Necesse</p>
  </header>

  <div class="controls-panel">
    <div class="input-group">
      <label for="seed">Semilla (Seed):</label>
      <input type="text" id="seed" value="123456" placeholder="Ingresa una semilla..." />
    </div>

    <div class="btn-group">
      <button onclick="generateMap()">Generar Mapa</button>
      <button class="btn-secondary" onclick="camera.x=0; camera.y=0; render();">Recentrar (0,0)</button>
      <button class="btn-secondary" onclick="camera.zoom=1; render();">Reset Zoom</button>
    </div>
  </div>

  <div class="canvas-container">
    <canvas id="mapCanvas"></canvas>
  </div>

  <div class="instructions">
    <p>💡 <span>Arrastrar</span> para navegar por el mapa | <span>Rueda del Ratón</span> para Zoom | <span>Hover</span> para ver coordenadas y bioma</p>
  </div>

  <script src="app.js"></script>
</body>
</html>
