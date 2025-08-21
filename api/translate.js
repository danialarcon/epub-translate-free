export default async function handler(req, res) {
  // CORS básico para desarrollo/local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, from = 'auto', to = 'es' } = req.body || {};
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Invalid text' });
    }

    // Usar directamente la API de Google Translate
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const translatedText = data[0]?.map(item => item[0]).join('') || text;
    
    return res.status(200).json({ translatedText });
  } catch (error) {
    console.error('Translate error:', error);
    return res.status(500).json({ error: 'Translation failed' });
  }
} 