// Product info, zone overlay, Three.js init, script loader, GLB upload
// Classic script (not a module): top-level let/const/function share the
// global scope across all src/*.js files, preserving original semantics.
// ── Product info updater ────────────────────────────────────────────────────
function updateProductInfo() {
  const MODELS = {
    chair:      { name: 'Sierra Lounge Chair', dims: '32W × 34D × 35H in.' },
    sofa:       { name: 'Haven Sofa 84"',      dims: '84W × 38D × 32H in.' },
    bed_fabric: { name: 'Fabric Bed',          dims: 'Queen · Fabric Frame' },
    bed_wooden: { name: 'Wooden Frame Bed',    dims: 'Queen · Wood Frame'   },
  };
  const info = MODELS[appStore.getState().currentModelKey] || MODELS.sofa;
  const nameEl = document.getElementById('cp-product-name');
  const dimsEl = document.getElementById('cp-product-dims');
  if(nameEl) nameEl.textContent = info.name;
  if(dimsEl) dimsEl.textContent = info.dims;
  const ctxEl = document.getElementById('context-model');
  if(ctxEl) ctxEl.textContent = info.name;
}

function _updateZoneCountBadge() {
  const el = document.getElementById('zone-count-badge');
  if(el) el.textContent = meshEntries.length + ' configurable zone' + (meshEntries.length !== 1 ? 's' : '');
}

// ── Zone overlay (floating labels on viewport) ──────────────────────────────
let _zoneLabelsReady = false;

function rebuildZoneOverlay() {
  const overlay = document.getElementById('zone-overlay');
  if(!overlay) return;
  overlay.innerHTML = '';
  _zoneLabelsReady = false;
  if(!meshEntries.length) { _updateZoneCountBadge(); return; }

  meshEntries.forEach(entry => {
    const label = document.createElement('div');
    label.className = 'zone-label';
    label.dataset.eid = entry.id;
    label.textContent = entry.name;
    label.title = 'Click to select ' + entry.name;
    label.onclick = () => _zoneClick(entry.id);
    overlay.appendChild(label);
  });

  _zoneLabelsReady = true;
  _updateZoneCountBadge();
  markDirty();
}

function _zoneClick(entryId) {
  const target = meshEntries.find(e => e.id === entryId);
  if(!target) return;
  const wasSoleSelected = target.checked && meshEntries.filter(e => e.checked).length === 1;
  // Deselect all — leave mesh.material untouched so applied fabrics stay visible
  meshEntries.forEach(entry => { entry.checked = false; });
  if(!wasSoleSelected) {
    // Select just this one
    target.checked = true;
    const matArr = Array.isArray(target.mesh.material)?[...target.mesh.material]:[target.mesh.material];
    if(target.matIndex>=0&&target.matIndex<matArr.length){matArr[target.matIndex]=target.greyMat;target.mesh.material=matArr;}
    // Flash
    target.greyMat.emissive=new THREE.Color(0x666600);target.greyMat.emissiveIntensity=0.3;target.greyMat.needsUpdate=true;
    setTimeout(()=>{target.greyMat.emissive=new THREE.Color(0);target.greyMat.emissiveIntensity=0;target.greyMat.needsUpdate=true;markDirty();},600);
  }
  buildMeshList();
  markDirty();
  _refreshZoneLabelStates();
}

function _refreshZoneLabelStates() {
  document.querySelectorAll('#zone-overlay .zone-label').forEach(l => {
    const entry = meshEntries.find(e => e.id === l.dataset.eid);
    l.classList.toggle('active', !!(entry && entry.checked));
  });
}

function updateZoneLabelPositions() {
  if(!_zoneLabelsReady || !camera || !renderer) return;
  const overlay = document.getElementById('zone-overlay');
  if(!overlay || overlay.style.display === 'none') return;
  const canvas = document.getElementById('viewer');
  if(!canvas) return;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if(W === 0 || H === 0) return;

  meshEntries.forEach((entry) => {
    const label = overlay.querySelector(`.zone-label[data-eid="${entry.id}"]`);
    if(!label) return;
    try {
      const box = new THREE.Box3().setFromObject(entry.mesh);
      const center = box.getCenter(new THREE.Vector3());
      const projected = center.clone().project(camera);
      if(projected.z >= 1) { label.style.opacity = '0'; return; }

      const sx = (projected.x * 0.5 + 0.5) * W;
      const sy = (-projected.y * 0.5 + 0.5) * H;

      // Push label outward from viewport center
      const cx = W * 0.5, cy = H * 0.45;
      let dx = sx - cx, dy = sy - cy;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      dx /= len; dy /= len;
      let lx = sx + dx * 85;
      let ly = sy + dy * 70;

      // Clamp within viewport with padding
      const lw = 120, lh = 28;
      lx = Math.max(lw/2 + 8, Math.min(W - lw/2 - 8, lx));
      ly = Math.max(lh/2 + 8, Math.min(H - lh/2 - 44, ly));

      label.style.left = (lx - lw/2) + 'px';
      label.style.top  = (ly - lh/2) + 'px';
      label.style.opacity = '1';
    } catch(e) {
      label.style.opacity = '0';
    }
  });
}


// ── Three.js Init ─────────────────────────────────────────────────────────
function camUpdate() {
  camera.position.set(
    tgt.x + sph.r*Math.sin(sph.phi)*Math.sin(sph.theta),
    tgt.y + sph.r*Math.cos(sph.phi),
    tgt.z + sph.r*Math.sin(sph.phi)*Math.cos(sph.theta)
  );
  camera.lookAt(tgt);
  markDirty();
}

function initThree() {
  const canvas = document.getElementById('viewer');
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.physicallyCorrectLights=true;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.0;
  renderer.shadowMap.enabled=true;

  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(42,1,0.01,1000);

  pmremGen=new THREE.PMREMGenerator(renderer);
  pmremGen.compileEquirectangularShader();
  scene.environment=pmremGen.fromScene(new THREE.RoomEnvironment(),1.0).texture;

  const amb=new THREE.AmbientLight(0xffffff,0.3);
  const dir=new THREE.DirectionalLight(0xfff8f0,1.8);
  dir.position.set(3,5,4);
  const hemi=new THREE.HemisphereLight(0xfff8f0,0x8090a0,0.6);
  const fill=new THREE.DirectionalLight(0xd0e8ff,0.8);
  fill.position.set(-3,3,-4);
  scene.add(amb,dir,hemi,fill);

  camUpdate();

  let isDrag=false,isRight=false,prev={x:0,y:0};
  // ── Floor-plane drag for move mode ──────────────────────────────────────
  let floorDragging=false;
  const _floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0); // updated at drag-start
  const _floorHit=new THREE.Vector3();
  const _floorOffset=new THREE.Vector3(); // offset from model centre to hit point

  canvas.addEventListener('mousedown',e=>{
    if(dragActive) return;
    if(furnitureMoveMode && e.button===0) {
      // Custom floor-drag: check if we hit the active furniture model
      const rect=canvas.getBoundingClientRect();
      const ndc=screenToNDC(e,rect);
      mouse.set(ndc.x,ndc.y);
      raycaster.setFromCamera(mouse,camera);
      const model=roomFurnitureModels[appStore.getState().currentModelKey];
      if(model){
        const hits=raycaster.intersectObject(model,true);
        if(hits.length){
          // Pin floor plane at detected floor Y
          _floorPlane.constant=-roomFloorY;
          raycaster.ray.intersectPlane(_floorPlane,_floorHit);
          _floorOffset.set(model.position.x-_floorHit.x,0,model.position.z-_floorHit.z);
          floorDragging=true;
          e.stopPropagation();
          return;
        }
      }
      return; // click in move mode on non-furniture — don't orbit
    }
    isDrag=true; isRight=e.button===2; prev={x:e.clientX,y:e.clientY};
  });

  window.addEventListener('mousemove',e=>{
    if(floorDragging){
      const rect=canvas.getBoundingClientRect();
      const ndc=screenToNDC(e,rect);
      mouse.set(ndc.x,ndc.y);
      raycaster.setFromCamera(mouse,camera);
      if(raycaster.ray.intersectPlane(_floorPlane,_floorHit)){
        const model=roomFurnitureModels[appStore.getState().currentModelKey];
        if(model){
          model.position.x=_floorHit.x+_floorOffset.x;
          model.position.z=_floorHit.z+_floorOffset.z;
          // Keep Y pinned
          const box=new THREE.Box3().setFromObject(model);
          model.position.y+=roomFloorY-box.min.y;
          model.updateMatrixWorld(true);
          markDirty();
        }
      }
      return;
    }
    if(!isDrag) return;
    const dx=e.clientX-prev.x,dy=e.clientY-prev.y;
    prev={x:e.clientX,y:e.clientY};
    if(isRight){
      const spd=0.002*sph.r;
      const right=new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()),camera.up).normalize();
      tgt.addScaledVector(right,-dx*spd); tgt.addScaledVector(camera.up,dy*spd);
    } else {
      sph.theta-=dx*0.007;
      sph.phi=Math.max(0.1,Math.min(Math.PI-0.1,sph.phi-dy*0.007));
    }
    camUpdate();
  });
  window.addEventListener('mouseup',()=>{ isDrag=false; floorDragging=false; });

  // Double-click on furniture to enter/exit move mode
  canvas.addEventListener('dblclick', e => {
    if (!appStore.getState().roomMode) return;
    const rect = canvas.getBoundingClientRect();
    const ndc = screenToNDC(e, rect);
    mouse.set(ndc.x, ndc.y);
    raycaster.setFromCamera(mouse, camera);

    if (furnitureMoveMode) {
      // Second double-click anywhere exits move mode
      furnitureMoveMode = false;
      if (transformControls) { transformControls.detach(); transformControls.visible = false; }
      const bar = document.getElementById('move-mode-bar');
      if (bar) bar.classList.remove('active');
      const hud = document.getElementById('move-hud');
      if (hud) hud.classList.remove('active');
      floorDragging = false;
      markDirty();
      return;
    }

    // Find which furniture model was hit — only consider models for the active section
    const _validKeys = appStore.getState().activeRoomSection === 'bedroom' ? ['bed_wooden','bed_fabric'] : ['chair','sofa'];
    const furnitureModels = _validKeys.map(k => roomFurnitureModels[k]).filter(Boolean);
    const hits = raycaster.intersectObjects(furnitureModels, true);
    if (!hits.length) return;

    // Walk up to find the root furniture model
    let hitObj = hits[0].object;
    let hitRoot = null;
    while (hitObj) {
      if (furnitureModels.includes(hitObj)) { hitRoot = hitObj; break; }
      hitObj = hitObj.parent;
    }
    if (!hitRoot) return;

    const hitKey = Object.keys(roomFurnitureModels).find(k => roomFurnitureModels[k] === hitRoot);
    if (!hitKey) return;

    // Switch to the hit furniture if it's not already active
    if (hitKey !== appStore.getState().currentModelKey) switchModel(hitKey);

    // Enter move mode — use custom HUD, no TC gizmo
    furnitureMoveMode = true;
    const bar = document.getElementById('move-mode-bar');
    if (bar) bar.classList.add('active');
    const hud = document.getElementById('move-hud');
    if (hud) hud.classList.add('active');
    if (transformControls) { transformControls.detach(); transformControls.visible = false; }
    markDirty();
  });

  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{sph.r=Math.max(0.3,Math.min(30,sph.r+e.deltaY*0.004));camUpdate();e.preventDefault();},{passive:false});

  const ro=new ResizeObserver(()=>{
    const w=canvas.clientWidth,h=canvas.clientHeight;
    renderer.setSize(w,h,false);
    camera.aspect=w/h; camera.updateProjectionMatrix(); markDirty();
  });
  ro.observe(canvas);

  (function loop(){
    requestAnimationFrame(loop);
    if(!_dirty)return;
    _dirty=false;
    renderer.render(scene,camera);
    updateZoneLabelPositions();
  })();

  const dracoLoader=new THREE.DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  gltfLoader=new THREE.GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
}

function loadScripts(urls){
  // All four extras (DRACOLoader, GLTFLoader, RoomEnvironment, TransformControls)
  // only need THREE which is already synchronously loaded — fetch them in parallel.
  return Promise.all(urls.map(url=>new Promise((res,rej)=>{
    const s=document.createElement('script');s.src=url;s.onload=res;s.onerror=rej;document.head.appendChild(s);
  })));
}

// ── GLB Upload ────────────────────────────────────────────────────────────
function handleGLBUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext !== 'glb' && ext !== 'gltf') { showToast('Please select a .glb or .gltf file'); return; }
  if (window._customGLBUrl) URL.revokeObjectURL(window._customGLBUrl);
  window._customGLBUrl = URL.createObjectURL(file);
  const label = file.name.replace(/\.(glb|gltf)$/i, '');
  showToast('Loading ' + label + '…');
  loadModel(window._customGLBUrl);
  // Tag active tab with "Custom"
  ['tab-chair','tab-sofa'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.querySelectorAll('.custom-model-tag').forEach(t => t.remove());
  });
  const activeTab = document.getElementById('tab-' + appStore.getState().currentModelKey);
  if (activeTab) {
    const tag = document.createElement('span');
    tag.className = 'custom-model-tag';
    tag.textContent = 'Custom';
    activeTab.appendChild(tag);
  }
  input.value = '';
}

