var ENVASES = ['Taza de ColaCao','Taza del m&m','Tazon del Real Madrid','Tazon grande blanco'];
var SABORES = ['ColaCao','Leche normal y corriente'];
var ACOMPS  = ['Sobao','Galletas','Croissant','Bizcocho de chocolate','Croissant chocolate','Pan de leche'];
var CHARS   = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
var BASE    = 'https://carlosmhz.github.io/APK/menu_carlos.html';
var payload = null;
var enlaceGenerado = '';

function xor(str, pin) {
  var out = '';
  for (var i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
  }
  return out;
}

function toHex(s) {
  var h = '';
  for (var i = 0; i < s.length; i++) {
    h += ('0' + s.charCodeAt(i).toString(16)).slice(-2).toUpperCase();
  }
  return h;
}

function fromHex(h) {
  var s = '';
  for (var i = 0; i < h.length; i += 2) {
    s += String.fromCharCode(parseInt(h.slice(i, i + 2), 16));
  }
  return s;
}

function verVista(v) {
  document.getElementById('vistaCarlos').style.display   = v === 'carlos'   ? 'block' : 'none';
  document.getElementById('vistaLucciana').style.display = v === 'lucciana' ? 'block' : 'none';
  document.getElementById('tabCarlos').className   = 'tab' + (v === 'carlos'   ? ' on' : '');
  document.getElementById('tabLucciana').className = 'tab' + (v === 'lucciana' ? ' on' : '');
}

function generar() {
  var ei  = document.getElementById('selEnvase').value;
  var si  = document.getElementById('selSabor').value;
  var ai  = document.getElementById('selAcomp').value;
  var ri  = document.getElementById('selRecompensa').value.trim();
  var pin = document.getElementById('inpPin').value.trim();
  if (ei === '' || si === '' || ai === '') { alert('Elige envase, sabor y acompanamiento'); return; }
  if (ri === '') { alert('Escribe la recompensa'); return; }
  if (pin.length !== 4 || isNaN(Number(pin))) { alert('El PIN debe ser 4 digitos'); return; }
  var pedido  = CHARS[Number(ei)] + CHARS[Number(si)] + CHARS[Number(ai)];
  var cifrado = toHex(xor('OK:' + ri, pin));
  enlaceGenerado = BASE + '?p=' + pedido + '&r=' + cifrado;
  document.getElementById('codebox').style.display = 'block';
}

function whatsapp() {
  if (!enlaceGenerado) return;
  var msg = 'Hola Lucciana!\n\nCarlos te manda tu tarea de hoy:\n' + enlaceGenerado + '\n\nCuando la tengas lista, pideme el PIN para tu recompensa!';
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function cargarDesdeURL() {
  var params = new URLSearchParams(window.location.search);
  var p = params.get('p');
  var r = params.get('r');
  if (!p || !r) {
    document.getElementById('sinTarea').style.display = 'block';
    return;
  }
  var ei = CHARS.indexOf(p[0]);
  var si = CHARS.indexOf(p[1]);
  var ai = CHARS.indexOf(p[2]);
  if (ei < 0 || ei >= ENVASES.length || si < 0 || si >= SABORES.length || ai < 0 || ai >= ACOMPS.length) {
    document.getElementById('sinTarea').style.display = 'block';
    return;
  }
  payload = { e: ENVASES[ei], s: SABORES[si], a: ACOMPS[ai], r: r };
  document.getElementById('outEnvase').textContent = payload.e;
  document.getElementById('outSabor').textContent  = payload.s;
  document.getElementById('outAcomp').textContent  = payload.a;
  document.getElementById('contenidoTarea').style.display = 'block';
  verVista('lucciana');
}

function desbloquear() {
  var pin = document.getElementById('inpPinLucciana').value.trim();
  document.getElementById('errPin').style.display = 'none';
  if (!payload || pin.length !== 4) { document.getElementById('errPin').style.display = 'block'; return; }
  try {
    var descifrado = xor(fromHex(payload.r), pin);
    if (descifrado.slice(0, 3) !== 'OK:') { document.getElementById('errPin').style.display = 'block'; return; }
    var recompensa = descifrado.slice(3);
    document.getElementById('lockbox').style.display     = 'none';
    document.getElementById('outRecompensa').textContent  = recompensa;
    document.getElementById('rewardbox').style.display    = 'block';
  } catch(e) {
    document.getElementById('errPin').style.display = 'block';
  }
}

window.onload = function() {
  var params = new URLSearchParams(window.location.search);
  if (params.get('p')) {
    cargarDesdeURL();
  }
};