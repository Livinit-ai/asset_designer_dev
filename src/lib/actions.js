// Actions — the ONLY setState callers (docs/superpowers/specs §5).
// Modules read via appStore.getState() and mutate via these functions;
// nothing else may call appStore.setState.
//
// Classic script: exposes action functions in the shared global scope.

const SLIDER_DEFAULTS = { brightness: 1.0, roughness: 0.72, metalness: 0, sheen: 0, scale: 10.0, norm: 1.0 };

function setSlider(name, v) {
  appStore.setState(s => ({ sliders: { ...s.sliders, [name]: v } }));
}

function resetSliders() {
  appStore.setState(() => ({ sliders: { ...SLIDER_DEFAULTS } }));
}

function setBaseColor(hex) {
  appStore.setState(() => ({ baseColorHex: hex }));
}

function setModelKey(key) {
  appStore.setState(() => ({ currentModelKey: key }));
}

function setRoomMode(on) {
  appStore.setState(() => ({ roomMode: on }));
}

// Named -State to avoid shadowing room.js's setRoomSection(section) UI handler,
// which is the store-consuming orchestrator (DOM sync + room rebuild).
function setRoomSectionState(section) {
  appStore.setState(() => ({ activeRoomSection: section }));
}

const CURTAIN_STATE_DEFAULTS = { shape:'drape', fabric:'linen', color:'#EDE6D8', widthFactor:1, lengthFactor:1 };

function setCurtain(patch) {
  appStore.setState(s => ({ curtainState: { ...s.curtainState, ...patch } }));
}

// Persists curtain customization across in-session room navigation — room
// rebuilds hard-reset curtainState to defaults. Null until the user changes
// anything.
function saveCurtainState() {
  appStore.setState(s => ({ savedCurtainState: { ...s.curtainState } }));
}

// Room-rebuild reset: defaults overlaid with any saved customization.
function restoreCurtainState() {
  appStore.setState(s => ({
    curtainState: s.savedCurtainState
      ? { ...CURTAIN_STATE_DEFAULTS, ...s.savedCurtainState }
      : { ...CURTAIN_STATE_DEFAULTS },
  }));
}

// key is "<gi>:<ii>" into LIBRARY[currentModelKey], or null to clear.
// renderActiveSwatch() (library.js) syncs the .active class from this.
function setActiveFabric(key) {
  appStore.setState(() => ({ activeFabricKey: key }));
}

function setFinder(patch) {
  appStore.setState(s => ({ finder: { ...s.finder, ...patch } }));
}

// Single mutation entry point for the user's My Fabrics collection. The array
// itself stays in src/catalog.js (CUSTOM_FABRIC_ITEMS) because four LIBRARY
// groups capture it by reference — replacing it immutably would strand them.
// Callers re-render via buildLibrary() after adding.
function addCustomFabric(item) {
  CUSTOM_FABRIC_ITEMS.push(item);
}
