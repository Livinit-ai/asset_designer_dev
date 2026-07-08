// Global key handlers + bootstrap: load three.js addons, init, preload
// Classic script (not a module): top-level let/const/function share the
// global scope across all src/*.js files, preserving original semantics.
document.addEventListener('keydown', e => {
  if (e.key==='Escape') closeFabricFinder();
});

loadScripts([
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js',
]).then(()=>{
  initThree();

  // Init TransformControls for furniture move mode
  if (THREE.TransformControls) {
    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.visible = false;
    transformControls.setMode('translate');
    transformControls.setTranslationSnap(null);
    transformControls.setRotationSnap(null);
    scene.add(transformControls);

    // Constrain translation to XZ plane (floor plane only)
    transformControls.addEventListener('objectChange', () => {
      if (tcMode === 'translate') {
        const model = roomFurnitureModels[appStore.getState().currentModelKey];
        if (model) {
          // Keep Y pinned to floor (furniture shouldn't float)
          const box = new THREE.Box3().setFromObject(model);
          const floorOffset = box.min.y;
          model.position.y += (roomFloorY - floorOffset);
          model.updateMatrixWorld(true);
        }
      }
      markDirty();
    });

    transformControls.addEventListener('mouseUp', () => { markDirty(); });
  }

  initDragDrop();
  buildLibrary();
  loadModel(CHAIR_GLB);
  updateProductInfo();

  // Background preload — furniture models cached so every tab switch is instant
  [
    { url: SOFA_GLB,       roomKey: 'sofa' },
    { url: BED_WOODEN_GLB, roomKey: null   },
    { url: BED_FABRIC_GLB, roomKey: null   },
  ].forEach(({ url, roomKey }) => {
    gltfLoader.load(url, gltf => {
      if (!_gltfSceneCache[url]) _gltfSceneCache[url] = gltf.scene;
      if (roomKey === 'sofa' && !roomFurnitureModels.sofa) {
        const m = gltf.scene.clone(true);
        const b = new THREE.Box3().setFromObject(m);
        const sz = b.getSize(new THREE.Vector3());
        m.scale.setScalar(1.6 / Math.max(sz.x, sz.y, sz.z));
        m.updateMatrixWorld(true);
        roomFurnitureModels.sofa = m;
      }
    }, undefined, () => { /* silent fail — user can still load on demand */ });
  });
}).catch(e=>{console.error('Script load failed',e);showToast('Failed to load Three.js loaders');});

// Narrow-window sidebar drawer toggle (floating "Fabrics" pill; no-op >=1024px)
function toggleSidebar(){ document.getElementById('right-panel')?.classList.toggle('open'); }

// Tool-panel tabs (Fabrics / Room / Parts). Single source of truth for which
// panel body is visible; room-mode calls showPanelTab('room') via room.js.
let activePanelTab = 'fabrics';
function showPanelTab(name){
  activePanelTab = name;
  document.querySelectorAll('.panel-tab-body').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  ['fabrics','room','parts'].forEach(n => document.getElementById('ptab-'+n)?.classList.toggle('active', n === name));
  // The pinned Applied card is fabric-editing context — hide it on the Room tab.
  document.getElementById('applied-card')?.classList.toggle('hidden', name === 'room');
}
window.showPanelTab = showPanelTab;
