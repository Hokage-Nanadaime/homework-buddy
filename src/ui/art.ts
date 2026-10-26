// @ts-nocheck
/**
 * The one place that draws stamps and Pip (ported from docs/design/e-mix/09-stamp-album.html).
 * Stamp = border (by set) + character (species) + round accessory badge. Pip = ten stages sharing one body and face.
 * Every colour is a token (--st-*, --sk1..7, --pip-*, --gold), so light, dark and Calm come from tokens.css.
 * A locked stamp or Pip is the same drawing as a flat silhouette with no face or badge.
 */
import { STAGES } from '../core/pip';
import { STAMP_SETS as SETS } from '../core/stampDefs';

function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
/* ===== Stamp art generator: one parameterised drawing system =====
   stamp = border (by set) + character (species: ears, face, marks, fur) + accessory badge (glyph).
   Same language as Pip: 3 px ink outline, flat fills, round joins. All colours are tokens (--st-*). */
export const SA = (function () {
  var P = function (d, c) { return '<path class="so ' + (c || 'sf') + '" d="' + d + '"/>'; };
  var E = function (cx, cy, rx, ry, c, rot) { return '<ellipse class="so ' + (c || 'sf') + '" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"' + (rot ? ' transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"' : '') + '/>'; };
  var C = function (cx, cy, r, c) { return '<circle class="so ' + (c || 'sf') + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>'; };
  var LN = function (d) { return '<path class="sl det" d="' + d + '"/>'; };
  var FUR = { face: 'f-face', orange: 'f-orange', brown: 'f-brown', grey: 'f-grey', dgrey: 'f-dgrey', yellow: 'f-yellow', green: 'f-green', pink: 'f-pink' };
  var SP = {
    bear: { fur: 'brown', ear: 'round', face: 'muzzle' }, panda: { fur: 'face', ear: 'rounddark', mark: 'patches', face: 'muzzle', dark: 1 },
    mouse: { fur: 'grey', ear: 'biground', face: 'tiny', whisk: 1 }, turtle: { sp: 'turtle' }, duck: { fur: 'yellow', ear: 'tuft', face: 'beak' },
    owl: { fur: 'brown', ear: 'tufts', mark: 'rings', face: 'beakyellow' }, rabbit: { fur: 'face', ear: 'long', face: 'tiny', whisk: 1 },
    giraffe: { fur: 'yellow', ear: 'horn', mark: 'spots', face: 'muzzle', tall: 1 }, hippo: { fur: 'grey', ear: 'smallround', face: 'snout', wide: 1 },
    penguin: { sp: 'penguin' }, fox: { fur: 'orange', ear: 'point', mark: 'ruff', face: 'muzzle' }, tiger: { fur: 'orange', ear: 'round', mark: 'stripes', face: 'muzzle' },
    elephant: { fur: 'grey', ear: 'big', face: 'trunk' }, koala: { fur: 'grey', ear: 'fluffround', face: 'bignose' }, cat: { fur: 'grey', ear: 'point', mark: 'stripes2', face: 'tiny', whisk: 1 },
    dragon: { fur: 'green', ear: 'hornsmall', mark: 'spikes', face: 'muzzle' }, frog: { fur: 'green', ear: 'eyes', face: 'wide' },
    monkey: { fur: 'brown', ear: 'sideround', mark: 'facepatch', face: 'muzzle' }, cow: { fur: 'face', ear: 'floppydark', mark: 'patches2', face: 'snout', cowhorn: 1 },
    lion: { fur: 'yellow', ear: 'round', mark: 'mane', face: 'muzzle' }, bee: { fur: 'yellow', ear: 'antenna', mark: 'beestripes', face: 'tiny' },
    pig: { fur: 'pink', ear: 'pointsmall', face: 'snout' }, snail: { sp: 'snail' }, dog: { fur: 'face', ear: 'floppydark', mark: 'eyepatch', face: 'muzzle' },
    robot: { fur: 'grey', ear: 'antenna', face: 'none', boxy: 1 }, sheep: { fur: 'grey', ear: 'floppydark', mark: 'wool', face: 'tiny' }, seal: { fur: 'grey', ear: 'none', face: 'tiny', whisk: 1, wide: 1 },
    pip: { sp: 'pip' }, hedgehog: { fur: 'face', ear: 'none', mark: 'hedge', face: 'tiny', wide: 1 }, otter: { fur: 'brown', ear: 'smallround', mark: 'otterface', face: 'tiny', whisk: 1 },
    squirrel: { fur: 'brown', ear: 'point', mark: 'tail', face: 'tiny' }, parrot: { fur: 'green', ear: 'crest', face: 'beakhook' }
  };
  function eyes(dark) { return (dark ? '<circle class="sw det" cx="47" cy="56" r="5.5"/><circle class="sw det" cx="73" cy="56" r="5.5"/>' : '') + '<circle class="sd det" cx="47" cy="56" r="3.4"/><circle class="sd det" cx="73" cy="56" r="3.4"/><circle class="sc det" cx="38" cy="67" r="4.4"/><circle class="sc det" cx="82" cy="67" r="4.4"/>'; }
  var smile = '<path class="sl det" d="M53 71Q60 78 67 71"/>';
  function ears(sp, fur) {
    var f = FUR[fur] || 'f-face';
    switch (sp.ear) {
      case 'round': return C(35, 36, 11, f) + C(85, 36, 11, f) + C(35, 36, 5, 'f-ear det') + C(85, 36, 5, 'f-ear det');
      case 'rounddark': return C(35, 35, 11, 'sd') + C(85, 35, 11, 'sd');
      case 'biground': return C(32, 38, 15, f) + C(88, 38, 15, f) + C(32, 38, 8, 'f-ear det') + C(88, 38, 8, 'f-ear det');
      case 'smallround': return C(39, 33, 8, f) + C(81, 33, 8, f);
      case 'point': return P('M33 46L36 20L54 36Z', f) + P('M87 46L84 20L66 36Z', f) + P('M38 40L39 28L47 36Z', 'f-ear det') + P('M82 40L81 28L73 36Z', 'f-ear det');
      case 'pointsmall': return P('M34 42L30 24L50 33Z', f) + P('M86 42L90 24L70 33Z', f);
      case 'long': return E(45, 22, 8, 22, f, -6) + E(75, 22, 8, 22, f, 6) + E(45, 22, 3.5, 15, 'f-ear det', -6) + E(75, 22, 3.5, 15, 'f-ear det', 6);
      case 'floppydark': return E(30, 56, 9, 19, 'sd', 14) + E(90, 56, 9, 19, 'sd', -14);
      case 'big': return C(25, 58, 18, f) + C(95, 58, 18, f) + C(25, 58, 10, 'f-ear det') + C(95, 58, 10, 'f-ear det');
      case 'horn': return LN('M48 33L45 20M72 33L75 20') + C(45, 18, 4, 'sd') + C(75, 18, 4, 'sd') + E(31, 44, 8, 5, f, -30) + E(89, 44, 8, 5, f, 30);
      case 'hornsmall': return P('M42 36L38 16L52 30Z', 'f-yellow') + P('M78 36L82 16L68 30Z', 'f-yellow');
      case 'tuft': return LN('M54 32Q52 22 58 18M62 32Q62 20 68 18');
      case 'tufts': return P('M36 42L32 18L54 32Z', f) + P('M84 42L88 18L66 32Z', f);
      case 'sideround': return C(26, 60, 12, f) + C(94, 60, 12, f) + C(26, 60, 6, 'f-ear det') + C(94, 60, 6, 'f-ear det');
      case 'fluffround': return C(30, 40, 16, f) + C(90, 40, 16, f) + C(30, 40, 8, 'f-face det') + C(90, 40, 8, 'f-face det');
      case 'antenna': return LN('M50 33L42 14M70 33L78 14') + C(41, 12, 4.5, 'sd') + C(79, 12, 4.5, 'sd');
      case 'eyes': return C(43, 33, 11, f) + C(77, 33, 11, f) + '<circle class="sw det" cx="43" cy="33" r="6"/><circle class="sw det" cx="77" cy="33" r="6"/><circle class="sd det" cx="43" cy="33" r="3.2"/><circle class="sd det" cx="77" cy="33" r="3.2"/>';
      case 'crest': return P('M52 34L48 14L58 28L62 10L66 28L76 16L70 34Z', 'f-orange');
      default: return '';
    }
  }
  function head(sp, fur) {
    var f = FUR[fur] || 'f-face';
    if (sp.boxy) return '<rect class="so ' + f + '" x="30" y="30" width="60" height="56" rx="12"/>';
    if (sp.tall) return E(60, 58, 24, 32, f);
    if (sp.wide) return E(60, 60, 35, 26, f);
    return E(60, 58, 30, 27, f);
  }
  function marks(sp, fur) {
    var m = sp.mark, s = '';
    if (m === 'patches') s += E(46, 56, 8, 10, 'sd det', 15) + E(74, 56, 8, 10, 'sd det', -15);
    if (m === 'rings') s += C(46, 55, 11, 'f-face det') + C(74, 55, 11, 'f-face det');
    if (m === 'spots') s += '<circle class="sd det" cx="50" cy="36" r="3"/><circle class="sd det" cx="70" cy="40" r="3.4"/><circle class="sd det" cx="64" cy="28" r="2.6"/><circle class="sd det" cx="76" cy="30" r="2.6"/>';
    if (m === 'ruff') s += P('M32 62L50 76L36 80Z', 'f-face det') + P('M88 62L70 76L84 80Z', 'f-face det');
    if (m === 'stripes') s += LN('M52 32L56 42M68 32L64 42M60 30V40M32 52L40 54M88 52L80 54M33 62L41 62M87 62L79 62');
    if (m === 'stripes2') s += LN('M54 33L56 41M66 33L64 41M60 31V40');
    if (m === 'beestripes') s += '<path class="sd det" d="M33 48Q60 40 87 48L86 54Q60 46 34 54Z"/>' + '<path class="sd det" d="M30 66Q60 58 90 66L88 72Q60 64 32 72Z"/>';
    if (m === 'facepatch') s += P('M60 50Q48 44 42 54Q38 72 60 78Q82 72 78 54Q72 44 60 50Z', 'f-face det');
    if (m === 'patches2') s += E(44, 44, 9, 7, 'sd det', -20) + E(78, 62, 7, 9, 'sd det', 10);
    if (m === 'eyepatch') s += E(47, 56, 9, 10, 'f-brown det', 0);
    if (m === 'otterface') s += E(60, 70, 19, 12, 'f-face det');
    return s;
  }
  function behind(sp, fur) {
    var m = sp.mark, s = '';
    if (m === 'mane') for (var i = 0; i < 10; i++) { var a = i * 36 * Math.PI / 180; s += C((60 + 36 * Math.cos(a)).toFixed(1), (58 + 33 * Math.sin(a)).toFixed(1), 10.5, 'f-orange'); }
    if (m === 'wool') for (var j = 0; j < 9; j++) { var b = j * 40 * Math.PI / 180; s += C((60 + 33 * Math.cos(b)).toFixed(1), (56 + 30 * Math.sin(b)).toFixed(1), 11, 'f-face'); }
    if (m === 'spikes') s += P('M32 44L24 30L40 38L38 22L50 34L56 16L62 32L72 18L74 36L86 26L82 42Z', 'f-orange');
    if (m === 'hedge') { var p = 'M26 62'; for (var k = 0; k <= 9; k++) { var t = Math.PI + k * Math.PI / 9, r1 = k % 2 ? 40 : 30; p += 'L' + (60 + r1 * Math.cos(t)).toFixed(1) + ' ' + (62 + (r1 - 2) * Math.sin(t)).toFixed(1); } s += P(p + 'L94 62Z', 'f-dgrey'); }
    if (m === 'tail') s += E(96, 52, 13, 27, 'f-brown', 22) + E(96, 54, 6, 17, 'f-face det', 22);
    return s;
  }
  function face(sp) {
    var f = sp.face, s = '';
    var nose = '<ellipse class="sd det" cx="60" cy="65" rx="4.2" ry="3"/>';
    if (f === 'muzzle') s += E(60, 71, 13, 9, 'f-face det') + nose + smile.replace('M53 71Q60 78 67 71', 'M54 74Q60 80 66 74');
    if (f === 'tiny') s += '<circle class="sd det" cx="60" cy="65" r="2.8"/>' + smile;
    if (f === 'beak') s += P('M50 63H70L60 76Z', 'f-orange');
    if (f === 'beakyellow') s += P('M54 62H66L60 76Z', 'f-yellow');
    if (f === 'beakhook') s += P('M50 62Q60 56 70 62Q70 76 60 78Q56 70 50 62Z', 'f-orange');
    if (f === 'snout') s += E(60, 72, 17, 10, 'f-pink') + '<circle class="sd det" cx="54" cy="72" r="2.4"/><circle class="sd det" cx="66" cy="72" r="2.4"/>';
    if (f === 'trunk') s += P('M52 66Q48 96 66 96Q76 94 72 86Q64 92 64 68Z', 'f-grey');
    if (f === 'bignose') s += E(60, 66, 9, 12, 'sd') + smile.replace('M53 71Q60 78 67 71', 'M52 80Q60 86 68 80');
    if (f === 'wide') s += LN('M38 70Q60 90 82 70');
    if (f === 'none') s += LN('M50 74H70');
    if (sp.whisk) s += LN('M30 66L18 63M30 70L18 72M90 66L102 63M90 70L102 72');
    if (sp.cowhorn) s += '';
    return s;
  }
  function special(sp, name) {
    if (sp.sp === 'turtle') return E(60, 70, 36, 25, 'f-green') + LN('M36 70Q60 50 84 70M60 46V95M44 58L40 84M76 58L80 84') + E(34, 90, 9, 6, 'f-green') + E(86, 90, 9, 6, 'f-green') + C(60, 38, 17, 'f-green') + '<circle class="sd det" cx="54" cy="36" r="3"/><circle class="sd det" cx="66" cy="36" r="3"/><path class="sl det" d="M54 44Q60 50 66 44"/><circle class="sc det" cx="48" cy="43" r="3.4"/><circle class="sc det" cx="72" cy="43" r="3.4"/>';
    if (sp.sp === 'penguin') return E(60, 60, 31, 36, 'f-dgrey') + E(60, 70, 19, 25, 'f-face det') + E(30, 66, 8, 20, 'f-dgrey', 12) + E(90, 66, 8, 20, 'f-dgrey', -12) + '<circle class="sw det" cx="49" cy="46" r="6"/><circle class="sw det" cx="71" cy="46" r="6"/><circle class="sd det" cx="49" cy="46" r="3"/><circle class="sd det" cx="71" cy="46" r="3"/>' + P('M53 56H67L60 66Z', 'f-orange') + '<path class="sl det" d="M54 70Q60 74 66 70"/>' + E(48, 94, 9, 4, 'f-orange') + E(72, 94, 9, 4, 'f-orange');
    if (sp.sp === 'snail') return E(56, 88, 34, 10, 'f-face') + C(30, 68, 13, 'f-face') + LN('M26 58L22 42M34 58L38 42') + C(21, 40, 4.5, 'f-face') + C(39, 40, 4.5, 'f-face') + '<circle class="sd det" cx="21" cy="40" r="2"/><circle class="sd det" cx="39" cy="40" r="2"/><path class="sl det" d="M24 72Q30 78 36 72"/>' + C(72, 58, 27, 'f-orange') + '<path class="sl det" d="M72 58m0 0a4 4 0 1 1 5 4a10 10 0 1 1-12-12a16 16 0 1 1 20 20"/>';
    if (sp.sp === 'pip') return P('M60 38V24', 'sl') + P('M60 30C52 22 44 24 42 24C44 32 52 36 60 30Z', 'f-green') + P('M60 30C68 22 76 24 78 24C76 32 68 36 60 30Z', 'f-green') + E(60, 70, 34, 30, 'f-yellow') + '<circle class="sd det" cx="49" cy="66" r="3.6"/><circle class="sd det" cx="71" cy="66" r="3.6"/><circle class="sc det" cx="40" cy="76" r="4.6"/><circle class="sc det" cx="80" cy="76" r="4.6"/><path class="sl det" d="M53 77Q60 85 67 77"/>';
    return '';
  }
  /* accessory glyphs, drawn in a box of +-11 around (0,0) */
  var TX = function (t, fs, y) { return '<text class="gx det" text-anchor="middle" y="' + (y === undefined ? 5 : y) + '" font-size="' + (fs || 15) + '">' + t + '</text>'; };
  var G = function (d, extra) { return '<path class="sl gl det" d="' + d + '"' + (extra || '') + '/>'; };
  var GF = function (d) { return '<path class="sl gf det" d="' + d + '"/>'; };
  var GLYPH = {
    plus: function () { return G('M-7 0H7M0 -7V7'); }, minus: function () { return G('M-7 0H7'); }, times: function () { return G('M-6 -6L6 6M6 -6L-6 6'); },
    divide: function () { return G('M-7 0H7') + '<circle class="sd det" cx="0" cy="-5.5" r="2"/><circle class="sd det" cx="0" cy="5.5" r="2"/>'; },
    num9: function () { return TX('9', 18, 6); }, n80: function () { return TX('80', 12, 4); }, ten: function () { return TX('10', 13, 4); }, n123: function () { return TX('123', 9.5, 3.5); },
    tagN: function () { return TX('N', 16, 6); }, letterA: function () { return TX('a', 18, 6); },
    clock: function () { return '<circle class="sl gl det" cx="0" cy="0" r="8.5"/>' + G('M0 -5V0L4 2'); }, clock15: function () { return '<circle class="sl gl det" cx="0" cy="0" r="8.5"/>' + G('M0 0V-5M0 0H5'); },
    rupee: function () { return G('M-5 -6H6M-5 -2H6M-5 -6H0Q6 -6 6 -2Q6 3 -5 3L4 9'); }, ruler: function () { return G('M-9 3L3 -9L9 -3L-3 9ZM-5 -1L-2 2M0 -5L3 -2'); },
    scale: function () { return G('M0 -9V7M-8 7H8M-9 -4H9M-9 -4L-11 2H-7ZM9 -4L7 2H11Z'); }, jug: function () { return G('M-5 -9H5L6 8H-6ZM6 -4Q11 -4 11 1Q11 5 6 5'); },
    pie: function () { return '<circle class="sl gl det" cx="0" cy="0" r="8.5"/>' + G('M0 0V-8M0 0L7.5 4'); }, triangle: function () { return G('M0 -9L9 7H-9Z'); },
    paw: function () { return '<circle class="sd det" cx="0" cy="3" r="5"/><circle class="sd det" cx="-6.5" cy="-3" r="2.6"/><circle class="sd det" cx="0" cy="-6.5" r="2.6"/><circle class="sd det" cx="6.5" cy="-3" r="2.6"/>'; },
    leaf: function () { return GF('M-8 7Q-8 -7 8 -8Q8 6 -8 7Z') + G('M-6 6L5 -5'); }, heart: function () { return GF('M0 8L-8 0Q-9 -7 -3 -6Q0 -5 0 -2Q0 -5 3 -6Q9 -7 8 0Z'); },
    star: function () { return GF('M0 -9L2.6 -3L9 -2.6L4 1.8L5.6 8L0 4.6L-5.6 8L-4 1.8L-9 -2.6L-2.6 -3Z'); }, sparkle: function () { return GF('M0 -10Q1 -1 10 0Q1 1 0 10Q-1 1 -10 0Q-1 -1 0 -10Z'); },
    swap: function () { return G('M-8 -3H6M3 -6L7 -3L3 0M8 4H-6M-3 1L-7 4L-3 7'); }, run: function () { return G('M-9 0H8M3 -5L8 0L3 5'); }, over: function () { return G('M-9 5Q0 -11 9 5M5 -1L9 5L3 6'); },
    fullstop: function () { return '<circle class="sd det" cx="0" cy="3" r="3.4"/>'; }, split: function () { return G('M-10 -6H-1V6H-10ZM1 -6H10V6H1Z'); },
    openbook: function () { return G('M0 -5Q-5 -8 -10 -6V6Q-5 4 0 7Q5 4 10 6V-6Q5 -8 0 -5ZM0 -5V7'); }, pencil: function () { return G('M-8 8L-6 3L5 -8L8 -5L-3 6ZM-6 3L-3 6'); },
    flag: function () { return G('M-6 -9V9') + GF('M-6 -8H8L4 -3L8 2H-6Z'); }, diamond: function () { return GF('M0 -9L8 0L0 9L-8 0Z'); },
    loop: function () { return G('M-7 2A7 7 0 1 0 -4 -5M-4 -9V-4H-9'); }, bulb: function () { return '<circle class="sl gl det" cx="0" cy="-2" r="6.5"/>' + G('M-3 6H3M-2 9H2'); },
    house: function () { return G('M-9 1L0 -8L9 1M-6 -1V8H6V-1M-2 8V3H2V8'); }, goldleaf: function () { return '<path class="so gold det" d="M-8 7Q-8 -7 8 -8Q8 6 -8 7Z"/>' + G('M-6 6L5 -5'); },
    cal3: function () { return '<rect class="sl gl det" x="-9" y="-8" width="18" height="17" rx="3"/>' + G('M-9 -3H9') + TX('3', 11, 7); }, cal5: function () { return '<rect class="sl gl det" x="-9" y="-8" width="18" height="17" rx="3"/>' + G('M-9 -3H9') + TX('5', 11, 7); },
    sun: function () { var s = '<circle class="sl gl det" cx="0" cy="0" r="4.5"/>'; for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; s += G('M' + (7 * Math.cos(a)).toFixed(1) + ' ' + (7 * Math.sin(a)).toFixed(1) + 'L' + (10 * Math.cos(a)).toFixed(1) + ' ' + (10 * Math.sin(a)).toFixed(1)); } return s; },
    crown: function () { return GF('M-9 7V-4L-4 1L0 -7L4 1L9 -4V7Z'); }, keys: function () { return '<rect class="sl gl det" x="-9" y="-6" width="5" height="5" rx="1.2"/><rect class="sl gl det" x="-2.5" y="-6" width="5" height="5" rx="1.2"/><rect class="sl gl det" x="4" y="-6" width="5" height="5" rx="1.2"/><rect class="sl gl det" x="-9" y="1" width="18" height="5" rx="1.2"/>'; },
    speed: function () { return G('M-10 -4H0M-10 0H4M-10 4H0') + '<circle class="sd det" cx="7" cy="0" r="3"/>'; }, target: function () { return '<circle class="sl gl det" cx="0" cy="0" r="9"/><circle class="sl gl det" cx="0" cy="0" r="4.5"/><circle class="sd det" cx="0" cy="0" r="1.6"/>'; },
    sheet: function () { return G('M-7 -9H4L8 -5V9H-7ZM-4 -2H5M-4 2H5M-4 6H2'); }, trophy: function () { return G('M-6 -8H6V-1Q6 4 0 4Q-6 4 -6 -1ZM0 4V8M-4 8H4M-6 -6H-9Q-9 0 -6 0M6 -6H9Q9 0 6 0'); },
    book12: function () { return '<rect class="sl gl det" x="-8" y="-9" width="16" height="18" rx="2"/>' + TX('12', 9, 4); }, bookR: function () { return '<rect class="sl gl det" x="-8" y="-9" width="16" height="18" rx="2"/>' + TX('R', 11, 4.5); }, bookP: function () { return '<rect class="sl gl det" x="-8" y="-9" width="16" height="18" rx="2"/>' + TX('P', 11, 4.5); }
  };
  /* borders by set */
  function border(kind, gold) {
    var fill = 'sb';
    if (kind === 'scallop') { var p = '', n = 16, R = 49, r = 9; for (var i = 0; i <= n; i++) { var a = i * 2 * Math.PI / n, x = (60 + R * Math.cos(a)).toFixed(1), y = (60 + R * Math.sin(a)).toFixed(1); p += (i ? 'A' + r + ' ' + r + ' 0 0 1 ' : 'M') + x + ' ' + y; } return '<path class="so ' + fill + '" d="' + p + 'Z"/>'; }
    if (kind === 'squircle') return '<rect class="so ' + fill + '" x="7" y="7" width="106" height="106" rx="30"/>';
    if (kind === 'hex') { var q = ''; for (var k = 0; k < 6; k++) { var b = (k * 60 - 90) * Math.PI / 180; q += (k ? 'L' : 'M') + (60 + 56 * Math.cos(b)).toFixed(1) + ' ' + (60 + 56 * Math.sin(b)).toFixed(1); } return '<path class="so ' + fill + '" d="' + q + 'Z"/>'; }
    if (kind === 'circle') return '<circle class="so ' + fill + '" cx="60" cy="60" r="54"/><circle class="sl det" cx="60" cy="60" r="48" stroke-dasharray="2 5" opacity=".55"/>';
    if (kind === 'pebble') return '<path class="so ' + fill + '" d="M62 6C92 4 114 22 112 56C110 92 88 116 56 113C24 110 6 88 8 58C10 28 34 8 62 6Z"/>';
    if (kind === 'keycap') return '<rect class="so ' + fill + '" x="6" y="6" width="108" height="108" rx="26"/><rect class="sl det" x="15" y="15" width="90" height="90" rx="18" opacity=".5"/>';
    if (kind === 'shield') return '<path class="so ' + fill + '" d="M10 16Q60 -2 110 16V62Q110 100 60 118Q10 100 10 62Z"/>';
    if (kind === 'burst') { var s = ''; for (var m = 0; m < 28; m++) { var c = m * Math.PI / 14 - Math.PI / 2, rr = m % 2 ? 49 : 58; s += (m ? 'L' : 'M') + (60 + rr * Math.cos(c)).toFixed(1) + ' ' + (60 + rr * Math.sin(c)).toFixed(1); } return '<path class="so ' + fill + '" d="' + s + 'Z"/>'; }
    return '';
  }
  function character(name) {
    var sp = SP[name] || SP.bear;
    if (sp.sp) return special(sp, name);
    return behind(sp, sp.fur) + ears(sp, sp.fur) + head(sp, sp.fur) + marks(sp, sp.fur) + face(sp) + eyes(sp.dark) + (sp.ear === 'eyes' ? '' : '');
  }
  /* def: {name,set,species,glyph,rarity}; opts: {locked, deco} */
  function stamp(def, opts) {
    opts = opts || {};
    var set = null; for (var i = 0; i < SETS.length; i++) if (SETS[i].id === def.set) set = SETS[i];
    var gold = def.rarity === 'gold', kind = gold ? 'burst' : set.border, fillTok = gold ? 'gold' : set.fill;
    var title = opts.locked ? 'Locked stamp: ' + def.name : def.name;
    var s = '<svg class="stampart ' + (opts.locked ? 'sil ' : '') + fillTok + (gold ? ' isgold' : '') + '" viewBox="0 0 120 120" ' + (opts.deco ? 'aria-hidden="true" focusable="false"' : 'role="img" aria-label="' + esc(title) + '"') + '>';
    s += border(kind, gold);
    s += character(def.species);
    s += '<g transform="translate(95 94)"><circle class="so sbadge" cx="0" cy="0" r="17"/>' + ((GLYPH[def.glyph] || GLYPH.star)()) + '</g>';
    if (gold) s += GLYPH.sparkle().replace(/<path/g, '<path').replace('class="sl gf det"', 'class="sl gf det"') ;
    if (gold) s = s.replace(GLYPH.sparkle(), '') + '<g class="det" transform="translate(16 20) scale(.8)">' + GLYPH.sparkle() + '</g><g class="det" transform="translate(104 24) scale(.55)">' + GLYPH.sparkle() + '</g>';
    return s + '</svg>';
  }
  return { stamp: stamp, species: Object.keys(SP) };
})();


export function pipSVG(stage, title, cls, opts) {
  opts = opts || {}; stage = Math.max(0, Math.min(9, stage));
  var sc = stage === 0 ? 0.84 : 1, rx = 32 * sc, ry = 28 * sc, cy = 108, top = cy - ry;
  var leaf = function (x, y, rot, w) { w = w || 15; return '<path class="o pip-leaf" d="M0 0C' + (w * .5) + ' -' + (w * .9) + ' ' + (w * 1.2) + ' -' + (w * .6) + ' ' + (w * 1.6) + ' 0C' + (w * 1.2) + ' ' + (w * .5) + ' ' + (w * .4) + ' ' + (w * .5) + ' 0 0Z" transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')"/>'; };
  var stem = function (y2, w) { return '<path class="o pip-stem" style="stroke-width:' + (w || 3) + 'px" d="M60 ' + (top + 2) + 'V' + y2 + '"/>'; };
  var blossom = function (x, y) { return '<circle class="o pip-bloom" cx="' + x + '" cy="' + y + '" r="4.6"/>'; };
  var s = '<svg class="pip ' + (opts.sil ? 'pip-sil ' : '') + (cls || '') + '" viewBox="0 0 120 140" role="img" aria-label="' + esc(title || ('Pip, ' + STAGES[stage].name)) + '">';
  s += '<ellipse class="pip-soil" cx="60" cy="134" rx="42" ry="6"/>';
  var i;
  if (stage === 0) s += '<path class="o pip-leaf" d="M54 ' + (top + 3) + 'L60 ' + (top - 8) + 'L66 ' + (top + 3) + 'Z"/>';
  if (stage === 1) s += stem(60) + leaf(60, 62, -25, 12) + leaf(60, 62, -155, 12);
  if (stage === 2) s += stem(38) + leaf(60, 66, -25, 14) + leaf(60, 66, -155, 14) + leaf(60, 50, -30, 13) + leaf(60, 50, -150, 13) + leaf(60, 38, -90, 11);
  if (stage === 3) s += stem(18, 4.5) + leaf(60, 72, -25, 16) + leaf(60, 58, -155, 16) + leaf(60, 44, -28, 15) + leaf(60, 32, -152, 14) + leaf(60, 20, -90, 12);
  if (stage === 4) s += stem(34, 3.5) + leaf(60, 66, -25, 15) + leaf(60, 66, -155, 15) + leaf(60, 50, -30, 13) + leaf(60, 50, -150, 13) + '<path class="o pip-bloom" d="M60 6C71 15 69 28 60 32C51 28 49 15 60 6Z"/>' + leaf(60, 34, -45, 9) + leaf(60, 34, -135, 9);
  if (stage === 5) { s += stem(40, 3.5) + leaf(60, 68, -25, 15) + leaf(60, 68, -155, 15) + leaf(60, 54, -30, 13) + leaf(60, 54, -150, 13); for (i = 0; i < 6; i++) s += '<ellipse class="o pip-bloom" cx="60" cy="16" rx="6.5" ry="9" transform="rotate(' + (i * 60) + ' 60 25)"/>'; s += '<circle class="o pip-core" cx="60" cy="25" r="5.5"/>'; }
  if (stage === 6) { s += '<path class="o pip-trunk" d="M56 ' + (top + 2) + 'V60H64V' + (top + 2) + 'Z"/>'; [[24, 58, 15], [42, 44, 17], [64, 36, 19], [86, 46, 17], [98, 62, 12]].forEach(function (c) { s += '<circle class="o pip-leaf" cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>'; }); s += blossom(36, 40) + blossom(62, 30) + blossom(84, 40) + blossom(98, 58) + blossom(22, 56); }
  if (stage === 7) s += '<path class="o pip-trunk" d="M55 ' + (top + 2) + 'V44H65V' + (top + 2) + 'Z"/><circle class="o pip-leaf" cx="60" cy="32" r="27"/>';
  if (stage === 8 || stage === 9) {
    s += '<path class="o pip-trunk" d="M55 ' + (top + 2) + 'V44H65V' + (top + 2) + 'Z"/><circle class="o pip-leaf" cx="34" cy="44" r="17"/><circle class="o pip-leaf" cx="86" cy="44" r="17"/><circle class="o pip-leaf" cx="60" cy="27" r="23"/>';
    var spots = [[50, 20], [70, 24], [32, 40], [42, 52], [80, 52], [90, 38]];
    spots.forEach(function (p) { s += stage === 8 ? blossom(p[0], p[1]) : '<circle class="o pip-fruit" cx="' + p[0] + '" cy="' + p[1] + '" r="5.6"/>'; });
  }
  s += '<ellipse class="o pip-body" cx="60" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/>';
  s += '<g class="det"><circle class="pip-eye" cx="' + (60 - 11 * sc) + '" cy="' + (cy - 3) + '" r="3.4"/><circle class="pip-eye" cx="' + (60 + 11 * sc) + '" cy="' + (cy - 3) + '" r="3.4"/>' +
    '<circle class="pip-cheek" cx="' + (60 - 20 * sc) + '" cy="' + (cy + 6) + '" r="4.5"/><circle class="pip-cheek" cx="' + (60 + 20 * sc) + '" cy="' + (cy + 6) + '" r="4.5"/>' +
    '<path class="o" fill="none" d="M53 ' + (cy + 5) + 'Q60 ' + (cy + 13) + ' 67 ' + (cy + 5) + '"/></g>';
  var gl = Math.min(opts.leaves || 0, 5), pos = [[10, 122, -50], [110, 122, 230], [20, 134, -20], [100, 134, 200], [60, 139, 0]];
  for (i = 0; i < gl; i++) s += '<path class="o pip-gold det" d="M0 0C4 -9 11 -10 15 -8C14 0 8 6 0 0Z" transform="translate(' + pos[i][0] + ' ' + pos[i][1] + ') rotate(' + pos[i][2] + ')"/>';
  return s + '</svg>';
}

/* Pip's orchard: the small friends planted after the Fruit Tree, one per 10 points, drawn side by side (the last few if there are many).
   Six kinds in a fixed order (core/pip.ts ORCHARD_FRIENDS), drawn from the same tokens and ink outline as Pip. A flat shadow when planted-not-yet. */
export function orchardSVG(count, title) {
  var W = 44, shown = Math.min(count, 8), first = count - shown, i;
  var t = function (x, h) { return '<path class="o pip-trunk" d="M' + (x - 3) + ' 50V' + (50 - h) + 'H' + (x + 3) + 'V50Z"/>'; };
  var fruit = function (x, y) { return '<circle class="o pip-fruit" cx="' + x + '" cy="' + y + '" r="3.6"/>'; };
  var KIND = [
    function (x) { return t(x, 14) + '<circle class="o pip-leaf" cx="' + x + '" cy="22" r="16"/>' + fruit(x - 6, 20) + fruit(x + 7, 25) + fruit(x + 1, 14); },
    function (x) { return t(x, 14) + '<ellipse class="o pip-leaf" cx="' + x + '" cy="22" rx="13" ry="18"/>' + fruit(x - 4, 24) + fruit(x + 5, 17); },
    function (x) { return t(x, 14) + '<circle class="o pip-leaf" cx="' + x + '" cy="22" r="16"/><circle class="o pip-bloom" cx="' + (x - 6) + '" cy="19" r="3.6"/><circle class="o pip-bloom" cx="' + (x + 6) + '" cy="24" r="3.6"/><circle class="o pip-bloom" cx="' + (x + 1) + '" cy="13" r="3.6"/>'; },
    function (x) { var s = '<path class="o pip-stem" style="stroke-width:3px" d="M' + x + ' 50V22"/><path class="o pip-leaf" d="M' + x + ' 40C' + (x + 8) + ' 34 ' + (x + 12) + ' 38 ' + (x + 13) + ' 42C' + (x + 8) + ' 44 ' + (x + 3) + ' 44 ' + x + ' 40Z"/>'; for (var k = 0; k < 8; k++) s += '<ellipse class="o pip-bloom" cx="' + x + '" cy="12" rx="4" ry="7" transform="rotate(' + (k * 45) + ' ' + x + ' 20)"/>'; return s + '<circle class="o pip-trunk" cx="' + x + '" cy="20" r="5"/>'; },
    function (x) { return '<ellipse class="o pip-leaf" cx="' + x + '" cy="38" rx="19" ry="13"/>' + fruit(x - 8, 36) + fruit(x + 4, 31) + fruit(x + 10, 40) + fruit(x - 2, 42); },
    function (x) { return t(x, 14) + '<circle class="o pip-leaf" cx="' + (x - 8) + '" cy="26" r="11"/><circle class="o pip-leaf" cx="' + (x + 8) + '" cy="26" r="11"/><circle class="o pip-leaf" cx="' + x + '" cy="17" r="12"/>' + fruit(x - 8, 28) + fruit(x + 8, 28) + fruit(x, 17); }
  ];
  var s = '<svg class="pip orchardart" viewBox="0 0 ' + (W * Math.max(shown, 1)) + ' 60" role="img" aria-label="' + esc(title || ('Pip\'s orchard, ' + count)) + '">';
  s += '<ellipse class="pip-soil" cx="' + (W * Math.max(shown, 1) / 2) + '" cy="55" rx="' + (W * Math.max(shown, 1) / 2 - 2) + '" ry="4"/>';
  for (i = 0; i < shown; i++) s += KIND[(first + i) % KIND.length](W * i + W / 2);
  return s + '</svg>';
}
