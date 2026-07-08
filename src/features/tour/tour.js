// Spotlight onboarding tour controller
// Classic script (not a module): top-level let/const/function share the
// global scope across all src/*.js files, preserving original semantics.
(function(){
  const STEPS = [
    { target:null, pos:null, title:'', desc:'', feats:[] },
    {
      target:'.seg--models', pos:'bottom',
      title:'Choose Your Furniture',
      desc:'Start by picking a piece from the tabs above — Sierra Chair, Haven Sofa, or Fabric Bed. Switch between them any time; your fabric choices are saved per product.',
      feats:[
        {icon:'🪑', text:'Sierra Lounge Chair — MityLite'},
        {icon:'🛋', text:'Haven Sofa — Douglass & Ennis'},
        {icon:'🛏', text:'Fabric Bed — full frame customisation'},
      ]
    },
    {
      target:'#viewport-wrap', pos:'right',
      title:'Interact with the 3D Model',
      desc:'The canvas is fully interactive. Orbit, zoom, and pan to inspect every angle — then click directly on any part of the furniture to select it for fabric application.',
      feats:[
        {icon:'🖱', text:'Drag to orbit the model'},
        {icon:'🔍', text:'Scroll to zoom in and out'},
        {icon:'✋', text:'Right-click + drag to pan'},
        {icon:'👆', text:'Click a part to select it'},
      ]
    },
    {
      target:'.lib-pane', pos:'left',
      title:'Apply Real Fabric Collections',
      desc:'Browse hundreds of textiles sourced from MityLite, Douglass, and Ennis Fabrics. Select a vendor tab, then click any swatch — it applies instantly to your selected part.',
      feats:[
        {icon:'🎨', text:'Hundreds of real textile swatches'},
        {icon:'📷', text:'Upload your own fabric photo'},
        {icon:'🔎', text:'Search by name or collection'},
        {icon:'⚙️', text:'Adjust scale, roughness & brightness'},
      ]
    },
    {
      target:'#nav-room', pos:'bottom',
      title:'Room View & AI Render',
      desc:'Click here to place your configured piece inside a photorealistic room. Adjust the space, reposition furniture, then hit Render in the top bar for a shareable AI image.',
      feats:[
        {icon:'🏠', text:'Fully furnished room environment'},
        {icon:'🪟', text:'Toggle walls, floor, windows & rug'},
        {icon:'✨', text:'AI-generated photorealistic render'},
        {icon:'⬇️', text:'Download your render as an image'},
      ]
    },
  ];

  let _step = 0;
  const PAD = 14;
  const BUBBLE_W = 358;

  window._tourOnReady = function() {
    const bar = document.getElementById('tw-load-bar');
    if (bar) bar.classList.add('done');
    const lbl = document.getElementById('tw-load-label');
    if (lbl) lbl.textContent = 'All models ready ✓';
  };

  window._tourNext = function() {
    if (_step < STEPS.length - 1) { _step++; _render(); }
    else _tourSkip();
  };
  window._tourBack = function() {
    if (_step > 1) { _step--; _render(); }
  };
  window._tourSkip = function() {
    try { localStorage.setItem('livinit_tour_seen_v1', '1'); } catch (e) {}
    const ov = document.getElementById('tour-ov');
    if (!ov) return;
    ov.style.transition = 'opacity .3s';
    ov.style.opacity = '0';
    setTimeout(() => { ov.style.display = 'none'; }, 310);
  };

  function _render() {
    const ov  = document.getElementById('tour-ov');
    const bk  = document.getElementById('tour-back');
    const spt = document.getElementById('tour-spot');
    const bbl = document.getElementById('tour-bubble');
    const wlc = document.getElementById('tour-welcome');
    if (!ov) return;

    ov.classList.add('on');
    const isWelcome = _step === 0;

    bk.classList.toggle('on', isWelcome);
    spt.classList.toggle('on', !isWelcome);
    bbl.classList.toggle('on', !isWelcome);
    wlc.classList.toggle('on', isWelcome);

    if (isWelcome) return;

    const step = STEPS[_step];

    /* — Spotlight — */
    const el = document.querySelector(step.target);
    if (el) {
      const r = el.getBoundingClientRect();
      spt.style.top    = (r.top    - PAD) + 'px';
      spt.style.left   = (r.left   - PAD) + 'px';
      spt.style.width  = (r.width  + PAD*2) + 'px';
      spt.style.height = (r.height + PAD*2) + 'px';
      _placeBubble(r, step.pos);
    }

    /* — Bubble content — */
    document.getElementById('tb-title').textContent = step.title;
    document.getElementById('tb-desc').textContent  = step.desc;
    const featsEl = document.getElementById('tb-feats');
    featsEl.innerHTML = '';
    step.feats.forEach(f => {
      featsEl.innerHTML +=
        `<div class="tb-feat"><div class="tb-feat-icon">${f.icon}</div><span>${f.text}</span></div>`;
    });

    /* — Pill & dots — */
    const total = STEPS.length - 1;
    document.getElementById('tb-pill').textContent = 'Step ' + _step + ' of ' + total;
    const dotsEl = document.getElementById('tb-dots');
    dotsEl.innerHTML = '';
    for (let i = 1; i <= total; i++) {
      const d = document.createElement('button');
      d.className = 'tb-dot' + (i === _step ? ' on' : '');
      d.setAttribute('aria-label', 'Step ' + i);
      d.onclick = (function(n){ return function(){ _step=n; _render(); }; })(i);
      dotsEl.appendChild(d);
    }

    /* — Buttons — */
    document.getElementById('tb-back').disabled = _step <= 1;
    const nxt = document.getElementById('tb-next');
    const isLast = _step === STEPS.length - 1;
    nxt.textContent = isLast ? 'Get Started' : 'Next →';
  }

  function _placeBubble(r, pos) {
    const bbl = document.getElementById('tour-bubble');
    bbl.className = bbl.className.replace(/\ba-\w+/g, '').trim();

    const bh  = bbl.offsetHeight || 260;
    const vw  = window.innerWidth, vh = window.innerHeight;
    const gap = PAD + 18;
    const mg  = 14;
    let top, left, arrow;

    if (pos === 'bottom') {
      top = r.bottom + PAD + gap; left = r.left + r.width/2 - BUBBLE_W/2; arrow = 'a-top';
    } else if (pos === 'top') {
      top = r.top - PAD - gap - bh; left = r.left + r.width/2 - BUBBLE_W/2; arrow = 'a-bottom';
    } else if (pos === 'right') {
      top = r.top + r.height/2 - bh/2; left = r.right + PAD + gap; arrow = 'a-left';
    } else {
      top = r.top + r.height/2 - bh/2; left = r.left - PAD - gap - BUBBLE_W; arrow = 'a-right';
    }

    left = Math.max(mg, Math.min(vw - BUBBLE_W - mg, left));
    top  = Math.max(mg, Math.min(vh - bh - mg, top));

    bbl.style.top  = top + 'px';
    bbl.style.left = left + 'px';
    bbl.style.width = BUBBLE_W + 'px';
    bbl.classList.add(arrow);
  }

  window.addEventListener('resize', () => { if (_step > 0) _render(); });
  // Auto-show the welcome tour only on the FIRST visit. Persisted in localStorage
  // (set by _tourSkip / Get Started) so it no longer pops up on every open.
  let _seen = false;
  try { _seen = !!localStorage.getItem('livinit_tour_seen_v1'); } catch (e) {}
  if (_seen) {
    const ov = document.getElementById('tour-ov');
    if (ov) { ov.classList.remove('on'); ov.style.display = 'none'; }
  } else {
    _render();
  }
})();
