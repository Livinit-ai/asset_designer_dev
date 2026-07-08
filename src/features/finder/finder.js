// Fabric Finder modal: upload/analyze/search/add flows
// Classic script (not a module): top-level let/const/function share the
// global scope across all src/*.js files, preserving original semantics.
// ── Fabric Finder ─────────────────────────────────────────────────────────
// Finder modal UI state lives in appStore.getState().finder — see src/store.js.
let _phCache = null; // PolyHaven assets API response (service cache, not UI state)
// Currently applied diffuse URL (tracks custom uploads too). Written by
// materials.js (applySwatchToEntries / handleDiffuseUpload) — apply-pipeline
// state, not finder state, so it stays a plain global.
let _currentAppliedDiffUrl = null;

// ── Tab switching ──────────────────────────────────────────────────────────
function switchFinderTab(tab) {
  setFinder({ tab });
  const isUpload = tab === 'upload';
  document.getElementById('ftab-upload').classList.toggle('active', isUpload);
  document.getElementById('ftab-search').classList.toggle('active', !isUpload);
  // Left panels
  document.getElementById('finder-left-upload').style.display = isUpload ? '' : 'none';
  const sl = document.getElementById('finder-left-search');
  sl.style.display = isUpload ? 'none' : 'flex';
  // Right panels
  document.getElementById('finder-right-upload').style.display = isUpload ? 'flex' : 'none';
  document.getElementById('finder-right-search').style.display = isUpload ? 'none' : 'flex';
  // Footer buttons
  document.getElementById('finder-upload-footer').style.display = isUpload ? 'flex' : 'none';
  document.getElementById('finder-search-footer').style.display = isUpload ? 'none' : '';
  if (!isUpload) setTimeout(() => document.getElementById('finder-search-q').focus(), 60);
}

function openFabricFinder() {
  document.getElementById('finder-overlay').classList.add('open');
  switchFinderTab('upload');
  setTimeout(() => document.getElementById('finder-name').focus(), 80);
}

function closeFabricFinder() {
  document.getElementById('finder-overlay').classList.remove('open');
  clearFinderImage({ stopPropagation:()=>{} });
  document.getElementById('finder-name').value = '';
  document.getElementById('finder-material-type').value = '';
  document.getElementById('finder-scale-val').value = '10';
  document.getElementById('finder-results-grid').innerHTML = '';
  document.getElementById('finder-props-rows').style.display = 'none';
  document.getElementById('finder-props-rows').innerHTML = '';
  document.getElementById('finder-hint-text').style.display = '';
  document.getElementById('finder-right-title').textContent = 'Preview';
  document.getElementById('finder-preview-drawer').style.display = 'none';
  document.getElementById('finder-results-title').textContent = 'Quick Filters';
  document.querySelectorAll('.finder-chip').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.tex-card.selected').forEach(c => c.classList.remove('selected'));
  setFinder({ selectedResult: null });
  clearSearchCustomImage({ stopPropagation:()=>{} });
  switchFinderTab('upload');
}

function updateFinderMode() {
  const hasImg = !!appStore.getState().finder.imgData;
  const t = document.getElementById('finder-btn-txt');
  if(t) t.textContent = hasImg ? 'Analyze Fabric' : 'Analyze & Add';
  const saveBtn = document.getElementById('finder-save-btn');
  if (saveBtn) saveBtn.disabled = !hasImg;
  if (!hasImg) {
    setFinder({ analyzed: null });
    const pmBtn = document.getElementById('finder-prev-model-btn');
    if (pmBtn) { pmBtn.style.display = 'none'; pmBtn.disabled = false; }
  }
}

function handleFinderImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    setFinder({ imgData: e.target.result.split(',')[1] });
    const dPreview = document.getElementById('finder-img-preview');
    dPreview.src = e.target.result; dPreview.style.display = 'block';
    document.getElementById('finder-drop-content').style.display = 'none';
    document.getElementById('finder-drop-zone').classList.add('has-img');
    const fullPrev = document.getElementById('finder-preview-full');
    fullPrev.src = e.target.result; fullPrev.style.display = 'block';
    document.getElementById('finder-preview-placeholder').style.display = 'none';
    document.getElementById('finder-right-dot').classList.add('active');
    document.getElementById('finder-right-title').textContent = 'Uploaded image';
    document.getElementById('finder-props-rows').style.display = 'none';
    updateFinderMode();
  };
  reader.readAsDataURL(file);
}

function clearFinderImage(e) {
  e.stopPropagation();
  setFinder({ imgData: null });
  const dPreview = document.getElementById('finder-img-preview');
  if(dPreview){ dPreview.src = ''; dPreview.style.display = 'none'; }
  const dc = document.getElementById('finder-drop-content');
  if(dc) dc.style.display = '';
  const dz = document.getElementById('finder-drop-zone');
  if(dz) dz.classList.remove('has-img');
  const fi = document.getElementById('finder-img-input');
  if(fi) fi.value = '';
  const fullPrev = document.getElementById('finder-preview-full');
  if(fullPrev){ fullPrev.src = ''; fullPrev.style.display = 'none'; }
  const ph = document.getElementById('finder-preview-placeholder');
  if(ph) ph.style.display = '';
  const dot = document.getElementById('finder-right-dot');
  if(dot) dot.classList.remove('active');
  const rt = document.getElementById('finder-right-title');
  if(rt) rt.textContent = 'Preview';
  const pr = document.getElementById('finder-props-rows');
  if(pr){ pr.style.display = 'none'; pr.innerHTML = ''; }
  updateFinderMode();
}

// ── Search tab: custom image upload ───────────────────────────────────────
function handleSearchCustomImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    setFinder({ searchCustomImg: e.target.result });
    const drop = document.getElementById('finder-custom-drop');
    const prev = document.getElementById('finder-custom-drop-preview');
    const content = document.getElementById('finder-custom-drop-content');
    drop.classList.add('has-img');
    prev.src = e.target.result; prev.style.display = 'block';
    content.style.display = 'none';
    const panel = document.getElementById('finder-custom-img-panel');
    panel.style.display = 'flex';
    const previewImg = document.getElementById('finder-custom-preview-img');
    previewImg.src = e.target.result;
    document.getElementById('finder-seamless-btn').disabled = false;
    document.getElementById('finder-custom-add-btn').disabled = false;
  };
  reader.readAsDataURL(file);
}

function clearSearchCustomImage(e) {
  if(e && e.stopPropagation) e.stopPropagation();
  setFinder({ searchCustomImg: null });
  const drop = document.getElementById('finder-custom-drop');
  const prev = document.getElementById('finder-custom-drop-preview');
  const content = document.getElementById('finder-custom-drop-content');
  if(drop) drop.classList.remove('has-img');
  if(prev){ prev.src = ''; prev.style.display = 'none'; }
  if(content) content.style.display = '';
  const panel = document.getElementById('finder-custom-img-panel');
  if(panel) panel.style.display = 'none';
  const fi = document.getElementById('finder-custom-img-input');
  if(fi) fi.value = '';
}

async function makeSearchImageSeamless() {
  const searchImg = appStore.getState().finder.searchCustomImg;
  if (!searchImg) return;
  const btn = document.getElementById('finder-seamless-btn');
  const overlay = document.getElementById('finder-seamless-overlay');
  btn.disabled = true;
  overlay.style.display = 'flex';
  try {
    const seamless = await makeSeamlessTexture(searchImg);
    setFinder({ searchCustomImg: seamless });
    document.getElementById('finder-custom-preview-img').src = seamless;
    showToast('Seamless texture ready!');
  } catch(e) {
    showToast('Could not process image');
  } finally {
    btn.disabled = false;
    overlay.style.display = 'none';
  }
}

async function addSearchCustomToLibrary() {
  // Read all inputs once at event time — DOM is the event source, not state.
  const searchImg = appStore.getState().finder.searchCustomImg;
  if (!searchImg) return;
  const btn = document.getElementById('finder-custom-add-btn');
  btn.disabled = true; btn.textContent = 'Adding…';
  let name = 'Custom Fabric ' + (CUSTOM_FABRIC_ITEMS.length + 1);
  const type = document.getElementById('finder-search-type').value || 'fabric';
  addCustomFabric({
    name, img: searchImg, type, hex: '#c8c0b8',
    vendor:'custom', series:'My Fabrics',
    _defaults: { roughness:0.72, sheen:0.1, metalness:0.0, scale:10, norm:1.0 },
  });
  buildLibrary();
  showToast('✓ ' + name + ' added to My Fabrics');
  closeFabricFinder();
}

// Save without AI (image required)
async function saveAsMaterial() {
  // Read finder state + inputs once at event time.
  const F = appStore.getState().finder;
  if (!F.imgData) return;
  let name = document.getElementById('finder-name').value.trim()
    || F.analyzed?.name
    || ('Custom Fabric ' + (CUSTOM_FABRIC_ITEMS.length + 1));
  let type = document.getElementById('finder-material-type').value
    || F.analyzed?.type
    || 'fabric';
  const scale = parseFloat(document.getElementById('finder-scale-val').value) || F.analyzed?.aiProps?.scale || 10;
  const aiProps = F.analyzed?.aiProps || { roughness:0.72, sheen:0.1, metalness:0.0, norm:1.0 };
  const diffUrl = 'data:image/jpeg;base64,' + F.imgData;
  addCustomFabric({
    name, img: diffUrl, type,
    hex: F.analyzed?.hex || '#c8c0b8', vendor:'custom', series:'My Fabrics',
    _defaults: { ...aiProps, scale, diffUrl },
  });
  buildLibrary();
  showToast('✓ ' + name + ' saved to My Fabrics');
  closeFabricFinder();
}

async function previewAnalyzedOnModel() {
  // Read finder state + inputs once at event time.
  const F = appStore.getState().finder;
  if (!F.imgData) return;
  const btn = document.getElementById('finder-prev-model-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Preparing…'; }

  const name    = document.getElementById('finder-name').value.trim() || F.analyzed?.name || 'Custom Fabric';
  const type    = document.getElementById('finder-material-type').value || F.analyzed?.type || 'fabric';
  const aiProps = F.analyzed?.aiProps || { roughness:0.72, sheen:0.1, metalness:0.0, scale:10.0, norm:1.0 };

  let dataUrl = 'data:image/jpeg;base64,' + F.imgData;
  try {
    showToast('Making seamless…');
    dataUrl = await makeSeamlessTexture(dataUrl);
  } catch(_) {}

  const previewItem = {
    name, img: dataUrl, type,
    hex: F.analyzed?.hex || '#c8c0b8', vendor:'custom', series:'My Fabrics',
    _defaults: { ...aiProps, diffUrl: dataUrl },
  };
  const checked = meshEntries.filter(e => e.checked);
  const previewTargets = checked.length ? checked : meshEntries.filter(e => !e._isCurtain);
  if (previewTargets.length) await applySwatchToEntries(previewItem, previewTargets);

  setFinder({ pendingUploadPreview: { name, type, aiProps, diffUrl: dataUrl }, pendingResult: null });
  closeFabricFinder();
  showConfirmBar(name);
}

// Entry point — branches on whether an image is loaded
async function analyzeAndAddFabric() {
  if (appStore.getState().finder.imgData) {
    await _analyzeImageAndAdd();
  } else {
    const query = document.getElementById('finder-name').value.trim();
    const matType = document.getElementById('finder-material-type').value;
    if (!query && !matType) { showToast('Enter a description or select a material type'); return; }
    await _searchAndShow(query, matType);
  }
}

// ── Image path: AI analysis ────────────────────────────────────────────────
async function _analyzeImageAndAdd() {
  const btn = document.getElementById('finder-btn');
  btn.disabled = true;
  document.getElementById('finder-btn-txt').textContent = 'Analyzing…';

  // Read finder state + inputs once at event time.
  const imgData = appStore.getState().finder.imgData;
  try {
    let name    = document.getElementById('finder-name').value.trim();
    let type    = document.getElementById('finder-material-type').value;
    const userScale = parseFloat(document.getElementById('finder-scale-val').value) || null;
    let aiProps = { roughness:0.72, sheen:0.1, metalness:0.0, scale:userScale||10.0, norm:1.0 };
    let hex     = '#c8c0b8';

    const hasApi = await _checkEndpoint('/api/find-fabric');
    if (hasApi) {
      try {
        const r = await fetch('/api/find-fabric', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ imageData: imgData }),
          signal: AbortSignal.timeout(22000),
        });
        if (r.ok) {
          const d = await r.json();
          if (!name && d.name)            name = d.name;
          if (!type && d.type)            type = d.type;
          if (d.roughness !== undefined)  aiProps.roughness = +d.roughness;
          if (d.sheen     !== undefined)  aiProps.sheen     = +d.sheen;
          if (d.metalness !== undefined)  aiProps.metalness = +d.metalness;
          if (!userScale && d.scale !== undefined) {
            aiProps.scale = +d.scale;
            document.getElementById('finder-scale-val').value = d.scale;
          }
          if (d.norm !== undefined)       aiProps.norm = +d.norm;
          if (d.hex)                      hex = d.hex;
          _showFinderAnalysis({ ...d, name: name || d.name, type: type || d.type });
        }
      } catch(e) { console.warn('AI analysis skipped:', e.message); }
    }

    if (!name) name = 'Custom Fabric ' + (CUSTOM_FABRIC_ITEMS.length + 1);
    if (!type) type = 'fabric';

    // Store result — user clicks Save or Preview on Model to finalise
    setFinder({ analyzed: { name, type, hex, aiProps, imgData } });
    const pmBtn = document.getElementById('finder-prev-model-btn');
    if (pmBtn) { pmBtn.style.display = 'flex'; pmBtn.disabled = false; }
    showToast('AI analysis done — click Preview or Save');

  } catch(e) {
    console.error('_analyzeImageAndAdd:', e);
    showToast('Analysis failed');
  } finally {
    btn.disabled = false;
    document.getElementById('finder-btn-txt').textContent = 'Analyze Fabric';
  }
}

// ── Search dispatch from footer button ────────────────────────────────────
async function doFinderSearch() {
  const q = (document.getElementById('finder-search-q').value || '').trim();
  const t = document.getElementById('finder-search-type').value;
  await _searchAndShow(q, t);
}

// ── Text path: search PolyHaven + AmbientCG ───────────────────────────────
async function _searchAndShow(query, matType, activeChip) {
  const trimmed = (query || '').trim();
  if (!trimmed && !matType) {
    showToast('Type a keyword to search — e.g. "dark linen"');
    return;
  }

  // Disable the correct button based on active tab
  const searchBtn = document.getElementById('finder-search-btn');
  if(searchBtn){ searchBtn.disabled = true; searchBtn.textContent = 'Searching…'; }

  document.getElementById('finder-hint-text').style.display = 'none';
  document.getElementById('finder-preview-drawer').style.display = 'none';
  setFinder({ selectedResult: null });
  document.getElementById('finder-results-grid').innerHTML =
    '<div class="finder-state"><div class="finder-state-spin"></div><span>Searching texture libraries…</span></div>';
  document.getElementById('finder-results-title').textContent = 'Searching…';

  document.querySelectorAll('.finder-chip').forEach(c => c.classList.remove('active'));
  if (activeChip) activeChip.classList.add('active');

  try {
    const keywords = trimmed.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    if (matType) keywords.push(matType.toLowerCase());

    const [ph, acg] = await Promise.allSettled([
      _searchPolyHaven(keywords, matType),
      trimmed || matType ? _searchAmbientCG(trimmed || matType) : Promise.resolve([]),
    ]);

    const seen = new Set();
    const all = [
      ...(ph.status==='fulfilled' ? ph.value : []),
      ...(acg.status==='fulfilled' ? acg.value : []),
    ].filter(r => { if(seen.has(r.id)) return false; seen.add(r.id); return true; });

    _renderFinderResults(all.slice(0, 30));
    const label = trimmed ? `"${trimmed}"` : matType;
    document.getElementById('finder-results-title').textContent =
      all.length
        ? `${all.length} result${all.length !== 1 ? 's' : ''} for ${label}`
        : `No assets found for ${label}`;
  } catch(e) {
    console.error('_searchAndShow:', e);
    document.getElementById('finder-results-grid').innerHTML =
      '<div class="finder-state">Search failed — check your connection and try again.</div>';
  } finally {
    if(searchBtn){ searchBtn.disabled = false; searchBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" style="vertical-align:middle;margin-right:5px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Search Fabrics'; }
    updateFinderMode();
  }
}

function quickSearch(query, chipEl) {
  if (appStore.getState().finder.tab !== 'search') switchFinderTab('search');
  document.getElementById('finder-search-q').value = query;
  document.getElementById('finder-search-type').value = '';
  _searchAndShow(query, '', chipEl || null);
}

async function _searchPolyHaven(keywords, matType) {
  if (!keywords.length) return [];
  if (!_phCache) {
    const r = await fetch('https://api.polyhaven.com/assets?type=textures', { signal: AbortSignal.timeout(9000) });
    if (!r.ok) throw new Error('PolyHaven unreachable');
    _phCache = await r.json();
  }
  const kws = keywords.map(k => k.toLowerCase());
  const scored = Object.entries(_phCache).map(([id, data]) => {
    const blob = [id, data.name||'', ...(data.categories||[]), ...(data.tags||[])].join(' ').toLowerCase();
    let score = 0;
    // Require at least one keyword to directly match — no filler hint points alone
    for (const k of kws) { if (blob.includes(k)) score += 4; }
    return { id, score, name: (data.name || id).replace(/_/g, ' ') };
  });
  return scored
    .filter(s => s.score >= 4)   // must match at least one user keyword directly
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(s => ({
      id: s.id, source: 'polyhaven', name: s.name,
      thumb: `https://cdn.polyhaven.com/asset_img/thumbs/${s.id}.png?width=200`,
    }));
}

async function _searchAmbientCG(query) {
  if (!query || !query.trim()) return [];   // never send empty q — returns all 159 assets
  const r = await fetch(`/api/acg-search?q=${encodeURIComponent(query.trim())}&limit=20`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error('AmbientCG proxy unreachable');
  const data = await r.json();
  if (data.error && !(data.assets || []).length) {
    console.warn('[acg-search] error from proxy:', data.error);
    return [];
  }
  // v3: response key is "assets", download field is "attributes" (plural)
  return (data.assets || [])
    .filter(a => {
      const dl = a.downloads || [];
      return dl.some(d => d.attributes === '1K-JPG' || d.attributes === '2K-JPG' || d.attributes === '1K-PNG');
    })
    .map(a => {
      // Extract real color thumbnail from the pbr-one preview URL's color_url param
      let thumb = null;
      const previewUrl = (a.previews || [])[0]?.url || '';
      const m = previewUrl.match(/color_url=([^&]+)/);
      if (m) thumb = decodeURIComponent(m[1]).split('?')[0];
      // Clean up name: "Fabric081C" → "Fabric 081 C"
      const name = (a.id || '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Za-z])(\d)/g, '$1 $2')
        .replace(/(\d)([A-Za-z])/g, '$1 $2')
        .replace(/\s+/g, ' ').trim();
      return { id: a.id, source:'ambientcg', name, thumb };
    });
}

function _renderFinderResults(results) {
  const grid = document.getElementById('finder-results-grid');
  if (!results.length) {
    grid.innerHTML = '<div class="finder-state">No results — try different terms like "linen" or "dark velvet".</div>';
    document.getElementById('finder-preview-drawer').style.display = 'none';
    return;
  }
  grid.innerHTML = '';
  results.forEach(result => {
    const card = document.createElement('div');
    card.className = 'tex-card';
    card.title = result.name;
    const thumb = document.createElement('div');
    thumb.className = 'tex-card-thumb';
    if (result.thumb) {
      const img = document.createElement('img');
      img.src = result.thumb; img.alt = result.name; img.crossOrigin = 'anonymous';
      img.onerror = () => { thumb.style.background='var(--border-strong)'; img.remove(); };
      thumb.appendChild(img);
    }
    const info = document.createElement('div');
    info.className = 'tex-card-info';
    const nm = document.createElement('div');
    nm.className = 'tex-card-name'; nm.textContent = result.name;
    const src = document.createElement('div');
    src.className = 'tex-card-src ' + (result.source==='polyhaven'?'ph':'acg');
    src.textContent = result.source==='polyhaven' ? 'PolyHaven' : 'AmbientCG';
    info.appendChild(nm); info.appendChild(src);
    card.appendChild(thumb); card.appendChild(info);
    // Click → show preview drawer (not immediate add)
    card.addEventListener('click', () => _showResultDrawer(result, card));
    grid.appendChild(card);
  });
}

// ── Preview drawer: show info + actions when a result card is clicked ─────
function _showResultDrawer(result, cardEl) {
  setFinder({ selectedResult: result });
  // Highlight selected card
  document.querySelectorAll('.tex-card').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');

  // Populate drawer
  const sq = document.getElementById('finder-drawer-sq');
  sq.innerHTML = '';
  if (result.thumb) {
    const img = document.createElement('img');
    img.src = result.thumb; img.alt = result.name; img.crossOrigin = 'anonymous';
    sq.appendChild(img);
  } else {
    sq.style.background = 'var(--border-strong)';
  }
  document.getElementById('finder-drawer-dname').textContent = result.name;
  const badge = document.getElementById('finder-drawer-badge');
  badge.textContent = result.source === 'polyhaven' ? 'PolyHaven' : 'AmbientCG';
  badge.className = 'finder-drawer-badge ' + (result.source === 'polyhaven' ? 'ph' : 'acg');

  // Reset button states
  const tryBtn = document.getElementById('finder-drawer-try');
  const addBtn = document.getElementById('finder-drawer-add');
  if(tryBtn){ tryBtn.disabled = false; tryBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Try on Model'; }
  if(addBtn){ addBtn.disabled = false; addBtn.textContent = '+ Add to My Fabrics'; }

  document.getElementById('finder-preview-drawer').style.display = 'block';
  document.getElementById('finder-preview-drawer').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

// "Try on Model" → close modal, apply texture, show floating confirm bar
async function trySelectedOnModel() {
  // Read the selection once at event time.
  const result = appStore.getState().finder.selectedResult;
  if (!result) return;
  const tryBtn = document.getElementById('finder-drawer-try');
  if(tryBtn){ tryBtn.disabled = true; tryBtn.textContent = 'Loading…'; }
  let diffUrl = result.thumb || null, normUrl = null, roughUrl = null;
  try {
    if (result.source === 'polyhaven') {
      const maps = await getPolyMaps(result.id);
      normUrl = maps.normUrl; roughUrl = maps.roughUrl;
      try {
        const filesResp = await fetch(POLY_API + result.id, { signal: AbortSignal.timeout(8000) });
        if (filesResp.ok) {
          const files = await filesResp.json();
          for (const key of ['Color','color','Diffuse','diffuse','Albedo','albedo']) {
            const entry = files[key];
            if (entry) { const u = entry?.['1k']?.jpg?.url || entry?.['2k']?.jpg?.url; if(u){diffUrl=u;break;} }
          }
        }
      } catch(_) {}
    } else {
      const id = encodeURIComponent(result.id);
      diffUrl = `/api/acg-map?id=${id}&map=Color&res=1K`;
      normUrl = `/api/acg-map?id=${id}&map=NormalGL&res=2K`;
      roughUrl= `/api/acg-map?id=${id}&map=Roughness&res=2K`;
    }
  } catch(_) {}

  // Apply to model without saving to library
  const typeGuess = (() => {
    const n = result.name.toLowerCase();
    if(n.includes('leather')) return 'leather';
    if(n.includes('linen')) return 'linen';
    if(n.includes('velvet')||n.includes('suede')) return 'suede';
    return 'fabric';
  })();
  const previewItem = {
    name: result.name, img: diffUrl, type: typeGuess, hex: '#c8c0b8',
    vendor:'custom', series:'My Fabrics',
    _defaults: { roughness:0.72, sheen:0.1, metalness:0.0, scale:10.0, norm:1.0, diffUrl, normUrl, roughUrl },
  };
  const checked = meshEntries.filter(e => e.checked);
  if (checked.length) {
    await applySwatchToEntries(previewItem, checked);
  }

  // Close modal, show confirm bar
  closeFabricFinder();
  setFinder({ pendingResult: { result, diffUrl, normUrl, roughUrl, typeGuess } });
  showConfirmBar(result.name);
}

// "Add to My Fabrics" from drawer → fetches maps and commits
async function addSelectedResult() {
  // Read the selection once at event time.
  const selected = appStore.getState().finder.selectedResult;
  if (!selected) return;
  const addBtn = document.getElementById('finder-drawer-add');
  if(addBtn){ addBtn.disabled = true; addBtn.textContent = 'Adding…'; }
  await _addFromSearchResult(selected, null);
}

// ── Floating confirm bar ──────────────────────────────────────────────────
function showConfirmBar(name) {
  document.getElementById('fcb-name').textContent = name;
  document.getElementById('finder-confirm-bar').classList.add('visible');
}
function hideConfirmBar() {
  document.getElementById('finder-confirm-bar').classList.remove('visible');
  setFinder({ pendingResult: null, pendingUploadPreview: null });
}
async function confirmAddFromBar() {
  // Capture all state before hideConfirmBar clears the pending keys
  const pr = appStore.getState().finder.pendingResult;
  const pu = appStore.getState().finder.pendingUploadPreview;
  if (!pr && !pu) { hideConfirmBar(); return; }
  // _currentAppliedDiffUrl tracks any custom image the user may have swapped in after previewing
  const finalDiffUrl = _currentAppliedDiffUrl || pr?.diffUrl || pu?.diffUrl || null;
  const normUrl  = pr?.normUrl  || null;
  const roughUrl = pr?.roughUrl || null;
  const name = pr?.result?.name || pu?.name || ('Custom Fabric ' + (CUSTOM_FABRIC_ITEMS.length + 1));
  const type = pr?.typeGuess    || pu?.type  || 'fabric';
  const thumb = pr?.result?.thumb || finalDiffUrl;

  hideConfirmBar();
  const S = appStore.getState().sliders;
  addCustomFabric({
    name, img: thumb, type, hex: '#c8c0b8', vendor:'custom', series:'My Fabrics',
    _defaults: {
      // Save the CURRENT slider state — not the original fabric defaults
      roughness: S.roughness, sheen: S.sheen, metalness: S.metalness,
      scale: S.scale, norm: S.norm,
      diffUrl: finalDiffUrl, normUrl, roughUrl,
    },
  });
  buildLibrary();
  showToast('✓ ' + name + ' saved to My Fabrics');
}

async function _addFromSearchResult(result, cardEl) {
  // Optional loading overlay on the card
  let overlay = null;
  if (cardEl) {
    overlay = document.createElement('div');
    overlay.className = 'tex-card-adding'; overlay.textContent = 'Adding…';
    cardEl.appendChild(overlay);
    cardEl.style.pointerEvents = 'none';
  }

  let diffUrl = result.thumb || null;
  let normUrl = null, roughUrl = null;

  try {
    if (result.source === 'polyhaven') {
      const maps = await getPolyMaps(result.id);
      normUrl = maps.normUrl; roughUrl = maps.roughUrl;
      try {
        const filesResp = await fetch(POLY_API + result.id, { signal: AbortSignal.timeout(8000) });
        if (filesResp.ok) {
          const files = await filesResp.json();
          for (const key of ['Color','color','Diffuse','diffuse','Albedo','albedo','diff','col']) {
            const entry = files[key];
            if (entry) { const u = entry?.['1k']?.jpg?.url || entry?.['2k']?.jpg?.url; if(u){diffUrl=u;break;} }
          }
        }
      } catch(_) {}
    } else if (result.source === 'ambientcg') {
      const id = encodeURIComponent(result.id);
      diffUrl  = `/api/acg-map?id=${id}&map=Color&res=1K`;
      normUrl  = `/api/acg-map?id=${id}&map=NormalGL&res=1K`;
      roughUrl = `/api/acg-map?id=${id}&map=Roughness&res=1K`;
    }

    const typeGuess = (() => {
      const n = result.name.toLowerCase();
      if(n.includes('leather')) return 'leather';
      if(n.includes('linen')) return 'linen';
      if(n.includes('velvet')||n.includes('suede')) return 'suede';
      if(n.includes('canvas')) return 'canvas';
      if(n.includes('cotton')) return 'cotton';
      return 'fabric';
    })();

    addCustomFabric({
      name: result.name, img: result.thumb || diffUrl,
      type: typeGuess, hex: '#c8c0b8', vendor:'custom', series:'My Fabrics',
      _defaults: { roughness:0.72, sheen:0.1, metalness:0.0, scale:10.0, norm:1.0, diffUrl, normUrl, roughUrl },
    });
    buildLibrary();
    showToast('✓ ' + result.name + ' added to My Fabrics');
    closeFabricFinder();
  } catch(e) {
    console.error('_addFromSearchResult:', e);
    showToast('Failed to fetch texture maps');
    if(overlay) overlay.remove();
    if(cardEl) cardEl.style.pointerEvents = '';
  }
}

function _showFinderAnalysis(d) {
  const el = document.getElementById('finder-props-rows');
  if (!el) return;
  const typeLabel = escapeHtml((d.type || 'fabric').replace(/_/g, ' '));
  const hex = escapeHtml(d.hex || '#c8c0b8');
  const roughness = (+d.roughness || 0.72).toFixed(2);
  const scale = (+d.scale || 10).toFixed(1);
  el.innerHTML = `
    <div class="finder-analysis-type-badge">
      <span class="finder-type-ico">◈</span>
      <span class="finder-type-lbl">${typeLabel}</span>
      <span class="finder-type-sub">AI Detected</span>
    </div>
    <div class="finder-prop-row">
      <div class="finder-prop-row-lbl">
        <div class="finder-prop-dot" style="background:${hex}"></div>Color
      </div>
      <div class="finder-prop-row-val" style="font-size:10px;letter-spacing:.04em">${hex.toUpperCase()}</div>
    </div>
    <div class="finder-prop-row">
      <div class="finder-prop-row-lbl">Roughness &amp; Normal</div>
      <div class="finder-prop-row-muted">${roughness} · Auto Generate</div>
    </div>
    <div class="finder-prop-row">
      <div class="finder-prop-row-lbl">Scale</div>
      <div class="finder-prop-row-val">${scale}</div>
    </div>
    ${d.description ? `<div style="font-size:10px;color:var(--text-muted);font-style:italic;padding:3px 2px;line-height:1.5">${escapeHtml(d.description)}</div>` : ''}
  `;
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.gap = '5px';
  const rt = document.getElementById('finder-right-title');
  if(rt) rt.textContent = d.name || 'Detected material';
  const rdot = document.getElementById('finder-right-dot');
  if(rdot) rdot.classList.add('active');
  const ht = document.getElementById('finder-hint-text-upload');
  if(ht) ht.style.display = 'none';
}

async function _checkEndpoint(path) {
  try {
    const r = await fetch(path, { method:'HEAD', signal: AbortSignal.timeout(3000) });
    return r.status !== 404;
  } catch(_) { return false; }
}

// Close finder on Escape
