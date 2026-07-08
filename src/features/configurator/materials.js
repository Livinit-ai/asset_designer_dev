// Fabric apply pipeline, diffuse upload, seamless blend, drag&drop, sliders
// Classic script (not a module): top-level let/const/function share the
// global scope across all src/*.js files, preserving original semantics.
// ── Apply swatch logic (shared between click and drop) ────────────────────
function texToDataUrl(tex) {
  const img = tex.image;
  if(!img) return null;
  const w = img.naturalWidth||img.width||(img instanceof ImageBitmap?img.width:0)||512;
  const h = img.naturalHeight||img.height||(img instanceof ImageBitmap?img.height:0)||512;
  if(w===0||h===0) return null;
  const c = document.createElement('canvas');
  c.width=w; c.height=h;
  const ctx=c.getContext('2d');
  if(!ctx) return null;
  ctx.drawImage(img,0,0,w,h);
  return c.toDataURL('image/jpeg',0.93);
}

async function enhanceTexture(dataUrl, cacheKey) {
  if(enhanceCache[cacheKey]) return enhanceCache[cacheKey];
  try {
    const resp = await fetch('/api/enhance-texture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: dataUrl }),
    });
    if(!resp.ok) throw new Error('enhance ' + resp.status);
    const { imageData } = await resp.json();
    if(imageData) { enhanceCache[cacheKey] = imageData; return imageData; }
  } catch(e) { console.warn('[enhance-texture] failed, using original:', e.message); }
  return null;
}

// Generation token shared by the material-apply pipelines. Each user apply
// (swatch click or diffuse upload) bumps it; any in-flight older apply bails
// after its awaits so the LAST action wins, not the last network response.
// Same pattern as _roomLoadGen for room loads.
let _applyGen = 0;

// Clone a loaded (shared, cached) texture with per-entry tiling — every mesh
// entry needs its own repeat, so the cached texture is never mutated directly.
function _tiledClone(tex, physRepeat) {
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(physRepeat, physRepeat);
  t.needsUpdate = true;
  return t;
}

// Swap the assembled material onto the entry's mesh (array-aware) and, when the
// entry is the curtain representative, propagate it to every curtain panel.
function _commitEntryMaterial(entry, mat) {
  if (Array.isArray(entry.mesh.material)) {
    const arr = [...entry.mesh.material];
    arr[entry.matIndex] = mat;
    entry.mesh.material = arr;
  } else {
    entry.mesh.material = mat;
  }
  if (entry._isCurtain) {
    curtainMeshEntries.forEach(ce => { if (ce !== entry) ce.mesh.material = mat; });
  }
}

async function applySwatchToEntries(item, targetEntries) {
  if(!targetEntries || !targetEntries.length) { showToast('Select a part →'); return; }
  const _gen = ++_applyGen;
  document.getElementById('loading').classList.add('on');
  document.getElementById('load-txt').textContent = 'Loading Texture…';

  const defaults = {
    wood:    { roughness:0.55, sheen:0.00, metalness:0.0, scale:1.5,  norm:0.8 },
    vinyl:   { roughness:0.45, sheen:0.05, metalness:0.0, scale:4.0,  norm:0.6 },
    pu:      { roughness:0.50, sheen:0.08, metalness:0.0, scale:3.5,  norm:0.7 },
    leather: { roughness:0.60, sheen:0.15, metalness:0.0, scale:5.0,  norm:0.5 },
    linen:   { roughness:0.80, sheen:0.20, metalness:0.0, scale:5.0,  norm:0.9 },
    fabric:  { roughness:0.72, sheen:0.10, metalness:0.0, scale:3.5,  norm:1.0 },
  };
  const defs = item._defaults || defaults[item.type] || defaults.fabric;
  _currentAppliedDiffUrl = (item._defaults && item._defaults.diffUrl) || item.img || null;
  setSlider('roughness', defs.roughness); setSlider('metalness', defs.metalness);
  setSlider('sheen', defs.sheen); setSlider('scale', defs.scale); setSlider('norm', defs.norm);
  ['brightness','roughness','metalness','sheen','scale','norm',
   'brightness-r','roughness-r','scale-r'].forEach(id=>{
    const el = document.getElementById('s-'+id);
    if(!el) return;
    if(id.startsWith('bright')) el.value=1;
    else if(id.includes('rough')||id==='s-roughness') el.value=defs.roughness;
    else if(id.includes('scale')) el.value=defs.scale;
    else if(id.includes('norm')) el.value=defs.norm;
  });
  setSliderVal('brightness',1); setSliderVal('roughness',defs.roughness);
  setSliderVal('metalness',defs.metalness); setSliderVal('sheen',defs.sheen,2);
  setSliderVal('scale',defs.scale,1); setSliderVal('norm',defs.norm,1);
  setSliderVal('brightness-r',1); setSliderVal('roughness-r',defs.roughness);
  setSliderVal('scale-r',defs.scale,1);

  // Update applied preview (both panels)
  const vendorLabel = item.vendor==='douglass'?'Douglass Fabrics':item.vendor==='ennis'?'Ennis Fabrics':'MityLite Sierra';
  ['','room'].forEach(sfx=>{
    const n=document.getElementById('app-name'+(sfx?'-'+sfx:''));
    const v=document.getElementById('app-vend'+(sfx?'-'+sfx:''));
    const sw=document.getElementById('app-sw'+(sfx?'-'+sfx:''));
    if(n) n.textContent=item.name;
    if(v) v.textContent=(item.pattern||'')+' · '+vendorLabel;
    if(sw){
      sw.innerHTML=''; sw.style.background=item.hex||'#ccc';
      if(item.img){const ig=document.createElement('img');ig.src=item.img;ig.alt=item.name;ig.onerror=()=>{ig.remove();sw.style.background=item.hex||'#ccc'};sw.appendChild(ig);}
    }
    const rb=document.getElementById('app-replace-btn'+(sfx?'-'+sfx:''));
    if(rb) rb.style.display='flex';
  });

  try {
    if(item.type==='wood') {
      // Fetch PolyHaven metadata and diffuse in parallel
      const woodMaps = MATERIAL_MAPS.wood;
      const [{normUrl,roughUrl}, diffTex] = await Promise.all([
        getPolyMaps(POLY_IDS.wood),
        item.img ? tryLoadTex(item.img, true).catch(()=>null) : Promise.resolve(null),
      ]);
      // Load normal + roughness in parallel
      let [normTex, roughTex] = await Promise.all([
        normUrl  ? tryLoadTex(normUrl,  false).catch(()=>null) : Promise.resolve(null),
        roughUrl ? tryLoadTex(roughUrl, false).catch(()=>null) : Promise.resolve(null),
      ]);
      if(!normTex)  normTex  = await loadTexFirstSuccess(woodMaps.norm,  false);
      if(!roughTex) roughTex = await loadTexFirstSuccess(woodMaps.rough, false);
      if(_gen !== _applyGen) return; // superseded by a newer apply
      setBaseColor(item.hex);
      const S = appStore.getState().sliders;
      targetEntries.forEach(entry => {
        const mat = entry.greyMat;
        const physRepeat = S.scale*(entry.uvScaleFactor/BASE_TILE);
        if(diffTex){mat.map=_tiledClone(diffTex,physRepeat);mat.color.setRGB(Math.max(0.01,S.brightness),Math.max(0.01,S.brightness),Math.max(0.01,S.brightness));}
        else{mat.map=null;mat.color.copy(new THREE.Color(item.hex)).multiplyScalar(Math.max(0.01,S.brightness));}
        if(normTex){mat.normalMap=_tiledClone(normTex,physRepeat);mat.normalScale.set(S.norm,S.norm);}else{mat.normalMap=null;}
        if(roughTex){mat.roughnessMap=_tiledClone(roughTex,physRepeat);}else{mat.roughnessMap=null;}
        mat.roughness=S.roughness;mat.metalness=S.metalness;mat.sheen=S.sheen;mat.needsUpdate=true;
        _commitEntryMaterial(entry, mat);
      });
      markDirty(); showToast(item.name+' applied!');
      // Auto-save material snapshot so room view retains changes
      saveMaterialSnapshot();
      return;
    }

    const diffSrc = item._defaults?.diffUrl || item.img || null;

    // Resolve norm/rough/AO URLs immediately (before loading diffuse) so we
    // can kick off those fetches in parallel with diffuse + AI enhancement.
    let _normUrl = null, _roughUrl = null, _aoUrl = null;
    if (item._defaults?.normUrl || item._defaults?.roughUrl) {
      _normUrl  = item._defaults.normUrl  || null;
      _roughUrl = item._defaults.roughUrl || null;
      if (_normUrl?.includes('/api/acg-map'))
        _aoUrl = _normUrl.replace('map=NormalGL', 'map=AmbientOcclusion');
    } else {
      // PolyHaven lookup — run in parallel with diffuse fetch below
      const polyId = (item.patKey && POLY_IDS[item.patKey]) ? POLY_IDS[item.patKey] : (POLY_IDS[item.type]||POLY_IDS.fabric);
      const ph = await getPolyMaps(polyId);
      _normUrl = ph.normUrl || null; _roughUrl = ph.roughUrl || null;
    }

    // Start loading norm/rough/AO in the background — they don't depend on diffuse
    const normRoughAoPromise = Promise.all([
      _normUrl  ? tryLoadTex(_normUrl,  false).catch(()=>null) : Promise.resolve(null),
      _roughUrl ? tryLoadTex(_roughUrl, false).catch(()=>null) : Promise.resolve(null),
      _aoUrl    ? tryLoadTex(_aoUrl,    false).catch(()=>null) : Promise.resolve(null),
    ]);

    // Load diffuse, then run seamless + AI enhancement pipeline sequentially
    let diffTex = diffSrc ? await tryLoadTex(diffSrc, true).catch(()=>null) : null;

    // Apply seamless processing to AmbientCG diffuse textures
    if(diffTex && diffSrc && diffSrc.includes('/api/acg-map')) {
      try {
        const rawDataUrl = texToDataUrl(diffTex);
        if(rawDataUrl) {
          const seamlessUrl = await makeSeamlessTexture(rawDataUrl);
          const seamlessTex = await tryLoadTex(seamlessUrl, true).catch(()=>null);
          if(seamlessTex) diffTex = seamlessTex;
        }
      } catch(_) {}
    }

    // AI texture enhancement — norm/rough are loading in parallel during this wait
    if(diffTex && diffSrc) {
      document.getElementById('load-txt').textContent = 'Enhancing Texture…';
      try {
        const currentDataUrl = texToDataUrl(diffTex);
        if(currentDataUrl) {
          const enhancedDataUrl = await enhanceTexture(currentDataUrl, diffSrc);
          if(enhancedDataUrl) {
            const enhancedTex = await tryLoadTex(enhancedDataUrl, true).catch(()=>null);
            if(enhancedTex) diffTex = enhancedTex;
          }
        }
      } catch(_) {}
      document.getElementById('load-txt').textContent = 'Applying…';
    }

    // Norm/rough/AO should be done by now (ran during AI enhancement)
    let [normTex, roughTex, aoTex] = await normRoughAoPromise;
    const matMaps = MATERIAL_MAPS[item.type]||MATERIAL_MAPS.fabric;
    if(!normTex)  normTex  = await loadTexFirstSuccess(matMaps.norm,  false);
    if(!roughTex) roughTex = await loadTexFirstSuccess(matMaps.rough, false);
    if(_gen !== _applyGen) return; // superseded by a newer apply

    setBaseColor(item.hex||'#ffffff');
    const S = appStore.getState().sliders;
    const baseColor = new THREE.Color(item.hex||'#ffffff');

    // For bed models with smooth fabrics (leather/pu/vinyl):
    // 1. Clamp uvScaleFactor tightly so pillows/headboard/mattress all tile at similar density
    // 2. Lower normal map intensity — grain direction varies per UV island on the bed, causing
    //    visible patchiness at high norm values. At 0.2 the grain reads as texture not direction.
    const _isBedSmooth = appStore.getState().currentModelKey && appStore.getState().currentModelKey.startsWith('bed') &&
      (item.type === 'leather' || item.type === 'pu' || item.type === 'vinyl');
    const _bedNorm = _isBedSmooth ? 0.2 : S.norm;

    targetEntries.forEach(entry => {
      const mat = entry.greyMat;
      const uvSF = _isBedSmooth ? Math.min(Math.max(entry.uvScaleFactor, 0.65), 0.85) : entry.uvScaleFactor;
      const physRepeat = S.scale*(uvSF/BASE_TILE);
      mat.color.setRGB(1,1,1); mat.map=null;
      if(diffTex){mat.map=_tiledClone(diffTex,physRepeat);mat.color.setRGB(S.brightness,S.brightness,S.brightness);}
      else if(item.hex){mat.map=null;mat.color.copy(baseColor).multiplyScalar(Math.max(0.01,S.brightness));}
      else{mat.map=null;mat.color.setRGB(0.83*S.brightness,0.82*S.brightness,0.80*S.brightness);}
      if(normTex){mat.normalMap=_tiledClone(normTex,physRepeat);mat.normalScale.set(_bedNorm,_bedNorm);}else{mat.normalMap=null;}
      if(roughTex){mat.roughnessMap=_tiledClone(roughTex,physRepeat);}else{mat.roughnessMap=null;}
      if(aoTex){mat.aoMap=_tiledClone(aoTex,physRepeat);mat.aoMapIntensity=1.0;}else{mat.aoMap=null;}
      mat.roughness=S.roughness;mat.metalness=S.metalness;mat.sheen=S.sheen;mat.needsUpdate=true;
      _commitEntryMaterial(entry, mat);
    });
    markDirty(); showToast(item.name+' applied!');
    // Auto-save material snapshot so room view retains changes
    saveMaterialSnapshot();
  } catch(e) {
    console.error(e); showToast('Failed to apply material');
  } finally {
    // Only the newest apply may clear the loading overlay
    if(_gen === _applyGen) document.getElementById('loading').classList.remove('on');
  }
}

// ── Custom diffuse image upload ─────────────────────────────────────────────
function openDiffuseUpload() {
  document.getElementById('diffuse-upload-input').click();
}

(function() {
  // Deferred so the DOM element is guaranteed to exist
  document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('diffuse-upload-input');
    if (!inp) return;
    inp.addEventListener('change', async function() {
      const file = this.files?.[0];
      this.value = '';
      if (!file) return;
      await handleDiffuseUpload(file);
    });
  });
})();

// ── Seamless texture via canvas cross-fade blend ──────────────────────────
async function makeSeamlessTexture(dataUrl) {
  // Step 1: Remove directional lighting gradients (de-light)
  // Blur the image to get the local illumination field, then divide each pixel
  // by it so the result has uniform brightness throughout — eliminates the
  // dark-edge / bright-centre patches that make the cross-fade look blotchy.
  const normC = await new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const MAX = 512;
      const sc = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const W = Math.round(img.naturalWidth * sc);
      const H = Math.round(img.naturalHeight * sc);

      const src = document.createElement('canvas');
      src.width = W; src.height = H;
      const srcCtx = src.getContext('2d');
      srcCtx.drawImage(img, 0, 0, W, H);

      // Large-radius blur = low-freq illumination field
      const blurR = Math.round(Math.max(W, H) * 0.13);
      const blurC = document.createElement('canvas');
      blurC.width = W; blurC.height = H;
      const blurCtx = blurC.getContext('2d');
      blurCtx.filter = `blur(${blurR}px)`;
      blurCtx.drawImage(src, 0, 0);

      const origD = srcCtx.getImageData(0, 0, W, H);
      const blurD = blurCtx.getImageData(0, 0, W, H);

      // Global mean luminance — target brightness after normalization
      let sumLum = 0;
      for (let i = 0; i < blurD.data.length; i += 4)
        sumLum += 0.299 * blurD.data[i] + 0.587 * blurD.data[i+1] + 0.114 * blurD.data[i+2];
      const meanLum = sumLum / (W * H) || 128;

      // Divide each pixel by local illumination to flatten shading
      const out = srcCtx.createImageData(W, H);
      for (let i = 0; i < origD.data.length; i += 4) {
        const bL = 0.299 * blurD.data[i] + 0.587 * blurD.data[i+1] + 0.114 * blurD.data[i+2];
        const f  = bL > 4 ? meanLum / bL : 1;
        out.data[i]   = Math.min(255, Math.max(0, Math.round(origD.data[i]   * f)));
        out.data[i+1] = Math.min(255, Math.max(0, Math.round(origD.data[i+1] * f)));
        out.data[i+2] = Math.min(255, Math.max(0, Math.round(origD.data[i+2] * f)));
        out.data[i+3] = origD.data[i+3];
      }
      srcCtx.putImageData(out, 0, 0);
      resolve(src);
    };
    img.crossOrigin = 'anonymous';
    img.src = dataUrl;
  });

  // Step 2: Seamless blend — shift quadrants so edges meet at centre, cross-fade
  const W = normC.width, H = normC.height;
  const normCtx = normC.getContext('2d');

  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const oc = off.getContext('2d');
  oc.drawImage(normC, W/2, H/2, W/2, H/2,   0,   0, W/2, H/2);
  oc.drawImage(normC,   0, H/2, W/2, H/2, W/2,   0, W/2, H/2);
  oc.drawImage(normC, W/2,   0, W/2, H/2,   0, H/2, W/2, H/2);
  oc.drawImage(normC,   0,   0, W/2, H/2, W/2, H/2, W/2, H/2);
  const offPx  = oc.getImageData(0, 0, W, H);
  const origPx = normCtx.getImageData(0, 0, W, H);

  const blendOut = normCtx.createImageData(W, H);
  const zone = 0.30;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const fx = Math.min(x / (W * zone), (W - 1 - x) / (W * zone));
      const fy = Math.min(y / (H * zone), (H - 1 - y) / (H * zone));
      const t  = Math.min(Math.min(fx, fy), 1);
      const s  = t * t * (3 - 2 * t); // smoothstep: 0 at edges → 1 at centre
      for (let c = 0; c < 4; c++)
        blendOut.data[i+c] = Math.round(origPx.data[i+c] * s + offPx.data[i+c] * (1 - s));
    }
  }
  normCtx.putImageData(blendOut, 0, 0);
  return normC.toDataURL('image/jpeg', 0.93);
}

async function handleDiffuseUpload(file) {
  // Use checked parts if any are selected, otherwise fall back to all parts.
  // meshEntries is rebuilt on room enter (_rebuildMeshEntries), so it is the
  // correct source in both modes.
  const all = meshEntries;
  const checked = all.filter(e => e.checked);
  const entries = checked.length ? checked : all.filter(e => !e._isCurtain);
  if (!entries.length) { showToast('Load a model first'); return; }
  const _gen = ++_applyGen; // shares the apply generation with applySwatchToEntries

  // Show processing state on the replace button
  const replBtn = document.getElementById('app-replace-btn');
  if (replBtn) replBtn.classList.add('processing');

  const rawUrl = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => resolve(ev.target.result);
    reader.readAsDataURL(file);
  });

  showToast('Making seamless…');
  let dataUrl = rawUrl;
  try { dataUrl = await makeSeamlessTexture(rawUrl); } catch(_) {}

  showToast('Enhancing texture…');
  try {
    const cacheKey = 'upload-' + file.name + '-' + file.size;
    const enhanced = await enhanceTexture(dataUrl, cacheKey);
    if (enhanced) dataUrl = enhanced;
  } catch(_) {}

  if (replBtn) replBtn.classList.remove('processing');
  _currentAppliedDiffUrl = dataUrl;

  const tex = await tryLoadTex(dataUrl, true).catch(() => null);
  if (!tex) { showToast('Could not load image'); return; }
  if (_gen !== _applyGen) return; // superseded by a newer apply

  // Replace diffuse only — keep existing normal/roughness maps intact
  const S = appStore.getState().sliders;
  entries.forEach(entry => {
    const mat = entry.greyMat;
    const physRepeat = S.scale * (entry.uvScaleFactor / BASE_TILE);
    mat.map = _tiledClone(tex, physRepeat);
    mat.color.setRGB(Math.max(0.01, S.brightness), Math.max(0.01, S.brightness), Math.max(0.01, S.brightness));
    mat.needsUpdate = true;
    if (Array.isArray(entry.mesh.material)) {
      const arr = [...entry.mesh.material];
      arr[entry.matIndex] = mat;
      entry.mesh.material = arr;
    }
  });

  // Update app-sw preview in both panels
  ['', 'room'].forEach(sfx => {
    const sw = document.getElementById('app-sw' + (sfx ? '-' + sfx : ''));
    if (!sw) return;
    sw.innerHTML = '';
    sw.style.background = 'transparent';
    const img = document.createElement('img');
    img.src = dataUrl; img.alt = 'Custom';
    sw.appendChild(img);
  });

  markDirty();
  showToast('Seamless texture applied!');
  saveMaterialSnapshot();
}

// ── Drag & Drop ────────────────────────────────────────────────────────────
function initDragDrop() {
  const vwrap = document.getElementById('viewport-wrap');

  document.addEventListener('mousemove', e => {
    if(!dragActive) return;
    ghost.style.left = e.clientX + 'px';
    ghost.style.top  = e.clientY + 'px';
    // Check if over canvas
    const rect = vwrap.getBoundingClientRect();
    if(e.clientX>=rect.left && e.clientX<=rect.right && e.clientY>=rect.top && e.clientY<=rect.bottom) {
      vwrap.classList.add('drag-over');
      document.getElementById('drop-hint').classList.add('show');
      highlightHoveredMesh(e, rect);
    } else {
      vwrap.classList.remove('drag-over');
      document.getElementById('drop-hint').classList.remove('show');
      clearMeshHighlight();
    }
  });

  document.addEventListener('mouseup', e => {
    if(!dragActive) return;
    dragActive = false;
    ghost.style.display = 'none';
    vwrap.classList.remove('drag-over');
    document.getElementById('drop-hint').classList.remove('show');

    const rect = vwrap.getBoundingClientRect();
    if(e.clientX>=rect.left && e.clientX<=rect.right && e.clientY>=rect.top && e.clientY<=rect.bottom) {
      dropFabricOnCanvas(e, rect);
    }
    clearMeshHighlight();
    dragItem = null;
  });
}

let hoveredEntry = null;
function screenToNDC(e, rect) {
  return {
    x: ((e.clientX - rect.left) / rect.width)  * 2 - 1,
    y: -((e.clientY - rect.top)  / rect.height) * 2 + 1,
  };
}
function getHitEntry(e, rect) {
  const ndc = screenToNDC(e, rect);
  mouse.set(ndc.x, ndc.y);
  raycaster.setFromCamera(mouse, camera);

  // Build target mesh list: furniture + all curtain meshes in room mode
  const allEntries = appStore.getState().roomMode
    ? [...meshEntries, ...curtainMeshEntries.filter(c => !meshEntries.includes(c))]
    : meshEntries;
  const meshes = allEntries.map(en=>en.mesh).filter(Boolean);
  const hits = raycaster.intersectObjects(meshes, true);
  if(!hits.length) return null;
  const hitMesh = hits[0].object;

  // Walk up parent chain to find matching entry (handles deep GLB hierarchies)
  let obj = hitMesh;
  while (obj) {
    const found = allEntries.find(en => en.mesh === obj);
    if (found) {
      // If it's a non-representative curtain mesh, return the representative instead
      if (found._isCurtain && curtainMeshEntries[0] && found !== curtainMeshEntries[0]) {
        return meshEntries.find(en => en._isCurtain) || curtainMeshEntries[0];
      }
      return found;
    }
    obj = obj.parent;
  }
  return null;
}
function highlightHoveredMesh(e, rect) {
  const entry = getHitEntry(e, rect);
  if(entry === hoveredEntry) return;
  clearMeshHighlight();
  hoveredEntry = entry;
  if(hoveredEntry) {
    hoveredEntry.greyMat.emissive = new THREE.Color(0x2d4a3e);
    hoveredEntry.greyMat.emissiveIntensity = 0.35;
    hoveredEntry.greyMat.needsUpdate = true;
    markDirty();
  }
}
function clearMeshHighlight() {
  if(hoveredEntry) {
    hoveredEntry.greyMat.emissive = new THREE.Color(0);
    hoveredEntry.greyMat.emissiveIntensity = 0;
    hoveredEntry.greyMat.needsUpdate = true;
    markDirty();
    hoveredEntry = null;
  }
}
async function dropFabricOnCanvas(e, rect) {
  if(!dragItem) return;

  if(appStore.getState().roomMode) {
    // In room mode: prefer the piece the user explicitly selected in the piece list.
    // Fall back to raycast hit so direct-drop-on-mesh still works.
    const selectedEntry = meshEntries.find(en => en.pieceSelected);
    const hitEntry = getHitEntry(e, rect);
    const target = selectedEntry || hitEntry;
    if(!target) { showToast('Select a part in the list, then drop'); return; }
    await applySwatchToEntries(dragItem.item, [target]);
    return;
  }

  const entry = getHitEntry(e, rect);
  if(!entry) { showToast('Drop on a furniture part'); return; }
  // Select only the dropped-on entry — leave other entries' materials intact
  meshEntries.forEach(en => { en.checked = false; });
  entry.checked = true;
  if(Array.isArray(entry.mesh.material)){const matArr=[...entry.mesh.material];if(entry.matIndex>=0&&entry.matIndex<matArr.length){matArr[entry.matIndex]=entry.greyMat;entry.mesh.material=matArr;}}else{entry.mesh.material=entry.greyMat;}
  buildMeshList();
  _refreshZoneLabelStates();
  await applySwatchToEntries(dragItem.item, [entry]);
}

function startDrag(e, gi, ii) {
  const item = LIBRARY[appStore.getState().currentModelKey][gi].items[ii];
  dragItem = {gi, ii, item};
  dragActive = true;
  ghost.style.display = 'block';
  ghost.style.left = e.clientX + 'px';
  ghost.style.top  = e.clientY + 'px';
  if(item.img) {
    ghostImg.src = item.img;
    ghostImg.style.display = 'block';
    ghost.style.background = 'none';
  } else {
    ghostImg.style.display = 'none';
    ghost.style.background = item.hex || '#aaa';
  }
}

// ── Slider handlers ───────────────────────────────────────────────────────
function updateBrightness(val) {
  setSlider('brightness', val);
  ['v-brightness','v-brightness-r'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=val.toFixed(2); });
  meshEntries.forEach(entry => {
    if(!entry.checked && !entry.pieceSelected) return;
    const mat = entry.greyMat;
    const safeVal = Math.max(0.01, val);
    if(mat.map) mat.color.setRGB(safeVal,safeVal,safeVal);
    else { const c=new THREE.Color(appStore.getState().baseColorHex||'#ffffff'); mat.color.copy(c).multiplyScalar(safeVal); }
    mat.needsUpdate = true;
  });
  markDirty();
}
function applyProp(prop, val) {
  const valEl = document.getElementById('v-'+prop);
  if(valEl) valEl.textContent = val.toFixed(2);
  setSlider(prop, val); // prop is only ever roughness/metalness/sheen (see oninput handlers)
  meshEntries.forEach(entry => {
    if(!entry.checked && !entry.pieceSelected) return;
    if(prop==='sheen') entry.greyMat.sheen=val;
    else entry.greyMat[prop]=val;
    entry.greyMat.needsUpdate=true;
  });
  markDirty();
}
function updateTexScale(val) {
  setSlider('scale', val);
  ['v-scale','v-scale-r'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=val.toFixed(1); });
  meshEntries.forEach(entry => {
    if(!entry.checked && !entry.pieceSelected) return;
    const physRepeat = val*(entry.uvScaleFactor/BASE_TILE);
    const mat = entry.greyMat;
    if(mat.map)         { mat.map.repeat.set(physRepeat,physRepeat); mat.map.needsUpdate=true; }
    if(mat.normalMap)   { mat.normalMap.repeat.set(physRepeat,physRepeat); mat.normalMap.needsUpdate=true; }
    if(mat.roughnessMap){ mat.roughnessMap.repeat.set(physRepeat,physRepeat); mat.roughnessMap.needsUpdate=true; }
    if(mat.aoMap)       { mat.aoMap.repeat.set(physRepeat,physRepeat); mat.aoMap.needsUpdate=true; }
    mat.needsUpdate=true;
  });
  markDirty();
}
function updateNormScale(val) {
  setSlider('norm', val);
  const el = document.getElementById('v-norm'); if(el) el.textContent=val.toFixed(1);
  meshEntries.forEach(entry => {
    if(!entry.checked && !entry.pieceSelected) return;
    if(entry.greyMat.normalMap){ entry.greyMat.normalScale.set(val,val); entry.greyMat.needsUpdate=true; }
  });
  markDirty();
}

