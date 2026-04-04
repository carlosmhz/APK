var FIREBASE_URL  = 'https://puntos-lucciana-default-rtdb.europe-west1.firebasedatabase.app';
var UPLOAD_URL    = 'https://app.mpi-sala.es/pruebas/upload.php';
var DELETE_URL    = 'https://app.mpi-sala.es/pruebas/delete.php';
var fotoPreview   = null; // URL de la foto pendiente de subir
var WHATSAPP_NUM  = '34685688139';

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
  var btnReset  = document.getElementById('btnReset');
  if (user.nombre === 'Carlos') {
    btnBorrar.style.display = 'block';
    btnReset.style.display  = 'block';
  } else {
    btnBorrar.style.display = 'none';
    btnReset.style.display  = 'none';
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
  var img = document.getElementById('imgEstado');
  if (usuarioActual && usuarioActual.nombre === 'Lucciana') {
    if (n > 0) {
      img.src = 'https://carlosmhz.github.io/APK/happy.jpg';
      img.className = 'score-img visible';
    } else if (n < 0) {
      img.src = 'https://carlosmhz.github.io/APK/sad.jpg';
      img.className = 'score-img visible';
    } else {
      img.className = 'score-img';
      img.src = '';
    }
  } else {
    img.className = 'score-img';
    img.src = '';
  }
}

// ── ASIGNAR PUNTOS ────────────────────────────────────────────
function asignarPuntos(signo) {
  var pts = parseInt(document.getElementById('inpPts').value);
  var motivo = document.getElementById('inpMotivo').value.trim();
  if (!pts || pts <= 0) { mostrarToast('Introduce un numero de puntos valido'); return; }
  if (!motivo) { mostrarToast('Escribe el motivo'); return; }
  var cambio = pts * signo;
  var nuevo = scoreActual + cambio;
  var fotoFile = document.getElementById('inpFoto').files[0];
  if (fotoFile) {
    document.getElementById('loaderOverlay').style.display = 'flex';
    var formData = new FormData();
    formData.append('foto', fotoFile);
    fetch(UPLOAD_URL, { method: 'POST', body: formData })
      .then(function(r){ return r.json(); })
      .then(function(data) {
        document.getElementById('loaderOverlay').style.display = 'none';
        var fotoUrl = data.ok ? data.url : null;
        guardarMovimiento(cambio, nuevo, motivo, fotoUrl);
      })
      .catch(function() {
        document.getElementById('loaderOverlay').style.display = 'none';
        guardarMovimiento(cambio, nuevo, motivo, null);
      });
  } else {
    guardarMovimiento(cambio, nuevo, motivo, null);
  }
}

function guardarMovimiento(cambio, nuevo, motivo, fotoUrl) {
  db.ref('puntos').set(nuevo);
  var entry = {
    ts: Date.now(),
    usuario: usuarioActual.nombre,
    motivo: motivo,
    cambio: cambio,
    total: nuevo
  };
  if (fotoUrl) entry.foto = fotoUrl;
  db.ref('historial').push(entry);
  document.getElementById('inpPts').value = '';
  document.getElementById('inpMotivo').value = '';
  document.getElementById('inpFoto').value = '';
  document.getElementById('fotoPreviewImg').style.display = 'none';
  document.getElementById('fotoPreviewImg').src = '';
  mostrarToast((cambio > 0 ? '+' : '') + cambio + ' puntos asignados');
  notificarLucciana(cambio, nuevo, motivo);
}

var pendingWAmsg = '';

function notificarLucciana(cambio, nuevo, motivo) {
  var signo = cambio > 0 ? '+' : '';
  var emoji = cambio > 0 ? '🌟' : '😬';
  pendingWAmsg = emoji + ' Lucciana, ' + usuarioActual.nombre + ' te ha ' +
    (cambio > 0 ? 'sumado ' : 'restado ') +
    signo + cambio + ' puntos por: "' + motivo + '".' +
    '\nTu puntuacion actual es ' + (nuevo > 0 ? '+' : '') + nuevo + ' puntos.';
  var titulo = (cambio > 0 ? '+' : '') + cambio + ' puntos ' + (cambio > 0 ? 'sumados' : 'restados');
  document.getElementById('modalWATitle').textContent = titulo;
  document.getElementById('modalWA').style.display = 'flex';
}

function cerrarModalWA() {
  document.getElementById('modalWA').style.display = 'none';
  pendingWAmsg = '';
}

function enviarWA() {
  document.getElementById('modalWA').style.display = 'none';
  if (pendingWAmsg) {
    var url = 'https://wa.me/' + WHATSAPP_NUM + '?text=' + encodeURIComponent(pendingWAmsg);
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  pendingWAmsg = '';
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
  // Borrar todas las fotos del hosting
  fetch(DELETE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modo: 'todas' })
  }).catch(function(){});
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
      var fotoBtn = item.foto ? '<a href="' + item.foto + '" target="_blank" style="font-size:11px;color:var(--gold);text-decoration:none;margin-top:3px;display:inline-block;">&#x1F4F7; Ver prueba</a>' : '';
      div.innerHTML =
        '<div class="hist-badge ' + (esPos?'pos':'neg') + '">' + (esPos?'+':'-') + Math.abs(item.cambio) + '</div>' +
        '<div class="hist-body">' +
          '<div class="hist-motivo">' + item.motivo + '</div>' +
          '<div class="hist-meta">' + item.usuario + ' · ' + fechaStr + ' · Total: ' + (item.total>0?'+':'') + item.total + '</div>' +
          fotoBtn +
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
  document.getElementById('tabGuia').className   = 'tab' + (tab==='guia'   ? ' on' : '');
  document.getElementById('histCard').style.display    = tab==='hist'   ? 'block' : 'none';
  document.getElementById('guiaSection').style.display = tab==='guia'   ? 'block' : 'none';
  document.querySelector('.score-section').style.display = tab==='puntos' ? 'block' : 'none';
  var esMod = usuarioActual && usuarioActual.rol === 'moderador';
  document.getElementById('actionsSection').style.display = (tab==='puntos' && esMod) ? 'block' : 'none';
  // Mostrar bloque paga solo a Lucciana
  if (tab==='guia' && usuarioActual) {
    document.getElementById('guiaPaga').style.display = usuarioActual.nombre === 'Lucciana' ? 'block' : 'none';
  }
}

// ── TOAST ─────────────────────────────────────────────────────
function previewFoto(input) {
  var img    = document.getElementById('fotoPreviewImg');
  var btnQ   = document.getElementById('fotoQuitarBtn');
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      img.src = e.target.result;
      img.style.display = 'block';
      btnQ.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    img.style.display = 'none';
    btnQ.style.display = 'none';
  }
}

function quitarFoto() {
  document.getElementById('inpFoto').value = '';
  document.getElementById('fotoPreviewImg').style.display = 'none';
  document.getElementById('fotoPreviewImg').src = '';
  document.getElementById('fotoQuitarBtn').style.display = 'none';
}

function mostrarToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show';
  setTimeout(function(){ t.className = 'toast'; }, 2500);
}

window.onload = function() {
  document.getElementById('panelLogin').style.display = 'flex';
};
