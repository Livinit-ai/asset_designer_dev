// Mesh/piece lists, GLB processing, load/switch/reset model
// Classic script (not a module): top-level let/const/function share the
// global scope across all src/*.js files, preserving original semantics.
// ── Mesh list ─────────────────────────────────────────────────────────────
const dotColors = ['#c84040','#c87840','#c8c840','#40c870','#4070c8','#8040c8','#c84080','#408080'];
function buildMeshList() {
  const list = document.getElementById('mesh-list');
  list.innerHTML = '';
  if(!meshEntries.length) { list.innerHTML='<div style="font-size:11px;color:var(--text-muted)">No parts found</div>'; return; }
  meshEntries.forEach((entry,i) => {
    const dot = dotColors[i%dotColors.length];
    const row = document.createElement('label');
    row.className = 'mesh-item'+(entry.checked?' sel':'');
    const cb = document.createElement('input');
    cb.type='checkbox'; cb.checked=entry.checked;
    cb.addEventListener('change',()=>{ toggleCheck(entry.id, cb.checked); _refreshZoneLabelStates(); });
    const dotEl = document.createElement('div');
    dotEl.className='mesh-dot'; dotEl.style.backgroundColor=dot;
    const txt = document.createElement('span');
    txt.textContent = entry.name;
    row.addEventListener('mouseenter',()=>{ entry.greyMat.emissive=new THREE.Color(0x444400);entry.greyMat.emissiveIntensity=0.25;entry.greyMat.needsUpdate=true;markDirty(); });
    row.addEventListener('mouseleave',()=>{ entry.greyMat.emissive=new THREE.Color(0);entry.greyMat.emissiveIntensity=0;entry.greyMat.needsUpdate=true;markDirty(); });
    row.appendChild(cb); row.appendChild(dotEl); row.appendChild(txt);
    list.appendChild(row);
  });
  _refreshZoneLabelStates();
}

function buildPieceList() {
  const list = document.getElementById('piece-list');
  list.innerHTML = '';
  if(!meshEntries.length) { list.innerHTML='<div style="font-size:11px;color:var(--text-muted)">No parts loaded</div>'; return; }

  // Separate curtain entry from furniture entries
  const curtainEntry = meshEntries.find(e => e._isCurtain);
  const furnitureEntries = meshEntries.filter(e => !e._isCurtain);

  furnitureEntries.forEach((entry,i) => {
    const dot = dotColors[i%dotColors.length];
    const row = document.createElement('div');
    row.className='piece-item'+(entry.pieceSelected?' sel-piece':'');
    const dotEl=document.createElement('div');
    dotEl.className='piece-dot'; dotEl.style.backgroundColor=dot;
    const txt=document.createElement('span'); txt.className='piece-item-name'; txt.textContent=entry.name;
    const arrow=document.createElement('span'); arrow.className='piece-item-arrow'; arrow.textContent='›';
    row.appendChild(dotEl); row.appendChild(txt); row.appendChild(arrow);
    row.addEventListener('click',()=>{
      meshEntries.forEach(e=>{ e.pieceSelected=false; });
      entry.pieceSelected = true;
      buildPieceList();
      buildLibrary();
      entry.greyMat.emissive=new THREE.Color(0x2d4a3e);entry.greyMat.emissiveIntensity=0.4;entry.greyMat.needsUpdate=true;markDirty();
      setTimeout(()=>{ entry.greyMat.emissive=new THREE.Color(0);entry.greyMat.emissiveIntensity=0;entry.greyMat.needsUpdate=true;markDirty(); },700);
    });
    row.addEventListener('mouseenter',()=>{ entry.greyMat.emissive=new THREE.Color(0x444400);entry.greyMat.emissiveIntensity=0.2;entry.greyMat.needsUpdate=true;markDirty(); });
    row.addEventListener('mouseleave',()=>{ if(!entry.pieceSelected){entry.greyMat.emissive=new THREE.Color(0);entry.greyMat.emissiveIntensity=0;entry.greyMat.needsUpdate=true;markDirty();} });
    list.appendChild(row);
  });

  // Curtain section — prominent dedicated row
  if (curtainEntry) {
    const sep = document.createElement('div');
    sep.style.cssText='margin:8px 0 4px;font-size:9px;font-weight:700;letter-spacing:.1em;color:var(--text-muted);text-transform:uppercase;padding:0 2px';
    sep.textContent='Curtains';
    list.appendChild(sep);

    const row = document.createElement('div');
    row.className='piece-item curtain-piece'+(curtainEntry.pieceSelected?' sel-piece':'');
    row.style.cssText='border:1.5px dashed var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .15s';
    const ico = document.createElement('span'); ico.style.cssText='display:flex;color:var(--text-mid)';
    ico.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 8h16M4 13h16"/></svg>';
    const lbl = document.createElement('span'); lbl.style.cssText='font-size:11px;font-weight:600;color:var(--text);flex:1'; lbl.textContent='Change Curtain Fabric';
    const hint = document.createElement('span'); hint.style.cssText='font-size:9px;color:var(--text-muted)'; hint.textContent='select → pick swatch';
    row.appendChild(ico); row.appendChild(lbl); row.appendChild(hint);
    row.addEventListener('click', () => {
      meshEntries.forEach(e => { e.pieceSelected = false; });
      curtainEntry.pieceSelected = true;
      buildPieceList();
      buildLibrary();
      showToast('Curtains selected — now pick a fabric below');
    });
    list.appendChild(row);
  }
}

function toggleCheck(id, checked) {
  meshEntries = meshEntries.map(entry => {
    if(entry.id!==id) return entry;
    const ne={...entry, checked};
    const matArr=Array.isArray(ne.mesh.material)?[...ne.mesh.material]:[ne.mesh.material];
    if(ne.matIndex>=0&&ne.matIndex<matArr.length){ matArr[ne.matIndex]=checked?ne.greyMat:ne.origMat; ne.mesh.material=matArr; }
    if(checked){ne.greyMat.emissive=new THREE.Color(0x666600);ne.greyMat.emissiveIntensity=0.3;ne.greyMat.needsUpdate=true;setTimeout(()=>{ne.greyMat.emissive=new THREE.Color(0);ne.greyMat.emissiveIntensity=0;ne.greyMat.needsUpdate=true;markDirty();},600);}
    return ne;
  });
  buildMeshList(); markDirty();
}
function selectAll() {
  meshEntries.forEach(entry=>{ entry.checked=true; if(Array.isArray(entry.mesh.material)){const a=[...entry.mesh.material];if(entry.matIndex>=0&&entry.matIndex<a.length){a[entry.matIndex]=entry.greyMat;entry.mesh.material=a;}}else{entry.mesh.material=entry.greyMat;} });
  buildMeshList(); markDirty(); _refreshZoneLabelStates();
}
function deselectAll() {
  meshEntries.forEach(entry=>{ entry.checked=false; if(Array.isArray(entry.mesh.material)){const a=[...entry.mesh.material];if(entry.matIndex>=0&&entry.matIndex<a.length){a[entry.matIndex]=entry.origMat;entry.mesh.material=a;}}else{entry.mesh.material=entry.origMat;} });
  buildMeshList(); markDirty(); _refreshZoneLabelStates();
}

// ── GLB Processing ────────────────────────────────────────────────────────
// Shared mesh classification for processGLTF + _rebuildMeshEntries: KNOWN-part
// name walk up the node tree, then the bed pillow/mattress/frame heuristic.
// Returns '' when unclassified (non-bed unnamed meshes) — each caller applies
// its own mode-specific fallback (positional heuristic vs raw mesh name).
function classifyMesh(mesh, modelKey, worldCenter, worldSize) {
  const KNOWN={
    'wooden frame':'Frame','fabric frame':'Frame','bed frame':'Frame','frame':'Frame',
    'headboard':'Frame','footboard':'Frame','bed base':'Frame','slat':'Frame','legs':'Frame',
    'mattress':'Mattress','bed mattress':'Mattress','victorian_bed_mattres':'Mattress','victorian_bed_mattress':'Mattress',
    'pillow':'Pillow','pillow_01':'Pillow','pillow_02':'Pillow','pillows':'Pillows','cushion':'Pillow',
    'seat cushion':'Seat Cushion','back cushion':'Back Cushion',
  };
  let _n=mesh;
  while(_n){const k=(_n.name||'').trim().toLowerCase();if(KNOWN[k])return KNOWN[k];_n=_n.parent;}

  if(modelKey!=='bed_wooden'&&modelKey!=='bed_fabric') return '';
  const meshBox=new THREE.Box3().setFromObject(mesh);
  const mc=meshBox.getCenter(new THREE.Vector3());
  const ms=meshBox.getSize(new THREE.Vector3());
  const relY=(mc.y-worldCenter.y)/(worldSize.y*0.5||1);
  const meshVol=ms.x*ms.y*ms.z,worldVol=worldSize.x*worldSize.y*worldSize.z;
  const volRatio=worldVol>0?meshVol/worldVol:0;
  const dims=[ms.x,ms.y,ms.z].sort((a,b)=>a-b);
  const flatness=dims[2]>0?dims[0]/dims[2]:1;
  if(volRatio<0.03&&relY>0.0) return 'Pillow';
  if(flatness<0.22&&ms.x*ms.z>(worldSize.x*worldSize.z*0.2)) return 'Mattress';
  return 'Frame';
}

function processGLTF(gltf) {
  try {
    // Guard: room mode caller manages scene membership
    if (!appStore.getState().roomMode && currentModel) scene.remove(currentModel);
    currentModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(currentModel);
    const sz = box.getSize(new THREE.Vector3());
    currentModel.scale.setScalar(1.6 / Math.max(sz.x, sz.y, sz.z));
    const box2 = new THREE.Box3().setFromObject(currentModel);
    const ctr = box2.getCenter(new THREE.Vector3());
    currentModel.position.sub(ctr);
    currentModel.updateMatrixWorld(true);

    // Always add to scene (room mode will reposition via _placeFurnitureInRoom)
    scene.add(currentModel);
    const worldBox = new THREE.Box3().setFromObject(currentModel);
    const worldCenter = worldBox.getCenter(new THREE.Vector3());
    const worldSize   = worldBox.getSize(new THREE.Vector3());

    const newEntries = [];
    let meshCounter = 0;

    currentModel.traverse(child => {
      if(!child.isMesh) return;
      const mesh = child;
      let materials;
      if(!Array.isArray(mesh.material)){
        materials = mesh.material ? [mesh.material] : [new THREE.MeshStandardMaterial({color:0xcccccc})];
        if(mesh.geometry.groups.length===0){const count=mesh.geometry.index?mesh.geometry.index.count:mesh.geometry.attributes.position.count;mesh.geometry.addGroup(0,count,0);}
      } else { materials = mesh.material; }
      mesh.material = materials;

      materials.forEach((origMat, index) => {
        if(!origMat) origMat = new THREE.MeshStandardMaterial({color:0xcccccc});
        const greyMat = origMat.clone();
        greyMat.onBeforeCompile=()=>{}; greyMat.customProgramCacheKey=()=>greyMat.uuid;
        greyMat.color.set(0xd4d0cc);
        greyMat.map=null;greyMat.normalMap=null;greyMat.roughnessMap=null;greyMat.metalnessMap=null;
        if(greyMat.emissiveMap!==undefined)greyMat.emissiveMap=null;
        if(greyMat.aoMap!==undefined)greyMat.aoMap=null;
        if(greyMat.alphaMap!==undefined)greyMat.alphaMap=null;
        if(greyMat.bumpMap!==undefined)greyMat.bumpMap=null;
        greyMat.transparent=false;greyMat.opacity=1;greyMat.alphaTest=0;
        greyMat.depthWrite=true;greyMat.visible=true;greyMat.side=THREE.DoubleSide;
        greyMat.roughness=0.75;greyMat.metalness=0;
        if(greyMat.emissive)greyMat.emissive.set(0);
        if(greyMat.emissiveIntensity!==undefined)greyMat.emissiveIntensity=0;
        if(greyMat.sheen!==undefined)greyMat.sheen=0;
        if(greyMat.clearcoat!==undefined)greyMat.clearcoat=0;
        if(greyMat.transmission!==undefined)greyMat.transmission=0;
        let origGreyscaleMap=null;
        if(origMat.map){origGreyscaleMap=makeGreyscaleTex(origMat.map);if(origGreyscaleMap)greyMat.map=origGreyscaleMap;}
        greyMat.needsUpdate=true;
        origMat._livinitGrey = greyMat; // so _rebuildMeshEntries reuses this mat (with any applied fabric)
        greyMat._livinitGrey = greyMat; // self-ref: mesh.material == greyMat after processGLTF, so _rebuildMeshEntries finds it here

        let cleanName=classifyMesh(mesh, appStore.getState().currentModelKey, worldCenter, worldSize);

        mesh.geometry.computeBoundingBox();
        const meshBox=new THREE.Box3().setFromObject(mesh);
        const mc=meshBox.getCenter(new THREE.Vector3());
        const ms=meshBox.getSize(new THREE.Vector3());
        const wc=worldCenter,ws=worldSize;
        const relY=(mc.y-wc.y)/(ws.y*0.5),relZ=(mc.z-wc.z)/(ws.z*0.5),relX=(mc.x-wc.x)/(ws.x*0.5);
        const absX=Math.abs(relX);
        const dims=[ms.x,ms.y,ms.z].sort((a,b)=>a-b);
        const flatness=dims[2]>0?dims[0]/dims[2]:1;
        const meshVol=ms.x*ms.y*ms.z,worldVol=ws.x*ws.y*ws.z,volRatio=worldVol>0?meshVol/worldVol:0;

        if(!cleanName){
          // Positional heuristic for unnamed chair/sofa parts (bed handled in classifyMesh)
          if(relY<-0.55) cleanName='Legs / Base';
          else if(relZ<-0.35&&relY>-0.3) cleanName='Backrest';
          else if(absX>0.55&&relY>-0.4) cleanName=relX>0?'Right Armrest':'Left Armrest';
          else if(relZ>0.0&&relY>-0.3&&relY<0.4&&absX<0.5) cleanName='Seat Cushion';
          else if(flatness<0.06||volRatio<0.0008) cleanName='Stitching';
          else if(relY<-0.35&&volRatio<0.02) cleanName='Legs / Base';
          else if(volRatio>0.12) cleanName='Main Body';
          else if(relY>-0.1&&relY<0.55&&absX<0.55) cleanName='Body Panel';
          else cleanName='Frame';
        }

        // Copy UV1 → UV2 for aoMap support (Three.js requires uv2 channel for aoMap)
        if(mesh.geometry.attributes.uv && !mesh.geometry.attributes.uv2) {
          mesh.geometry.setAttribute('uv2', mesh.geometry.attributes.uv);
        }

        const maxDim=Math.max(ms.x,ms.y,ms.z);
        const uvScaleFactor=maxDim>0?maxDim:1;
        newEntries.push({id:`m-${meshCounter}-${index}`,name:cleanName,mesh,matIndex:index,origMat,greyMat,origGreyscaleMap,checked:false,pieceSelected:false,uvScaleFactor});
        meshCounter++;
      });
    });

    const rawCounts={};
    newEntries.forEach(e=>{rawCounts[e.name]=(rawCounts[e.name]||0)+1;});
    const rawIdx={};
    newEntries.forEach(e=>{if(rawCounts[e.name]>1){rawIdx[e.name]=(rawIdx[e.name]||0)+1;e.name=e.name+' '+rawIdx[e.name];}});
    const RENAME={
      chair:{'Backrest':'Backrest','Main Body 1':'Seat Cushion','Main Body 2':'Armrest & Legs'},
      sofa:{'Main Body 1':'Sofa Frame','Main Body 2':'Decorative Cushion','Seat Cushion':'Sofa Seat'},
      bed_wooden:{'Frame 1':'Frame','Frame 2':'Frame','Mattress 1':'Mattress','Pillow 1':'Pillow','Pillow 2':'Pillow'},
      bed_fabric:{'Frame 1':'Frame','Frame 2':'Frame','Mattress 1':'Mattress','Pillow 1':'Pillow','Pillow 2':'Pillow'},
    };
    const remap=RENAME[appStore.getState().currentModelKey]||{};
    newEntries.forEach(e=>{if(remap[e.name])e.name=remap[e.name];});

    meshEntries = newEntries;
    buildMeshList();
    buildPieceList();
    rebuildZoneOverlay();
    updateProductInfo();

    if(!appStore.getState().roomMode){
      sph={theta:0.4,phi:1.15,r:2.2}; tgt.set(0,0,0); camUpdate();
    }
    // Room mode: camera stays, _placeFurnitureInRoom sets positions
    // Restore previously saved material snapshot for this model key
    const snap = modelMaterialSnapshots[appStore.getState().currentModelKey];
    if(snap && snap.length > 0) {
      snap.forEach((s, si) => {
        if(si < meshEntries.length) {
          const entry = meshEntries[si];
          // Copy all material properties from snapshot
          const src = s.matClone;
          entry.greyMat.color.copy(src.color);
          entry.greyMat.roughness = src.roughness;
          entry.greyMat.metalness = src.metalness;
          if(src.sheen !== undefined) entry.greyMat.sheen = src.sheen;
          if(src.map) { entry.greyMat.map = src.map; }
          if(src.normalMap) { entry.greyMat.normalMap = src.normalMap; entry.greyMat.normalScale.copy(src.normalScale); }
          if(src.roughnessMap) { entry.greyMat.roughnessMap = src.roughnessMap; }
          entry.greyMat.needsUpdate = true;
          // Apply to mesh
          const matArr = Array.isArray(entry.mesh.material) ? [...entry.mesh.material] : [entry.mesh.material];
          if(entry.matIndex >= 0 && entry.matIndex < matArr.length) {
            matArr[entry.matIndex] = entry.greyMat;
            entry.mesh.material = matArr;
          }
        }
      });
      markDirty();
    }

    markDirty();
    document.getElementById('loading').classList.remove('on');
    document.getElementById('v-hint').style.display='flex';
    if (typeof window._tourOnReady === 'function') { window._tourOnReady(); window._tourOnReady = null; }
    setSliderVal('brightness',1);setSliderVal('roughness',0.72);setSliderVal('metalness',0);
    setSliderVal('sheen',0,2);setSliderVal('scale',10,1);setSliderVal('norm',1,1);
  } catch(e) {
    console.error('processGLTF error:', e);
    document.getElementById('loading').classList.remove('on');
    showToast('Model load failed: '+e.message);
  }
}

function loadModel(url) {
  document.getElementById('loading').classList.add('on');
  document.getElementById('load-txt').textContent = 'Loading…';
  document.getElementById('v-hint').style.display='none';
  meshEntries=[];
  setActiveFabric(null); renderActiveSwatch();
  // Reset BOTH the product and room applied-preview variants — materials.js
  // writes both via ['','room'], so reset must clear both or the room panel
  // keeps a stale swatch after reset.
  ['','room'].forEach(sfx=>{
    const s=sfx?'-'+sfx:'';
    const n=document.getElementById('app-name'+s);if(n)n.textContent='— none —';
    const v=document.getElementById('app-vend'+s);if(v)v.textContent='';
    const sw=document.getElementById('app-sw'+s);if(sw){sw.innerHTML='';sw.style.background='var(--border)';}
    const rb=document.getElementById('app-replace-btn'+s);if(rb)rb.style.display='none';
  });

  if (_gltfSceneCache[url]) {
    // Cache hit — clone so processGLTF gets a fresh unmodified hierarchy
    processGLTF({ scene: _gltfSceneCache[url].clone(true) });
    roomFurnitureModels[appStore.getState().currentModelKey] = currentModel;
    return;
  }

  gltfLoader.load(url, gltf => {
    // Store a pre-process clone so subsequent loads skip the download + re-parse
    _gltfSceneCache[url] = gltf.scene.clone(true);
    processGLTF(gltf);
    roomFurnitureModels[appStore.getState().currentModelKey] = currentModel;
  }, undefined, err=>{
    console.error(err);
    document.getElementById('loading').classList.remove('on');
    showToast('Failed to load model');
  });
}

function switchModel(key) {
  // ── 1. Save snapshot of current model before switching ─────────────────
  if (meshEntries.length > 0) {
    saveMaterialSnapshot();
  }

  const prevKey = appStore.getState().currentModelKey;
  setModelKey(key);
  document.getElementById('tab-chair').classList.toggle('active', key === 'chair');
  document.getElementById('tab-sofa').classList.toggle('active',  key === 'sofa');
  const _bedFabTab = document.getElementById('tab-bed_fabric');
  if (_bedFabTab) _bedFabTab.classList.toggle('active', key === 'bed_fabric');
  const _titleMap = {chair:'Chair Fabrics',sofa:'Sofa Fabrics',bed_wooden:'Bed — Wooden Frame',bed_fabric:'Bed — Fabric Frame'};
  document.getElementById('lib-title').textContent = _titleMap[key] || 'Fabrics';
  // Sync bedroom bed-style chips if in bedroom section
  ['bed_wooden','bed_fabric'].forEach(bk => {
    const c = document.getElementById('chip-bed-'+bk.replace('bed_',''));
    if (c) c.classList.toggle('on', bk === key);
  });
  buildLibrary();
  updateProductInfo();
  if (appStore.getState().roomMode) _syncRoomSectionLock();

  if (appStore.getState().roomMode) {
    // ── Room mode: both models stay in scene, just swap which is "active" ──
    const cached = roomFurnitureModels[key];
    if (cached) {
      if (currentModel) roomFurnitureModels[prevKey] = currentModel;
      currentModel = cached;
      // Ensure the newly-active model is in scene — preload and companion load can
      // produce different object instances, causing the cached ref to be orphaned.
      if (!scene.getObjectById(currentModel.id)) {
        scene.add(currentModel);
        const _ks = (appStore.getState().activeRoomSection === 'bedroom' && BEDROOM_SLOTS[key]) ? BEDROOM_SLOTS : FURNITURE_SLOTS;
        const s = _ks[key];
        if (s) _seatOnFloor(currentModel, s.x, s.z, s.rotY, s.scale || 1.0);
      }
      // Companion behaviour: living room keeps both pieces visible; bedroom shows only the active bed
      if (prevKey && roomFurnitureModels[prevKey]) {
        const prevModel = roomFurnitureModels[prevKey];
        if (appStore.getState().activeRoomSection === 'bedroom') {
          scene.remove(prevModel);
        } else if (!scene.getObjectById(prevModel.id)) {
          scene.add(prevModel);
          const ps = FURNITURE_SLOTS[prevKey];
          if (ps) _seatOnFloor(prevModel, ps.x, ps.z, ps.rotY, ps.scale || 1.0);
        }
      }
      meshEntries = [];
      _rebuildMeshEntries(currentModel, key);
      buildMeshList();
      buildPieceList();
      _applySnapshotToModel(currentModel, key);
      markDirty();
    } else {
      // Not cached yet — load fresh (avoid calling processGLTF in room mode;
      // it would re-centre the model and clobber meshEntries/curtain entries)
      const url = getGLBUrl(key);
      document.getElementById('loading').classList.add('on');
      document.getElementById('load-txt').textContent = 'Loading…';
      gltfLoader.load(url, gltf => {
        // Remove any stale scene instance for this key before adding the new one
        if (roomFurnitureModels[key]) {
          scene.remove(roomFurnitureModels[key]);
          roomFurnitureModels[key] = null;
        }
        if (currentModel) {
          roomFurnitureModels[prevKey] = currentModel;
          // In bedroom mode only one bed is shown — remove the old one before adding new
          if (appStore.getState().activeRoomSection === 'bedroom') scene.remove(currentModel);
        }
        currentModel = gltf.scene;
        // Normalise scale the same way processGLTF does
        const b = new THREE.Box3().setFromObject(currentModel);
        const sz = b.getSize(new THREE.Vector3());
        currentModel.scale.setScalar(1.6 / Math.max(sz.x, sz.y, sz.z));
        currentModel.updateMatrixWorld(true);
        if (!scene.getObjectById(currentModel.id)) scene.add(currentModel);
        roomFurnitureModels[key] = currentModel;
        // Place in room BEFORE rebuilding entries so bbox is measured in final position
        _placeFurnitureInRoom();
        // Build entries the same way the cached branch does (applies greyMat, re-injects curtains)
        meshEntries = [];
        _rebuildMeshEntries(currentModel, key);
        buildMeshList();
        buildPieceList();
        _applySnapshotToModel(currentModel, key);
        markDirty();
        document.getElementById('loading').classList.remove('on');
      }, undefined, () => {
        document.getElementById('loading').classList.remove('on');
        showToast('Failed to load model');
      });
    }
  } else {
    // ── Product mode: load fresh (applies snapshot via processGLTF) ───────
    loadModel(getGLBUrl(key));
  }
}

// Rebuild meshEntries for a model already in scene (room mode tab switch)
function _rebuildMeshEntries(model, modelKey) {
  const newEntries = [];
  let meshCounter = 0;
  const worldBox    = new THREE.Box3().setFromObject(model);
  const worldCenter = worldBox.getCenter(new THREE.Vector3());
  const worldSize   = worldBox.getSize(new THREE.Vector3());

  model.traverse(child => {
    if (!child.isMesh) return;
    const mesh = child;
    const isMaterialArray = Array.isArray(mesh.material);
    let materials = isMaterialArray ? mesh.material : (mesh.material ? [mesh.material] : [new THREE.MeshStandardMaterial({color:0xcccccc})]);

    materials.forEach((origMat, index) => {
      if (!origMat) origMat = new THREE.MeshStandardMaterial({color:0xcccccc});
      // Use existing greyMat if already processed, else clone
      let greyMat = origMat._livinitGrey || (() => {
        const g = origMat.clone();
        g.color.set(0xd4d0cc); g.map=null; g.normalMap=null; g.roughnessMap=null;
        g.roughness=0.75; g.metalness=0; g.needsUpdate=true;
        origMat._livinitGrey = g;
        return g;
      })();

      const meshBox = new THREE.Box3().setFromObject(mesh);
      const ms = meshBox.getSize(new THREE.Vector3());
      let maxDim = Math.max(ms.x, ms.y, ms.z);
      // Normalize uvScaleFactor to processGLTF scale so fabric tiling matches product view
      // regardless of slotScale. _seatOnFloor stores _baseScale when slotScale != 1.0.
      if (model._baseScale && model.scale.x > 0) maxDim *= (model._baseScale.x / model.scale.x);

      // Name from node name (shared walk + bed heuristic), else raw mesh name —
      // room-mode rebuilds deliberately skip the positional chair/sofa heuristic.
      let cleanName = classifyMesh(mesh, modelKey, worldCenter, worldSize);
      if(!cleanName) cleanName = mesh.name || `Part ${meshCounter+1}`;

      // Apply greyMat — preserve single vs array form to avoid geometry-group rendering issues
      if (isMaterialArray) {
        const matArr = [...mesh.material];
        matArr[index] = greyMat;
        mesh.material = matArr;
      } else {
        mesh.material = greyMat;
      }

      newEntries.push({
        id: `m-${meshCounter}-${index}`, name: cleanName,
        mesh, matIndex: index, origMat, greyMat,
        checked: false, pieceSelected: false,
        uvScaleFactor: maxDim > 0 ? maxDim : 1, // maxDim already normalized above by _baseScale/scale ratio
      });
      meshCounter++;
    });
  });

  // Deduplicate names
  const rawCounts = {};
  newEntries.forEach(e => { rawCounts[e.name] = (rawCounts[e.name]||0)+1; });
  const rawIdx = {};
  newEntries.forEach(e => { if(rawCounts[e.name]>1){ rawIdx[e.name]=(rawIdx[e.name]||0)+1; e.name=e.name+' '+rawIdx[e.name]; } });

  meshEntries = newEntries;

  // Re-inject curtain entry so piece list always shows Curtains in room mode
  if (curtainMeshEntries.length > 0 && !meshEntries.find(e => e._isCurtain)) {
    meshEntries.push(curtainMeshEntries[0]);
  }
}

function resetAll() {
  deselectAll();
  // Clear ALL snapshots on reset — every model key, not just chair/sofa
  modelMaterialSnapshots = { chair: null, sofa: null, bed_wooden: null, bed_fabric: null };
  setActiveFabric(null); renderActiveSwatch();
  document.getElementById('app-name').textContent='— none —';
  document.getElementById('app-vend').textContent='';
  document.getElementById('app-sw').innerHTML='';
  document.getElementById('app-sw').style.background='var(--border)';
  const _rbr=document.getElementById('app-replace-btn');if(_rbr)_rbr.style.display='none';
  // If in room mode, reload companion model fresh (living room only)
  if(appStore.getState().roomMode && roomFurnitureModels && appStore.getState().activeRoomSection === 'living') {
    const otherKey = appStore.getState().currentModelKey === 'chair' ? 'sofa' : 'chair';
    if(roomFurnitureModels[otherKey]) {
      scene.remove(roomFurnitureModels[otherKey]);
      roomFurnitureModels[otherKey] = null;
    }
    const otherUrl = getGLBUrl(otherKey);
    gltfLoader.load(otherUrl, gltf => {
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const sz = box.getSize(new THREE.Vector3());
      m.scale.setScalar(1.6/Math.max(sz.x,sz.y,sz.z));
      scene.add(m);
      roomFurnitureModels[otherKey] = m;
      _placeFurnitureInRoom();
    });
  }
  showToast('Reset');
}

