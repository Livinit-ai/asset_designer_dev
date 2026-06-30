import { GoogleGenAI } from '@google/genai';

const PROMPT = `You are a professional interior design photographer and compositor. You will receive two images.

IMAGE 1 = a real photograph of the user's room.
IMAGE 2 = a 3D render of the furniture (sofa and/or accent chair) on a neutral background, showing the exact custom fabrics and colors the user has chosen.

YOUR TASK: Produce a single photorealistic interior photograph that looks like IMAGE 1's room with IMAGE 2's furniture physically present inside it — indistinguishable from a real photo taken on the day.

INTEGRATION — THIS IS THE MOST IMPORTANT PART:
- The furniture must be re-lit to match the real room's lighting conditions exactly. In IMAGE 1, observe the light sources (windows, ceiling lights, direction of shadows on the floor) and apply that same lighting to the furniture. The furniture should not look like it came from a studio — it should look like it was photographed in this specific room.
- Add realistic contact shadows beneath each furniture piece that match the direction and softness of other shadows in IMAGE 1.
- The furniture should show realistic ambient occlusion where it meets the floor — a soft dark edge where the legs/base touch the ground.
- If the real floor has reflections or sheen, the furniture legs should show a subtle floor reflection.
- The overall result must look like a single, unified photograph — not a composite.

FABRIC: The fabric color, pattern, and texture must match IMAGE 2 exactly. Apply the room's lighting on top of the fabric (highlights, shadows from the light source) — this is correct and expected. But the underlying fabric design, color, and pattern must not change.

PLACEMENT:
- Remove any existing moveable furniture from IMAGE 1 (sofas, chairs, tables, rugs, floor lamps, cushions). Keep all permanent architecture: walls, floor, ceiling, windows, fireplace, wall art, built-in shelving.
- Place only the sofa and/or chair from IMAGE 2. No other items (no coffee table, no plants, no rug, no decorations).
- Position them naturally in the room at a realistic scale.

OUTPUT: One photorealistic image that looks like a professional interior design photograph of IMAGE 1's room with IMAGE 2's furniture in it.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomPhoto, furnitureRender } = req.body || {};
  if (!roomPhoto || !furnitureRender) {
    return res.status(400).json({ error: 'Missing roomPhoto or furnitureRender' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable' });
  }

  // Strip data URL prefix if present
  const roomBase64 = roomPhoto.replace(/^data:image\/[a-z]+;base64,/, '');
  const furnBase64 = furnitureRender.replace(/^data:image\/[a-z]+;base64,/, '');

  // Detect mime type from prefix
  const roomMime = roomPhoto.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  const furnMime = furnitureRender.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          { inlineData: { data: roomBase64,  mimeType: roomMime } },
          { inlineData: { data: furnBase64,  mimeType: furnMime } },
          { text: PROMPT },
        ],
      },
    });

    let generatedImageUrl: string | null = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedImageUrl) {
      return res.status(500).json({ error: 'No generated image returned from Gemini' });
    }

    return res.status(200).json({ imageUrl: generatedImageUrl });
  } catch (error: any) {
    console.error('gemini-room error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate image' });
  }
}
