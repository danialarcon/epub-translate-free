import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Cache simple para evitar traducciones repetidas
const translationCache = new Map();

// Ruta de traducción optimizada
app.post('/api/translate', async (req, res) => {
  try {
    const { text, from = 'auto', to = 'es' } = req.body || {};
    
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Invalid text' });
    }

    // Crear clave de cache
    const cacheKey = `${text}:${from}:${to}`;
    
    // Verificar cache
    if (translationCache.has(cacheKey)) {
      return res.status(200).json({ translatedText: translationCache.get(cacheKey) });
    }

    // Usar directamente la API de Google Translate con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
    
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const translatedText = data[0]?.map(item => item[0]).join('') || text;
    
    // Guardar en cache
    translationCache.set(cacheKey, translatedText);
    
    // Limpiar cache si es muy grande (más de 1000 entradas)
    if (translationCache.size > 1000) {
      const firstKey = translationCache.keys().next().value;
      translationCache.delete(firstKey);
    }
    
    return res.status(200).json({ translatedText });
  } catch (error) {
    console.error('Translate error:', error);
    if (error.name === 'AbortError') {
      return res.status(408).json({ error: 'Translation timeout' });
    }
    return res.status(500).json({ error: 'Translation failed' });
  }
});

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    cacheSize: translationCache.size
  });
});

// Ruta para limpiar cache
app.post('/api/clear-cache', (req, res) => {
  translationCache.clear();
  res.json({ message: 'Cache cleared successfully' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend ejecutándose en http://localhost:${PORT}`);
  console.log(`📡 API de traducción disponible en http://localhost:${PORT}/api/translate`);
});
