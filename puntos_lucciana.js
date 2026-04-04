var FIREBASE_URL = 'https://puntos-lucciana-default-rtdb.europe-west1.firebasedatabase.app';

var USERS = {
  '1984': { nombre: 'Carlos',   rol: 'moderador' },
  '2233': { nombre: 'Milu',     rol: 'moderador' },
  '4455': { nombre: 'Abuelos',  rol: 'moderador' },
  '1111': { nombre: 'Lucciana', rol: 'lector'    }
};

var firebaseConfig = { databaseURL: FIREBASE_URL };
firebase.initializeApp(firebaseConfig);
var db = firebase.database();

var usuarioActual = null;
var scoreActual = 0;
var tabActual = 'puntos';

// ── LOGIN ─────────────────────────────────────────────────────
function entrar() {
  var pin = document.getElementById('inpLoginPin').value.trim();
  var user = USERS[pin];
  if (!user) {
    document.getElementById('loginErr').style.display = 'block';
    document.getElementById('inpLoginPin').value = '';
    return;
  }
  document.getElementById('loginErr').style.display = 'none';
  usuarioActual = { pin: pin, nombre: user.nombre, rol: user.rol };
  document.getElementById('panelLogin').style.display = 'none';
  document.getElementById('panelApp').style.display = 'flex';
  document.getElementById('headerUser').textContent = user.nombre + ' (' + user.rol + ')';
  if (user.rol === 'lector') {
    document.getElementById('actionsSection').style.display = 'none';
  } else {
    document.getElementById('actionsSection').style.display = 'block';
  }
  // Boton borrar historial solo para Carlos
  var btnBorrar = document.getElementById('btnBorrarHistorial');
  if (user.nombre === 'Carlos') {
    btnBorrar.style.display = 'block';
  } else {
    btnBorrar.style.display = 'none';
  }
  iniciarEscucha();
}

function cerrarSesion() {
  usuarioActual = null;
  document.getElementById('inpLoginPin').value = '';
  document.getElementById('panelLogin').style.display = 'flex';
  document.getElementById('panelApp').style.display = 'none';
  db.ref('puntos').off();
  db.ref('historial').off();
}

// ── FIREBASE ──────────────────────────────────────────────────
function iniciarEscucha() {
  db.ref('puntos').on('value', function(snap) {
    var val = snap.val();
    scoreActual = val !== null ? val : 0;
    actualizarScore(scoreActual);
  });
  db.ref('historial').orderByChild('ts').on('value', function(snap) {
    var items = [];
    snap.forEach(function(child) { items.push(child.val()); });
    items.reverse();
    renderHistorial(items);
  });
}

function actualizarScore(n) {
  var el = document.getElementById('scoreNumber');
  el.textContent = (n > 0 ? '+' : '') + n;
  el.className = 'score-number' + (n > 0 ? ' positive' : n < 0 ? ' negative' : '');
}

// ── ASIGNAR PUNTOS ────────────────────────────────────────────
function asignarPuntos(signo) {
  var pts = parseInt(document.getElementById('inpPts').value);
  var motivo = document.getElementById('inpMotivo').value.trim();
  if (!pts || pts <= 0) { mostrarToast('Introduce un numero de puntos valido'); return; }
  if (!motivo) { mostrarToast('Escribe el motivo'); return; }
  var cambio = pts * signo;
  var nuevo = scoreActual + cambio;
  db.ref('puntos').set(nuevo);
  db.ref('historial').push({
    ts: Date.now(),
    usuario: usuarioActual.nombre,
    motivo: motivo,
    cambio: cambio,
    total: nuevo
  });
  document.getElementById('inpPts').value = '';
  document.getElementById('inpMotivo').value = '';
  mostrarToast((cambio > 0 ? '+' : '') + cambio + ' puntos asignados');
}

// ── BORRAR HISTORIAL (solo Carlos) ───────────────────────────
function confirmarBorrarHistorial() {
  document.getElementById('modalBorrarHist').style.display = 'flex';
}
function cerrarModalBorrarHist() {
  document.getElementById('modalBorrarHist').style.display = 'none';
}
function ejecutarBorrarHistorial() {
  cerrarModalBorrarHist();
  db.ref('historial').remove();
  mostrarToast('Historial borrado');
}

// ── RESET ─────────────────────────────────────────────────────
function confirmarReset() {
  document.getElementById('modalReset').style.display = 'flex';
}
function cerrarModal() {
  document.getElementById('modalReset').style.display = 'none';
}
function ejecutarReset() {
  cerrarModal();
  db.ref('puntos').set(0);
  db.ref('historial').push({
    ts: Date.now(),
    usuario: usuarioActual.nombre,
    motivo: 'RESET SEMANAL',
    cambio: 0,
    total: 0,
    esReset: true
  });
  mostrarToast('Puntuacion reseteada a 0');
}

// ── HISTORIAL ─────────────────────────────────────────────────
function renderHistorial(items) {
  var card = document.getElementById('histCard');
  var empty = document.getElementById('histEmpty');
  if (!items || items.length === 0) {
    empty.style.display = 'block';
    var old = card.querySelectorAll('.hist-item');
    old.forEach(function(el){ el.remove(); });
    return;
  }
  empty.style.display = 'none';
  var old = card.querySelectorAll('.hist-item');
  old.forEach(function(el){ el.remove(); });
  items.forEach(function(item) {
    var div = document.createElement('div');
    div.className = 'hist-item';
    var fecha = new Date(item.ts);
    var fechaStr = fecha.toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit'}) + ' ' + fecha.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    if (item.esReset) {
      div.innerHTML =
        '<div class="hist-badge reset">&#x21BA;</div>' +
        '<div class="hist-body">' +
          '<div class="hist-motivo">Reset semanal</div>' +
          '<div class="hist-meta">' + item.usuario + ' · ' + fechaStr + '</div>' +
        '</div>' +
        '<div class="hist-pts reset">0 pts</div>';
    } else {
      var esPos = item.cambio > 0;
      div.innerHTML =
        '<div class="hist-badge ' + (esPos?'pos':'neg') + '">' + (esPos?'+':'-') + Math.abs(item.cambio) + '</div>' +
        '<div class="hist-body">' +
          '<div class="hist-motivo">' + item.motivo + '</div>' +
          '<div class="hist-meta">' + item.usuario + ' · ' + fechaStr + ' · Total: ' + (item.total>0?'+':'') + item.total + '</div>' +
        '</div>' +
        '<div class="hist-pts ' + (esPos?'pos':'neg') + '">' + (esPos?'+':'') + item.cambio + '</div>';
    }
    card.appendChild(div);
  });
}

// ── TABS ──────────────────────────────────────────────────────
function verTab(tab) {
  tabActual = tab;
  document.getElementById('tabPuntos').className = 'tab' + (tab==='puntos' ? ' on' : '');
  document.getElementById('tabHist').className   = 'tab' + (tab==='hist'   ? ' on' : '');
  document.getElementById('histCard').style.display   = tab==='hist'   ? 'block' : 'none';
  document.querySelector('.score-section').style.display = tab==='puntos' ? 'block' : 'none';
  if (tab==='puntos') document.querySelector('.actions-section') && (document.getElementById('actionsSection').style.display = usuarioActual && usuarioActual.rol==='moderador' ? 'block' : 'none');
  if (tab==='hist') document.getElementById('actionsSection').style.display = 'none';
}

// ── TOAST ─────────────────────────────────────────────────────
function mostrarToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show';
  setTimeout(function(){ t.className = 'toast'; }, 2500);
}

window.onload = function() {
  document.getElementById('panelLogin').style.display = 'flex';
};