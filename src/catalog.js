// Static data: GLB urls, PolyHaven ids, fabric catalogs, LIBRARY
// Classic script (not a module): top-level let/const/function share the
// global scope across all src/*.js files, preserving original semantics.
// ── Constants ─────────────────────────────────────────────────────────────
const CHAIR_GLB      = '/api/s3proxy?key=custom_assets/chair_split.glb';
const SOFA_GLB       = '/api/s3proxy?key=custom_assets/sofa.glb';
const BED_WOODEN_GLB      = '/api/s3proxy?key=custom_assets/bed_wooden_frame.glb';
const BED_FABRIC_GLB      = '/api/s3proxy?key=custom_assets/bed_fabric_frame.glb';
const ROOM_GLB            = '/api/s3proxy?key=glbs/room_new.glb';
const BEDROOM_ROOM_GLB = '/api/s3proxy?key=glbs/bed_room_uni.glb';
const BEDROOM_SLOTS = {
  bed_wooden: { x: -0.300, z: 1.250, rotY: Math.PI, scale: 1.8 },
  bed_fabric: { x: -0.300, z: 1.250, rotY: Math.PI, scale: 1.8 },
};
function getGLBUrl(key){return{chair:CHAIR_GLB,sofa:SOFA_GLB,bed_wooden:BED_WOODEN_GLB,bed_fabric:BED_FABRIC_GLB}[key]||null;}
const MITY_IMG  = 'https://fabrics.mityinc.com/server/public/fabrics/';
const POLY_API  = 'https://api.polyhaven.com/files/';

const POLY_IDS = {
  fabric:  'fabric_pattern_05',
  vinyl:   'leather_white',
  pu:      'leather_white',
  leather: 'leather_white',
  linen:   'rough_linen',
  wood:    'wood_plank_05',
  twist:   'hessian_230',
  kaleid:  'caban',
};

const SB = '/api/s3proxy?key=';
const MATERIAL_MAPS = {
  fabric:  { norm: [SB+'cotton_fabric/Normal.jpg',  SB+'cotton_fabric/Normal.webp'],
             rough:[SB+'cotton_fabric/Roughness.jpg',SB+'cotton_fabric/Roughness.webp'] },
  linen:   { norm: [SB+'cotton_fabric/Normal.jpg',  SB+'cotton_fabric/Normal.webp'],
             rough:[SB+'cotton_fabric/Roughness.jpg',SB+'cotton_fabric/Roughness.webp'] },
  vinyl:   { norm: [SB+'leather_fabric/Normal.jpg', SB+'leather_fabric/Normal.webp'],
             rough:[SB+'leather_fabric/Roughness.jpg',SB+'leather_fabric/Roughness.webp'] },
  pu:      { norm: [SB+'leather_fabric/Normal.jpg', SB+'leather_fabric/Normal.webp'],
             rough:[SB+'leather_fabric/Roughness.jpg',SB+'leather_fabric/Roughness.webp'] },
  leather: { norm: [SB+'leather_fabric/Normal.jpg', SB+'leather_fabric/Normal.webp'],
             rough:[SB+'leather_fabric/Roughness.jpg',SB+'leather_fabric/Roughness.webp'] },
  wood:    { norm: [SB+'wood_texture/Normal.jpg',   SB+'wood_texture/Normal.webp'],
             rough:[SB+'wood_texture/Roughness.jpg', SB+'wood_texture/Roughness.webp'] },
};

async function loadTexFirstSuccess(urls, isSrgb) {
  for(const url of urls) {
    try { const t = await tryLoadTex(url, isSrgb); if(t) return t; } catch(e){}
  }
  return null;
}

// ── Fabric data (Chair) ───────────────────────────────────────────────────
const MF = MITY_IMG;
const WF = SB + 'wood_texture/custom/';
const CHAIR_WOOD = [
  { code:'ASHWOOD',   name:'Ashwood',   hex:'#c8a882', type:'wood', img: WF+'Ashwood.jpg'   },
  { code:'CASHEW',    name:'Cashew',    hex:'#b08d6b', type:'wood', img: WF+'Cashew.jpg'    },
  { code:'CIDER',     name:'Cider',     hex:'#8b5e3c', type:'wood', img: WF+'Cider.jpg'     },
  { code:'EBONY',     name:'Ebony',     hex:'#2c1f14', type:'wood', img: WF+'Ebony.jpg'     },
  { code:'ELMWOOD',   name:'Elmwood',   hex:'#a07850', type:'wood', img: WF+'Elmwood.jpg'   },
  { code:'KONA',      name:'Kona',      hex:'#5c3a1e', type:'wood', img: WF+'Kona.jpg'      },
  { code:'MINK',      name:'Mink',      hex:'#d0c0a8', type:'wood', img: WF+'Mink.jpg'      },
  { code:'SHORELINE', name:'Shoreline', hex:'#6e5840', type:'wood', img: WF+'Shoreline.jpg' },
].map(c=>({...c,vendor:'mity'}));

const CHAIR_FABRICS = [
  // ── Abilene (vinyl) ───────────────────────────────────────────────────
  {name:'Abilene Bark',    img:MF+'ABILE808V.jpg',    type:'vinyl', series:'Abilene'},
  {name:'Abilene Black',   img:MF+'ABILE9009V.jpg',   type:'vinyl', series:'Abilene'},
  {name:'Abilene Honey',   img:MF+'ABILE606V.jpg',    type:'vinyl', series:'Abilene'},
  {name:'Abilene Oak',     img:MF+'ABILE807V.jpg',    type:'vinyl', series:'Abilene'},
  {name:'Abilene Walnut',  img:MF+'ABILE8006V.jpg',   type:'vinyl', series:'Abilene'},
  // ── All American (fabric) ─────────────────────────────────────────────
  {name:'Adobe White',     img:MF+'adobe-white-.jpg',          type:'fabric', series:'All American'},
  {name:'Alabaster',       img:MF+'alabaster.jpg',             type:'fabric', series:'All American'},
  {name:'American Beauty', img:MF+'american-beauty.jpg',       type:'fabric', series:'All American'},
  {name:'AA Black',        img:MF+'black.jpg',                 type:'fabric', series:'All American'},
  {name:'Blue Ridge',      img:MF+'blue-ridge.jpg',            type:'fabric', series:'All American'},
  {name:'Bright White',    img:MF+'bright-white.jpg',          type:'fabric', series:'All American'},
  {name:'Bronze',          img:MF+'bronze.jpg',                type:'fabric', series:'All American'},
  {name:'Burgundy',        img:MF+'burgundy.jpg',              type:'fabric', series:'All American'},
  {name:'Cinnabar',        img:MF+'cinnabar.jpg',              type:'fabric', series:'All American'},
  {name:'Claret',          img:MF+'all-american_claret.jpg',   type:'fabric', series:'All American'},
  {name:'Crocus',          img:MF+'crocus.jpg',                type:'fabric', series:'All American'},
  {name:'Dove',            img:MF+'dove.jpg',                  type:'fabric', series:'All American'},
  {name:'Dusty Jade',      img:MF+'dusty-jade.jpg',            type:'fabric', series:'All American'},
  {name:'Dutch Blue',      img:MF+'dutch-blue.jpg',            type:'fabric', series:'All American'},
  {name:'Forest',          img:MF+'forest.jpg',                type:'fabric', series:'All American'},
  {name:'Grotto',          img:MF+'grotto.jpg',                type:'fabric', series:'All American'},
  {name:'GunMetal',        img:MF+'gunmetal.jpg',              type:'fabric', series:'All American'},
  {name:'Imperial Blue',   img:MF+'imperial-blue.jpg',         type:'fabric', series:'All American'},
  {name:'Mauve',           img:MF+'mauve.jpg',                 type:'fabric', series:'All American'},
  {name:'Paprika',         img:MF+'paprika.jpg',               type:'fabric', series:'All American'},
  {name:'Parchment',       img:MF+'parchment-.jpg',            type:'fabric', series:'All American'},
  {name:'Plum',            img:MF+'plum.jpg',                  type:'fabric', series:'All American'},
  {name:'Raspberry',       img:MF+'raspberry.jpg',             type:'fabric', series:'All American'},
  {name:'Regimental Blue', img:MF+'regimental-blue.jpg',       type:'fabric', series:'All American'},
  {name:'Royal',           img:MF+'royal.jpg',                 type:'fabric', series:'All American'},
  {name:'Sage',            img:MF+'sage.jpg',                  type:'fabric', series:'All American'},
  {name:'Sand',            img:MF+'sand.jpg',                  type:'fabric', series:'All American'},
  {name:'Sangria',         img:MF+'sangria.jpg',               type:'fabric', series:'All American'},
  {name:'Tea Rose',        img:MF+'tea-rose.jpg',              type:'fabric', series:'All American'},
  {name:'Tomato',          img:MF+'tomato.jpg',                type:'fabric', series:'All American'},
  {name:'Turquoise',       img:MF+'turquoise.jpg',             type:'fabric', series:'All American'},
  {name:'Yew Green',       img:MF+'yew-green.jpg',             type:'fabric', series:'All American'},
  // ── Amarillo (vinyl) ──────────────────────────────────────────────────
  {name:'Amarillo Black',    img:MF+'AMARI9009V.jpg',  type:'vinyl', series:'Amarillo'},
  {name:'Amarillo Cloud',    img:MF+'AMARI66V.jpg',    type:'vinyl', series:'Amarillo'},
  {name:'Amarillo Flame',    img:MF+'AMARI1373V.jpg',  type:'vinyl', series:'Amarillo'},
  {name:'Amarillo Java',     img:MF+'AMARI8009V.jpg',  type:'vinyl', series:'Amarillo'},
  {name:'Amarillo Moccasin', img:MF+'AMARI6010V.jpg',  type:'vinyl', series:'Amarillo'},
  {name:'Amarillo Saddle',   img:MF+'AMARI810V.jpg',   type:'vinyl', series:'Amarillo'},
  {name:'Amarillo Satchel',  img:MF+'AMARI8019V.jpg',  type:'vinyl', series:'Amarillo'},
  // ── Amuse (PU) ────────────────────────────────────────────────────────
  {name:'Amuse Admiral', img:MF+'amuse-admiral.jpg', type:'pu', series:'Amuse'},
  {name:'Amuse Alloy',   img:MF+'amuse-alloy.jpg',   type:'pu', series:'Amuse'},
  {name:'Amuse Mocha',   img:MF+'amuse-mocha.jpg',   type:'pu', series:'Amuse'},
  {name:'Amuse Poppy',   img:MF+'amuse-poppy.jpg',   type:'pu', series:'Amuse'},
  {name:'Amuse Quartz',  img:MF+'amuse-quartz.jpg',  type:'pu', series:'Amuse'},
  // ── Anchor (fabric) ───────────────────────────────────────────────────
  {name:'Anchor Albatross',   img:MF+'Anchor_Albatross.jpg',   type:'fabric', series:'Anchor'},
  {name:'Anchor Cardinal',    img:MF+'Anchor_Cardinal.jpg',    type:'fabric', series:'Anchor'},
  {name:'Anchor Driftwood',   img:MF+'Anchor_Driftwood.jpg',  type:'fabric', series:'Anchor'},
  {name:'Anchor Fog',         img:MF+'Anchor_Fog.jpg',         type:'fabric', series:'Anchor'},
  {name:'Anchor Gull',        img:MF+'Anchor_Gull.jpg',        type:'fabric', series:'Anchor'},
  {name:'Anchor Iceberg',     img:MF+'Anchor_Iceberg.jpg',     type:'fabric', series:'Anchor'},
  {name:'Anchor Ink',         img:MF+'Anchor_Ink.jpg',         type:'fabric', series:'Anchor'},
  {name:'Anchor Iron',        img:MF+'Anchor_Iron.jpg',        type:'fabric', series:'Anchor'},
  {name:'Anchor Pea',         img:MF+'Anchor_Pea.jpg',         type:'fabric', series:'Anchor'},
  {name:'Anchor Salt',        img:MF+'Anchor_Salt.jpg',        type:'fabric', series:'Anchor'},
  {name:'Anchor Sand Dollar',  img:MF+'Anchor_SandDollar.jpg', type:'fabric', series:'Anchor'},
  {name:'Anchor Storm',       img:MF+'Anchor_Storm.jpg',       type:'fabric', series:'Anchor'},
  // ── Archetype (fabric) ────────────────────────────────────────────────
  {name:'Archetype Admiral',    img:MF+'archetype_admiral_zm.jpg',    type:'fabric', series:'Archetype'},
  {name:'Archetype Anchor',     img:MF+'archetype_anchor_zm.jpg',     type:'fabric', series:'Archetype'},
  {name:'Archetype Blackberry', img:MF+'archetype_blackberry_zm.jpg', type:'fabric', series:'Archetype'},
  {name:'Archetype Bourbon',    img:MF+'archetype_bourbon_zm.jpg',    type:'fabric', series:'Archetype'},
  {name:'Archetype Cafe',       img:MF+'archetype_cafe_zm.jpg',       type:'fabric', series:'Archetype'},
  {name:'Archetype Carbon',     img:MF+'300archetype_carbon_zm.jpg',  type:'fabric', series:'Archetype'},
  {name:'Archetype Hemp',       img:MF+'archetype_hemp_zm.jpg',       type:'fabric', series:'Archetype'},
  {name:'Archetype Herbal',     img:MF+'archetype_herbal_zm.jpg',     type:'fabric', series:'Archetype'},
  {name:'Archetype Quartz',     img:MF+'archetype_quartz_zm.jpg',     type:'fabric', series:'Archetype'},
  {name:'Archetype Silt',       img:MF+'archetype_silt_zm.jpg',       type:'fabric', series:'Archetype'},
  {name:'Archetype Smoke',      img:MF+'archetype_smoke_zm.jpg',      type:'fabric', series:'Archetype'},
  {name:'Archetype Vermilion',  img:MF+'archetype_vermilion_zm.jpg',  type:'fabric', series:'Archetype'},
  // ── Aretha (fabric) ───────────────────────────────────────────────────
  {name:'Aretha Midnight', img:MF+'culp-aretha-midnight.jpg', type:'fabric', series:'Aretha'},
  {name:'Aretha Smoke',    img:MF+'culp-aretha-smoke.jpg',    type:'fabric', series:'Aretha'},
  // ── Artisanal EPU (PU) ────────────────────────────────────────────────
  {name:'Art. Blue Grass',  img:MF+'momentum-artisanal-epu-blue-grass.jpg',  type:'pu', series:'Artisanal EPU'},
  {name:'Art. Blushing',    img:MF+'momentum-artisanal-epu-blushing.jpg',    type:'pu', series:'Artisanal EPU'},
  {name:'Art. Brushed Tan', img:MF+'momentum-artisanal-epu-brushed-tan.jpg', type:'pu', series:'Artisanal EPU'},
  {name:'Art. Caspian',     img:MF+'momentum-artisanal-epu-caspian.jpg',     type:'pu', series:'Artisanal EPU'},
  {name:'Art. Cavern',      img:MF+'momentum-artisanal-epu-cavern.jpg',      type:'pu', series:'Artisanal EPU'},
  {name:'Art. Coral',       img:MF+'momentum-artisanal-epu-coral.jpg',       type:'pu', series:'Artisanal EPU'},
  {name:'Art. Fog',         img:MF+'momentum-artisanal-epu-fog.jpg',         type:'pu', series:'Artisanal EPU'},
  {name:'Art. Limoncello',  img:MF+'momentum-artisanal-epu-limoncello.jpg',  type:'pu', series:'Artisanal EPU'},
  {name:'Art. Lunar',       img:MF+'momentum-artisanal-epu-lunar.jpg',       type:'pu', series:'Artisanal EPU'},
  {name:'Art. Matcha',      img:MF+'momentum-artisanal-epu-matcha.jpg',      type:'pu', series:'Artisanal EPU'},
  {name:'Art. Mulberry',    img:MF+'momentum-artisanal-epu-mulberry.jpg',    type:'pu', series:'Artisanal EPU'},
  {name:'Art. Navy',        img:MF+'momentum-artisanal-epu-navy.jpg',        type:'pu', series:'Artisanal EPU'},
  {name:'Art. Oak',         img:MF+'momentum-artisanal-epu-oak.jpg',         type:'pu', series:'Artisanal EPU'},
  {name:'Art. Onyx',        img:MF+'momentum-artisanal-epu-onyx.jpg',        type:'pu', series:'Artisanal EPU'},
  {name:'Art. Pathalo',     img:MF+'momentum-artisanal-epu-pathalo.jpg',     type:'pu', series:'Artisanal EPU'},
  {name:'Art. Pebble',      img:MF+'momentum-artisanal-epu-pebble.jpg',      type:'pu', series:'Artisanal EPU'},
  {name:'Art. Periwinkle',  img:MF+'momentum-artisanal-epu-periwinkle.jpg',  type:'pu', series:'Artisanal EPU'},
  {name:'Art. Raw Sugar',   img:MF+'momentum-artisanal-epu-raw-sugar.jpg',   type:'pu', series:'Artisanal EPU'},
  {name:'Art. Rose Suede',  img:MF+'momentum-artisanal-epu-rose-suede.jpg',  type:'pu', series:'Artisanal EPU'},
  {name:'Art. Seaglass',    img:MF+'momentum-artisanal-epu-seaglass.jpg',    type:'pu', series:'Artisanal EPU'},
  {name:'Art. Shale',       img:MF+'momentum-artisanal-epu-shale.jpg',       type:'pu', series:'Artisanal EPU'},
  {name:'Art. Ski Lift',    img:MF+'momentum-artisanal-epu-ski-lift.jpg',    type:'pu', series:'Artisanal EPU'},
  {name:'Art. Sky',         img:MF+'momentum-artisanal-epu-sky.jpg',         type:'pu', series:'Artisanal EPU'},
  {name:'Art. Taupe',       img:MF+'momentum-artisanal-epu-taupe.jpg',       type:'pu', series:'Artisanal EPU'},
  // ── Berwick Tweed (fabric) ────────────────────────────────────────────
  {name:'BT After Glow',       img:MF+'berwick-tweed_after-glow_100.jpg',        type:'fabric', series:'Berwick Tweed'},
  {name:'BT All Nighter',      img:MF+'berwick-tweed_all-nighter_200.jpg',       type:'fabric', series:'Berwick Tweed'},
  {name:'BT Angels Feather',   img:MF+'berwick-tweed_angels-feather_300.jpg',    type:'fabric', series:'Berwick Tweed'},
  {name:'BT Baja Sunset',      img:MF+'berwick-tweed_baja-sunset_400.jpg',       type:'fabric', series:'Berwick Tweed'},
  {name:'BT Bobcat Whisker',   img:MF+'berwick-tweed_bobcat-whisker_1100.jpg',   type:'fabric', series:'Berwick Tweed'},
  {name:'BT Bodhi Tree',       img:MF+'berwick-tweed_bodhi-tree_500.jpg',        type:'fabric', series:'Berwick Tweed'},
  {name:'BT Carbon Footprint', img:MF+'berwick-tweed_carbon-footprint_600.jpg',  type:'fabric', series:'Berwick Tweed'},
  {name:'BT Cedar Ridge',      img:MF+'berwick-tweed_cedar-ridge_700.jpg',       type:'fabric', series:'Berwick Tweed'},
  {name:'BT Dream Catcher',    img:MF+'berwick-tweed_dream-catcher_800.jpg',     type:'fabric', series:'Berwick Tweed'},
  {name:'BT Labyrinth Walk',   img:MF+'berwick-tweed_labyrinth-walk_900.jpg',    type:'fabric', series:'Berwick Tweed'},
  {name:'BT Mischeavous Mink', img:MF+'berwick-tweed_mischeavous-mink_1000.jpg', type:'fabric', series:'Berwick Tweed'},
  {name:'BT Polished Pewter',  img:MF+'berwick-tweed_polished-pewter_1200.jpg',  type:'fabric', series:'Berwick Tweed'},
  {name:'BT Racoon Eyes',      img:MF+'berwick-tweed_racoon-eyes_1300.jpg',      type:'fabric', series:'Berwick Tweed'},
  {name:'BT Sandy Toes',       img:MF+'berwick-tweed_sandy-toes_1400.jpg',       type:'fabric', series:'Berwick Tweed'},
  {name:'BT Sea Glass',        img:MF+'berwick-tweed_sea-glass_1500.jpg',        type:'fabric', series:'Berwick Tweed'},
  {name:'BT Soft Suede',       img:MF+'berwick-tweed_soft-suede_1600.jpg',       type:'fabric', series:'Berwick Tweed'},
  {name:'BT Spiked Apricot',   img:MF+'berwick-tweed_spiked-apricot_1700.jpg',   type:'fabric', series:'Berwick Tweed'},
  {name:'BT Thai Basil',       img:MF+'berwick-tweed_thai-basil_1800.jpg',       type:'fabric', series:'Berwick Tweed'},
  {name:'BT Tranquality',      img:MF+'berwick-tweed_tranquality_1900.jpg',      type:'fabric', series:'Berwick Tweed'},
  {name:'BT Zen Essence',      img:MF+'berwick-tweed_zen-essence_2000.jpg',      type:'fabric', series:'Berwick Tweed'},
  // ── Beso (fabric) ─────────────────────────────────────────────────────
  {name:'Beso Aqua',    img:MF+'culp-beso-aqua.jpg',     type:'fabric', series:'Beso'},
  {name:'Beso Capri',   img:MF+'culp-beso-capri.jpg',    type:'fabric', series:'Beso'},
  {name:'Beso Chalice', img:MF+'culp-beso-chalice.jpg',  type:'fabric', series:'Beso'},
  {name:'Beso Coral',   img:MF+'culp-beso-coral.jpg',    type:'fabric', series:'Beso'},
  {name:'Beso Dusk',    img:MF+'culp-beso-dusk.jpg',     type:'fabric', series:'Beso'},
  {name:'Beso Flaxen',  img:MF+'culp-beso-flaxen.jpg',   type:'fabric', series:'Beso'},
  {name:'Beso Graphite',img:MF+'culp-beso-graphite.jpg', type:'fabric', series:'Beso'},
  {name:'Beso Harbor',  img:MF+'culp-beso-harbor.jpg',   type:'fabric', series:'Beso'},
  {name:'Beso Jute',    img:MF+'culp-beso-jute.jpg',     type:'fabric', series:'Beso'},
  {name:'Beso Lupine',  img:MF+'culp-beso-lupine.jpg',   type:'fabric', series:'Beso'},
  {name:'Beso Magenta', img:MF+'culp-beso-magenta.jpg',  type:'fabric', series:'Beso'},
  {name:'Beso Onyx',    img:MF+'culp-beso-onyx.jpg',     type:'fabric', series:'Beso'},
  {name:'Beso Peridot', img:MF+'culp-beso-peridot.jpg',  type:'fabric', series:'Beso'},
  {name:'Beso Scarlet', img:MF+'culp-beso-scarlet.jpg',  type:'fabric', series:'Beso'},
  {name:'Beso Silver',  img:MF+'culp-beso-silver.jpg',   type:'fabric', series:'Beso'},
  {name:'Beso Stone',   img:MF+'culp-beso-stone.jpg',    type:'fabric', series:'Beso'},
  // ── Bestie (fabric) ───────────────────────────────────────────────────
  {name:'Bestie Brownstone', img:MF+'culp-bestie-brownstone.jpg', type:'fabric', series:'Bestie'},
  {name:'Bestie Citrine',    img:MF+'culp-bestie-citrine.jpg',    type:'fabric', series:'Bestie'},
  {name:'Bestie H2O',        img:MF+'culp-bestie-h2o.jpg',        type:'fabric', series:'Bestie'},
  {name:'Bestie Lapis',      img:MF+'culp-bestie-lapis.jpg',      type:'fabric', series:'Bestie'},
  {name:'Bestie Mica',       img:MF+'culp-bestie-mica.jpg',       type:'fabric', series:'Bestie'},
  {name:'Bestie Obsidian',   img:MF+'culp-bestie-obsidian.jpg',   type:'fabric', series:'Bestie'},
  {name:'Bestie Onyx',       img:MF+'culp-bestie-onyx.jpg',       type:'fabric', series:'Bestie'},
  {name:'Bestie Peridot',    img:MF+'culp-bestie-peridot.jpg',    type:'fabric', series:'Bestie'},
  {name:'Bestie Pewter',     img:MF+'culp-bestie-pewter.jpg',     type:'fabric', series:'Bestie'},
];

const D = '/api/s3proxy?key=fabric_images/douglass/';
const SOFA_KALEID = [
  {name:'Bazaar',id:'712',hex:'#6b4e5e'},{name:'Bronze',id:'541',hex:'#8b6840'},{name:'Champagne',id:'120',hex:'#d4c4a0'},
  {name:'Chocolate',id:'420',hex:'#5a3820'},{name:'Citron',id:'609',hex:'#8f9a2c'},{name:'Foam',id:'648',hex:'#b8d4cc'},
  {name:'Haze',id:'220',hex:'#a0a8b8'},{name:'Iceberg',id:'942',hex:'#d8e8f0'},{name:'Marsh',id:'104',hex:'#8aa880'},
  {name:'Neptune',id:'628',hex:'#3a7888'},{name:'Saffron',id:'547',hex:'#d4903a'},{name:'Smokehouse',id:'461',hex:'#7a6858'},
  {name:'Taupe',id:'111',hex:'#b8a890'},{name:'Teal',id:'380',hex:'#2a6868'},
].map(c=>({...c,img:D+'5308-'+c.id+'.jpg',pattern:'Kaleidoscope Neo',patId:'5308',vendor:'douglass',type:'vinyl',patKey:'kaleid'}));

const SOFA_TWIST = [
  {name:'Bamboo',id:'119',hex:'#c4b87a'},{name:'Burlap',id:'123',hex:'#c8b890'},{name:'Cadmium',id:'226',hex:'#909898'},
  {name:'Chambray',id:'310',hex:'#6888a8'},{name:'Cotton',id:'993',hex:'#f0ece4'},{name:'Flannel',id:'228',hex:'#989098'},
  {name:'Gauze',id:'942',hex:'#dcd8c8'},{name:'Grasscloth',id:'630',hex:'#789060'},{name:'Hemp',id:'410',hex:'#b0a070'},
  {name:'Henna',id:'443',hex:'#a04830'},{name:'Indigo',id:'376',hex:'#2a3870'},{name:'Kona',id:'481',hex:'#884820'},
  {name:'Linen',id:'945',hex:'#d8c8a0'},{name:'Oxford',id:'104',hex:'#8a9880'},{name:'Parchment',id:'124',hex:'#dcd0b0'},
  {name:'Raffia',id:'153',hex:'#c8b890'},{name:'Sari',id:'332',hex:'#485880'},{name:'Scuba',id:'308',hex:'#3a5888'},
  {name:'Sheer',id:'943',hex:'#e0dcd0'},{name:'Spindel',id:'460',hex:'#807858'},{name:'Tapestry',id:'463',hex:'#6a7058'},
  {name:'Tobacco',id:'440',hex:'#806040'},{name:'Worsted',id:'450',hex:'#a09888'},
].map(c=>({...c,img:D+'5881-'+c.id+'.jpg',pattern:'Twist',patId:'5881',vendor:'douglass',type:'linen',patKey:'twist'}));

const SOFA_LINUM = [
  {name:'805 Bark',hex:'#8b6b48'},{name:'902 Flax',hex:'#d4c090'},{name:'87 Chestnut',hex:'#7a4e30'},
  {name:'97 Gunmetal',hex:'#606870'},{name:'106 Denim',hex:'#4a6888'},{name:'14 Cherry',hex:'#882030'},
  {name:'303 Cerulean',hex:'#3a5888'},{name:'405 Russet',hex:'#8a4828'},{name:'603 Cotton',hex:'#e8e4dc'},
  {name:'705 Sterling',hex:'#a8aab0'},{name:'904 Ash',hex:'#c0bab0'},{name:'909 Raven',hex:'#1a1818'},
  {name:'94 Pewter',hex:'#888880'},
].map(c=>({...c,img:null,pattern:'Linum',vendor:'ennis',type:'linen'}));

const SOFA_CHALLENGER = [
  {name:'98 Charcoal',hex:'#484848'},{name:'909 Raven',hex:'#1a1818'},{name:'602 Mystic White',hex:'#f0ece4'},
  {name:'303 Denim Blue',hex:'#3a5888'},{name:'109 Plum',hex:'#5a2860'},{name:'54 Citron',hex:'#8a9828'},
  {name:'14 Cherry Red',hex:'#882030'},{name:'63 Vanilla',hex:'#e8d8b0'},{name:'605 Cream',hex:'#ece4cc'},
  {name:'609 Taupe',hex:'#b8a888'},{name:'805 Bark',hex:'#8b6b48'},{name:'87 Chestnut',hex:'#7a4e30'},
  {name:'91 Dove',hex:'#d8d4cc'},{name:'97 Slate',hex:'#707880'},{name:'83 Tan',hex:'#c8a878'},
  {name:'64 Pearl',hex:'#e8e4d8'},{name:'66 Diamond',hex:'#d8d8d8'},{name:'802 Mocha',hex:'#806048'},
  {name:'804 Amber',hex:'#c89048'},{name:'809 Chocolate',hex:'#503820'},{name:'86 Earth',hex:'#8a6840'},
  {name:'88 Tobacco',hex:'#784830'},{name:'902 Seagull',hex:'#d0ccc4'},{name:'903 Fog',hex:'#b8b8b0'},
  {name:'905 Steel',hex:'#8898a8'},{name:'908 Chinchilla',hex:'#a8a098'},{name:'102 Champagne',hex:'#dcc8a0'},
  {name:'108 Wine',hex:'#702838'},{name:'17 Garnet',hex:'#781828'},{name:'205 Spring',hex:'#688050'},
  {name:'21 Meadow',hex:'#608858'},{name:'24 Deep Teal',hex:'#1a5860'},{name:'31 Lagoon',hex:'#3a7888'},
  {name:'33 Celeste',hex:'#80b8c8'},
].map(c=>({...c,img:null,pattern:'Challenger',vendor:'ennis',type:'leather'}));

// Mutable — items pushed here by analyzeAndAddFabric(); shared by both chair + sofa
const CUSTOM_FABRIC_ITEMS = [];

const LIBRARY = {
  chair: [
    { group:'My Fabrics', vendor:'Uploaded', vclass:'custom', items: CUSTOM_FABRIC_ITEMS },
    { group:'Faux Wood Finishes',     vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_WOOD },
    { group:'Abilene · Vinyl',        vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_FABRICS.filter(f=>f.series==='Abilene') },
    { group:'All American · Fabric',  vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_FABRICS.filter(f=>f.series==='All American') },
    { group:'Amarillo · Vinyl',       vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_FABRICS.filter(f=>f.series==='Amarillo') },
    { group:'Amuse · PU',             vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_FABRICS.filter(f=>f.series==='Amuse') },
    { group:'Anchor · Fabric',        vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_FABRICS.filter(f=>f.series==='Anchor') },
    { group:'Archetype · Fabric',     vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_FABRICS.filter(f=>f.series==='Archetype') },
    { group:'Aretha · Fabric',        vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_FABRICS.filter(f=>f.series==='Aretha') },
    { group:'Artisanal EPU · PU',     vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_FABRICS.filter(f=>f.series==='Artisanal EPU') },
    { group:'Berwick Tweed · Fabric', vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_FABRICS.filter(f=>f.series==='Berwick Tweed') },
    { group:'Beso · Fabric',          vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_FABRICS.filter(f=>f.series==='Beso') },
    { group:'Bestie · Fabric',        vendor:'MityLite Sierra', vclass:'mity', items: CHAIR_FABRICS.filter(f=>f.series==='Bestie') },
  ],
  sofa: [
    { group:'My Fabrics', vendor:'Uploaded', vclass:'custom', items: CUSTOM_FABRIC_ITEMS },
    { group:'Kaleidoscope Neo', vendor:'Douglass #5308', vclass:'doug', items: SOFA_KALEID },
    { group:'Twist',            vendor:'Douglass #5881', vclass:'doug', items: SOFA_TWIST  },
    { group:'Linum',            vendor:'Ennis Fabrics',  vclass:'ennis',items: SOFA_LINUM  },
    { group:'Challenger',       vendor:'Ennis Fabrics',  vclass:'ennis',items: SOFA_CHALLENGER },
  ],
  bed_wooden: [
    { group:'My Fabrics',            vendor:'Uploaded',         vclass:'custom', items: CUSTOM_FABRIC_ITEMS },
    { group:'Faux Wood Finishes',    vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_WOOD },
    { group:'Abilene · Vinyl',       vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Abilene') },
    { group:'All American · Fabric', vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='All American') },
    { group:'Amarillo · Vinyl',      vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Amarillo') },
    { group:'Amuse · PU',            vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Amuse') },
    { group:'Anchor · Fabric',       vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Anchor') },
    { group:'Archetype · Fabric',    vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Archetype') },
    { group:'Aretha · Fabric',       vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Aretha') },
    { group:'Artisanal EPU · PU',    vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Artisanal EPU') },
    { group:'Berwick Tweed · Fabric',vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Berwick Tweed') },
    { group:'Beso · Fabric',         vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Beso') },
    { group:'Bestie · Fabric',       vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Bestie') },
    { group:'Kaleidoscope Neo',      vendor:'Douglass #5308',   vclass:'doug',   items: SOFA_KALEID },
    { group:'Twist',                 vendor:'Douglass #5881',   vclass:'doug',   items: SOFA_TWIST  },
    { group:'Linum',                 vendor:'Ennis Fabrics',    vclass:'ennis',  items: SOFA_LINUM  },
    { group:'Challenger',            vendor:'Ennis Fabrics',    vclass:'ennis',  items: SOFA_CHALLENGER },
  ],
  bed_fabric: [
    { group:'My Fabrics',            vendor:'Uploaded',         vclass:'custom', items: CUSTOM_FABRIC_ITEMS },
    { group:'Faux Wood Finishes',    vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_WOOD },
    { group:'Abilene · Vinyl',       vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Abilene') },
    { group:'All American · Fabric', vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='All American') },
    { group:'Amarillo · Vinyl',      vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Amarillo') },
    { group:'Amuse · PU',            vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Amuse') },
    { group:'Anchor · Fabric',       vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Anchor') },
    { group:'Archetype · Fabric',    vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Archetype') },
    { group:'Aretha · Fabric',       vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Aretha') },
    { group:'Artisanal EPU · PU',    vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Artisanal EPU') },
    { group:'Berwick Tweed · Fabric',vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Berwick Tweed') },
    { group:'Beso · Fabric',         vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Beso') },
    { group:'Bestie · Fabric',       vendor:'MityLite Sierra',  vclass:'mity',   items: CHAIR_FABRICS.filter(f=>f.series==='Bestie') },
    { group:'Kaleidoscope Neo',      vendor:'Douglass #5308',   vclass:'doug',   items: SOFA_KALEID },
    { group:'Twist',                 vendor:'Douglass #5881',   vclass:'doug',   items: SOFA_TWIST  },
    { group:'Linum',                 vendor:'Ennis Fabrics',    vclass:'ennis',  items: SOFA_LINUM  },
    { group:'Challenger',            vendor:'Ennis Fabrics',    vclass:'ennis',  items: SOFA_CHALLENGER },
  ],
};

