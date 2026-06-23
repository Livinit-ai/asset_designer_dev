// POST /api/enhance-texture
// Accepts a base64 JPEG diffuse texture, returns an AI-enhanced version.
// Enhancement goals: seamless tiling, neutral flat lighting, sharp weave detail.
import { GoogleGenAI } from '@google/genai';

const ENHANCE_PROMPT = `You are a 3D texture artist specialising in PBR material authoring.

The input image is a fabric/textile diffuse (albedo) texture that will tile on a 3D furniture model.

Enhance it with these goals — preserve everything else exactly:
1. SEAMLESS EDGES: Make all four edges perfectly seamless so the texture tiles without visible seams when repeated.
2. NEUTRAL LIGHTING: Remove any baked-in shadows, highlights, vignettes, or directional lighting gradients. The output should be evenly lit as if under a perfectly diffuse studio light — no dark corners, no shiny patches.
3. SHARPNESS: Increase clarity and micro-detail of the weave structure, yarn, pile or grain. The fabric threads or surface texture should be crisp.
4. COLOUR ACCURACY: Preserve the exact hue, saturation, and value of the fabric. Do not shift the colour temperature or add any toning.
5. PATTERN INTEGRITY: Keep the exact same weave pattern, repeat size, and fabric structure. Do not invent or remove any pattern elements.

Output a square image at the same resolution as the input.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageData } = req.body || {};
  if (!imageData) return res.status(400).json({ error: 'Missing imageData' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Strip data-URL prefix if present
    const base64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType: 'image/jpeg' } },
          { text: ENHANCE_PROMPT },
        ],
      },
    });

    let enhancedB64: string | null = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if ((part as any).inlineData) {
        enhancedB64 = (part as any).inlineData.data;
        break;
      }
    }

    if (!enhancedB64) return res.status(500).json({ error: 'No image returned from model' });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ imageData: `data:image/png;base64,${enhancedB64}` });
  } catch (err: any) {
    console.error('[enhance-texture]', err?.message);
    return res.status(500).json({ error: err?.message || 'Enhancement failed' });
  }
}
