// Fabric library bar + curtain library + filters
// Classic script (not a module): top-level let/const/function share the
// global scope across all src/*.js files, preserving original semantics.
// ── Build fabric library UI ───────────────────────────────────────────────
function buildLibrary() {
  if (roomMode && meshEntries.find(e => e._isCurtain && e.pieceSelected)) {
    buildCurtainLibrary();
    return;
  }

  const lt = document.getElementById('lib-title');
  const _ltMap={chair:'Chair Fabrics',sofa:'Sofa Fabrics',bed_wooden:'Bed — Wooden Frame',bed_fabric:'Bed — Fabric Frame'};
  if(lt) lt.textContent = _ltMap[currentModelKey] || 'Fabrics';

  const tabsEl = document.getElementById('fabric-tabs');
  const swatchesEl = document.getElementById('fabric-swatches-row');
  if(!tabsEl || !swatchesEl) return;

  // Clear only tabs (not the search widget which is static in HTML)
  tabsEl.querySelectorAll('.fab-tab, .fab-tab-add').forEach(el => el.remove());
  swatchesEl.innerHTML = '';

  // Clear search box
  const searchInput = document.getElementById('fab-search-input');
  if(searchInput) searchInput.value = '';

  const groups = LIBRARY[currentModelKey];

  // Flatten all items with their group indices (for startDrag compat)
  const allSwatches = [];
  groups.forEach((group, gi) => {
    if(group.items.length === 0) return;
    const typeKey = group.vclass === 'custom' ? 'custom'
                  : (group.items[0] && group.items[0].type ? group.items[0].type : 'fabric');
    group.items.forEach((item, ii) => {
      const itemType = group.vclass === 'custom' ? 'custom' : (item.type || 'fabric');
      allSwatches.push({ item, gi, ii, typeKey: itemType, seriesName: group.group });
    });
  });

  // Type tab definitions — only show tabs that have items
  const TYPE_DEFS = [
    { key: 'all',    label: 'All Fabrics' },
    { key: 'fabric', label: 'Fabric' },
    { key: 'vinyl',  label: 'Vinyl' },
    { key: 'pu',     label: 'PU / Leather' },
    { key: 'wood',   label: 'Wood' },
    { key: 'custom', label: 'My Fabrics' },
  ];
  const presentTypes = new Set(allSwatches.map(s => s.typeKey));

  // Active type state
  window._fabActiveType = 'all';

  window._fabFilterTab = function(key) {
    window._fabActiveType = key;
    tabsEl.querySelectorAll('.fab-tab[data-tk]').forEach(t =>
      t.classList.toggle('active', t.dataset.tk === key));
    const q = (document.getElementById('fab-search-input') || {}).value || '';
    _applyFabricFilters(key, q);
  };

  function mkTab(label, key) {
    const btn = document.createElement('button');
    btn.className = 'fab-tab' + (key === 'all' ? ' active' : '');
    btn.textContent = label;
    btn.dataset.tk = key;
    btn.onclick = () => window._fabFilterTab(key);
    return btn;
  }

  // Insert tabs before the search widget
  const searchWrap = tabsEl.querySelector('.fab-search-wrap');
  TYPE_DEFS.forEach(({ key, label }) => {
    if (key === 'all' || presentTypes.has(key)) {
      tabsEl.insertBefore(mkTab(label, key), searchWrap);
    }
  });

  // Add Fabric button (before search wrap)
  const addBtn = document.createElement('button');
  addBtn.className = 'fab-tab-add';
  addBtn.textContent = '+ Add Fabric';
  addBtn.onclick = openFabricFinder;
  tabsEl.insertBefore(addBtn, searchWrap);

  // Build all swatches
  allSwatches.forEach(({ item, gi, ii, typeKey, seriesName }) => {
    const sw = document.createElement('div');
    sw.className = 'bar-sw';
    sw.dataset.type = typeKey;
    sw.dataset.series = seriesName.toLowerCase();
    sw.dataset.name = item.name.toLowerCase();
    sw.title = item.name + ' · ' + seriesName;

    const imgWrap = document.createElement('div');
    imgWrap.className = 'bar-sw-img';
    if (item.img) {
      const img = document.createElement('img');
      img.src = item.img; img.alt = item.name; img.loading = 'lazy'; img.crossOrigin = 'anonymous';
      img.onerror = () => { img.remove(); imgWrap.style.background = item.hex || '#ccc'; };
      imgWrap.appendChild(img);
    } else if (item.code) {
      const img = document.createElement('img');
      img.src = MITY_IMG + item.code + '.jpg'; img.alt = item.name; img.loading = 'lazy'; img.crossOrigin = 'anonymous';
      img.onerror = () => { img.remove(); imgWrap.style.background = item.hex || '#ccc'; };
      imgWrap.appendChild(img);
    } else {
      imgWrap.style.background = item.hex || '#ccc';
    }

    // Strip series prefix from name so label is shorter ("Bark" not "Abilene Bark")
    const shortName = item.name.startsWith(seriesName + ' ')
      ? item.name.slice(seriesName.length + 1) : item.name;

    const nameEl = document.createElement('div');
    nameEl.className = 'bar-sw-name';
    nameEl.textContent = shortName;

    const seriesEl = document.createElement('div');
    seriesEl.className = 'bar-sw-series';
    seriesEl.textContent = seriesName;

    sw.appendChild(imgWrap);
    sw.appendChild(nameEl);
    sw.appendChild(seriesEl);

    sw.addEventListener('click', () => {
      if (roomMode) {
        const selected = meshEntries.filter(e => e.pieceSelected);
        if (!selected.length) { showToast('Click a piece in the list →'); return; }
        if (activeBtnEl) activeBtnEl.classList.remove('active');
        activeBtnEl = sw; sw.classList.add('active');
        applySwatchToEntries(item, selected);
      } else {
        const checked = meshEntries.filter(e => e.checked);
        if (!checked.length) { showToast('Select a zone first →'); return; }
        if (activeBtnEl) activeBtnEl.classList.remove('active');
        activeBtnEl = sw; sw.classList.add('active');
        lastAppliedItem = item;
        applySwatchToEntries(item, checked);
      }
    });

    sw.addEventListener('mousedown', e => { e.preventDefault(); startDrag(e, gi, ii); });
    swatchesEl.appendChild(sw);
  });

  _updateZoneCountBadge();
}

function buildCurtainLibrary() {
  const lt = document.getElementById('lib-title');
  if (lt) lt.textContent = 'Curtain Fabrics';

  const tabsEl     = document.getElementById('fabric-tabs');
  const swatchesEl = document.getElementById('fabric-swatches-row');
  if (!tabsEl || !swatchesEl) return;

  tabsEl.querySelectorAll('.fab-tab, .fab-tab-add').forEach(el => el.remove());
  swatchesEl.innerHTML = '';

  const searchInput = document.getElementById('fab-search-input');
  if (searchInput) searchInput.value = '';

  // Fabric type label
  const fabLabel = document.createElement('div');
  fabLabel.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:.08em;color:var(--text-muted);text-transform:uppercase;padding:0 6px;display:flex;align-items:center;align-self:center;white-space:nowrap;flex-shrink:0';
  fabLabel.textContent = 'Fabric Type';
  swatchesEl.appendChild(fabLabel);

  CURTAIN_FABRICS.forEach(f => {
    const sw = document.createElement('div');
    sw.className = 'bar-sw' + (f.id === curtainState.fabric ? ' active' : '');
    sw.dataset.cfab = f.id;
    sw.title = f.label;

    const imgWrap = document.createElement('div');
    imgWrap.className = 'bar-sw-img';
    imgWrap.style.background = f.swatch;

    const nameEl = document.createElement('div');
    nameEl.className = 'bar-sw-name';
    nameEl.textContent = f.label;

    const seriesEl = document.createElement('div');
    seriesEl.className = 'bar-sw-series';
    seriesEl.textContent = 'Curtain';

    sw.appendChild(imgWrap);
    sw.appendChild(nameEl);
    sw.appendChild(seriesEl);

    sw.addEventListener('click', () => {
      swatchesEl.querySelectorAll('.bar-sw[data-cfab]').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      setCurtainFabric(f.id);
    });
    swatchesEl.appendChild(sw);
  });

  // Divider
  const divider = document.createElement('div');
  divider.style.cssText = 'width:1px;height:60px;background:var(--border);margin:0 10px;flex-shrink:0;align-self:center';
  swatchesEl.appendChild(divider);

  // Color label
  const colLabel = document.createElement('div');
  colLabel.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:.08em;color:var(--text-muted);text-transform:uppercase;padding:0 6px;display:flex;align-items:center;align-self:center;white-space:nowrap;flex-shrink:0';
  colLabel.textContent = 'Color';
  swatchesEl.appendChild(colLabel);

  CURTAIN_COLORS.forEach(c => {
    const chip = document.createElement('button');
    chip.className = 'curtain-color-chip' + (c.hex === curtainState.color ? ' active' : '');
    chip.dataset.cclr = c.hex;
    chip.style.cssText = 'flex-shrink:0;align-self:center;background:' + c.hex;
    chip.title = c.label;
    chip.addEventListener('click', () => {
      setCurtainColor(c.hex);
    });
    swatchesEl.appendChild(chip);
  });

  _updateZoneCountBadge();
}

function _applyFabricFilters(typeKey, query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll('#fabric-swatches-row .bar-sw').forEach(sw => {
    const typeMatch = (typeKey === 'all' || sw.dataset.type === typeKey);
    const textMatch = !q || sw.dataset.name.includes(q) || sw.dataset.series.includes(q);
    sw.classList.toggle('hidden', !(typeMatch && textMatch));
  });
}

function filterFabricSearch(value) {
  _applyFabricFilters(window._fabActiveType || 'all', value);
}

