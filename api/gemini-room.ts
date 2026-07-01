import { GoogleGenAI } from '@google/genai';

const PROMPT = `You are a world-class VFX compositor and interior design photographer with 20 years of experience making furniture composites completely indistinguishable from real photographs. Your output will be scrutinised by professional photographers — it must be flawless.

You will receive two images:
IMAGE 1 = a real photograph of the user's room.
IMAGE 2 = a photorealistic product photo of a sofa and/or accent chair on a neutral background, with the exact custom fabrics the user has designed.

YOUR GOAL: Produce one image that looks like IMAGE 1's room was photographed on the same day with IMAGE 2's furniture already sitting inside it — zero evidence of compositing.

━━━ PLACEMENT ━━━

CASE A — IMAGE 1 already has a sofa or chair:
Replace each matching piece (sofa → sofa, chair → chair) with the corresponding piece from IMAGE 2 in the EXACT same position, angle, depth, and floor footprint as the original. The replacement must be identical in pose and placement to what it replaced.

CASE B — IMAGE 1 has no sofa or chair:
Place the sofa as the primary piece facing the camera, with the accent chair angled toward it. Use real-world scale: sofa ~200–230 cm wide, chair ~70–80 cm wide. Position them naturally in the available floor space.

In all cases: remove only the furniture being replaced. Keep all permanent architecture (walls, floor, ceiling, windows, fireplace, built-in shelving, wall art). Add no extra objects not in IMAGE 2.

━━━ PHOTOREALISM — APPLY ALL OF THESE ━━━

LIGHTING:
- Analyse IMAGE 1 carefully: identify every light source (windows, ceiling lights, lamps), the direction, colour temperature, and intensity of each.
- Re-light the furniture from IMAGE 2 under this exact same lighting. If IMAGE 1 has warm sunlight coming from the left window, the furniture must have warm highlights on its left faces and cooler shadow on its right faces.
- Match the white balance and colour cast of IMAGE 1 exactly — if the room is warm (3000K), the furniture should carry the same warmth; if cool (6500K daylight), match that.

SHADOWS:
- Cast realistic directional shadows from the furniture onto the floor. The shadow direction, length, and softness must exactly match the shadows of other objects already in IMAGE 1.
- Add tight, dark ambient occlusion where the furniture base/legs meet the floor — this is the most important grounding element.
- If there are multiple light sources, the furniture casts multiple overlapping shadows, just like everything else in the room.

PERSPECTIVE & GEOMETRY:
- The furniture must align perfectly with the room's perspective grid — vanishing points, horizon line, floor plane. A sofa that appears to defy the room's perspective immediately reads as fake.
- The furniture must sit flat on the floor plane — no floating, no sinking.
- Match the apparent focal length / lens perspective of IMAGE 1.

SURFACE INTERACTION:
- If the floor is shiny hardwood or polished tile, show a subtle, blurred reflection of the furniture underside in the floor surface.
- If the floor has texture (carpet, wood grain), the furniture legs should compress or interact with it slightly.
- The furniture should show subtle bounce light from the floor and nearby walls — coloured by the room's dominant surface colours.

FABRIC & MATERIAL:
- The fabric color, pattern, texture, and weave from IMAGE 2 must be preserved exactly — this is the user's custom design and must not change.
- Apply lighting effects on top of the fabric (directional shading, specular highlights on shiny threads, soft shadow in folds) but do not alter the underlying pattern or colour.

PHOTO CHARACTERISTICS:
- Match the grain/noise level of IMAGE 1 across the composited furniture.
- If IMAGE 1 has any chromatic aberration, slight vignette, or lens sharpness falloff, apply the same to the composited area.
- The composited area should have identical sharpness, contrast, and saturation to the surrounding real photo — no artificially clean or over-sharpened areas.

FINAL CHECK (apply before output):
- Zoom into the floor contact area — are the shadows correct and the base grounded?
- Check the furniture highlights against the window positions — do they match?
- Is there any halo, hard edge, or colour fringe around the furniture silhouette? Remove it.
- Does the furniture read as part of the original photograph, or as a paste-in? It must read as part of the photograph.

OUTPUT: One single photorealistic image — impossible to distinguish from a real interior photograph taken with this furniture in the room.`;

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

  const roomBase64 = roomPhoto.replace(/^data:image\/[a-z]+;base64,/, '');
  const furnBase64 = furnitureRender.replace(/^data:image\/[a-z]+;base64,/, '');
  const roomMime = roomPhoto.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  const furnMime = furnitureRender.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          { inlineData: { data: roomBase64, mimeType: roomMime } },
          { inlineData: { data: furnBase64, mimeType: furnMime } },
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
