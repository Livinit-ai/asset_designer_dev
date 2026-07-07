// Room view, living/bedroom builds, curtains & blinds, placement, move mode, explode
// Classic script (not a module): top-level let/const/function share the
// global scope across all src/*.js files, preserving original semantics.
// ── Room View ─────────────────────────────────────────────────────────────
function toggleRoomView() {
  roomMode = !roomMode;
  const btn = document.getElementById('btn-room-view');
  if(btn){ btn.classList.toggle('active-view', roomMode); btn.textContent = roomMode ? '× Exit Room' : '🏠 Room View'; }
  // "View in My Room" stays visible in both product and room views
  // Sidebar nav state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.getElementById(roomMode ? 'nav-room' : 'nav-simulator');
  if(activeNav) activeNav.classList.add('active');
  // Zone overlay visibility
  const zoneOverlay = document.getElementById('zone-overlay');
  if(zoneOverlay) zoneOverlay.style.display = roomMode ? 'none' : '';

  document.getElementById('panel-product').style.display = roomMode ? 'none' : 'block';
  document.getElementById('panel-room').style.display    = roomMode ? 'block' : 'none';

  if(roomMode) {
    // Save snapshot of current model's fabric state before entering room
    if (meshEntries.length > 0) {
      modelMaterialSnapshots[currentModelKey] = meshEntries.map(e => ({
        id: e.id, name: e.name, matClone: e.greyMat.clone(),
      }));
    }
    // Auto-select room section based on furniture type
    const _enterBed = currentModelKey === 'bed_wooden' || currentModelKey === 'bed_fabric';
    activeRoomSection = _enterBed ? 'bedroom' : 'living';
    ['living','bedroom'].forEach(s => {
      const _rb = document.getElementById('rsec-'+s);
      const _rc = document.getElementById('rsec-'+s+'-content');
      if (_rb) _rb.classList.toggle('active', s === activeRoomSection);
      if (_rc) _rc.classList.toggle('active', s === activeRoomSection);
    });
    _syncRoomSectionLock();
    _syncProductTabLock();
    if (_enterBed) {
      buildBedroomRoom(() => {
        sph = {theta: Math.PI, phi: 1.1, r: 9.0};
        tgt.set(0, 0, 0);
        camUpdate();
      });
    } else {
      buildRoom(() => {
        // Look INTO the room interior from the open front-right corner.
        sph = {theta: 0.05 + Math.PI, phi: 1.15, r: 7.0};
        tgt.set(0, -0.3, 0);
        camUpdate();
      });
    }
    buildPieceList();
  } else {
    // Unlock both section tabs and product tabs when leaving room mode
    ['rsec-living','rsec-bedroom'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.classList.remove('room-sec-btn--locked');
    });
    _syncProductTabLock(); // clears all prod-tab--locked since roomMode is now false
    removeRoom();
    // Restore the active model to clean centered product-view position
    if (currentModel) {
      currentModel.rotation.set(0, 0, 0);
      // Reset scale to normalised base (undo room slot scale)
      if (currentModel._baseScale) {
        currentModel.scale.copy(currentModel._baseScale);
        currentModel._baseScale = null;
      }
      currentModel.position.set(0, 0, 0);
      currentModel.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(currentModel);
      const ctr = box.getCenter(new THREE.Vector3());
      currentModel.position.sub(ctr);
      currentModel.updateMatrixWorld(true);
    }
    // Restore product-view camera
    sph = {theta: 0.4, phi: 1.15, r: 2.2};
    tgt.set(0, 0, 0);
    camUpdate();
    // Re-apply environment to restore correct lighting after room session
    if (pmremGen) {
      scene.environment = pmremGen.fromScene(new THREE.RoomEnvironment(), 1.0).texture;
    }
    markDirty();
  }
}

// ── Room geometry ─────────────────────────────────────────────────────────
function buildRoom(onReadyCallback) {
  removeRoom();
  const _gen = ++_roomLoadGen;
  roomGroup = new THREE.Group();
  scene.add(roomGroup);

  // Load the room.glb as the environment
  document.getElementById('loading').classList.add('on');
  document.getElementById('load-txt').textContent = 'Loading Room…';

  gltfLoader.load(ROOM_GLB, gltf => {
    if (_roomLoadGen !== _gen) return; // superseded by a newer room build
    const roomScene = gltf.scene;

    // ── Scale room to ~6 units wide ──────────────────────────────────────
    const rawBox  = new THREE.Box3().setFromObject(roomScene);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const roomScale = 6.0 / Math.max(rawSize.x, rawSize.z, 0.001);
    roomScene.scale.setScalar(roomScale);
    roomScene.updateMatrixWorld(true);

    // ── Centre horizontally, pin bottom of room to y = -1.6 ─────────────
    const scaledBox    = new THREE.Box3().setFromObject(roomScene);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    roomScene.position.x = -scaledCenter.x;
    roomScene.position.z = -scaledCenter.z;
    roomScene.position.y = -1.6 - scaledBox.min.y;
    roomScene.updateMatrixWorld(true);

    // ── Detect actual floor surface Y in world space ─────────────────────
    // Walk meshes, find the one with the largest XZ footprint → that's the floor
    let bestArea = 0, detectedFloorY = -1.6;
    roomScene.traverse(child => {
      if (!child.isMesh) return;
      const b = new THREE.Box3().setFromObject(child);
      const sz = b.getSize(new THREE.Vector3());
      // Floor candidates: flat (height < 15% of the larger of width/depth)
      const maxHoriz = Math.max(sz.x, sz.z);
      if (sz.y < maxHoriz * 0.15) {
        const area = sz.x * sz.z;
        if (area > bestArea) { bestArea = area; detectedFloorY = b.max.y; }
      }
    });
    // If nothing flat found, fall back to scaled box bottom + small offset
    if (bestArea === 0) detectedFloorY = scaledBox.min.y + 0.02;
    roomFloorY = detectedFloorY;
    console.log('[Room] detectedFloorY =', roomFloorY, 'bestArea =', bestArea);

    roomGroup.add(roomScene);

    // ── Tag room sub-objects for chip toggles ────────────────────────────
    roomScene.traverse(child => {
      const n = (child.name || '').toLowerCase();
      if (n.includes('wall') || n.includes('arch')) roomElements.walls = roomElements.walls || child;
      if (n.includes('floor') || n.includes('ground')) roomElements.floor = roomElements.floor || child;
      if (n.includes('window') || n.includes('glass')) roomElements.windows = roomElements.windows || child;
      if (n.includes('door')) roomElements.doors = roomElements.doors || child;
      if (n.includes('rug') || n.includes('carpet')) roomElements.rug = roomElements.rug || child;
      if (n.includes('ceiling') || n.includes('ceil')) roomElements.ceiling = roomElements.ceiling || child;
    });

    // ── Detect curtain meshes and add to piece system ────────────────────
    _buildCurtainEntries(roomScene);
    // Inject curtain representative entry into meshEntries so piece list + fabric drop works
    if (curtainMeshEntries.length > 0) {
      meshEntries = meshEntries.filter(e => !e._isCurtain);
      meshEntries.push(curtainMeshEntries[0]); // show single "Curtains" entry

      // Restore prior in-session customization if any; otherwise defaults. Without
      // this the living-room curtains reset to a flat placeholder grey on every
      // rebuild (toggling Room View, or navigating bedroom→living) even though
      // curtainState/the fabric bar still show the user's last selection as active.
      curtainState = _savedCurtainState
        ? { ...{ shape:'drape', fabric:'linen', color:'#EDE6D8', widthFactor:1, lengthFactor:1 }, ..._savedCurtainState }
        : { shape:'drape', fabric:'linen', color:'#EDE6D8', widthFactor:1, lengthFactor:1 };
      curtainsVisible = true;
      const _ccl = document.getElementById('chip-curtains-living');
      if (_ccl) _ccl.classList.add('on');
      _initCurtainFabricSwatches();
      _showCurtainConfigPanel(true);
      _applyCurtainMaterial();
    }

    _placeFurnitureInRoom();
    document.getElementById('loading').classList.remove('on');
    if (onReadyCallback) onReadyCallback();
    buildPieceList();
    markDirty();
  }, undefined, err => {
    if (_roomLoadGen !== _gen) return;
    console.error('Room GLB load error:', err);
    document.getElementById('loading').classList.remove('on');
    showToast('Room GLB failed — using fallback');
    _buildProceduralRoom();
    _placeFurnitureInRoom();
    if (onReadyCallback) onReadyCallback();
    markDirty();
  });
}

function _buildProceduralRoom() {
  const W=6, H=3.2, D=6;
  roomFloorY = -1.6 + 0.01; // floor surface is the plane surface + tiny offset
  const wallMat = new THREE.MeshStandardMaterial({color:0xf5f0ea, roughness:0.9, side:THREE.BackSide});
  const floorMat= new THREE.MeshStandardMaterial({color:0xd4c4a8, roughness:0.8, metalness:0.02});
  const roomBox = new THREE.Mesh(new THREE.BoxGeometry(W,H,D), wallMat);
  roomElements.walls=roomBox; roomGroup.add(roomBox);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W,D), floorMat);
  floor.rotation.x=-Math.PI/2; floor.position.y=-1.6;
  roomElements.floor=floor; roomGroup.add(floor);
}

// ── Bedroom Room ─────────────────────────────────────────────────────────
function buildBedroomRoom(onReadyCallback) {
  removeRoom();
  const _gen = ++_roomLoadGen;
  roomGroup = new THREE.Group();
  scene.add(roomGroup);

  const bedroomUrl = BEDROOM_ROOM_GLB;
  document.getElementById('loading').classList.add('on');
  document.getElementById('load-txt').textContent = 'Loading Bedroom…';

  gltfLoader.load(bedroomUrl, gltf => {
    if (_roomLoadGen !== _gen) return; // superseded by a newer room build
    const fullScene = gltf.scene;
    console.log('[Bedroom] GLB loaded:', bedroomUrl, '| children:', fullScene.children.length);

    fullScene.scale.setScalar(0.9487);
    fullScene.rotation.y = Math.PI;
    fullScene.position.set(1.923, -1.817, 2.783);
    fullScene.updateWorldMatrix(false, true);
    roomFloorY = -1.6;

    // DoubleSide on room arch so walls are visible from camera
    const roomArch = fullScene.getObjectByName('_9_minimalist_medium') || fullScene;
    roomArch.traverse(child => {
      if (!child.isMesh) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => { if (m) { m.side = THREE.DoubleSide; m.needsUpdate = true; } });
    });

    roomGroup.add(fullScene);
    console.log('[Bedroom] room placed | scale:', fullScene.scale.x.toFixed(4), '| pos:', fullScene.position.x.toFixed(3), fullScene.position.y.toFixed(3), fullScene.position.z.toFixed(3));

    // Tag room elements for chip toggles
    roomArch.traverse(child => {
      const n = (child.name || '').toLowerCase();
      if (n.includes('wall') || n.includes('arch')) roomElements.walls   = roomElements.walls   || child;
      if (n.includes('floor') || n.includes('ground')) roomElements.floor = roomElements.floor || child;
      if (n.includes('window') || n.includes('glass')) roomElements.windows = roomElements.windows || child;
      if (n.includes('ceiling') || n.includes('ceil')) roomElements.ceiling = roomElements.ceiling || child;
    });

    // Build curtain entries — traverse fullScene so curtain nodes outside roomArch are found
    _buildBedroomCurtainEntries(fullScene);
    if (curtainMeshEntries.length > 0) {
      meshEntries = meshEntries.filter(e => !e._isCurtain);
      meshEntries.push(curtainMeshEntries[0]);
    }
    curtainsVisible = true;
    // Restore prior in-session customization if any; otherwise defaults.
    curtainState = _savedCurtainState
      ? { ...{ shape:'drape', fabric:'linen', color:'#EDE6D8', widthFactor:1, lengthFactor:1 }, ..._savedCurtainState }
      : { shape:'drape', fabric:'linen', color:'#EDE6D8', widthFactor:1, lengthFactor:1 };
    const _ccb = document.getElementById('chip-curtains-bedroom');
    if (_ccb) _ccb.classList.add('on');
    _initCurtainFabricSwatches();
    _showCurtainConfigPanel(true);
    if (curtainMeshEntries.length > 0) _applyCurtainMaterial();

    // Sync bed-style chips
    ['bed_wooden', 'bed_fabric'].forEach(bk => {
      const c = document.getElementById('chip-bed-' + bk.replace('bed_', ''));
      if (c) c.classList.toggle('on', bk === currentModelKey);
    });

    // Place bed using calibrated slot, then restore fabric state from product view
    if (currentModel) {
      const bs = BEDROOM_SLOTS[currentModelKey];
      _seatOnFloor(currentModel, bs.x, bs.z, bs.rotY, bs.scale);
      roomFurnitureModels[currentModelKey] = currentModel;
      if (!scene.getObjectById(currentModel.id)) scene.add(currentModel);
      // _rebuildMeshEntries reuses origMat._livinitGrey (set in product view) so
      // fabric selections carry through automatically — no snapshot apply needed.
      _rebuildMeshEntries(currentModel, currentModelKey);
    }

    document.getElementById('loading').classList.remove('on');
    if (onReadyCallback) onReadyCallback();
    buildPieceList();
    markDirty();
  }, undefined, err => {
    if (_roomLoadGen !== _gen) return;
    console.error('[Bedroom] GLB load error:', err);
    document.getElementById('loading').classList.remove('on');
    showToast('Bedroom room failed');
    if (onReadyCallback) onReadyCallback();
    markDirty();
  });
}


// ── Curtain configurator functions ────────────────────────────────────────

function _showCurtainConfigPanel(show) {
  const panel = document.getElementById('curtain-config-panel');
  if (panel) panel.style.display = show ? 'block' : 'none';
}

function _initCurtainFabricSwatches() {
  const row = document.getElementById('curtain-fabric-row');
  if (row) {
    row.innerHTML = '';
    const FAB_DESC = { linen:'natural slub', cotton:'soft matte', velvet:'luxe pile', silk:'lustrous',
      voile:'sheer airy', 'cotton-blend':'easy care', wool:'warm dense', jacquard:'woven pattern', blackout:'room-darkening' };
    CURTAIN_FABRICS.forEach(f => {
      const card = document.createElement('button');
      card.className = 'curtain-fab-card' + (f.id === curtainState.fabric ? ' active' : '');
      card.id = 'cfab-' + f.id;
      card.title = f.label;
      card.onclick = () => setCurtainFabric(f.id);
      const dot = document.createElement('span');
      dot.className = 'curtain-fab-dot';
      dot.style.background = f.swatch;
      const txt = document.createElement('span');
      txt.className = 'curtain-fab-text';
      const nm = document.createElement('span');
      nm.className = 'curtain-fab-name';
      nm.textContent = f.label;
      const ds = document.createElement('span');
      ds.className = 'curtain-fab-desc';
      ds.textContent = FAB_DESC[f.id] || '';
      txt.appendChild(nm); txt.appendChild(ds);
      card.appendChild(dot); card.appendChild(txt);
      row.appendChild(card);
    });
  }
  renderCurtainColorGroups();
  // Sync active shape button to current/restored state
  document.querySelectorAll('.curtain-shape-btn').forEach(b => b.classList.remove('active'));
  const shapeBtn = document.getElementById('cshape-' + curtainState.shape);
  if (shapeBtn) shapeBtn.classList.add('active');
  // Sync size sliders to current/restored state
  const wf = curtainState.widthFactor || 1, lf = curtainState.lengthFactor || 1;
  const wEl = document.getElementById('curtain-width'),  wVal = document.getElementById('curtain-width-val');
  const lEl = document.getElementById('curtain-length'), lVal = document.getElementById('curtain-length-val');
  if (wEl)  wEl.value = wf;
  if (wVal) wVal.textContent = Math.round(wf * 100) + '%';
  if (lEl)  lEl.value = lf;
  if (lVal) lVal.textContent = Math.round(lf * 100) + '%';
}

// Renders the grouped colour palettes into the side panel. Highlights the active
// fabric's recommended colours.
function renderCurtainColorGroups() {
  const host = document.getElementById('curtain-color-presets');
  if (!host) return;
  host.innerHTML = '';
  const preset = CURTAIN_FABRICS.find(f => f.id === curtainState.fabric);
  const rec = new Set((preset && preset.recommend) ? preset.recommend.map(h => h.toUpperCase()) : []);
  CURTAIN_COLOR_GROUPS.forEach(g => {
    const lbl = document.createElement('div');
    lbl.className = 'curtain-color-group-label';
    lbl.textContent = g.group;
    host.appendChild(lbl);
    const rowEl = document.createElement('div');
    rowEl.className = 'curtain-color-group-row';
    g.colors.forEach(c => {
      const btn = document.createElement('button');
      const isRec = rec.has(c.hex.toUpperCase());
      btn.className = 'curtain-color-chip'
        + (c.hex.toLowerCase() === (curtainState.color || '').toLowerCase() ? ' active' : '')
        + (isRec ? ' recommended' : '');
      btn.id = 'cclr-' + c.hex.replace('#','');
      btn.title = c.label + (isRec ? ' · recommended' : '');
      btn.style.background = c.hex;
      btn.onclick = () => setCurtainColor(c.hex);
      rowEl.appendChild(btn);
    });
    host.appendChild(rowEl);
  });
}

function _buildCurtainMat(normTex, roughTex, diffTex) {
  const preset = CURTAIN_FABRICS.find(f => f.id === curtainState.fabric) || CURTAIN_FABRICS[0];
  const shape  = curtainState.shape;

  let roughness  = preset.roughness;
  let opacity    = preset.opacity;
  const baseCol  = _curtainLinColor(curtainState.color);

  if (shape === 'sheer') {
    roughness = Math.min(preset.roughness + 0.04, 1.0);
    opacity   = 0.42;
  } else if (shape === 'blinds') {
    // Vertical fabric blinds read off the pleat geometry. Matte woven fabric with
    // the full texture set — not shiny metal, which looked like wet plastic.
    roughness = 0.7;
  } else if (shape === 'pleated') {
    roughness = Math.min(preset.roughness + 0.10, 1.0);
    baseCol.multiplyScalar(0.78);
  }

  const matOpts = {
    color: baseCol,
    roughness,
    metalness: 0,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: opacity >= 1,
  };
  // Velvet uses MeshPhysicalMaterial for its retroreflective sheen rim.
  // r128: sheen is a THREE.Color (null disables it) — not a float, and there is
  // no sheenColor/sheenRoughness (those are r133+).
  const mat = preset.physical
    ? new THREE.MeshPhysicalMaterial(matOpts)
    : new THREE.MeshStandardMaterial(matOpts);
  if (preset.physical) {
    mat.sheen = _curtainLinColor(curtainState.color, 0.7);
  }

  // Texture repeat scales with curtain size so the weave density stays constant.
  const repX = 4 * (curtainState.widthFactor  || 1);
  const repY = 4 * (curtainState.lengthFactor || 1);

  if (diffTex) {
    // Desaturate the diffuse to a luminance-only weave so the colour chip stays the
    // true hue — a PolyHaven diffuse tint would otherwise fight the chosen colour.
    const src = makeGreyscaleTex(diffTex) || diffTex;
    const dt = src.clone();
    dt.wrapS = dt.wrapT = THREE.RepeatWrapping;
    dt.repeat.set(repX, repY);
    dt.needsUpdate = true;
    mat.map = dt;
  }
  if (normTex) {
    const nt = normTex.clone();
    nt.wrapS = nt.wrapT = THREE.RepeatWrapping;
    nt.repeat.set(repX, repY);
    nt.needsUpdate = true;
    mat.normalMap = nt;
    const ns = preset.normalScale ?? 0.8;
    mat.normalScale = new THREE.Vector2(ns, ns);
  }
  if (roughTex) {
    const rt = roughTex.clone();
    rt.wrapS = rt.wrapT = THREE.RepeatWrapping;
    rt.repeat.set(repX, repY);
    rt.needsUpdate = true;
    mat.roughnessMap = rt;
  }

  // Fabric should barely reflect the RoomEnvironment — full intensity made it look
  // like satin/vinyl (the blue interior HDRI reflecting as bright specular streaks).
  mat.envMapIntensity = (preset.envMapIntensity ?? 1.0) * 0.25;

  return mat;
}

async function _applyCurtainMaterial() {
  if (!curtainMeshEntries.length) return;
  if (_blindsGroup) _blindsGroup.visible = false; // default hidden; blinds branch re-shows
  if (curtainState.shape === 'none') {
    curtainMeshEntries.forEach(e => { e.mesh.visible = false; });
    markDirty();
    return;
  }
  if (curtainState.shape === 'blinds') {
    // Procedural slats replace the drape mesh entirely.
    curtainMeshEntries.forEach(e => { e.mesh.visible = false; });
    _applyBlinds();
    return;
  }
  curtainMeshEntries.forEach(e => { e.mesh.visible = curtainsVisible; });

  const _gen = _roomLoadGen;
  const preset = CURTAIN_FABRICS.find(f => f.id === curtainState.fabric) || CURTAIN_FABRICS[0];
  let normTex = null, roughTex = null, diffTex = null;
  try {
    if (preset.polyId) {
      const maps = await getPolyMaps(preset.polyId);
      [normTex, roughTex, diffTex] = await Promise.all([
        maps.normUrl  ? tryLoadTex(maps.normUrl,  false).catch(() => null) : Promise.resolve(null),
        maps.roughUrl ? tryLoadTex(maps.roughUrl, false).catch(() => null) : Promise.resolve(null),
        maps.diffUrl  ? tryLoadTex(maps.diffUrl,  true ).catch(() => null) : Promise.resolve(null),
      ]);
    }
    if (!normTex  && preset.normFallback)  normTex  = await loadTexFirstSuccess(preset.normFallback,  false).catch(() => null);
    if (!roughTex && preset.roughFallback) roughTex = await loadTexFirstSuccess(preset.roughFallback, false).catch(() => null);
    // No diffuse fallback — if PolyHaven diffuse is unavailable we fall back to flat color.
  } catch (_) {}

  if (_roomLoadGen !== _gen) return; // room was switched while textures loaded
  _curtainNormTex  = normTex;
  _curtainRoughTex = roughTex;

  const mat = _buildCurtainMat(normTex, roughTex, diffTex);
  curtainMeshEntries.forEach(e => { e.mesh.material = mat; });
  _applyCurtainSize(); // re-apply node scale + UV repeat (fresh meshes after room load)
}

function _applyCurtainColor() {
  if (!curtainMeshEntries.length) return;
  if (curtainState.shape === 'none') return;
  if (curtainState.shape === 'blinds') {
    if (_blindsGroup) {
      _blindsGroup.userData.slatMat.color.copy(_curtainLinColor(curtainState.color));
      _blindsGroup.userData.railMat.color.copy(_curtainLinColor(curtainState.color, 0.7));
      _blindsGroup.userData.slatMat.needsUpdate = true;
    }
    markDirty();
    return;
  }
  const preset  = CURTAIN_FABRICS.find(f => f.id === curtainState.fabric) || CURTAIN_FABRICS[0];
  const shape   = curtainState.shape;
  const baseCol = _curtainLinColor(curtainState.color);
  let opacity   = preset.opacity;
  if (shape === 'sheer') {
    opacity = 0.42;
  } else if (shape === 'pleated') {
    baseCol.multiplyScalar(0.78);
  }
  curtainMeshEntries.forEach(e => {
    if (!e.mesh.material) return;
    const mats = Array.isArray(e.mesh.material) ? e.mesh.material : [e.mesh.material];
    mats.forEach(m => {
      if (!m || !m.color) return;
      m.color.set(baseCol);
      m.opacity = opacity;
      m.transparent = opacity < 1;
      // Velvet (MeshPhysicalMaterial): keep the r128 sheen Color tracking the chip color
      if (m.sheen instanceof THREE.Color) m.sheen.copy(baseCol).multiplyScalar(0.7);
      m.needsUpdate = true;
    });
  });
  markDirty();
}

function setCurtainShape(id) {
  curtainState.shape = id;
  _saveCurtainState();
  document.querySelectorAll('.curtain-shape-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('cshape-' + id);
  if (btn) btn.classList.add('active');
  _applyCurtainMaterial();
}

function setCurtainFabric(id) {
  curtainState.fabric = id;
  _saveCurtainState();
  document.querySelectorAll('.curtain-fab-card').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('cfab-' + id);
  if (btn) btn.classList.add('active');
  // Sync bar swatches
  document.querySelectorAll('[data-cfab]').forEach(b => b.classList.toggle('active', b.dataset.cfab === id));
  renderCurtainColorGroups(); // refresh recommended-colour highlight for the new fabric
  _applyCurtainMaterial();
}

function setCurtainColor(hex) {
  curtainState.color = hex;
  _saveCurtainState();
  document.querySelectorAll('.curtain-color-chip').forEach(b => b.classList.remove('active'));
  const chip = document.getElementById('cclr-' + hex.replace('#',''));
  if (chip) chip.classList.add('active');
  // Sync bar color chips
  document.querySelectorAll('[data-cclr]').forEach(b => b.classList.toggle('active', b.dataset.cclr === hex));
  _applyCurtainColor();
}

// Scales curtain nodes (width=X, length=Y) and rescales texture repeat so the
// fabric weave keeps its density instead of stretching. Folds are baked into the
// GLB geometry, so large factors still distort folds — hence the 0.7–1.4 clamp.
function _applyCurtainSize() {
  const wf = curtainState.widthFactor  || 1;
  const lf = curtainState.lengthFactor || 1;
  if (curtainState.shape === 'blinds') { _applyBlinds(); return; } // slats rebuild to new dims
  _curtainNodes.forEach(n => {
    const base = n.userData._curtainBaseScale;
    if (!base) return;
    n.scale.set(base.x * wf, base.y * lf, base.z);
    n.updateMatrixWorld(true);
  });
  curtainMeshEntries.forEach(e => {
    if (!e.mesh.material) return;
    const mats = Array.isArray(e.mesh.material) ? e.mesh.material : [e.mesh.material];
    mats.forEach(m => {
      if (!m) return;
      [m.map, m.normalMap, m.roughnessMap].forEach(tex => {
        if (tex) { tex.repeat.set(4 * wf, 4 * lf); tex.needsUpdate = true; }
      });
    });
  });
  markDirty();
}

function setCurtainSize(dim, value) {
  const v = Math.max(0.7, Math.min(1.4, parseFloat(value) || 1));
  if (dim === 'width') curtainState.widthFactor = v; else curtainState.lengthFactor = v;
  _saveCurtainState();
  const valEl = document.getElementById('curtain-' + dim + '-val');
  if (valEl) valEl.textContent = Math.round(v * 100) + '%';
  _applyCurtainSize();
}

// Compute a node's average world-space normal by sampling its meshes' normals.
function _avgWorldNormal(node) {
  const acc = new THREE.Vector3();
  node.updateWorldMatrix(true, true);
  node.traverse(c => {
    if (!c.isMesh || !c.geometry || !c.geometry.attributes.normal) return;
    const na = c.geometry.attributes.normal;
    const nm = new THREE.Matrix3().getNormalMatrix(c.matrixWorld);
    const step = Math.max(1, (na.count / 200) | 0);
    const v = new THREE.Vector3();
    for (let k = 0; k < na.count; k += step) {
      v.set(na.getX(k), na.getY(k), na.getZ(k)).applyMatrix3(nm);
      acc.add(v);
    }
  });
  return acc.lengthSq() ? acc.normalize() : acc.set(0, 0, 1);
}

// Detect & repair mirror-flipped panel normals (e.g. one bedroom curtain panel is a
// mirror of the other, so its baked vertex normals point INTO the wall instead of
// toward the room — it then lights as if from behind, reading a different colour
// than its twin even though they share one material). Only acts when panels genuinely
// OPPOSE each other, then flips whichever faces away from the room interior — a no-op
// on correct GLBs (including the living room's single-node case, where this is skipped).
function _fixCurtainNormals(curtainNodes, roomScene) {
  if (curtainNodes.length < 2) return;
  const n0 = _avgWorldNormal(curtainNodes[0]);
  const n1 = _avgWorldNormal(curtainNodes[1]);
  if (n0.dot(n1) >= -0.3) return; // panels already face the same way → nothing to fix

  const curtainBox = new THREE.Box3();
  curtainNodes.forEach(n => curtainBox.expandByObject(n));
  const curtainCenter = curtainBox.getCenter(new THREE.Vector3());
  const roomCenter = new THREE.Box3().setFromObject(roomScene).getCenter(new THREE.Vector3());
  const toRoom = roomCenter.clone().sub(curtainCenter); toRoom.y = 0;
  if (!toRoom.lengthSq()) return;
  toRoom.normalize();

  const flippedGeoms = new Set();
  curtainNodes.forEach(node => {
    if (_avgWorldNormal(node).dot(toRoom) >= 0) return; // faces the room → correct
    node.traverse(c => {
      if (!c.isMesh || !c.geometry || !c.geometry.attributes.normal) return;
      if (flippedGeoms.has(c.geometry.uuid)) return; // don't double-flip shared geometry
      const na = c.geometry.attributes.normal;
      for (let k = 0; k < na.count; k++) na.setXYZ(k, -na.getX(k), -na.getY(k), -na.getZ(k));
      na.needsUpdate = true;
      flippedGeoms.add(c.geometry.uuid);
    });
    console.log(`[Curtains] fixed inverted normals on ${node.name}`);
  });
}

// ── Procedural Venetian blinds ────────────────────────────────────────────
// The "Blinds" style swaps the drape mesh for real horizontal slat geometry.
const BLINDS_TILT = THREE.MathUtils.degToRad(32); // half-open venetian angle

// Blinds mount AT the window, but the only anchor is the drape footprint
// (_curtainBaseBox), which spans the full floor-to-rod drape — the rod sits well
// above the window head and the panels puddle to the floor. Reusing it raw makes
// the shade ride up the bare wall above the window (and overshoot the sill below).
// Confine the shade to the window band: cover ~72% of the drape height, biased
// slightly upward so the top drops below the rod and the bottom lifts off the floor.
const SHADE_VCOVER = 0.72; // shade height as a fraction of the drape footprint height
const SHADE_VRISE  = 0.04; // shade centre lifted above the drape-box centre (× footprint height)

function _disposeBlinds() {
  if (!_blindsGroup) return;
  _blindsGroup.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }
  });
  if (_blindsGroup.parent) _blindsGroup.parent.remove(_blindsGroup);
  _blindsGroup = null;
}

// Shared orientation + position for the rigid blind panel. The drape's averaged
// normal (_curtainFace) is noisy because the drape is wavy; feeding that straight in
// skews the flat panel a few degrees, swinging its far edge back through the window
// glass → z-fighting. Snap the facing axis to the nearest world cardinal so the panel
// stays parallel to the glass, then stand it off toward the room.
function _curtainPanelFrame(offset) {
  const zAxis = _curtainFace.clone(); zAxis.y = 0;
  if (zAxis.lengthSq() < 1e-6) zAxis.set(-1, 0, 0);
  zAxis.normalize();
  if (Math.abs(zAxis.x) >= Math.abs(zAxis.z)) zAxis.set(Math.sign(zAxis.x) || -1, 0, 0);
  else                                        zAxis.set(0, 0, Math.sign(zAxis.z) || 1);
  const up = new THREE.Vector3(0, 1, 0);
  const xAxis = new THREE.Vector3().crossVectors(up, zAxis).normalize();
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  const position = _curtainBaseBox.center.clone().add(zAxis.clone().multiplyScalar(offset));
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);
  return { position, quaternion };
}

function _buildBlindsGeometry() {
  _disposeBlinds();
  if (!_curtainBaseBox || !_curtainFace || !scene) return;
  const wf = curtainState.widthFactor || 1;
  const lf = curtainState.lengthFactor || 1;
  const sz = _curtainBaseBox.size;
  const fullH  = sz.y * lf;                          // full drape footprint height
  const width  = Math.max(sz.x, sz.z) * wf * 0.98;
  const height = fullH * SHADE_VCOVER * 0.98;        // confined to the window band
  if (width <= 0 || height <= 0) return;

  const grp = new THREE.Group();
  const frame = _curtainPanelFrame(0.05); // stand off the glass; snapped square to it
  grp.position.copy(frame.position);
  grp.position.y += fullH * SHADE_VRISE;             // lift off the floor / below the rod
  grp.quaternion.copy(frame.quaternion);

  // Faux-wood louvers: solid boxes (real thickness) so edges catch light.
  const slatMat = new THREE.MeshStandardMaterial({
    color: _curtainLinColor(curtainState.color), roughness: 0.62, metalness: 0,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: _curtainLinColor(curtainState.color, 0.7), roughness: 0.7, metalness: 0,
  });

  const tilt      = BLINDS_TILT;
  const slatDepth = 0.05;                         // 2" louver (front-to-back when flat)
  const thickness = 0.004;                        // ~3-4 mm
  const projPitch = Math.max(0.02, slatDepth * Math.cos(tilt)); // visible vertical pitch when tilted
  const count     = Math.min(60, Math.max(16, Math.round(height / projPitch)));
  const pitch     = height / count;

  // Box local axes: X = louver length (window width), Y = thickness, Z = louver depth.
  const slatGeo = new THREE.BoxGeometry(width, thickness, slatDepth);
  for (let i = 0; i < count; i++) {
    const slat = new THREE.Mesh(slatGeo, slatMat);
    slat.position.y = height / 2 - pitch * (i + 0.5);
    slat.rotation.x = tilt;                        // tilt about the louver's long axis
    slat.castShadow = true; slat.receiveShadow = true;
    grp.add(slat);
  }

  // Slim headrail (top) + heavier bottom rail — both solid boxes, depth kept small to stay clear of glass.
  const headrail = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, 0.05, 0.06), railMat);
  headrail.position.y = height / 2 + 0.03;
  headrail.castShadow = true; headrail.receiveShadow = true;
  grp.add(headrail);

  const bottomrail = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, 0.03, slatDepth * 0.7), railMat);
  bottomrail.position.y = -height / 2 - 0.015;
  bottomrail.castShadow = true; bottomrail.receiveShadow = true;
  grp.add(bottomrail);

  // Ladder cords down the face (toward the room) — the detail that sells "real blinds".
  const cordMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xeae6dc), roughness: 0.8, metalness: 0 });
  const cordLen = height + 0.06;
  const cordGeo = new THREE.CylinderGeometry(0.004, 0.004, cordLen, 6); // axis = local Y (vertical)
  for (const xf of [-0.28, 0.28]) {
    const cord = new THREE.Mesh(cordGeo, cordMat);
    cord.position.set(width * xf, 0, slatDepth * 0.5 + 0.005); // +Z = toward room, in front of louvers
    grp.add(cord);
  }
  grp.userData.cordMat = cordMat;

  grp.userData.slatMat = slatMat;
  grp.userData.railMat = railMat;
  _blindsGroup = grp;
  scene.add(grp);
}

// Show blinds (rebuilds with current colour + size), hiding the drape meshes.
function _applyBlinds() {
  _buildBlindsGeometry();
  if (_blindsGroup) _blindsGroup.visible = curtainsVisible;
  markDirty();
}

function toggleCurtains() {
  curtainsVisible = !curtainsVisible;
  ['chip-curtains-living', 'chip-curtains-bedroom'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('on', curtainsVisible);
  });
  if (curtainsVisible) {
    _applyCurtainMaterial(); // respects shape='none'/'blinds' internally
  } else {
    curtainMeshEntries.forEach(e => { e.mesh.visible = false; });
    if (_blindsGroup) _blindsGroup.visible = false;
    markDirty();
  }
  _showCurtainConfigPanel(curtainsVisible);
}

function _buildBedroomCurtainEntries(roomScene) {
  const curtainNodes = [];
  roomScene.traverse(c => {
    if (c.name === 'curtains_1' || c.name === 'curtains_2') curtainNodes.push(c);
  });
  if (!curtainNodes.length) { console.log('[Bedroom] no curtain nodes found'); return; }

  // Keep the top-level curtain nodes and their base scale for sizing (scaling the
  // node about its own pivot keeps the curtain anchored, unlike scaling child meshes).
  _curtainNodes = curtainNodes;
  curtainNodes.forEach(n => { n.userData._curtainBaseScale = n.scale.clone(); });

  // Fix inverted panel normals — see _fixCurtainNormals for why this can happen.
  _fixCurtainNormals(curtainNodes, roomScene);

  // Capture the curtain footprint at BASE scale (nodes un-sized here) — anchors the
  // procedural blinds geometry independently of drape scaling.
  {
    const bb = new THREE.Box3();
    curtainNodes.forEach(n => bb.expandByObject(n));
    if (!bb.isEmpty()) {
      _curtainBaseBox = { center: bb.getCenter(new THREE.Vector3()), size: bb.getSize(new THREE.Vector3()) };
      _curtainFace = _avgWorldNormal(curtainNodes[0]).clone();
    }
  }

  const sharedGreyMat = new THREE.MeshStandardMaterial({
    color: 0xd4c8b8, roughness: 0.8, metalness: 0, side: THREE.DoubleSide,
  });
  let idx = 0;
  curtainNodes.forEach(node => {
    node.traverse(child => {
      if (!child.isMesh || !child.material) return;
      const origMat = Array.isArray(child.material) ? child.material[0] : child.material;
      child.material = sharedGreyMat;
      curtainMeshEntries.push({
        id: `curtain-${idx++}`,
        name: idx === 1 ? 'Curtains' : null,
        mesh: child,
        matIndex: 0,
        origMat: origMat || sharedGreyMat,
        greyMat: sharedGreyMat,
        origGreyscaleMap: null,
        checked: false,
        pieceSelected: false,
        uvScaleFactor: 0.3,
        _isCurtain: true,
      });
    });
  });
  if (curtainMeshEntries.length > 0) {
    curtainMeshEntries[0].name = 'Curtains';
    console.log(`[Bedroom] built ${curtainMeshEntries.length} curtain entries`);
  }
}

// ── Furniture placement ──────────────────────────────────────────────────
//
//  DESIGN:
//  - roomFloorY is detected dynamically from the room.glb bounding box min.y
//  - Both chair and sofa are loaded and kept alive for the whole room session
//  - _seatOnFloor resets to origin, measures bbox, then positions precisely
//  - Rotation 0 = model faces its natural forward (+Z in GLB convention)
//    If a model loads facing wrong way, flip FURNITURE_SLOTS rotY by PI.
//
// Sofa faces +Z naturally (confirmed in modelviewer) = rotY: 0
// Chair faces -Z naturally so needs Math.PI to face camera
// Room bounds: X:[-3,3], Z:[-2.35,2.35], floorY≈-1.32
// Sofa natural size at rot=0: 2.48 × 1.21 (long along X, faces ±Z)
// Chair: 0.8 × 0.82 (roughly square)
const FURNITURE_SLOTS = {
  chair:      { x:  2.2, z:  0.89, rotY:  3.93,      scale: 0.7  },
  sofa:       { x:  0.2, z:  1.0,  rotY:  Math.PI,   scale: 1.2  },
  bed_wooden: { x:  0.0, z: -0.3,  rotY:  0,          scale: 1.0  },
  bed_fabric: { x:  0.0, z: -0.3,  rotY:  0,          scale: 1.0  },
};

let roomFloorY = -1.6; // updated dynamically after room.glb loads

function _seatOnFloor(model, slotX, slotZ, rotY, slotScale) {
  if (!model) return;

  // 1. Zero out transform
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.updateMatrixWorld(true);

  // 2. Apply slot-specific scale on top of the normalised scale
  // model.scale was already set to 1.6/maxDim by processGLTF
  // We multiply by slotScale to fine-tune per-slot size
  if (slotScale && slotScale !== 1.0) {
    model.scale.multiplyScalar(slotScale);
    // Prevent accumulation: store base scale and recompute
    if (!model._baseScale) model._baseScale = model.scale.clone().divideScalar(slotScale);
    model.scale.copy(model._baseScale).multiplyScalar(slotScale);
  }
  model.updateMatrixWorld(true);

  // 3. Measure bbox after scale applied
  const box = new THREE.Box3().setFromObject(model);
  const ctr = box.getCenter(new THREE.Vector3());
  const minY = box.min.y;

  // 4. Apply rotation then translate
  model.rotation.y = rotY;
  model.position.set(slotX - ctr.x, roomFloorY - minY, slotZ - ctr.z);

  model.updateMatrixWorld(true);
  markDirty();
}

// Called after room.glb loads AND after any model reload inside room mode
function _placeFurnitureInRoom() {
  // ── Active model ────────────────────────────────────────────────────────
  if (currentModel) {
    const _fs = (activeRoomSection === 'bedroom' && BEDROOM_SLOTS[currentModelKey])
      ? BEDROOM_SLOTS : FURNITURE_SLOTS;
    const s = _fs[currentModelKey];
    if (s) _seatOnFloor(currentModel, s.x, s.z, s.rotY, s.scale || 1.0);
    roomFurnitureModels[currentModelKey] = currentModel;
    if (!scene.getObjectById(currentModel.id)) scene.add(currentModel);
  }

  // No companion in bedroom mode — only one bed shown at a time
  if (activeRoomSection === 'bedroom') return;

  // ── Companion model (living room only) ─────────────────────────────────
  const otherKey = currentModelKey === 'chair' ? 'sofa' : 'chair';
  const otherUrl = getGLBUrl(otherKey);
  const os = FURNITURE_SLOTS[otherKey];

  if (roomFurnitureModels[otherKey]) {
    // Already loaded — just reposition
    const other = roomFurnitureModels[otherKey];
    if (!scene.getObjectById(other.id)) scene.add(other);
    _seatOnFloor(other, os.x, os.z, os.rotY, os.scale || 1.0);
  } else {
    // Load companion fresh
    const _compGen = _roomLoadGen;
    gltfLoader.load(otherUrl, gltf => {
      if (_roomLoadGen !== _compGen) return; // room changed while companion loaded
      if (roomFurnitureModels[otherKey]) return;
      const m = gltf.scene;

      // Normalise scale the same way processGLTF does
      const b = new THREE.Box3().setFromObject(m);
      const sz = b.getSize(new THREE.Vector3());
      m.scale.setScalar(1.6 / Math.max(sz.x, sz.y, sz.z));
      m.updateMatrixWorld(true);

      roomFurnitureModels[otherKey] = m;
      if (!scene.getObjectById(m.id)) scene.add(m);
      _seatOnFloor(m, os.x, os.z, os.rotY, os.scale || 1.0);

      // Re-apply any saved fabric snapshot for the companion
      _applySnapshotToModel(m, otherKey);
    }, undefined, err => {
      console.warn('Companion furniture load failed:', err);
    });
  }
}

// Apply a saved material snapshot to a raw gltf scene (companion model)
function _applySnapshotToModel(model, key) {
  const snap = modelMaterialSnapshots[key];
  if (!snap || !snap.length) return;
  let si = 0;
  model.traverse(child => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((_, idx) => {
      if (si < snap.length) {
        const arr = Array.isArray(child.material) ? [...child.material] : [child.material];
        arr[idx] = snap[si].matClone.clone();
        arr[idx].needsUpdate = true;
        child.material = arr;
        si++;
      }
    });
  });
  markDirty();
}

function removeRoom() {
  // Exit move mode first
  if (furnitureMoveMode) {
    furnitureMoveMode = false;
    if (transformControls) { transformControls.detach(); transformControls.visible = false; }
    const bar = document.getElementById('move-mode-bar');
    if (bar) bar.classList.remove('active');
    const hud = document.getElementById('move-hud');
    if (hud) hud.classList.remove('active');
  }

  // Clean up curtain entries
  _removeCurtainEntries();

  if (roomGroup) { scene.remove(roomGroup); roomGroup = null; }
  Object.keys(roomElements).forEach(k => roomElements[k] = null);

  // Remove companion furniture from scene but KEEP currentModel so product-view
  // can still use it. Keep all refs in roomFurnitureModels for fast re-entry.
  Object.keys(roomFurnitureModels).forEach(k => {
    if (k !== currentModelKey && roomFurnitureModels[k]) {
      scene.remove(roomFurnitureModels[k]);
    }
  });

  // Reset roomFloorY back to default
  roomFloorY = -1.6;
}

function toggleRoomEl(key) {
  const btn = document.getElementById('chip-'+key);
  roomVisible[key] = !roomVisible[key];
  if(btn) btn.classList.toggle('on', roomVisible[key]);
  const el = roomElements[key];
  if(el) { el.visible = roomVisible[key]; markDirty(); }
}

// ── Room section lock — prevent switching to incompatible section ─────────
function _syncRoomSectionLock() {
  const isBed = currentModelKey === 'bed_wooden' || currentModelKey === 'bed_fabric';
  const btnLiving  = document.getElementById('rsec-living');
  const btnBedroom = document.getElementById('rsec-bedroom');
  if (btnLiving)  btnLiving.classList.toggle('room-sec-btn--locked',  isBed);
  if (btnBedroom) btnBedroom.classList.toggle('room-sec-btn--locked', !isBed);
}

// ── Product tab lock — grey out incompatible tabs while in room mode ──────
function _syncProductTabLock() {
  if (!roomMode) {
    // Unlock all when not in room mode
    ['tab-chair','tab-sofa','tab-bed_fabric'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('prod-tab--locked');
    });
    return;
  }
  const inBedroom = activeRoomSection === 'bedroom';
  // In bedroom → lock chair + sofa. In living → lock fabric bed tab.
  const livingIds = ['tab-chair','tab-sofa'];
  const bedIds    = ['tab-bed_fabric'];
  livingIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('prod-tab--locked', inBedroom);
  });
  bedIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('prod-tab--locked', !inBedroom);
  });
}

// ── Room Sections ────────────────────────────────────────────────────────
function setRoomSection(section) {
  if (activeRoomSection === section && roomMode) return;
  activeRoomSection = section;
  ['living','bedroom'].forEach(s => {
    document.getElementById('rsec-'+s).classList.toggle('active', s===section);
    document.getElementById('rsec-'+s+'-content').classList.toggle('active', s===section);
  });
  if (furnitureMoveMode) toggleMoveMode();
  const lbl = document.getElementById('piece-list-label');
  if (lbl) lbl.textContent = section === 'bedroom' ? 'Bed Parts' : 'Furniture Parts';

  if (!roomMode) return;
  _syncRoomSectionLock();
  _syncProductTabLock();

  if (section === 'bedroom') {
    ['chair','sofa'].forEach(k => { if(roomFurnitureModels[k]) scene.remove(roomFurnitureModels[k]); });
    const bedKey = (currentModelKey==='bed_wooden'||currentModelKey==='bed_fabric') ? currentModelKey : 'bed_wooden';
    if (currentModelKey !== bedKey) {
      currentModelKey = bedKey;
      buildLibrary(); updateProductInfo();
      document.getElementById('tab-chair').classList.remove('active');
      document.getElementById('tab-sofa').classList.remove('active');
      const _bt = document.getElementById('tab-bed_fabric');
      if (_bt) _bt.classList.toggle('active', bedKey === 'bed_fabric');
    }
    buildBedroomRoom(() => {
      sph = {theta: Math.PI, phi: 1.1, r: 9.0};
      tgt.set(0, 0, 0);
      camUpdate();
    });
  } else {
    ['bed_wooden','bed_fabric'].forEach(k => { if(roomFurnitureModels[k]) scene.remove(roomFurnitureModels[k]); });
    const livingKey = (currentModelKey==='chair'||currentModelKey==='sofa') ? currentModelKey : 'chair';
    if (currentModelKey !== livingKey) {
      currentModelKey = livingKey;
      buildLibrary(); updateProductInfo();
    }
    buildRoom(() => {
      sph = {theta: 0.05 + Math.PI, phi: 1.15, r: 7.0};
      tgt.set(0, -0.3, 0);
      camUpdate();
    });
  }
}

// ── Furniture Move Mode ──────────────────────────────────────────────────
function toggleMoveMode() {
  furnitureMoveMode = !furnitureMoveMode;
  const bar = document.getElementById('move-mode-bar');
  if (bar) bar.classList.toggle('active', furnitureMoveMode);
  const hud = document.getElementById('move-hud');
  if (hud) hud.classList.toggle('active', furnitureMoveMode);
  // Keep TC detached/hidden — we use the custom HUD instead
  if (transformControls) { transformControls.detach(); transformControls.visible = false; }
  markDirty();
}

function setMoveMode(mode) {
  tcMode = mode;
  ['translate','rotate'].forEach(m => {
    const el = document.getElementById('mm-'+m);
    if (el) el.classList.toggle('active', m===mode);
  });
  markDirty();
}

// ── Furniture nudge / rotate helpers (used by Move HUD buttons) ───────────
function nudgeFurniture(dx, dz) {
  const model = roomFurnitureModels[currentModelKey];
  if (!model) return;
  model.position.x += dx;
  model.position.z += dz;
  model.updateMatrixWorld(true);
  markDirty();
}
function rotateFurnitureY(deg) {
  const model = roomFurnitureModels[currentModelKey];
  if (!model) return;
  model.rotation.y += deg * Math.PI / 180;
  model.updateMatrixWorld(true);
  markDirty();
}

// ── Fabric bar scroll ─────────────────────────────────────────────────────
function scrollSwatches(amount) {
  const row = document.getElementById('fabric-swatches-row');
  if (row) row.scrollLeft += amount;
}

// ── Curtain mesh helpers ─────────────────────────────────────────────────
function _buildCurtainEntries(roomScene) {
  // Find the curtain group (New6.002) by object name
  let curtainGroup = null;
  roomScene.traverse(c => { if (c.name === 'New6.002') curtainGroup = c; });
  if (!curtainGroup) {
    console.log('[Room] curtain group New6.002 not found, skipping curtain entries');
    return;
  }

  // Collect all mesh children from curtain group
  const meshes = [];
  curtainGroup.traverse(child => {
    if (child.isMesh && child.material) meshes.push(child);
  });
  if (!meshes.length) return;

  // Keep the group as the sizeable node + base scale (mirrors bedroom's two-panel
  // setup, just a single group here) so width/length sliders work in living room too.
  _curtainNodes = [curtainGroup];
  curtainGroup.userData._curtainBaseScale = curtainGroup.scale.clone();
  // Single node → _fixCurtainNormals is a no-op (needs 2+ to compare), called
  // defensively for consistency with the bedroom path.
  _fixCurtainNormals(_curtainNodes, roomScene);
  {
    const bb = new THREE.Box3().setFromObject(curtainGroup);
    if (!bb.isEmpty()) {
      _curtainBaseBox = { center: bb.getCenter(new THREE.Vector3()), size: bb.getSize(new THREE.Vector3()) };
      _curtainFace = _avgWorldNormal(curtainGroup).clone();
    }
  }

  // All curtain panels share a SINGLE greyMat so fabric applies uniformly to all
  const firstMat = Array.isArray(meshes[0].material) ? meshes[0].material[0] : meshes[0].material;
  const sharedGreyMat = new THREE.MeshStandardMaterial({
    color: 0xd4c8b8, roughness: 0.8, metalness: 0, side: THREE.DoubleSide,
  });
  if (firstMat) {
    sharedGreyMat.roughness = firstMat.roughness ?? 0.8;
  }
  sharedGreyMat.needsUpdate = true;

  let idx = 0;
  meshes.forEach(child => {
    const origMat = Array.isArray(child.material) ? child.material[0] : child.material;
    // Apply sharedGreyMat to the mesh NOW so highlights and drag feedback are visible
    child.material = sharedGreyMat;
    const entry = {
      id: `curtain-${idx++}`,
      name: idx === 1 ? 'Curtains' : null,
      mesh: child,
      matIndex: 0,
      origMat: origMat || sharedGreyMat,
      greyMat: sharedGreyMat,   // shared — mutating this updates all panels
      origGreyscaleMap: null,
      checked: false,
      pieceSelected: false,
      uvScaleFactor: 1,
      _isCurtain: true,
    };
    curtainMeshEntries.push(entry);
  });

  if (curtainMeshEntries.length > 0) {
    curtainMeshEntries[0].name = 'Curtains';
    console.log(`[Room] built ${curtainMeshEntries.length} curtain mesh entries`);
  }
}

function _removeCurtainEntries() {
  // Restore original materials on curtain meshes
  curtainMeshEntries.forEach(e => {
    const arr = Array.isArray(e.mesh.material) ? [...e.mesh.material] : [e.mesh.material];
    arr[e.matIndex] = e.origMat;
    e.mesh.material = arr;
  });
  curtainMeshEntries = [];
  _curtainNodes = [];
  _disposeBlinds(); _curtainBaseBox = null; _curtainFace = null;
  // Remove curtain entries from meshEntries
  meshEntries = meshEntries.filter(e => !e._isCurtain);
  _showCurtainConfigPanel(false);
}

// ── Explode ───────────────────────────────────────────────────────────────
function updateExplode(val) {
  explodeVal = val;
  const el = document.getElementById('v-explode'); if(el) el.textContent=val.toFixed(1);
  const slider = document.getElementById('s-explode'); if(slider) slider.value=val;
  if(!currentModel || !meshEntries.length) return;

  // compute model center
  const modelBox = new THREE.Box3().setFromObject(currentModel);
  const center = modelBox.getCenter(new THREE.Vector3());

  meshEntries.forEach((entry,i)=>{
    // Direction = mesh center relative to model center
    const mBox = new THREE.Box3().setFromObject(entry.mesh);
    const mc = mBox.getCenter(new THREE.Vector3());
    const dir = mc.clone().sub(center).normalize();
    if(dir.length()===0) dir.set(0,1,0);
    // Apply in local space: move mesh by dir * explodeVal * scale
    const offset = dir.multiplyScalar(val*0.8);
    // We store original local position
    if(!entry._origLocalPos) entry._origLocalPos = entry.mesh.position.clone();
    entry.mesh.position.copy(entry._origLocalPos).add(offset);
  });
  markDirty();
}

function animateExplode() {
  if(explodeAnim) return;
  const start = explodeVal;
  const target = start < 0.5 ? 1.0 : 0.0;
  const duration = 1200;
  const startTime = performance.now();
  explodeAnim = requestAnimationFrame(function tick(now) {
    const t = Math.min((now-startTime)/duration, 1);
    const ease = t<0.5 ? 2*t*t : -1+(4-2*t)*t;
    const val = start + (target-start)*ease;
    updateExplode(val);
    if(t<1) { explodeAnim=requestAnimationFrame(tick); }
    else { explodeAnim=null; }
  });
}

