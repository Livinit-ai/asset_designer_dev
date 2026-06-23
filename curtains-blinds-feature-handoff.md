# Per‑Window Curtains & Blinds — Feature Handoff

A drop‑in way to add **curtains / blinds to existing windows**, configurable **per window**
(shape, fabric, color). Built procedurally in three.js — no GLB assets, no backend.

- **Source branch:** `feat/curtain-autofit`
- **Base commit:** `0be6f43` (`git merge-base feat/curtain-autofit origin/trunk`)
- **Status:** working + unit‑tested on the branch; **not yet merged** to `trunk`/`dev`.

> The branch also carries two unrelated changes that already landed on `trunk` separately
> (an asset‑toolbar "Buy" button and a keyboard‑shortcut gate). Ignore those — this doc
> describes only the curtain/blinds feature.

---

## 1. What it does

- Each window can show a curtain or blind. **9 shapes:** `sheer, drape, pleated, eyelet,
  valance, roman, cafe, blinds, none`.
- **5 fabrics** (linen, cotton, velvet, silk, voile) controlling weave/roughness/opacity.
- **Color** is a free hex tint applied on top of the fabric (independent of fabric).
- **Default + override model:** a room‑wide shape is the default for all windows; editing a
  window creates a per‑window override; clearing it falls back to the default.
- Renders in the realtime 3D scene; the curtain hangs on the window opening and auto‑sizes
  to the window's width/height.

## 2. Architecture / data flow

```
WindowElement.curtain?: CurtainConfig          ← per-window config (optional)
        │  resolveCurtainConfig(window, roomWideShape)   ← falls back to room default
        ▼
buildWindowMesh(style, w, h, curtain)           ← window builder takes the config
        │
        ▼
buildCurtain(curtain, w, h): THREE.Group|null   ← shape → geometry
        │                                          fabric+color → material
        ├─ buildCurtainMaterial(fabric, color, makeTextures)   (cached, color-correct)
        └─ buildCurtainPanel(...)                (pleated/gathered cloth panels)
```

Three pure/decoupled modules do the heavy lifting and are unit‑tested; the geometry +
material live in `buildOpeningMesh.ts`; the rest is wiring (pass the config through your
window builder + an editing UI).

## 3. How to get the code

Full diff for the curtain‑only files (paste into a terminal in the repo):

```bash
git diff 0be6f43..feat/curtain-autofit -- \
  lib/design-studio/types.ts \
  lib/design-studio/curtainConfig.ts \
  lib/design-studio/curtainFabrics.ts \
  lib/design-studio/curtainShapes.ts \
  lib/db-types.ts \
  components/three/openings/curtainMaterial.ts \
  components/three/openings/buildOpeningMesh.ts \
  components/three/GenerationRoomScene.tsx \
  components/three/openings/WizardDoorWindowEditor.tsx \
  components/AppShell.tsx \
  tests/curtain-config.test.ts tests/curtain-fabrics.test.ts \
  tests/curtain-shapes.test.ts tests/curtain-material-key.test.ts \
  > curtains-blinds.patch
```

Or check out the branch directly: `git checkout feat/curtain-autofit`.

The self‑contained core (new files + the geometry) is embedded below so it can be
reconstructed even without the branch.

---

## 4. Data model (add to `lib/design-studio/types.ts`)

```ts
/** Curtain silhouette/construction. Room-wide default + per-window override. */
export type CurtainStyleId =
  | 'sheer' | 'drape' | 'blinds' | 'none'
  | 'pleated' | 'eyelet' | 'valance' | 'roman' | 'cafe';

/** Curtain material look (independent of color tint). */
export type CurtainFabricId = 'linen' | 'velvet' | 'cotton' | 'silk' | 'voile';

/** Per-window curtain configuration. */
export interface CurtainConfig {
  shape: CurtainStyleId;
  fabric: CurtainFabricId;
  color: string; // hex tint
}

// And on your window type:
export interface WindowElement {
  // ...existing fields...
  curtain?: CurtainConfig;   // per-window override; absent → room default
}
```

## 5. New file — `lib/design-studio/curtainConfig.ts`

```ts
import type { CurtainConfig, CurtainFabricId, CurtainStyleId, WindowElement } from './types'

export const DEFAULT_CURTAIN_FABRIC: CurtainFabricId = 'linen'
export const DEFAULT_CURTAIN_COLOR = '#e9e4d8'

/** Window's own config if set, else a default derived from the room-wide style. */
export function resolveCurtainConfig(
  window: Pick<WindowElement, 'curtain'>,
  roomWide: CurtainStyleId | null | undefined,
): CurtainConfig {
  if (window.curtain) return window.curtain
  return { shape: roomWide ?? 'sheer', fabric: DEFAULT_CURTAIN_FABRIC, color: DEFAULT_CURTAIN_COLOR }
}

/** True when a window carries its own curtain config (an override of the room default). */
export function isCurtainOverridden(window: Pick<WindowElement, 'curtain'>): boolean {
  return !!window.curtain
}
```

## 6. New file — `lib/design-studio/curtainFabrics.ts`

```ts
import type { CurtainFabricId } from './types'

export interface CurtainFabricPreset {
  id: CurtainFabricId
  label: string
  roughness: number
  sheen: number       // 0..1
  opacity: number     // <1 → transparent
  weaveScale: number
  baseColor: string   // neutral base before tint
  swatch: string      // CSS preview
}

export const CURTAIN_FABRICS: CurtainFabricPreset[] = [
  { id: 'linen',  label: 'Linen',  roughness: 0.9,  sheen: 0.1,  opacity: 1,    weaveScale: 3, baseColor: '#e9e4d8', swatch: 'linear-gradient(135deg,#efe9dc,#d9d2c2)' },
  { id: 'cotton', label: 'Cotton', roughness: 0.85, sheen: 0.05, opacity: 1,    weaveScale: 4, baseColor: '#eceae4', swatch: 'linear-gradient(135deg,#f2f0ea,#dcdad2)' },
  { id: 'velvet', label: 'Velvet', roughness: 0.55, sheen: 0.6,  opacity: 1,    weaveScale: 2, baseColor: '#3c3f44', swatch: 'linear-gradient(135deg,#55585f,#2b2d31)' },
  { id: 'silk',   label: 'Silk',   roughness: 0.35, sheen: 0.8,  opacity: 1,    weaveScale: 5, baseColor: '#efe7d6', swatch: 'linear-gradient(135deg,#f6efe0,#e2d7bf)' },
  { id: 'voile',  label: 'Voile',  roughness: 0.95, sheen: 0.0,  opacity: 0.72, weaveScale: 6, baseColor: '#f4f2ec', swatch: 'linear-gradient(135deg,#faf9f4,#e8e6de)' },
]

export function getCurtainFabric(id: CurtainFabricId): CurtainFabricPreset {
  return CURTAIN_FABRICS.find(f => f.id === id) ?? CURTAIN_FABRICS[0]
}
```

## 7. New file — `lib/design-studio/curtainShapes.ts`

```ts
import type { CurtainStyleId } from './types'

export const CURTAIN_SHAPES: { id: CurtainStyleId; label: string }[] = [
  { id: 'sheer',   label: 'Sheer' },
  { id: 'drape',   label: 'Drapes' },
  { id: 'pleated', label: 'Pleated' },
  { id: 'eyelet',  label: 'Eyelet' },
  { id: 'valance', label: 'Valance' },
  { id: 'roman',   label: 'Roman' },
  { id: 'cafe',    label: 'Café' },
  { id: 'blinds',  label: 'Blinds' },
  { id: 'none',    label: 'None' },
]

export const SELECTABLE_CURTAIN_SHAPES = CURTAIN_SHAPES.filter(s => s.id !== 'none')
```

## 8. New file — `components/three/openings/curtainMaterial.ts`

Color‑correct, cached material. **Key insight:** apply the user's color directly; the weave
texture is generated on **white** so it only modulates (adds cloth texture) and never darkens
toward black. Materials are cached by `fabric|color` and tagged `userData.curtainCached` so a
per‑window rebuild (`disposeOpeningMesh`) does not dispose a material another window still uses.

```ts
import * as THREE from 'three'
import type { CurtainFabricId } from '@/lib/design-studio/types'
import { getCurtainFabric } from '@/lib/design-studio/curtainFabrics'

export function curtainMaterialKey(fabric: CurtainFabricId, color: string): string {
  return `${fabric}|${color.toLowerCase()}`
}

export interface CurtainTextures { map: THREE.Texture | null; normalMap: THREE.Texture | null }

const cache = new Map<string, THREE.MeshStandardMaterial>()

export function buildCurtainMaterial(
  fabric: CurtainFabricId,
  color: string,
  makeTextures: (weaveScale: number) => CurtainTextures,
): THREE.MeshStandardMaterial {
  const key = curtainMaterialKey(fabric, color)
  const hit = cache.get(key)
  if (hit) return hit

  const preset = getCurtainFabric(fabric)
  const { map, normalMap } = makeTextures(preset.weaveScale)

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    map: map ?? undefined,
    normalMap: normalMap ?? undefined,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: preset.roughness,
    metalness: 0,
    transparent: preset.opacity < 1,
    opacity: preset.opacity,
    side: THREE.DoubleSide,
    depthWrite: preset.opacity >= 1,
  })
  mat.userData.curtainCached = true   // see disposeMaterial note in §11
  cache.set(key, mat)
  return mat
}

export function disposeCurtainMaterials(): void {
  for (const mat of cache.values()) { mat.map?.dispose(); mat.normalMap?.dispose(); mat.dispose() }
  cache.clear()
}
```

## 9. Geometry — add to `components/three/openings/buildOpeningMesh.ts`

Helpers (a displaced cloth plane + the white‑base weave textures). `buildFabricTextureCanvas`
and `buildNormalFromAlbedoCanvas` are existing canvas helpers in that file; `CURTAIN_ROD` is an
existing dark material; `CURTAIN_Z` is the panel's z‑offset in the window's local frame.

```ts
/** A hanging fabric panel: a plane displaced along z by a sine wave to read as pleats. */
function buildCurtainPanel(widthM: number, heightM: number, mat: THREE.Material, opts: { pleats: number; amp: number }): THREE.Mesh {
  const segW = Math.max(8, Math.round(opts.pleats * 4));
  const geo = new THREE.PlaneGeometry(widthM, heightM, segW, 4);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin((x / widthM + 0.5) * Math.PI * 2 * opts.pleats) * opts.amp);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

/** Weave albedo on white + matching normal map, scaled by fabric weave density. */
function makeCurtainTextures(weaveScale: number): { map: THREE.Texture | null; normalMap: THREE.Texture | null } {
  const al = buildFabricTextureCanvas('#ffffff');
  if (!al) return { map: null, normalMap: null };
  al.texture.repeat.set(weaveScale, weaveScale * 2);
  const normalMap = buildNormalFromAlbedoCanvas(al.canvas, 2.5);
  if (normalMap) normalMap.repeat.set(weaveScale, weaveScale * 2);
  return { map: al.texture, normalMap };
}
```

The main builder — `shape` drives geometry, `fabric`+`color` drive the material. (Full body is
on the branch; the shape branches are: `blinds` = tilted slats; `roman` = flat panel + fold
bars; `valance` = short top pelmet; `sheer/drape/pleated/eyelet/cafe` = gathered hanging
panels with optional side panels / eyelet rings; `cafe` = half‑height.)

```ts
export function buildCurtain(config: CurtainConfig, widthM: number, heightM: number): THREE.Group | null {
  const { shape } = config;
  if (shape === 'none') return null;
  const g = new THREE.Group();
  g.userData.isCurtain = true;
  const mat = buildCurtainMaterial(config.fabric, config.color, makeCurtainTextures);

  // rod + finials
  const rodY = heightM + 0.12, rodLen = widthM + 0.3;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, rodLen, 16), CURTAIN_ROD);
  rod.rotation.z = Math.PI / 2; rod.position.set(0, rodY, CURTAIN_Z); g.add(rod);

  if (shape === 'blinds') {                         // horizontal slats
    const slatW = widthM + 0.04;
    for (let y = heightM + 0.02; y > 0; y -= 0.06) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(slatW, 0.045, 0.006), mat);
      slat.position.set(0, y, CURTAIN_Z); slat.rotation.x = 0.32; g.add(slat);
    }
    return g;
  }
  // ... roman / valance / hanging-panel branches (see branch for full body) ...
  return g;
}
```

## 10. Wiring it in

1. **Window builder** — give `buildWindowMesh` an optional curtain and call `buildCurtain`:

   ```ts
   const DEFAULT_CURTAIN: CurtainConfig = { shape: 'sheer', fabric: 'linen', color: '#e9e4d8' };

   export function buildWindowMesh(style, widthM, heightM, curtain: CurtainConfig = DEFAULT_CURTAIN) {
     // ...build the window frame/sash as today...
     const curtainGroup = buildCurtain(curtain, widthM, heightM);
     if (curtainGroup) group.add(curtainGroup);
     return group;
   }
   ```

2. **Per‑window resolve at the call site** — wherever you build a window in the scene, pass the
   window's resolved config:

   ```ts
   const cfg = resolveCurtainConfig({ curtain: win.curtain }, roomWideCurtainStyle);
   const mesh = createWindowMesh(win.w, win.h, win.styleId, cfg);
   ```

3. **Persistence** — `curtain` lives on the window object, so it serializes with your room
   state automatically. If openings travel through a manifest/URL, make sure the field is
   carried (it's an optional plain object).

4. **Editing UI** — show shape (`SELECTABLE_CURTAIN_SHAPES`), fabric (`CURTAIN_FABRICS`
   swatches) and a color picker for the selected window; write back
   `{ ...window, curtain: { shape, fabric, color } }`. "Reset to default" sets
   `curtain: undefined`. (Reference implementation: the EDIT‑WINDOW panel in
   `components/three/openings/WizardDoorWindowEditor.tsx` on the branch.)

5. **Teardown** — call `disposeCurtainMaterials()` once when the scene is torn down.

## 11. Important gotcha (resource disposal)

If your scene disposes opening meshes on rebuild (e.g. a `disposeOpeningMesh` that disposes
every non‑shared material), it will dispose the **cached** curtain material that other windows
still use → black/blank curtains. Guard it:

```ts
function disposeMaterial(mat: THREE.Material) {
  if (mat.userData?.curtainCached) return;   // owned by the cache, freed by disposeCurtainMaterials()
  // ...existing dispose...
}
```

## 12. Tests (vitest, on the branch)

- `tests/curtain-config.test.ts` — `resolveCurtainConfig` default/override, `isCurtainOverridden`.
- `tests/curtain-fabrics.test.ts` — preset table + lookup.
- `tests/curtain-shapes.test.ts` — shape registry covers every `CurtainStyleId`; `buildCurtain`
  returns a group for every selectable shape, `null` for `none`.
- `tests/curtain-material-key.test.ts` — cache key stability + cache‑owned tagging.

Run: `pnpm vitest run tests/curtain-*.test.ts` (project uses **pnpm@11.6.0**).

## 13. Known limitations / notes

- Shapes are stylized procedural geometry (not photoreal cloth). Tuning knobs: pleat count/amp
  in `buildCurtainPanel`, the per‑shape parameters in `buildCurtain`.
- `cafe` curtain rod sits at the top (a mid‑rod would read better) — minor visual tweak.
- Curtain "facing" assumes the panel's front is +Z; if a window mesh is oriented differently in
  your pipeline, set the curtain group's `rotation.y` accordingly.
- Material `sheen` is carried in the fabric preset but not yet applied (would need
  `MeshPhysicalMaterial.sheen`) — safe to ignore or wire up later.
