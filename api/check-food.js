// Zina's Days food check (free).
// The app sends foods it doesn't know; this asks Google's Gemini (free tier) how each fits a low-FODMAP diet.
// Needs the environment variable GEMINI_API_KEY set in Vercel (Settings > Environment Variables).
// Get a free key at https://aistudio.google.com/apikey (no credit card).

const LANGS = { en: 'English', fr: 'French', ar: 'simple Arabic' };
const LEVELS = ['g', 'a', 'r', 'x', 'u'];
const MODELS = [process.env.GEMINI_MODEL, 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-flash-latest'].filter(Boolean);
const MAX_PER_HOUR = 40; // checks per phone per hour, to stay inside the free quota
const recent = new Map();

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  // Only accept calls from the app's own page.
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Forbidden' }); }
    catch (e) { return res.status(403).json({ error: 'Forbidden' }); }
  }

  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const times = (recent.get(ip) || []).filter(t => now - t < 3600e3);
  if (times.length >= MAX_PER_HOUR) return res.status(429).json({ error: 'Too many checks. Try again later.' });
  times.push(now); recent.set(ip, times);

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const foods = (Array.isArray(body && body.foods) ? body.foods : [])
    .map(f => String(f).slice(0, 60).trim()).filter(Boolean).slice(0, 12);
  const lang = LANGS[body && body.lang] ? body.lang : 'en';
  if (!foods.length) return res.status(400).json({ error: 'No foods sent' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not set in Vercel' });

  const prompt = `You help a woman in Algeria who has mixed-type IBS follow the Monash University low-FODMAP approach.
For each food or dish below (written in English, French, Arabic or Algerian Darija, in Latin or Arabic script), give:
- "level": "g" if low-FODMAP in a normal portion, "a" if fine only in a small portion, "r" if high-FODMAP or a common IBS trigger, "x" if it depends on the recipe or variety, "u" if it is not a food or you cannot tell.
- "note": at most 12 words in ${LANGS[lang]}: the safe portion, or the main trigger (for example garlic, onion, lactose, wheat, fat).
Foods: ${JSON.stringify(foods)}
Reply with only a JSON array with one object per food, in the same order: [{"food":"...","level":"g","note":"..."}]`;

  const payload = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 900, responseMimeType: 'application/json' },
  });

  try {
    let text = null, lastStatus = 0;
    // Try the models in order; skip one Google has renamed or retired.
    for (const model of MODELS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: payload,
      });
      lastStatus = r.status;
      if (r.status === 404 || r.status === 400) { console.error('Model not usable:', model, await r.text()); continue; }
      if (r.status === 429) return res.status(429).json({ error: 'Free daily limit reached. Try again tomorrow.' });
      if (!r.ok) { console.error('Gemini error', r.status, await r.text()); return res.status(502).json({ error: 'Food check service error' }); }
      const data = await r.json();
      const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
      text = parts.map(p => p.text || '').join('');
      break;
    }
    if (text === null) return res.status(502).json({ error: 'No Gemini model available (' + lastStatus + ')' });

    const match = text.match(/\[[\s\S]*\]/);
    const list = match ? JSON.parse(match[0]) : [];
    const out = foods.map((food, i) => {
      const x = (list[i] && typeof list[i] === 'object') ? list[i] : {};
      return { food, level: LEVELS.includes(x.level) ? x.level : 'u', note: String(x.note || '').slice(0, 160) };
    });
    return res.status(200).json(out);
  } catch (e) {
    console.error('Food check failed', e);
    return res.status(502).json({ error: 'Could not check foods' });
  }
};
