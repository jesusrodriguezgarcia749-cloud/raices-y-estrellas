/* Raíces y Estrellas · Plataforma docente · Entrega 3: acceso, panel directivo, calificación, tablero y reportes PDF */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, serverTimestamp, addDoc, query, where, Timestamp, increment } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyB0IzYArTNquMl5-zphxdW9G4wcYmPgekA",
  authDomain: "raices-y-estrellas-est17.firebaseapp.com",
  projectId: "raices-y-estrellas-est17",
  storageBucket: "raices-y-estrellas-est17.firebasestorage.app",
  messagingSenderId: "666765040335",
  appId: "1:666765040335:web:a5bae72abc2dbd1b7035ba"
};
const CUENTAS = { directivo: 'directivos@est17.mx', maestro: 'maestros@est17.mx' };
const INICIO_CICLO = SEMANAS[0].inicio;

window.__rye_modulo = true;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });

/* ---------- Utilidades ---------- */
const $ = s => document.querySelector(s);
const vista = $('#vista');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoyISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const LISTA_GRUPOS = Object.entries(GRUPOS).flatMap(([g, ls]) => ls.map(l => ({ grado: +g, grupo: l, id: g + l })));
const ASIGNATURAS = [...new Set(LECTURAS.map(l => l.asignatura))].sort((a, b) => a.localeCompare(b, 'es'));
const NOM_GRADO = { 1: '1.er grado', 2: '2.º grado', 3: '3.er grado' };
const CURP_RE = /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/;
const normal = t => String(t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const limpiarNombre = t => String(t ?? '').replace(/\s+/g, ' ').trim();
const nombreCompleto = a => [a.paterno, a.materno, a.nombres].filter(Boolean).join(' ');
const ordenAlumno = (a, b) => (a.lista || 999) - (b.lista || 999) || nombreCompleto(a).localeCompare(nombreCompleto(b), 'es');

function aviso(texto, mal = false) {
  const el = $('#aviso'); el.textContent = texto; el.classList.toggle('mal', mal); el.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => { el.hidden = true; }, 3800);
}
function abrirModal(titulo, html) {
  $('#modal-tit').textContent = titulo; $('#modal-cuerpo').innerHTML = html; $('#modal').hidden = false;
  const primero = $('#modal-cuerpo').querySelector('input,select,button'); if (primero) primero.focus();
}
function cerrarModal() { $('#modal').hidden = true; $('#modal-cuerpo').innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.classList.contains('modal-cerrar')) cerrarModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) cerrarModal(); });
function descargar(nombre, blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
async function bitacora(accion, detalle) {
  try { await addDoc(collection(db, 'bitacora'), { accion, detalle, quien: estado.nombre || estado.rol, fecha: serverTimestamp() }); } catch (e) { /* no detiene el trabajo */ }
}
function actualizarRed() { $('#red').hidden = navigator.onLine; }
addEventListener('online', actualizarRed); addEventListener('offline', actualizarRed); actualizarRed();

/* ---------- Estado ---------- */
const estado = { rol: null, nombre: null, alumnos: [], maestros: [], claves: 0, clavesMap: {}, califs: {}, aplic: {}, pestana: 'tablero', config: {}, grupoSel: '1G', verBajas: false, filtro: '', subs: [] };

/* ---------- Memoria en el teléfono y sincronización por cambios ----------
   Cada colección se guarda en el teléfono (IndexedDB). Al abrir, se muestra lo guardado al instante
   y a Firebase solo se le piden los documentos que cambiaron desde la última vez. */
const idb = (() => {
  let p; const abrir = () => p || (p = new Promise((ok, mal) => { const r = indexedDB.open('raices-y-estrellas', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); }));
  const op = (modo, f) => abrir().then(d => new Promise((ok, mal) => { const t = d.transaction('kv', modo), q = f(t.objectStore('kv')); t.oncomplete = () => ok(q && q.result); t.onerror = () => mal(t.error); }));
  return { get: k => op('readonly', st => st.get(k)).catch(() => null), set: (k, v) => op('readwrite', st => st.put(v, k)).catch(e => console.warn(e)), limpiar: () => op('readwrite', st => st.clear()).catch(() => {}) };
})();
const msDe = t => !t ? 0 : typeof t.toMillis === 'function' ? t.toMillis() : t.seconds ? t.seconds * 1000 : 0;
const MARGEN = 5 * 60 * 1000; // se vuelve a pedir un poco antes de la última marca, por seguridad
const mem = {}, tGuardar = {};
function guardarLocal(col) { clearTimeout(tGuardar[col]); tGuardar[col] = setTimeout(() => idb.set('col:' + col, mem[col]), 1200); }
const SYNC = [
  { col: 'alumnos', campo: 'actualizado', inicial: () => collection(db, 'alumnos'), aplicar: m => { estado.alumnos = Object.values(m); } },
  { col: 'maestros', campo: 'actualizado', inicial: () => collection(db, 'maestros'), aplicar: m => { estado.maestros = Object.entries(m).map(([id, d]) => ({ id, ...d })); } },
  { col: 'calificaciones', campo: 'fecha', inicial: () => query(collection(db, 'calificaciones'), where('ciclo', '==', CICLO)), aplicar: m => { estado.califs = m; } },
  { col: 'aplicaciones', campo: 'fecha', inicial: () => collection(db, 'aplicaciones'), aplicar: m => { estado.aplic = m; } },
  { col: 'claves', campo: null, inicial: () => collection(db, 'claves'), aplicar: m => { estado.clavesMap = m; estado.claves = Object.keys(m).length; } },
];
let subsDatos = [], versionActual = null;

async function iniciarSync() {
  estado.subs.forEach(f => f()); estado.subs = [];
  await Promise.all(SYNC.map(async s => { mem[s.col] = (await idb.get('col:' + s.col)) || { docs: {}, marca: 0, completo: false }; s.aplicar(mem[s.col].docs); }));
  refrescar();
  versionActual = null;
  estado.subs.push(onSnapshot(doc(db, 'config', 'escuela'), d => {
    estado.config = d.exists() ? d.data() : {};
    const v = estado.config.version || 0, guardada = +(localStorage.getItem('rye_version') || 0);
    if (versionActual === null) { versionActual = v; arrancarDatos(v !== guardada); }
    else if (v !== versionActual) { versionActual = v; arrancarDatos(true); } // la dirección borró algo: rehacer memoria
  }, errorDatos));
  estado.subs.push(() => { subsDatos.forEach(f => f()); subsDatos = []; });
}
async function arrancarDatos(completo) {
  subsDatos.forEach(f => f()); subsDatos = []; estado.sincronizando = true; refrescar();
  try {
    for (const s of SYNC) {
      const m = mem[s.col];
      if (completo || !m.completo || !s.campo) {
        if (!s.campo && m.completo && !completo) { /* claves: ya guardadas */ }
        else {
          const snap = await getDocs(s.inicial()); m.docs = {}; m.marca = 0;
          snap.docs.forEach(d => { const x = d.data(); m.docs[d.id] = x; if (s.campo) m.marca = Math.max(m.marca, msDe(x[s.campo])); });
          m.completo = true; s.aplicar(m.docs); guardarLocal(s.col);
        }
      }
      if (!s.campo) continue;
      subsDatos.push(onSnapshot(query(collection(db, s.col), where(s.campo, '>', Timestamp.fromMillis(Math.max(0, m.marca - MARGEN)))), snap => {
        let cambio = false;
        snap.docChanges().forEach(ch => {
          if (ch.type === 'removed') return;
          const x = ch.doc.data(); if (s.col === 'calificaciones' && x.ciclo !== CICLO) return;
          m.docs[ch.doc.id] = x; cambio = true; m.marca = Math.max(m.marca, msDe(x[s.campo]));
        });
        if (cambio) { s.aplicar(m.docs); guardarLocal(s.col); refrescar(); }
      }, errorDatos));
    }
    localStorage.setItem('rye_version', String(versionActual || 0));
    estado.sincronizado = new Date();
  } catch (e) { console.error(e); aviso('No se pudieron actualizar los datos. Se muestra lo guardado en este teléfono.', true); }
  estado.sincronizando = false; refrescar();
}
async function recargarTodo() { for (const s of SYNC) mem[s.col].completo = false; await arrancarDatos(true); aviso('Datos actualizados por completo.'); }
// Avisar a todos los teléfonos que rehagan su memoria (después de borrar algo).
async function avisarBorrado() { try { await setDoc(doc(db, 'config', 'escuela'), { version: increment(1) }, { merge: true }); } catch (e) { console.warn(e); } }
function errorDatos(e) { console.error(e); aviso('No se pudieron leer los datos. Revisa que las reglas de seguridad estén publicadas.', true); }
let refrescar = () => {};

/* ---------- Acceso ---------- */
onAuthStateChanged(auth, usuario => {
  if (!usuario) { estado.subs.forEach(f => f()); estado.subs = []; pantallaAcceso(); return; }
  estado.rol = usuario.email === CUENTAS.directivo ? 'directivo' : usuario.email === CUENTAS.maestro ? 'maestro' : null;
  if (!estado.rol) { signOut(auth); return; }
  $('#cab-usuario').hidden = false;
  iniciarSync();
  if (estado.rol === 'directivo') { estado.nombre = 'Directivo'; $('#cab-nombre').textContent = 'Panel directivo'; refrescar = panelDirectivo; panelDirectivo(); }
  else { estado.nombre = localStorage.getItem('rye_docente'); refrescar = pantallaDocente; pantallaDocente(); }
});
$('#btn-salir').addEventListener('click', async () => {
  if (!confirm('¿Cerrar sesión? Se borrarán de este teléfono los datos guardados de los alumnos.')) return;
  localStorage.removeItem('rye_docente'); localStorage.removeItem('rye_version'); await idb.limpiar(); await signOut(auth);
});

function pantallaAcceso() {
  $('#cab-usuario').hidden = true; refrescar = () => {};
  let rol = 'maestro';
  vista.innerHTML = `
  <section class="acceso"><div class="acceso-caja">
    <h1>Plataforma docente</h1>
    <p>Calificación y seguimiento de la estrategia de comprensión lectora.</p>
    <div class="roles" role="group" aria-label="Tipo de acceso">
      <button type="button" class="rol" data-rol="maestro" aria-pressed="true"><strong>Soy docente</strong><span>Para calificar y consultar a los alumnos.</span></button>
      <button type="button" class="rol" data-rol="directivo" aria-pressed="false"><strong>Soy directivo</strong><span>Para administrar alumnos, maestros y reportes.</span></button>
    </div>
    <form id="f-acceso" novalidate>
      <div class="campo"><label for="clave">Contraseña</label><input id="clave" type="password" autocomplete="current-password" required></div>
      <p id="acceso-error" class="error" role="alert"></p>
      <button class="btn oro" style="width:100%" type="submit">Entrar</button>
    </form>
  </div></section>`;
  vista.querySelectorAll('.rol').forEach(b => b.addEventListener('click', () => {
    rol = b.dataset.rol; vista.querySelectorAll('.rol').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#clave').focus();
  }));
  $('#f-acceso').addEventListener('submit', async e => {
    e.preventDefault(); const err = $('#acceso-error'); err.textContent = '';
    const clave = $('#clave').value; if (!clave) { err.textContent = 'Escribe la contraseña.'; return; }
    const btn = e.submitter; btn.disabled = true; btn.textContent = 'Entrando…';
    try { await signInWithEmailAndPassword(auth, CUENTAS[rol], clave); }
    catch (x) {
      err.textContent = x.code === 'auth/network-request-failed' ? 'No hay conexión a internet. Intenta de nuevo con señal.' : 'La contraseña no es correcta para este tipo de acceso.';
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });
}

/* ---------- Semanas y utilidades de calificación ---------- */
const fISO = iso => { const p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const rangoSem = s => { const a = fISO(s.inicio), b = fISO(s.fin); return a.getMonth() === b.getMonth() ? `${a.getDate()} al ${b.getDate()} de ${MESES[b.getMonth()]}` : `${a.getDate()} de ${MESES[a.getMonth()]} al ${b.getDate()} de ${MESES[b.getMonth()]}`; };
function semanaVigente() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  let actual = null, ultima = 0;
  SEMANAS.forEach(s => { const desde = fISO(s.inicio); desde.setDate(desde.getDate() - 2); if (hoy >= desde) ultima = s.sem; if (hoy >= desde && hoy <= fISO(s.fin)) actual = s; });
  return { actual, ultima }; // ultima: la semana más reciente que ya comenzó
}
const CRIT = RUBRICA.criterios;
const NIVEL_CORTO = ['Requiere apoyo', 'En proceso', 'Satisfactorio', 'Sobresaliente'];
function colorDe(c) { return c == null ? 'gris' : c >= 8.5 ? 'verde' : c >= 7 ? 'amarillo' : c >= 6 ? 'azul' : 'rojo'; }
const NOMBRE_COLOR = { verde: 'Verde', amarillo: 'Amarillo', azul: 'Azul', rojo: 'Rojo', gris: 'Sin calificar' };
const lecturaPorId = id => LECTURAS.find(l => l.id === id);
const idCalif = (curp, lec) => `${curp}_${lec}`;
const idAplic = (lec, g, gr) => `${lec}_${g}${gr}`;
const TIPO1 = { 1: 'Fábula', 2: 'Leyenda', 3: 'Mito' };
const hecho = c => !!(c && c.estado && c.estado !== 'anulada');
const califDe = (curp, lec) => { const c = estado.califs[idCalif(curp, lec)]; return hecho(c) ? c : null; };

// Alumnos a quienes corresponde una lectura en un grupo: activos en ese grupo e inscritos antes de que terminara la semana.
function alumnosDe(lec, grado, grupo) {
  const s = SEMANAS[lec.semana - 1];
  return estado.alumnos.filter(a => a.estado === 'activo' && a.grado === grado && a.grupo === grupo && (!a.fechaAlta || a.fechaAlta <= s.fin)).sort(ordenAlumno);
}
function avance(lec, grado, grupo) {
  const al = alumnosDe(lec, grado, grupo);
  const hechos = al.filter(a => califDe(a.curp, lec.id)).length;
  return { total: al.length, hechos };
}

/* ---------- Docente ---------- */
const ui = { pantalla: 'inicio', lec: null, grado: null, grupo: null, idx: 0, abiertos: {} };

function miMaestro() { return estado.maestros.find(m => m.nombre === estado.nombre); }

function pantallaDocente() {
  const activos = estado.maestros.filter(m => m.activo !== false).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  if (!estado.nombre || (estado.maestros.length && !miMaestro())) {
    if (estado.nombre && estado.maestros.length && !miMaestro()) { localStorage.removeItem('rye_docente'); estado.nombre = null; }
    $('#cab-nombre').textContent = 'Docente';
    vista.innerHTML = `<div class="tarjeta"><h2>¿Quién eres?</h2><p class="ayuda">Toca tu nombre. Así queda registrado quién califica cada lectura. Solo se pide la primera vez en este teléfono.</p>
      <div class="lista-nombres">${activos.map(m => `<button type="button" data-n="${esc(m.nombre)}">${esc(m.nombre)}<span>${esc((m.asignaturas || []).join(', '))}</span></button>`).join('') || '<p class="vacio">Todavía no hay maestros registrados. Pide a la dirección que te dé de alta.</p>'}</div></div>`;
    vista.querySelectorAll('.lista-nombres button').forEach(b => b.addEventListener('click', () => { estado.nombre = b.dataset.n; localStorage.setItem('rye_docente', estado.nombre); ui.pantalla = 'inicio'; pantallaDocente(); }));
    return;
  }
  $('#cab-nombre').textContent = estado.nombre;
  const m = miMaestro(); if (!m) { vista.innerHTML = '<div class="cargando">Cargando…</div>'; return; }
  const { ultima } = semanaVigente();
  // Lecturas relevantes: las que califica y las que aplica, hasta la semana vigente.
  const califica = LECTURAS.filter(l => (m.asignaturas || []).includes(l.asignatura) && (m.grados || []).includes(l.grado) && l.semana <= Math.max(ultima, 1));
  const aplicaIC = (m.asignaturas || []).includes('Integración Curricular');
  const ids = new Set(califica.map(l => l.id));
  if (ui.lec) ids.add(ui.lec.id);
  if (aplicaIC) LECTURAS.filter(l => l.semana === Math.max(ultima, 1)).forEach(l => ids.add(l.id));
  if (ui.pantalla === 'calificar' && ui.lec) return pantallaCalificar();
  if (ui.pantalla === 'tablero') return tablero(vista, volverInicio);
  inicioDocente(m, califica, aplicaIC, ultima);
}

function tarjetaGrupo(lec, g, gr, accion) {
  const { total, hechos } = avance(lec, g, gr), pct = total ? Math.round(hechos / total * 100) : 0;
  return `<button type="button" class="t-grupo" data-accion="${accion}" data-lec="${lec.id}" data-g="${g}" data-gr="${gr}">
    <b>${g}.° ${gr}</b><span>${total ? `${hechos} de ${total} calificados` : 'Sin alumnos registrados'}</span><span class="progreso"><i style="width:${pct}%"></i></span></button>`;
}

function inicioDocente(m, califica, aplicaIC, ultima) {
  const sem = SEMANAS[Math.max(ultima, 1) - 1];
  const deEstaSemana = califica.filter(l => l.semana === sem.sem);
  const pendientes = califica.filter(l => l.semana < sem.sem && GRUPOS[l.grado].some(gr => { const a = avance(l, l.grado, gr); return a.hechos < a.total; }));
  let html = `<div class="saludo"><h1>Hola, ${esc(estado.nombre)}</h1>
    <p class="ayuda">Semana ${sem.sem} de 30, del ${rangoSem(sem)}.</p></div>`;

  if (aplicaIC) {
    const lecs = LECTURAS.filter(l => l.semana === sem.sem && (m.grados || []).includes(l.grado));
    html += `<section class="tarjeta"><h2>Esta semana aplicas</h2><p class="ayuda">Imprime las hojas ya ordenadas por número de lista y, al terminar la sesión, marca quién faltó.</p>
      ${lecs.map(l => `<div class="bloque-lec"><p class="lec-tit"><span class="etq g${l.grado}">${l.grado}.° grado</span> ${esc(l.titulo)}</p>
        <div class="grupos-apl">${GRUPOS[l.grado].map(gr => { const ap = estado.aplic?.[idAplic(l.id, l.grado, gr)];
          return `<div class="apl"><div><b>${l.grado}.° ${gr}</b>${ap ? `<span class="ok">Aplicada, ${ap.faltas?.length || 0} faltas</span>` : '<span>Sin registrar</span>'}</div>
          <div class="fila-btn"><button type="button" class="btn linea chico" data-hojas="${l.id}" data-g="${l.grado}" data-gr="${gr}" aria-label="Imprimir hojas de ${l.grado}.° ${gr}">Hojas</button><button type="button" class="btn chico" data-faltas="${l.id}" data-g="${l.grado}" data-gr="${gr}" aria-label="Registrar faltas de ${l.grado}.° ${gr}">Faltas</button></div></div>`; }).join('')}</div></div>`).join('') || '<p class="vacio">No tienes grados asignados.</p>'}
    </section>`;
  }

  html += `<section class="tarjeta"><h2>Esta semana te toca calificar</h2>
    ${deEstaSemana.length ? deEstaSemana.map(l => `<div class="bloque-lec"><p class="lec-tit"><span class="etq g${l.grado}">${l.grado}.° grado</span> ${esc(l.titulo)}</p>
      <div class="t-grupos">${GRUPOS[l.grado].map(gr => tarjetaGrupo(l, l.grado, gr, 'calificar')).join('')}</div></div>`).join('')
      : `<p class="vacio">Esta semana la lectura la califican otras asignaturas.</p>`}
  </section>`;

  if (pendientes.length) html += `<section class="tarjeta"><h2>Pendientes de semanas anteriores</h2>
    ${pendientes.map(l => `<div class="bloque-lec"><p class="lec-tit"><span class="etq g${l.grado}">${l.grado}.° grado</span> Semana ${l.semana}: ${esc(l.titulo)}</p>
      <div class="t-grupos">${GRUPOS[l.grado].map(gr => tarjetaGrupo(l, l.grado, gr, 'calificar')).join('')}</div></div>`).join('')}</section>`;

  html += `<button type="button" class="btn oro ancho-total" id="ir-tablero">Consultar alumnos, semáforo y reportes</button>
  <section class="tarjeta"><h2>Calificar otra lectura</h2><p class="ayuda">Por ejemplo, si cubres a un compañero.</p>
    <div class="otra"><select id="o-lec" aria-label="Lectura">${[1, 2, 3].map(g => `<optgroup label="${NOM_GRADO[g]}">${LECTURAS.filter(l => l.grado === g && l.semana <= Math.max(ultima, 1)).map(l => `<option value="${l.id}" ${l.semana === sem.sem && l.grado === ((m.grados || [1])[0]) ? 'selected' : ''}>Semana ${l.semana}: ${esc(l.titulo)}</option>`).join('')}</optgroup>`).join('')}</select>
    <button type="button" class="btn linea" id="o-ir">Elegir grupo</button></div></section>
    <p style="text-align:center"><button type="button" class="btn-texto oscuro" id="cambiar-nombre">No soy ${esc(estado.nombre)}</button></p>`;
  vista.innerHTML = html;

  vista.querySelectorAll('[data-accion="calificar"]').forEach(b => b.addEventListener('click', () => abrirCalificar(b.dataset.lec, +b.dataset.g, b.dataset.gr)));
  vista.querySelectorAll('[data-hojas]').forEach(b => b.addEventListener('click', () => imprimirHojas(lecturaPorId(b.dataset.hojas), +b.dataset.g, b.dataset.gr)));
  vista.querySelectorAll('[data-faltas]').forEach(b => b.addEventListener('click', () => registrarFaltas(lecturaPorId(b.dataset.faltas), +b.dataset.g, b.dataset.gr)));
  $('#o-ir').addEventListener('click', () => { const l = lecturaPorId($('#o-lec').value);
    abrirModal('Elige el grupo', `<p>${esc(l.titulo)}</p><div class="t-grupos">${GRUPOS[l.grado].map(gr => `<button type="button" class="t-grupo" data-gr="${gr}"><b>${l.grado}.° ${gr}</b></button>`).join('')}</div>`);
    $('#modal-cuerpo').querySelectorAll('[data-gr]').forEach(b => b.addEventListener('click', () => { cerrarModal(); abrirCalificar(l.id, l.grado, b.dataset.gr); })); });
  $('#cambiar-nombre').addEventListener('click', () => { localStorage.removeItem('rye_docente'); estado.nombre = null; pantallaDocente(); });
  $('#ir-tablero').addEventListener('click', () => { ui.pantalla = 'tablero'; rep.vista = 'resumen'; pantallaDocente(); scrollTo(0, 0); });
}

/* Registrar faltas (Integración Curricular) */
function registrarFaltas(lec, g, gr) {
  const al = alumnosDe(lec, g, gr), ap = estado.aplic?.[idAplic(lec.id, g, gr)], faltas = new Set(ap?.faltas || []);
  abrirModal(`Faltas de ${g}.° ${gr}`, `<p class="ayuda">${esc(lec.titulo)}. Marca solo a quienes no estuvieron en la sesión.</p>
    <div class="lista-check">${al.map(a => `<label class="check"><input type="checkbox" value="${a.curp}" ${faltas.has(a.curp) ? 'checked' : ''}> ${a.lista}. ${esc(nombreCompleto(a))}</label>`).join('') || '<p class="vacio">Este grupo no tiene alumnos registrados.</p>'}</div>
    <button type="button" class="btn oro" id="g-faltas" style="margin-top:1rem">Guardar: lectura aplicada</button>`);
  $('#g-faltas').addEventListener('click', async () => {
    const lista = [...document.querySelectorAll('.lista-check input:checked')].map(x => x.value);
    await setDoc(doc(db, 'aplicaciones', idAplic(lec.id, g, gr)), { lectura: lec.id, grado: g, grupo: gr, faltas: lista, docente: estado.nombre, fecha: serverTimestamp() });
    // Las faltas se registran también como "No asistió" si aún no tienen calificación.
    const lote = writeBatch(db);
    lista.forEach(curp => { const id = idCalif(curp, lec.id); if (!califDe(curp, lec.id)) lote.set(doc(db, 'calificaciones', id), { curp, lectura: lec.id, grado: g, grupo: gr, estado: 'falta', niveles: null, puntos: null, calificacion: null, docente: estado.nombre, ciclo: CICLO, fecha: serverTimestamp() }); });
    // En pantalla y en el teléfono de inmediato, aunque no haya señal.
    mem.aplicaciones.docs[idAplic(lec.id, g, gr)] = { lectura: lec.id, grado: g, grupo: gr, faltas: lista, docente: estado.nombre, fecha: null };
    lista.forEach(curp => { const id = idCalif(curp, lec.id); if (!califDe(curp, lec.id)) mem.calificaciones.docs[id] = { curp, lectura: lec.id, grado: g, grupo: gr, estado: 'falta', niveles: null, puntos: null, calificacion: null, docente: estado.nombre, ciclo: CICLO, fecha: null }; });
    guardarLocal('aplicaciones'); guardarLocal('calificaciones');
    lote.commit().catch(e => console.error(e));
    cerrarModal(); refrescar(); aviso(`Lectura registrada en ${g}.° ${gr}: ${lista.length} faltas.`);
  });
}

/* ---------- Pantalla de calificación ---------- */
function abrirCalificar(lecId, g, gr) {
  ui.pantalla = 'calificar'; ui.lec = lecturaPorId(lecId); ui.grado = g; ui.grupo = gr; ui.abiertos = {};
  const al = alumnosDe(ui.lec, g, gr);
  const primero = al.findIndex(a => !califDe(a.curp, lecId));
  ui.idx = primero < 0 ? 0 : primero;
  ui.borrador = null;
  pantallaDocente(); scrollTo(0, 0);
}

function pantallaCalificar() {
  const lec = ui.lec, al = alumnosDe(lec, ui.grado, ui.grupo);
  const y = scrollY;
  if (!al.length) {
    vista.innerHTML = `<button type="button" class="btn-texto oscuro" id="volver">‹ Volver</button><div class="tarjeta"><h2>${ui.grado}.° ${ui.grupo} sin alumnos</h2><p>Pide a la dirección que suba la lista de este grupo.</p></div>`;
    $('#volver').addEventListener('click', volverInicio); return;
  }
  ui.idx = Math.min(ui.idx, al.length - 1);
  const a = al[ui.idx], guardada = califDe(a.curp, lec.id);
  if (!ui.borrador || ui.borrador.curp !== a.curp) ui.borrador = { curp: a.curp, niveles: { ...(guardada?.niveles || {}) } };
  const niv = ui.borrador.niveles, completos = CRIT.every(c => niv[c.id]);
  const puntos = completos ? CRIT.reduce((s, c) => s + niv[c.id], 0) : null;
  const cal = guardada?.estado === 'calificado' ? guardada.calificacion : completos ? puntos / 2 : null;
  const est = guardada?.estado;
  const { total, hechos } = avance(lec, ui.grado, ui.grupo);
  const clave = estado.clavesMap[lec.id] || (estado.claves ? {} : null);
  const abierto = k => ui.abiertos[k] ? 'open' : '';
  const faltaIC = estado.aplic?.[idAplic(lec.id, ui.grado, ui.grupo)]?.faltas?.includes(a.curp);

  vista.innerHTML = `
  <div class="cal-cab">
    <button type="button" class="btn-texto oscuro" id="volver">‹ Mis lecturas</button>
    <h1 class="cal-tit">${esc(lec.titulo)}</h1>
    <p class="ayuda">${ui.grado}.° ${ui.grupo}, ${TIPO1[lec.grado].toLowerCase()} de la semana ${lec.semana}. ${hechos} de ${total} calificados.</p>
    <div class="progreso"><i style="width:${total ? hechos / total * 100 : 0}%"></i></div>
  </div>
  <details class="desp" data-k="texto" ${abierto('texto')}><summary>Texto de la lectura</summary><p class="texto-lec">${esc(lec.texto)}</p></details>
  <details class="desp" data-k="preg" ${abierto('preg')}><summary>Preguntas</summary><ol>${lec.preguntas.map(p => `<li>${esc(p)}</li>`).join('')}</ol></details>
  <details class="desp clave" data-k="clave" ${abierto('clave')}><summary>Clave del docente</summary>${!clave ? '<p class="ayuda">Cargando…</p>' : clave.respuesta ? `<p><b>Respuesta:</b> ${esc(clave.respuesta)}</p><p><b>Moraleja:</b> ${esc(clave.moraleja)}</p>` : clave.ensenanza ? `<p><b>Enseñanza:</b> ${esc(clave.ensenanza)}</p>` : '<p class="ayuda">La dirección aún no carga las claves.</p>'}</details>

  <div class="tira" role="list" aria-label="Alumnos del grupo">${al.map((x, i) => { const c = califDe(x.curp, lec.id);
    const col = !c ? 'vacio' : c.estado === 'calificado' ? colorDe(c.calificacion) : 'gris';
    return `<button type="button" role="listitem" class="punto ${col} ${i === ui.idx ? 'actual' : ''}" data-i="${i}" aria-label="${x.lista}. ${esc(nombreCompleto(x))}">${x.lista}</button>`; }).join('')}</div>

  <article class="alumno-cal">
    <div class="al-cab">
      <div><span class="al-num">${a.lista}</span><h2>${esc(nombreCompleto(a))}</h2></div>
      <div class="al-cal ${est === 'calificado' || completos ? colorDe(cal) : 'gris'}">${est === 'falta' ? 'No asistió' : est === 'no_entrego' ? 'No entregó' : cal != null ? `<b>${cal.toFixed(1)}</b><span>${puntos ?? guardada?.puntos} de 20 puntos</span>` : '<span>Sin calificar</span>'}</div>
    </div>
    ${faltaIC && !est ? '<p class="nota-falta">Integración Curricular lo registró como ausente.</p>' : ''}
    <div class="rub">${CRIT.map(c => `<div class="crit">
      <p class="crit-n">${esc(c.nombre)}</p>
      <div class="niveles" role="radiogroup" aria-label="${esc(c.nombre)}">${[4, 3, 2, 1].map(n => `<button type="button" role="radio" aria-checked="${niv[c.id] === n}" class="nv n${n}" data-c="${c.id}" data-n="${n}"><b>${n}</b><span>${NIVEL_CORTO[n - 1]}</span></button>`).join('')}</div>
      ${niv[c.id] ? `<p class="desc">${esc(c.niveles[niv[c.id] - 1])}</p>` : ''}</div>`).join('')}</div>
    <div class="fila-btn estados">
      <button type="button" class="btn linea chico ${est === 'falta' ? 'marcado' : ''}" data-estado="falta">No asistió</button>
      <button type="button" class="btn linea chico ${est === 'no_entrego' ? 'marcado' : ''}" data-estado="no_entrego">No entregó</button>
      ${est ? '<button type="button" class="btn-texto oscuro" data-estado="limpiar">Quitar</button>' : ''}
    </div>
    <div class="nav-al">
      <button type="button" class="btn linea" id="ant" ${ui.idx === 0 ? 'disabled' : ''}>‹ Anterior</button>
      <button type="button" class="btn" id="sig" ${ui.idx === al.length - 1 ? 'disabled' : ''}>Siguiente ›</button>
    </div>
  </article>
  <div class="herr">
    <button type="button" class="btn linea chico" id="h-captura">Hoja de captura para imprimir</button>
    <button type="button" class="btn linea chico" id="h-excel">Descargar Excel del grupo</button>
    <button type="button" class="btn linea chico" id="h-subir">Subir Excel calificado</button>
    <input type="file" id="h-archivo" accept=".xlsx" hidden>
  </div>`;
  scrollTo(0, y);

  $('#volver').addEventListener('click', volverInicio);
  vista.querySelectorAll('details.desp').forEach(d => d.addEventListener('toggle', () => { ui.abiertos[d.dataset.k] = d.open; }));
  vista.querySelectorAll('.punto').forEach(b => b.addEventListener('click', () => irA(+b.dataset.i)));
  $('#ant').addEventListener('click', () => irA(ui.idx - 1));
  $('#sig').addEventListener('click', () => irA(ui.idx + 1));
  vista.querySelectorAll('.nv').forEach(b => b.addEventListener('click', () => elegirNivel(a, b.dataset.c, +b.dataset.n)));
  vista.querySelectorAll('[data-estado]').forEach(b => b.addEventListener('click', () => marcarEstado(a, b.dataset.estado)));
  $('#h-captura').addEventListener('click', () => imprimirCaptura(lec, ui.grado, ui.grupo));
  $('#h-excel').addEventListener('click', () => excelGrupo(lec, ui.grado, ui.grupo));
  $('#h-subir').addEventListener('click', () => $('#h-archivo').click());
  $('#h-archivo').addEventListener('change', e => { if (e.target.files[0]) leerExcelGrupo(e.target.files[0], lec, ui.grado, ui.grupo); e.target.value = ''; });
}
function volverInicio() { ui.pantalla = 'inicio'; ui.lec = null; ui.borrador = null; rep.vista = 'resumen'; rep.grupo = null; pantallaDocente(); scrollTo(0, 0); }
function irA(i) { ui.idx = i; ui.borrador = null; pantallaCalificar(); document.querySelector('.tira')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); document.querySelector('.punto.actual')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }

async function guardarCalif(a, datos) {
  const lec = ui.lec, id = idCalif(a.curp, lec.id), previa = califDe(a.curp, lec.id);
  const reg = { curp: a.curp, lectura: lec.id, grado: ui.grado, grupo: ui.grupo, docente: estado.nombre, ciclo: CICLO, fecha: serverTimestamp(), ...datos };
  estado.califs[id] = { ...reg, fecha: null }; guardarLocal('calificaciones'); // respuesta inmediata y queda en el teléfono aunque no haya señal
  try { await setDoc(doc(db, 'calificaciones', id), reg); } catch (e) { console.error(e); aviso('No se pudo guardar. Se reintentará al volver la conexión.', true); }
  if (previa && reg.estado !== 'anulada' && (previa.puntos !== reg.puntos || previa.estado !== reg.estado))
    bitacora('corrección de calificación', `${nombreCompleto(a)}, ${lec.id}: ${previa.estado === 'calificado' ? previa.calificacion : previa.estado} a ${reg.estado === 'calificado' ? reg.calificacion : reg.estado} (antes: ${previa.docente || '—'})`);
}

function elegirNivel(a, crit, n) {
  const niv = ui.borrador.niveles; niv[crit] = n;
  const eraCompleto = califDe(a.curp, ui.lec.id)?.estado === 'calificado';
  if (CRIT.every(c => niv[c.id])) {
    const puntos = CRIT.reduce((s, c) => s + niv[c.id], 0);
    guardarCalif(a, { estado: 'calificado', niveles: { ...niv }, puntos, calificacion: puntos / 2 });
    aviso(`${nombreCompleto(a)}: ${(puntos / 2).toFixed(1)}, ${NOMBRE_COLOR[colorDe(puntos / 2)].toLowerCase()}. Guardado.`);
    pantallaCalificar();
    if (!eraCompleto) { // avanza solo al siguiente alumno sin calificar
      const al = alumnosDe(ui.lec, ui.grado, ui.grupo);
      const sig = al.findIndex((x, i) => i > ui.idx && !califDe(x.curp, ui.lec.id));
      setTimeout(() => { if (ui.pantalla !== 'calificar') return;
        if (sig > -1) irA(sig); else if (al.every(x => califDe(x.curp, ui.lec.id))) aviso(`¡Grupo completo! ${al.length} de ${al.length} alumnos.`); }, 650);
    }
  } else pantallaCalificar();
}
function marcarEstado(a, est) {
  const id = idCalif(a.curp, ui.lec.id);
  if (est === 'limpiar') {
    const previa = califDe(a.curp, ui.lec.id); ui.borrador = null;
    guardarCalif(a, { estado: 'anulada', niveles: null, puntos: null, calificacion: null });
    if (previa) bitacora('calificación quitada', `${nombreCompleto(a)}, ${ui.lec.id} (antes: ${previa.estado === 'calificado' ? previa.calificacion : previa.estado})`);
    pantallaCalificar(); return;
  }
  ui.borrador = { curp: a.curp, niveles: {} };
  guardarCalif(a, { estado: est, niveles: null, puntos: null, calificacion: null });
  const al = alumnosDe(ui.lec, ui.grado, ui.grupo);
  const sig = al.findIndex((x, i) => i > ui.idx && !califDe(x.curp, ui.lec.id));
  pantallaCalificar(); if (sig > -1) setTimeout(() => irA(sig), 500);
}

/* ---------- Impresión ---------- */
function imprimir(html) {
  const zona = $('#impresion'); zona.innerHTML = html; document.body.classList.add('imprimiendo');
  const fin = () => { document.body.classList.remove('imprimiendo'); zona.innerHTML = ''; removeEventListener('afterprint', fin); };
  addEventListener('afterprint', fin); setTimeout(() => print(), 300);
}
function imprimirHojas(lec, g, gr) {
  const al = alumnosDe(lec, g, gr);
  if (!al.length) { aviso('Este grupo no tiene alumnos registrados.', true); return; }
  imprimir(al.map(a => `<section class="hoja-imp">
    <div class="imp-membrete">Escuela Secundaria Técnica N.° 17, Turno Vespertino. Raíces y Estrellas, ciclo ${CICLO}</div>
    <div class="imp-alumno"><span><b>N.° ${a.lista}</b></span><span>${esc(nombreCompleto(a))}</span><span>${g}.° ${gr}</span><span>Fecha: ________</span></div>
    <p class="imp-tipo">${TIPO1[lec.grado]} ${lec.num} de 30, semana ${lec.semana}</p>
    <h1>${esc(lec.titulo)}</h1><p class="imp-texto">${esc(lec.texto)}</p>
    <h2>Preguntas de comprensión lectora</h2>
    <ol>${lec.preguntas.map(p => `<li>${esc(p)}<span class="renglones"></span></li>`).join('')}</ol></section>`).join(''));
}
function imprimirCaptura(lec, g, gr) {
  const al = alumnosDe(lec, g, gr);
  imprimir(`<section class="hoja-imp captura"><div class="imp-membrete">Raíces y Estrellas. Hoja de captura, ${g}.° ${gr}</div>
    <h1>${esc(lec.titulo)}</h1><p class="imp-tipo">Semana ${lec.semana}. Encierra el nivel de cada criterio (4 sobresaliente, 3 satisfactorio, 2 en proceso, 1 requiere apoyo). Total máximo: 20 puntos.</p>
    <table><thead><tr><th>N.°</th><th>Alumno</th>${CRIT.map(c => `<th>${esc(c.nombre.split(' (')[0])}</th>`).join('')}<th>Total</th><th>Faltó</th></tr></thead>
    <tbody>${al.map(a => `<tr><td>${a.lista}</td><td class="nom">${esc(nombreCompleto(a))}</td>${CRIT.map(() => '<td class="opc">4 3 2 1</td>').join('')}<td></td><td></td></tr>`).join('')}</tbody></table></section>`);
}

/* ---------- Excel de ida y vuelta ---------- */
const ASIST = ['Asistió', 'No asistió', 'No entregó'];
async function excelGrupo(lec, g, gr) {
  const al = alumnosDe(lec, g, gr), wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Captura', { views: [{ state: 'frozen', ySplit: 4, xSplit: 3 }] });
  ws.getCell('A1').value = `Raíces y Estrellas: ${lec.titulo}`; ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A2').value = `${g}.° ${gr}, semana ${lec.semana}. Escribe 4, 3, 2 o 1 en cada criterio. Si el alumno faltó o no entregó, cámbialo en la columna Asistencia.`;
  const cab = ['N.°', 'CURP', 'Alumno', ...CRIT.map(c => c.nombre.split(' (')[0]), 'Asistencia', 'Puntos', 'Calificación'];
  ws.getRow(4).values = cab; ws.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } }; ws.getRow(4).height = 32;
  ws.getRow(4).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16213F' } }; c.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }; });
  [6, 22, 34, 12, 12, 12, 12, 12, 13, 9, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  al.forEach((a, i) => {
    const r = 5 + i, c = califDe(a.curp, lec.id);
    const fila = ws.getRow(r);
    fila.values = [a.lista, a.curp, nombreCompleto(a), ...CRIT.map(k => c?.niveles?.[k.id] ?? null), c?.estado === 'falta' ? 'No asistió' : c?.estado === 'no_entrego' ? 'No entregó' : 'Asistió'];
    ws.getCell(`J${r}`).value = { formula: `IF(AND(I${r}="Asistió",COUNT(D${r}:H${r})=5),SUM(D${r}:H${r}),"")` };
    ws.getCell(`K${r}`).value = { formula: `IF(J${r}="","",J${r}/2)` };
    for (const col of 'DEFGH') ws.getCell(`${col}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"4,3,2,1"'], showErrorMessage: true, errorTitle: 'Nivel', error: 'Escribe 4, 3, 2 o 1.' };
    ws.getCell(`I${r}`).dataValidation = { type: 'list', allowBlank: false, formulae: [`"${ASIST.join(',')}"`] };
    ['A', 'B', 'C', 'J', 'K'].forEach(col => { ws.getCell(`${col}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6EEDC' } }; });
    for (const col of 'DEFGHIJK') ws.getCell(`${col}${r}`).alignment = { horizontal: 'center' };
  });
  const dat = wb.addWorksheet('Datos', { state: 'veryHidden' });
  dat.getCell('A1').value = lec.id; dat.getCell('A2').value = g; dat.getCell('A3').value = gr;
  const buf = await wb.xlsx.writeBuffer();
  descargar(`calificaciones-${g}${gr}-semana${lec.semana}-${lec.slug}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
async function leerExcelGrupo(archivo, lec, g, gr) {
  const filas = [];
  try {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await archivo.arrayBuffer());
    const dat = wb.getWorksheet('Datos'), ws = wb.getWorksheet('Captura');
    if (!ws || !dat) { aviso('Este Excel no es una hoja de captura de la plataforma. Descarga el Excel del grupo y úsalo.', true); return; }
    if (dat.getCell('A1').text !== lec.id || dat.getCell('A3').text !== gr || +dat.getCell('A2').text !== g) {
      const otra = lecturaPorId(dat.getCell('A1').text);
      aviso(`Este Excel corresponde a ${otra ? otra.titulo : 'otra lectura'}, ${dat.getCell('A2').text}.° ${dat.getCell('A3').text}. Ábrelo desde esa lectura y ese grupo.`, true); return;
    }
    ws.eachRow((row, i) => {
      if (i < 5) return;
      const curp = row.getCell(2).text.trim(); if (!curp) return;
      const niv = CRIT.map((c, k) => { const t = row.getCell(4 + k).text.trim(); return t === '' ? null : +t; });
      filas.push({ fila: i, curp, nombre: row.getCell(3).text, niv, asist: row.getCell(9).text.trim() || 'Asistió' });
    });
  } catch (e) { console.error(e); aviso('No se pudo leer el archivo. Verifica que sea el Excel descargado de la plataforma.', true); return; }
  const al = alumnosDe(lec, g, gr), porCurp = Object.fromEntries(al.map(a => [a.curp, a]));
  filas.forEach(f => {
    f.alumno = porCurp[f.curp]; f.previa = califDe(f.curp, lec.id);
    if (!f.alumno) { f.tipo = 'error'; f.msg = 'El alumno ya no está en este grupo'; return; }
    if (f.asist === 'No asistió' || f.asist === 'No entregó') { f.datos = { estado: f.asist === 'No asistió' ? 'falta' : 'no_entrego', niveles: null, puntos: null, calificacion: null }; }
    else {
      const llenos = f.niv.filter(x => x != null);
      if (!llenos.length) { f.tipo = 'vacia'; return; }
      if (llenos.length < 5 || f.niv.some(x => x != null && ![1, 2, 3, 4].includes(x))) { f.tipo = 'error'; f.msg = 'Faltan criterios o hay valores distintos de 1 a 4'; return; }
      const niveles = Object.fromEntries(CRIT.map((c, k) => [c.id, f.niv[k]])), puntos = f.niv.reduce((s, x) => s + x, 0);
      f.datos = { estado: 'calificado', niveles, puntos, calificacion: puntos / 2 };
    }
    const p = f.previa;
    f.tipo = !p?.estado ? 'nueva' : (p.estado === f.datos.estado && p.puntos === f.datos.puntos && JSON.stringify(p.niveles) === JSON.stringify(f.datos.niveles)) ? 'igual' : 'cambio';
  });
  const n = t => filas.filter(f => f.tipo === t).length, aGuardar = filas.filter(f => f.tipo === 'nueva' || f.tipo === 'cambio');
  const txt = f => f.datos ? (f.datos.estado === 'calificado' ? `${f.datos.calificacion.toFixed(1)} (${f.datos.puntos} pts)` : f.datos.estado === 'falta' ? 'No asistió' : 'No entregó') : '';
  abrirModal('Revisar calificaciones del Excel', `
    <div class="resumen"><div><b>${n('nueva')}</b>nuevas</div><div><b>${n('cambio')}</b>cambian</div><div><b>${n('igual')}</b>sin cambios</div><div><b>${n('vacia')}</b>vacías</div><div><b>${n('error')}</b>con error</div></div>
    ${n('cambio') ? '<p class="ayuda">Las calificaciones que cambian quedarán registradas en el historial de correcciones.</p>' : ''}
    <div class="tabla-envol" style="max-height:45vh;overflow:auto"><table><thead><tr><th>Alumno</th><th>Resultado</th></tr></thead><tbody>
    ${filas.filter(f => f.tipo !== 'igual' && f.tipo !== 'vacia').map(f => `<tr><td>${esc(f.nombre)}</td><td>${f.tipo === 'error' ? `<span class="etiqueta error">Error</span> <span class="ayuda">${f.msg}</span>` : `<span class="etiqueta ${f.tipo === 'nueva' ? 'nuevo' : 'cambio'}">${f.tipo === 'nueva' ? 'Nueva' : 'Cambia'}</span> ${txt(f)}`}</td></tr>`).join('') || '<tr><td colspan="2" class="vacio">No hay calificaciones nuevas ni cambios.</td></tr>'}
    </tbody></table></div>
    <div class="fila-btn" style="margin-top:1rem"><button type="button" class="btn oro" id="x-ok" ${aGuardar.length ? '' : 'disabled'}>Guardar ${aGuardar.length} calificaciones</button><button type="button" class="btn linea" id="x-no">Cancelar</button></div>`);
  $('#x-no').addEventListener('click', cerrarModal);
  $('#x-ok').addEventListener('click', async e => {
    e.target.disabled = true; e.target.textContent = 'Guardando…';
    const lote = writeBatch(db);
    aGuardar.forEach(f => lote.set(doc(db, 'calificaciones', idCalif(f.curp, lec.id)), { curp: f.curp, lectura: lec.id, grado: g, grupo: gr, docente: estado.nombre, ciclo: CICLO, fecha: serverTimestamp(), origen: 'excel', ...f.datos }));
    aGuardar.forEach(f => { mem.calificaciones.docs[idCalif(f.curp, lec.id)] = { curp: f.curp, lectura: lec.id, grado: g, grupo: gr, docente: estado.nombre, ciclo: CICLO, fecha: null, origen: 'excel', ...f.datos }; });
    guardarLocal('calificaciones'); refrescar();
    lote.commit().catch(x => console.error(x));
    aGuardar.filter(f => f.tipo === 'cambio').forEach(f => bitacora('corrección de calificación (Excel)', `${f.nombre}, ${lec.id}: ${f.previa.estado === 'calificado' ? f.previa.calificacion : f.previa.estado} a ${txt(f)}`));
    cerrarModal(); aviso(`${aGuardar.length} calificaciones guardadas.`);
  });
}

/* ---------- Estadísticas ---------- */
const RANGO_COLOR = { rojo: 0, azul: 1, amarillo: 2, verde: 3 };
const HEX = { verde: '#2E8B57', amarillo: '#E0B321', azul: '#2F6FD1', rojo: '#C8403A', gris: '#BDB3A3' };
const COLORES = ['verde', 'amarillo', 'azul', 'rojo'];
const CORTO = { literal: 'Literal', inferencial: 'Inferencial', critico: 'Crítico y valorativo', central: 'Elemento central', escrita: 'Expresión escrita' };
function lecturaTendencia(ini, fin) { const d = fin - ini; return d >= 0.5 ? 'Muestra avance en su comprensión lectora.' : d <= -0.5 ? (fin >= 8.5 ? 'Bajó ligeramente, aunque se mantiene en verde.' : 'Su desempeño bajó con respecto al inicio; conviene darle seguimiento.') : 'Su desempeño se mantiene estable.'; }
const prom = arr => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null;
const r1 = x => x == null ? '—' : (Math.round(x * 10) / 10).toFixed(1);
const MESES_CICLO = [...new Set(SEMANAS.map(s => s.inicio.slice(0, 7)))];
const nomMes = ym => { const [y, m] = ym.split('-'); return MESES[+m - 1][0].toUpperCase() + MESES[+m - 1].slice(1) + ' ' + y; };
const fechaLarga = d => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;

// Periodo: qué semanas abarca (solo las que ya comenzaron).
function semanasDe(p) {
  const { ultima } = semanaVigente(), tope = Math.max(ultima, 1);
  let lista = SEMANAS;
  if (p.tipo === 'trimestre') lista = SEMANAS.filter(s => s.trimestre === +p.valor);
  if (p.tipo === 'mes') lista = SEMANAS.filter(s => s.inicio.startsWith(p.valor));
  if (p.tipo === 'quincena') lista = SEMANAS.filter(s => Math.ceil(s.sem / 2) === +p.valor);
  if (p.tipo === 'rango') lista = SEMANAS.filter(s => (!p.desde || s.fin >= p.desde) && (!p.hasta || s.inicio <= p.hasta));
  return new Set(lista.filter(s => s.sem <= tope).map(s => s.sem));
}
function nombrePeriodo(p) {
  if (p.tipo === 'trimestre') return `Trimestre ${['I', 'II', 'III'][p.valor - 1]}`;
  if (p.tipo === 'mes') return nomMes(p.valor);
  if (p.tipo === 'quincena') { const a = SEMANAS[p.valor * 2 - 2], b = SEMANAS[p.valor * 2 - 1] || a; return `Quincena de las semanas ${a.sem} y ${b.sem} (${rangoSem({ inicio: a.inicio, fin: b.fin })})`; }
  if (p.tipo === 'rango') return `Del ${p.desde ? fechaLarga(fISO(p.desde)) : 'inicio del ciclo'} al ${p.hasta ? fechaLarga(fISO(p.hasta)) : 'día de hoy'}`;
  return `Ciclo escolar ${CICLO} (a la fecha)`;
}

// Resultado de un alumno en un conjunto de semanas.
function statsAlumno(a, semanas, califs = estado.califs) {
  const lecs = LECTURAS.filter(l => l.grado === a.grado && semanas.has(l.semana) && (!a.fechaAlta || a.fechaAlta <= SEMANAS[l.semana - 1].fin)).sort((x, y) => x.semana - y.semana);
  const filas = lecs.map(l => ({ lec: l, c: (() => { const c = califs[idCalif(a.curp, l.id)]; return hecho(c) ? c : null; })() }));
  const cal = filas.filter(f => f.c?.estado === 'calificado');
  const p = prom(cal.map(f => f.c.calificacion));
  const criterios = Object.fromEntries(CRIT.map(k => [k.id, prom(cal.map(f => f.c.niveles?.[k.id]).filter(Boolean))]));
  return { a, filas, cal, prom: p, color: colorDe(p), faltas: filas.filter(f => f.c?.estado === 'falta').length, noEntrego: filas.filter(f => f.c?.estado === 'no_entrego').length,
    pendientes: filas.filter(f => !f.c).length, esperadas: filas.length, criterios };
}
function statsConjunto(alumnos, semanas) {
  const est = alumnos.map(a => statsAlumno(a, semanas));
  const conteo = Object.fromEntries([...COLORES, 'gris'].map(c => [c, est.filter(e => e.color === c).length]));
  const todas = est.flatMap(e => e.cal);
  const criterios = Object.fromEntries(CRIT.map(k => [k.id, prom(todas.map(f => f.c.niveles?.[k.id]).filter(Boolean))]));
  const esperadas = est.reduce((s, e) => s + e.esperadas, 0), calificadas = todas.length;
  const debil = CRIT.filter(k => criterios[k.id] != null).sort((x, y) => criterios[x.id] - criterios[y.id])[0];
  return { est, conteo, prom: prom(todas.map(f => f.c.calificacion)), criterios, debil, participacion: esperadas ? calificadas / esperadas : null, calificadas, esperadas };
}
function evolucion(alumnos, semanas) {
  return [...semanas].sort((a, b) => a - b).map(sem => {
    const c = { sem, verde: 0, amarillo: 0, azul: 0, rojo: 0 };
    alumnos.forEach(a => { const l = LECTURAS.find(x => x.grado === a.grado && x.semana === sem); const k = l && estado.califs[idCalif(a.curp, l.id)]; if (k?.estado === 'calificado') c[colorDe(k.calificacion)]++; });
    return c;
  }).filter(c => c.verde + c.amarillo + c.azul + c.rojo > 0);
}
function alertas(alumnos) {
  const todas = new Set(SEMANAS.map(s => s.sem)), out = [];
  alumnos.forEach(a => {
    const cal = statsAlumno(a, todas).cal;
    if (cal.length >= 2) {
      const [x, y] = cal.slice(-2).map(f => f.c.calificacion);
      if (x < 6 && y < 6) { out.push({ a, tipo: 'Dos rojos seguidos', det: `${r1(x)} y ${r1(y)}` }); return; }
    }
    if (cal.length >= 4) {
      const antes = prom(cal.slice(0, -2).map(f => f.c.calificacion)), ahora = prom(cal.slice(-2).map(f => f.c.calificacion));
      if (RANGO_COLOR[colorDe(ahora)] < RANGO_COLOR[colorDe(antes)]) out.push({ a, tipo: 'Va a la baja', det: `de ${r1(antes)} a ${r1(ahora)}` });
    }
  });
  return out;
}

/* ---------- Gráficas en pantalla (SVG) ---------- */
function barraSemaforo(conteo) {
  const tot = COLORES.reduce((s, c) => s + conteo[c], 0);
  if (!tot) return '<div class="barra-sem vacia"><span>Sin calificaciones en el periodo</span></div>';
  return `<div class="barra-sem" role="img" aria-label="${COLORES.map(c => `${NOMBRE_COLOR[c]}: ${conteo[c]}`).join(', ')}">${COLORES.filter(c => conteo[c]).map(c => `<i style="flex:${conteo[c]};background:${HEX[c]}" title="${NOMBRE_COLOR[c]}: ${conteo[c]}"></i>`).join('')}</div>`;
}
function leyendaSem(conteo) {
  return `<div class="leyenda">${COLORES.map(c => `<span><i style="background:${HEX[c]}"></i>${NOMBRE_COLOR[c]} <b>${conteo[c]}</b></span>`).join('')}${conteo.gris ? `<span><i style="background:${HEX.gris}"></i>Sin calificar <b>${conteo.gris}</b></span>` : ''}</div>`;
}
function svgEvolucion(ev) {
  if (!ev.length) return '<p class="vacio">Aún no hay semanas calificadas en este periodo.</p>';
  const W = 320, H = 150, bw = Math.min(28, (W - 20) / ev.length - 4);
  const barras = ev.map((c, i) => { const tot = c.verde + c.amarillo + c.azul + c.rojo; let y = H - 20; const x = 10 + i * ((W - 20) / ev.length) + 2;
    return ['rojo', 'azul', 'amarillo', 'verde'].map(k => { const h = (H - 30) * c[k] / tot; y -= h; return h ? `<rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="${HEX[k]}"/>` : ''; }).join('') + `<text x="${x + bw / 2}" y="${H - 6}" font-size="9" text-anchor="middle" fill="#6A5C4C">${c.sem}</text>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="graf" role="img" aria-label="Distribución del semáforo por semana">${barras}</svg><p class="ayuda" style="text-align:center">Semana del ciclo. Cada barra muestra la proporción de alumnos en cada color.</p>`;
}
function svgTrayectoria(cal) {
  if (!cal.length) return '<p class="vacio">Sin lecturas calificadas todavía.</p>';
  const W = 320, H = 170, L = 26, R = 10, T = 10, B = 24, y = v => T + (H - T - B) * (1 - (v - 2) / 8), n = cal.length;
  const x = i => n === 1 ? (L + W - R) / 2 : L + (W - L - R) * i / (n - 1);
  const bandas = [[8.5, 10, 'verde'], [7, 8.5, 'amarillo'], [6, 7, 'azul'], [2, 6, 'rojo']].map(([a, b, c]) => `<rect x="${L}" y="${y(b)}" width="${W - L - R}" height="${y(a) - y(b)}" fill="${HEX[c]}" opacity=".12"/>`).join('');
  const ejes = [2.5, 6, 7, 8.5, 10].map(v => `<text x="${L - 4}" y="${y(v) + 3}" font-size="8.5" text-anchor="end" fill="#6A5C4C">${v}</text>`).join('');
  const linea = `<polyline fill="none" stroke="#16213F" stroke-width="2" points="${cal.map((f, i) => `${x(i)},${y(f.c.calificacion)}`).join(' ')}"/>`;
  const pts = cal.map((f, i) => `<circle cx="${x(i)}" cy="${y(f.c.calificacion)}" r="4.5" fill="${HEX[colorDe(f.c.calificacion)]}" stroke="#fff" stroke-width="1.5"><title>Semana ${f.lec.semana}: ${r1(f.c.calificacion)}</title></circle><text x="${x(i)}" y="${H - 8}" font-size="8.5" text-anchor="middle" fill="#6A5C4C">${f.lec.semana}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="graf" role="img" aria-label="Trayectoria de calificaciones">${bandas}${ejes}${linea}${pts}</svg>`;
}
function barrasCriterio(criterios) {
  return `<div class="criterios">${CRIT.map(k => { const v = criterios[k.id]; return `<div class="cr"><span>${esc(k.nombre.split(' (')[0])}</span><div class="cr-barra"><i style="width:${v ? v / 4 * 100 : 0}%;background:${v == null ? HEX.gris : v >= 3.4 ? HEX.verde : v >= 2.8 ? HEX.amarillo : v >= 2.4 ? HEX.azul : HEX.rojo}"></i></div><b>${v == null ? '—' : v.toFixed(1)}</b></div>`; }).join('')}<p class="ayuda">Promedio de nivel por criterio, de 1 a 4.</p></div>`;
}

/* ---------- Tablero ---------- */
const rep = { vista: 'resumen', grupo: null, curp: null, periodo: { tipo: 'ciclo' }, filtro: '', historial: null };
function selectorPeriodo() {
  const p = rep.periodo, { ultima } = semanaVigente();
  const quin = Array.from({ length: Math.ceil(Math.max(ultima, 1) / 2) }, (_, i) => i + 1);
  const sec = p.tipo === 'trimestre' ? `<select id="p-val">${[1, 2, 3].map(t => `<option value="${t}" ${+p.valor === t ? 'selected' : ''}>Trimestre ${['I', 'II', 'III'][t - 1]}</option>`).join('')}</select>`
    : p.tipo === 'mes' ? `<select id="p-val">${MESES_CICLO.map(m => `<option value="${m}" ${p.valor === m ? 'selected' : ''}>${nomMes(m)}</option>`).join('')}</select>`
    : p.tipo === 'quincena' ? `<select id="p-val">${quin.map(q => `<option value="${q}" ${+p.valor === q ? 'selected' : ''}>Semanas ${q * 2 - 1} y ${q * 2}</option>`).join('')}</select>`
    : p.tipo === 'rango' ? `<input type="date" id="p-desde" value="${p.desde || ''}" aria-label="Desde"><input type="date" id="p-hasta" value="${p.hasta || ''}" aria-label="Hasta">` : '';
  return `<div class="periodo"><label for="p-tipo">Periodo</label><div class="periodo-campos"><select id="p-tipo">${[['ciclo', 'Ciclo completo'], ['trimestre', 'Trimestre'], ['mes', 'Mes'], ['quincena', 'Quincena'], ['rango', 'Fechas libres']].map(([v, t]) => `<option value="${v}" ${p.tipo === v ? 'selected' : ''}>${t}</option>`).join('')}</select>${sec}</div></div>`;
}
function enlazarPeriodo() {
  $('#p-tipo')?.addEventListener('change', e => { const t = e.target.value, { ultima } = semanaVigente(), s = SEMANAS[Math.max(ultima, 1) - 1];
    rep.periodo = { tipo: t, valor: t === 'trimestre' ? s.trimestre : t === 'mes' ? s.inicio.slice(0, 7) : t === 'quincena' ? Math.ceil(s.sem / 2) : undefined }; refrescar(); });
  $('#p-val')?.addEventListener('change', e => { rep.periodo.valor = e.target.value; refrescar(); });
  $('#p-desde')?.addEventListener('change', e => { rep.periodo.desde = e.target.value; refrescar(); });
  $('#p-hasta')?.addEventListener('change', e => { rep.periodo.hasta = e.target.value; refrescar(); });
}

function tablero(cont, volver) {
  const activos = estado.alumnos.filter(a => a.estado === 'activo');
  if (rep.vista === 'grupo') return vistaGrupo(cont);
  if (rep.vista === 'alumno') return vistaAlumno(cont);
  const semanas = semanasDe(rep.periodo), esc0 = statsConjunto(activos, semanas);
  const { ultima } = semanaVigente(), semAct = SEMANAS[Math.max(ultima, 1) - 1];
  const q = normal(rep.filtro), encontrados = q.length >= 2 ? activos.filter(a => normal(nombreCompleto(a) + ' ' + a.curp).includes(q)).sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es')).slice(0, 12) : [];
  const al = alertas(activos);
  cont.innerHTML = `
  ${volver ? '<button type="button" class="btn-texto oscuro" id="t-volver">‹ Volver</button>' : ''}
  <div class="tarjeta">
    <div class="tab-cab"><h2>Tablero de avance</h2><button type="button" class="btn-texto oscuro" id="t-act">Recargar todo</button></div>
    ${selectorPeriodo()}
    <p class="ayuda">${esc(nombrePeriodo(rep.periodo))}. ${estado.sincronizando ? 'Actualizando…' : estado.sincronizado ? 'Al día, se actualiza solo.' : 'Mostrando lo guardado en este teléfono.'}</p>
    <div class="buscar-al"><input id="t-buscar" type="search" class="buscar" placeholder="Buscar alumno por nombre o CURP" value="${esc(rep.filtro)}" aria-label="Buscar alumno">
      ${encontrados.length ? `<div class="resultados">${encontrados.map(a => `<button type="button" data-curp="${a.curp}">${esc(nombreCompleto(a))}<span>${a.grado}.° ${a.grupo}</span></button>`).join('')}</div>` : q.length >= 2 ? '<p class="ayuda">Sin coincidencias.</p>' : ''}</div>
  </div>
  <div class="tarjeta">
    <div class="tab-cab"><h2>Semáforo de la escuela</h2><button type="button" class="btn oro chico" id="pdf-escuela">PDF de la escuela</button></div>
    <div class="cifras"><div><b>${r1(esc0.prom)}</b>promedio</div><div><b>${esc0.participacion == null ? '—' : Math.round(esc0.participacion * 100) + '%'}</b>lecturas calificadas</div><div><b>${activos.length}</b>alumnos</div></div>
    ${barraSemaforo(esc0.conteo)}${leyendaSem(esc0.conteo)}
  </div>
  <div class="tarjeta"><h2>Grupos</h2><div class="g-cards">${LISTA_GRUPOS.map(x => { const st = statsConjunto(activos.filter(a => a.grado === x.grado && a.grupo === x.grupo), semanas);
    return `<button type="button" class="g-card g${x.grado}" data-g="${x.id}"><div class="g-top"><b>${x.grado}.° ${x.grupo}</b><span class="prom ${colorDe(st.prom)}">${r1(st.prom)}</span></div>${barraSemaforo(st.conteo)}
      <span class="ayuda">${st.est.length} alumnos, ${st.participacion == null ? 'sin datos' : Math.round(st.participacion * 100) + '% calificado'}</span>${st.debil ? `<span class="ayuda">Criterio más bajo: ${esc(CORTO[st.debil.id].toLowerCase())}</span>` : ''}</button>`; }).join('')}</div></div>
  <div class="tarjeta"><h2>Captura de la semana ${semAct.sem}</h2><div class="captura-sem">${[1, 2, 3].map(g => { const l = LECTURAS.find(x => x.grado === g && x.semana === semAct.sem);
    const resp = estado.maestros.filter(m => m.activo !== false && (m.asignaturas || []).includes(l.asignatura) && (m.grados || []).includes(g)).map(m => m.nombre);
    return `<div class="cs"><p class="lec-tit"><span class="etq g${g}">${g}.° grado</span> ${esc(l.titulo)}</p><p class="ayuda">Califica ${esc(l.asignatura)}${resp.length ? `: ${esc(resp.join(', '))}` : ' (sin maestro asignado)'}</p>
      <div class="cs-grupos">${GRUPOS[g].map(gr => { const al2 = alumnosDe(l, g, gr), h = al2.filter(a => { const c = estado.califs[idCalif(a.curp, l.id)]; return hecho(c); }).length;
        return `<span class="cs-g ${al2.length && h === al2.length ? 'lista' : h ? 'parcial' : ''}">${g}.° ${gr}: ${h}/${al2.length}</span>`; }).join('')}</div></div>`; }).join('')}</div></div>
  <div class="tarjeta"><h2>Alertas</h2>${al.length ? `<div class="alertas">${al.map(x => `<button type="button" data-curp="${x.a.curp}"><span class="etiqueta ${x.tipo === 'Dos rojos seguidos' ? 'baja' : 'cambio'}">${x.tipo}</span> ${esc(nombreCompleto(x.a))} <span class="ayuda">${x.a.grado}.° ${x.a.grupo}, ${x.det}</span></button>`).join('')}</div>` : '<p class="vacio">Sin alertas por ahora.</p>'}</div>
  <div class="tarjeta"><h2>Evolución del semáforo</h2>${svgEvolucion(evolucion(activos, semanas))}</div>`;
  enlazarPeriodo();
  $('#t-volver')?.addEventListener('click', volver);
  $('#t-act').addEventListener('click', () => { if (confirm('Esto descarga de nuevo todos los datos. Úsalo solo si algo no se ve actualizado. ¿Continuar?')) recargarTodo(); });
  const bus = $('#t-buscar'); bus.addEventListener('input', e => { rep.filtro = e.target.value; refrescar(); const b = $('#t-buscar'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); });
  cont.querySelectorAll('[data-curp]').forEach(b => b.addEventListener('click', () => { rep.vista = 'alumno'; rep.curp = b.dataset.curp; rep.historial = null; refrescar(); scrollTo(0, 0); }));
  cont.querySelectorAll('.g-card').forEach(b => b.addEventListener('click', () => { rep.vista = 'grupo'; rep.grupo = b.dataset.g; refrescar(); scrollTo(0, 0); }));
  $('#pdf-escuela').addEventListener('click', e => generarPDF(e.target, pdfEscuela));
}

function vistaGrupo(cont) {
  const g = +rep.grupo[0], gr = rep.grupo.slice(1), semanas = semanasDe(rep.periodo);
  const al = estado.alumnos.filter(a => a.estado === 'activo' && a.grado === g && a.grupo === gr).sort(ordenAlumno);
  const st = statsConjunto(al, semanas);
  cont.innerHTML = `<button type="button" class="btn-texto oscuro" id="t-atras">‹ Tablero</button>
  <div class="tarjeta"><div class="tab-cab"><h2>${g}.° ${gr}</h2><button type="button" class="btn oro chico" id="pdf-grupo">PDF del grupo</button></div>
    ${selectorPeriodo()}<p class="ayuda">${esc(nombrePeriodo(rep.periodo))}.</p>
    <div class="cifras"><div><b>${r1(st.prom)}</b>promedio</div><div><b>${st.participacion == null ? '—' : Math.round(st.participacion * 100) + '%'}</b>calificado</div><div><b>${al.length}</b>alumnos</div></div>
    ${barraSemaforo(st.conteo)}${leyendaSem(st.conteo)}</div>
  <div class="tarjeta"><h2>Por criterio</h2>${barrasCriterio(st.criterios)}</div>
  <div class="tabla-envol"><table><thead><tr><th>N.°</th><th>Alumno</th><th>Prom.</th><th class="ocultar-movil">Lecturas</th><th class="ocultar-movil">Faltas</th></tr></thead><tbody>
  ${st.est.map(e => `<tr class="fila-al" data-curp="${e.a.curp}"><td class="num">${e.a.lista}</td><td>${esc(nombreCompleto(e.a))}</td><td><span class="prom ${e.color}">${r1(e.prom)}</span></td><td class="ocultar-movil">${e.cal.length} de ${e.esperadas}</td><td class="ocultar-movil">${e.faltas}</td></tr>`).join('')}
  </tbody></table>${al.length ? '' : '<p class="vacio">Sin alumnos.</p>'}</div>
  <div class="tarjeta" style="margin-top:1rem"><h2>Evolución del grupo</h2>${svgEvolucion(evolucion(al, semanas))}</div>`;
  enlazarPeriodo();
  $('#t-atras').addEventListener('click', () => { rep.vista = 'resumen'; refrescar(); scrollTo(0, 0); });
  cont.querySelectorAll('.fila-al').forEach(f => f.addEventListener('click', () => { rep.vista = 'alumno'; rep.curp = f.dataset.curp; rep.historial = null; refrescar(); scrollTo(0, 0); }));
  $('#pdf-grupo').addEventListener('click', e => generarPDF(e.target, d => pdfGrupo(d, g, gr)));
}

function vistaAlumno(cont) {
  const a = estado.alumnos.find(x => x.curp === rep.curp);
  if (!a) { rep.vista = 'resumen'; return tablero(cont); }
  const semanas = semanasDe(rep.periodo), e = statsAlumno(a, semanas);
  const ini = prom(e.cal.slice(0, 3).map(f => f.c.calificacion)), fin = prom(e.cal.slice(-3).map(f => f.c.calificacion));
  cont.innerHTML = `<button type="button" class="btn-texto oscuro" id="t-atras">‹ Volver</button>
  <div class="tarjeta"><div class="tab-cab"><div><p class="ayuda">${a.grado}.° ${a.grupo}, n.° ${a.lista}</p><h2>${esc(nombreCompleto(a))}</h2></div><span class="prom grande ${e.color}">${r1(e.prom)}</span></div>
    ${selectorPeriodo()}<p class="ayuda">${esc(nombrePeriodo(rep.periodo))}.</p>
    <div class="cifras"><div><b>${e.cal.length}</b>calificadas</div><div><b>${e.faltas}</b>faltas</div><div><b>${e.noEntrego}</b>no entregó</div><div><b>${e.pendientes}</b>sin registro</div></div>
    ${e.cal.length >= 4 ? `<p class="comparacion">Primeras lecturas del periodo: <b>${r1(ini)}</b>. Últimas: <b>${r1(fin)}</b>. ${lecturaTendencia(ini, fin)}</p>` : ''}
    <button type="button" class="btn oro chico" id="pdf-alumno">PDF del alumno</button></div>
  <div class="tarjeta"><h2>Trayectoria</h2>${svgTrayectoria(e.cal)}</div>
  <div class="tarjeta"><h2>Por criterio</h2>${barrasCriterio(e.criterios)}</div>
  <div class="tabla-envol"><table><thead><tr><th>Sem.</th><th>Lectura</th><th>Resultado</th></tr></thead><tbody>
  ${e.filas.map(f => `<tr><td class="num">${f.lec.semana}</td><td>${esc(f.lec.titulo)}</td><td>${!f.c ? '<span class="ayuda">Sin registro</span>' : f.c.estado === 'calificado' ? `<span class="prom ${colorDe(f.c.calificacion)}">${r1(f.c.calificacion)}</span>` : `<span class="etiqueta">${f.c.estado === 'falta' ? 'No asistió' : 'No entregó'}</span>`}</td></tr>`).join('')}
  </tbody></table></div>`;
  enlazarPeriodo();
  $('#t-atras').addEventListener('click', () => { rep.vista = rep.grupo ? 'grupo' : 'resumen'; refrescar(); scrollTo(0, 0); });
  $('#pdf-alumno').addEventListener('click', ev => generarPDF(ev.target, d => pdfAlumno(d, a)));
}

/* ---------- PDF ---------- */
let logoBytes = null;
async function generarPDF(boton, llenar) {
  if (typeof PDFLib === 'undefined') { aviso('No se pudo cargar la herramienta de PDF. Revisa la conexión.', true); return; }
  const txt = boton.textContent; boton.disabled = true; boton.textContent = 'Generando…';
  try {
    if (!logoBytes) logoBytes = await fetch('logo-escuela.jpg').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
    const d = await DocPDF.crear();
    const nombre = await llenar(d);
    const bytes = await d.terminar();
    descargar(nombre, new Blob([bytes], { type: 'application/pdf' }));
    aviso('PDF descargado.');
  } catch (e) { console.error(e); aviso('No se pudo generar el PDF.', true); }
  boton.disabled = false; boton.textContent = txt;
}
const limpiarPDF = t => String(t ?? '').replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/g, '');
const rgbHex = h => PDFLib.rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

class DocPDF {
  static async crear() {
    const d = new DocPDF(); const { PDFDocument, StandardFonts } = PDFLib;
    d.pdf = await PDFDocument.create(); d.pdf.setTitle('Raíces y Estrellas'); d.pdf.setAuthor('EST 17 Turno Vespertino');
    d.f = await d.pdf.embedFont(StandardFonts.Helvetica); d.fb = await d.pdf.embedFont(StandardFonts.HelveticaBold);
    d.logo = logoBytes ? await d.pdf.embedJpg(logoBytes) : null;
    d.W = 612; d.H = 792; d.M = 46; d.pagina(); return d;
  }
  pagina() {
    this.p = this.pdf.addPage([this.W, this.H]); let y = this.H - this.M;
    if (this.logo) this.p.drawImage(this.logo, { x: this.M, y: y - 50, width: 43, height: 50 });
    const x = this.M + (this.logo ? 54 : 0);
    this.t('Escuela Secundaria Técnica N.° 17, Turno Vespertino', x, y - 12, 11.5, true);
    this.t('C.C.T. 04DST0017E. San Francisco de Campeche, Campeche', x, y - 26, 8.5, false, '#5B4E40');
    this.t(`Raíces y Estrellas. Estrategia para la Comprensión Lectora, ciclo escolar ${CICLO}`, x, y - 38, 8.5, false, '#5B4E40');
    this.p.drawLine({ start: { x: this.M, y: y - 58 }, end: { x: this.W - this.M, y: y - 58 }, thickness: 1.2, color: rgbHex('#16213F') });
    this.y = y - 78;
  }
  t(s, x, y, size = 10, bold = false, color = '#1E1A16') { this.p.drawText(limpiarPDF(s), { x, y, size, font: bold ? this.fb : this.f, color: rgbHex(color) }); }
  ancho(s, size, bold) { return (bold ? this.fb : this.f).widthOfTextAtSize(limpiarPDF(s), size); }
  asegurar(h) { if (this.y - h < this.M + 20) this.pagina(); }
  lineas(s, size, max, bold) {
    const out = []; let cur = '';
    limpiarPDF(s).split(/\s+/).forEach(w => { const prueba = cur ? cur + ' ' + w : w; if (this.ancho(prueba, size, bold) > max && cur) { out.push(cur); cur = w; } else cur = prueba; });
    if (cur) out.push(cur); return out;
  }
  titulo(s, size = 17) { this.asegurar(size + 12); this.lineas(s, size, this.W - 2 * this.M, true).forEach(l => { this.t(l, this.M, this.y, size, true, '#16213F'); this.y -= size + 4; }); this.y -= 4; }
  subtitulo(s, espacio = 60) { this.asegurar(espacio); this.y -= 6; this.t(s, this.M, this.y, 12, true, '#16213F'); this.y -= 16; }
  parrafo(s, size = 10, color = '#1E1A16') { this.lineas(s, size, this.W - 2 * this.M).forEach(l => { this.asegurar(size + 4); this.t(l, this.M, this.y, size, false, color); this.y -= size + 4; }); this.y -= 4; }
  cifras(items) {
    this.asegurar(46); const w = (this.W - 2 * this.M) / items.length;
    items.forEach(([v, et], i) => { const x = this.M + i * w; this.p.drawRectangle({ x: x + 2, y: this.y - 34, width: w - 4, height: 40, color: rgbHex('#F6EEDC') });
      this.t(v, x + 10, this.y - 14, 16, true, '#16213F'); this.t(et, x + 10, this.y - 28, 8.5, false, '#5B4E40'); });
    this.y -= 50;
  }
  semaforo(conteo) {
    this.asegurar(44); const w = this.W - 2 * this.M, tot = COLORES.reduce((s, c) => s + conteo[c], 0); let x = this.M;
    if (!tot) { this.p.drawRectangle({ x, y: this.y - 14, width: w, height: 14, color: rgbHex('#EFE6D3') }); }
    else COLORES.forEach(c => { if (!conteo[c]) return; const ww = w * conteo[c] / tot; this.p.drawRectangle({ x, y: this.y - 14, width: ww, height: 14, color: rgbHex(HEX[c]) }); x += ww; });
    this.y -= 28; x = this.M;
    [...COLORES, ...(conteo.gris ? ['gris'] : [])].forEach(c => { this.p.drawRectangle({ x, y: this.y - 1, width: 8, height: 8, color: rgbHex(HEX[c]) }); const s = `${NOMBRE_COLOR[c]}: ${conteo[c]}`; this.t(s, x + 12, this.y, 9); x += this.ancho(s, 9) + 26; });
    this.y -= 18;
  }
  criterios(cr) {
    CRIT.forEach(k => { this.asegurar(18); const v = cr[k.id], bx = this.M + 190, bw = this.W - 2 * this.M - 230;
      this.t(k.nombre.split(' (')[0], this.M, this.y, 9);
      this.p.drawRectangle({ x: bx, y: this.y - 2, width: bw, height: 10, color: rgbHex('#EFE6D3') });
      if (v) this.p.drawRectangle({ x: bx, y: this.y - 2, width: bw * v / 4, height: 10, color: rgbHex(v >= 3.4 ? HEX.verde : v >= 2.8 ? HEX.amarillo : v >= 2.4 ? HEX.azul : HEX.rojo) });
      this.t(v == null ? '—' : v.toFixed(1), bx + bw + 8, this.y, 9, true); this.y -= 17; });
    this.y -= 4;
  }
  tabla(cols, filas) {
    const alto = 17, fila = (vals, cab, par) => {
      if (this.y - alto < this.M + 20) { this.pagina(); fila(cols.map(c => c.t), true); }
      let x = this.M;
      if (cab) this.p.drawRectangle({ x: this.M, y: this.y - 5, width: this.W - 2 * this.M, height: alto, color: rgbHex('#16213F') });
      else if (par) this.p.drawRectangle({ x: this.M, y: this.y - 5, width: this.W - 2 * this.M, height: alto, color: rgbHex('#FBF6EA') });
      vals.forEach((v, i) => { const c = cols[i], w = c.w;
        if (!cab && v && typeof v === 'object') { this.p.drawRectangle({ x: x + 2, y: this.y - 3, width: w - 8, height: 13, color: rgbHex(HEX[v.color] || HEX.gris) }); this.t(v.t, x + 6, this.y, 9, true, v.color === 'amarillo' ? '#1E1A16' : '#FFFFFF'); }
        else { let s = String(v ?? ''); while (s.length > 3 && this.ancho(s, 9, cab) > w - 8) s = s.slice(0, -2) + '…';
          this.t(s, c.der ? x + w - 6 - this.ancho(s, 9, cab) : x + 4, this.y, 9, cab, cab ? '#FFFFFF' : '#1E1A16'); }
        x += w; });
      this.y -= alto;
    };
    this.asegurar(alto * 3); fila(cols.map(c => c.t), true); filas.forEach((f, i) => fila(f, false, i % 2)); this.y -= 8;
  }
  trayectoria(cal) {
    const h = 150; this.asegurar(h + 20); const L = this.M + 22, R = this.W - this.M, T = this.y, B = this.y - h + 16;
    const yv = v => B + (T - B) * (v - 2) / 8, n = cal.length, xv = i => n === 1 ? (L + R) / 2 : L + (R - L) * i / (n - 1);
    [[8.5, 10, 'verde'], [7, 8.5, 'amarillo'], [6, 7, 'azul'], [2, 6, 'rojo']].forEach(([a, b, c]) => this.p.drawRectangle({ x: L, y: yv(a), width: R - L, height: yv(b) - yv(a), color: rgbHex(HEX[c]), opacity: 0.13 }));
    [2.5, 6, 7, 8.5, 10].forEach(v => this.t(String(v), this.M, yv(v) - 3, 8, false, '#5B4E40'));
    for (let i = 1; i < n; i++) this.p.drawLine({ start: { x: xv(i - 1), y: yv(cal[i - 1].c.calificacion) }, end: { x: xv(i), y: yv(cal[i].c.calificacion) }, thickness: 1.6, color: rgbHex('#16213F') });
    cal.forEach((f, i) => { this.p.drawCircle({ x: xv(i), y: yv(f.c.calificacion), size: 4, color: rgbHex(HEX[colorDe(f.c.calificacion)]), borderColor: rgbHex('#FFFFFF'), borderWidth: 1 });
      const s = String(f.lec.semana); this.t(s, xv(i) - this.ancho(s, 7.5) / 2, B - 12, 7.5, false, '#5B4E40'); });
    this.y = B - 26; this.t('Semana del ciclo', (L + R) / 2 - 30, this.y + 2, 7.5, false, '#5B4E40'); this.y -= 12;
  }
  evolucion(ev) {
    if (!ev.length) { this.parrafo('Sin semanas calificadas en el periodo.'); return; }
    const h = 120; this.asegurar(h + 20); const L = this.M, R = this.W - this.M, B = this.y - h + 14, paso = (R - L) / ev.length, bw = Math.min(24, paso - 4);
    ev.forEach((c, i) => { const tot = c.verde + c.amarillo + c.azul + c.rojo; let y = B; const x = L + i * paso + (paso - bw) / 2;
      ['rojo', 'azul', 'amarillo', 'verde'].forEach(k => { const hh = (h - 24) * c[k] / tot; if (hh) { this.p.drawRectangle({ x, y, width: bw, height: hh, color: rgbHex(HEX[k]) }); y += hh; } });
      const s = String(c.sem); this.t(s, x + bw / 2 - this.ancho(s, 7.5) / 2, B - 11, 7.5, false, '#5B4E40'); });
    this.y = B - 26; this.parrafo('Proporción de alumnos en cada color por semana del ciclo.', 8, '#5B4E40');
  }
  firmas() {
    const f = estado.config || {}, ps = [[f.director || 'Aurelio May Euan', f.cargoDirector || 'Director'], [f.subdirector || 'Jesús Rodríguez García', f.cargoSubdirector || 'Subdirector del Turno Vespertino']];
    this.asegurar(90); this.y -= 50; const w = (this.W - 2 * this.M) / 2;
    ps.forEach(([n, c], i) => { const cx = this.M + w * i + w / 2;
      this.p.drawLine({ start: { x: cx - 95, y: this.y + 12 }, end: { x: cx + 95, y: this.y + 12 }, thickness: 0.8, color: rgbHex('#1E1A16') });
      this.t(n, cx - this.ancho(n, 9.5, true) / 2, this.y, 9.5, true); this.t(c, cx - this.ancho(c, 8.5) / 2, this.y - 12, 8.5, false, '#5B4E40'); });
    this.y -= 30;
  }
  async terminar() {
    const ps = this.pdf.getPages(), hoy = `Generado el ${fechaLarga(new Date())}`;
    ps.forEach((p, i) => { const s = `Página ${i + 1} de ${ps.length}`;
      p.drawText(limpiarPDF(hoy), { x: this.M, y: 26, size: 7.5, font: this.f, color: rgbHex('#8A7D6E') });
      p.drawText(s, { x: this.W - this.M - this.f.widthOfTextAtSize(s, 7.5), y: 26, size: 7.5, font: this.f, color: rgbHex('#8A7D6E') }); });
    return this.pdf.save();
  }
}
const slugArch = t => normal(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function pdfAlumno(d, a) {
  const semanas = semanasDe(rep.periodo), e = statsAlumno(a, semanas);
  d.titulo(`Reporte de comprensión lectora: ${nombreCompleto(a)}`, 15);
  d.parrafo(`${NOM_GRADO[a.grado]}, grupo ${a.grupo}, número de lista ${a.lista}. CURP ${a.curp}. ${nombrePeriodo(rep.periodo)}.`, 9.5, '#5B4E40');
  d.cifras([[r1(e.prom), 'Promedio'], [NOMBRE_COLOR[e.color], 'Semáforo'], [`${e.cal.length} de ${e.esperadas}`, 'Lecturas calificadas'], [String(e.faltas + e.noEntrego), 'Faltas o sin entregar']]);
  if (e.cal.length >= 4) { const ini = prom(e.cal.slice(0, 3).map(f => f.c.calificacion)), fin = prom(e.cal.slice(-3).map(f => f.c.calificacion));
    d.parrafo(`Promedio de sus primeras lecturas del periodo: ${r1(ini)}. De las más recientes: ${r1(fin)}. ${lecturaTendencia(ini, fin)}`); }
  d.subtitulo('Trayectoria', 180); if (e.cal.length) d.trayectoria(e.cal); else d.parrafo('Aún no tiene lecturas calificadas en este periodo.');
  d.subtitulo('Desempeño por criterio (1 a 4)'); d.criterios(e.criterios);
  d.subtitulo('Detalle por lectura');
  d.tabla([{ t: 'Sem.', w: 36 }, { t: 'Lectura', w: 290 }, { t: 'Puntos', w: 54, der: true }, { t: 'Resultado', w: 140 }],
    e.filas.map(f => [f.lec.semana, f.lec.titulo, f.c?.estado === 'calificado' ? `${f.c.puntos}/20` : '', !f.c ? 'Sin registro' : f.c.estado === 'calificado' ? { t: `${r1(f.c.calificacion)}  ${NOMBRE_COLOR[colorDe(f.c.calificacion)]}`, color: colorDe(f.c.calificacion) } : f.c.estado === 'falta' ? 'No asistió' : 'No entregó']));
  return `reporte-${slugArch(nombreCompleto(a))}.pdf`;
}
function pdfGrupo(d, g, gr) {
  const semanas = semanasDe(rep.periodo), al = estado.alumnos.filter(a => a.estado === 'activo' && a.grado === g && a.grupo === gr).sort(ordenAlumno), st = statsConjunto(al, semanas);
  d.titulo(`Reporte del grupo ${g}.° ${gr}`); d.parrafo(`${nombrePeriodo(rep.periodo)}. ${al.length} alumnos activos.`, 9.5, '#5B4E40');
  d.cifras([[r1(st.prom), 'Promedio del grupo'], [st.participacion == null ? '—' : Math.round(st.participacion * 100) + '%', 'Lecturas calificadas'], [String(st.conteo.verde), 'En verde'], [String(st.conteo.rojo), 'En rojo']]);
  d.subtitulo('Semáforo del grupo'); d.semaforo(st.conteo);
  d.subtitulo('Desempeño por criterio (1 a 4)'); d.criterios(st.criterios);
  if (st.debil) d.parrafo(`Criterio con menor desempeño: ${st.debil.nombre}. Se sugiere reforzarlo en las próximas sesiones.`);
  d.subtitulo('Alumnos');
  d.tabla([{ t: 'N.°', w: 30 }, { t: 'Alumno', w: 250 }, { t: 'Promedio', w: 96 }, { t: 'Calificadas', w: 74, der: true }, { t: 'Faltas', w: 70, der: true }],
    st.est.map(e => [e.a.lista, nombreCompleto(e.a), e.prom == null ? 'Sin datos' : { t: `${r1(e.prom)}  ${NOMBRE_COLOR[e.color]}`, color: e.color }, `${e.cal.length} de ${e.esperadas}`, e.faltas + e.noEntrego]));
  const al2 = alertas(al); if (al2.length) { d.subtitulo('Alumnos que requieren atención'); al2.forEach(x => d.parrafo(`${nombreCompleto(x.a)}: ${x.tipo.toLowerCase()} (${x.det}).`, 9.5)); }
  d.subtitulo('Evolución del semáforo', 150); d.evolucion(evolucion(al, semanas));
  d.firmas();
  return `reporte-grupo-${g}${gr.toLowerCase()}-${slugArch(nombrePeriodo(rep.periodo))}.pdf`;
}
function pdfEscuela(d) {
  const semanas = semanasDe(rep.periodo), activos = estado.alumnos.filter(a => a.estado === 'activo'), st = statsConjunto(activos, semanas);
  d.titulo('Reporte general de la escuela'); d.parrafo(`${nombrePeriodo(rep.periodo)}. ${activos.length} alumnos activos en ${LISTA_GRUPOS.length} grupos.`, 9.5, '#5B4E40');
  d.cifras([[r1(st.prom), 'Promedio general'], [st.participacion == null ? '—' : Math.round(st.participacion * 100) + '%', 'Lecturas calificadas'], [String(st.conteo.verde), 'En verde'], [String(st.conteo.rojo), 'En rojo']]);
  d.subtitulo('Semáforo de la escuela'); d.semaforo(st.conteo);
  d.subtitulo('Comparativo de grupos');
  d.tabla([{ t: 'Grupo', w: 50 }, { t: 'Alumnos', w: 56, der: true }, { t: 'Promedio', w: 92 }, { t: 'Verde', w: 44, der: true }, { t: 'Amarillo', w: 54, der: true }, { t: 'Azul', w: 40, der: true }, { t: 'Rojo', w: 40, der: true }, { t: 'Calificado', w: 64, der: true }, { t: 'Criterio más bajo', w: 80 }],
    LISTA_GRUPOS.map(x => { const s = statsConjunto(activos.filter(a => a.grado === x.grado && a.grupo === x.grupo), semanas);
      return [`${x.grado}.° ${x.grupo}`, s.est.length, s.prom == null ? 'Sin datos' : { t: `${r1(s.prom)}  ${NOMBRE_COLOR[colorDe(s.prom)]}`, color: colorDe(s.prom) }, s.conteo.verde, s.conteo.amarillo, s.conteo.azul, s.conteo.rojo, s.participacion == null ? '—' : Math.round(s.participacion * 100) + '%', s.debil ? CORTO[s.debil.id] : '—']; }));
  d.subtitulo('Desempeño por criterio en la escuela (1 a 4)'); d.criterios(st.criterios);
  d.subtitulo('Evolución del semáforo', 150); d.evolucion(evolucion(activos, semanas));
  const al = alertas(activos); if (al.length) { d.subtitulo('Alumnos que requieren atención');
    d.tabla([{ t: 'Alumno', w: 250 }, { t: 'Grupo', w: 60 }, { t: 'Alerta', w: 120 }, { t: 'Detalle', w: 90 }], al.map(x => [nombreCompleto(x.a), `${x.a.grado}.° ${x.a.grupo}`, x.tipo, x.det])); }
  d.firmas();
  return `reporte-escuela-${slugArch(nombrePeriodo(rep.periodo))}.pdf`;
}

/* ---------- Panel directivo ---------- */
function panelDirectivo() {
  const tabs = [['tablero', 'Tablero'], ['alumnos', 'Alumnos'], ['maestros', 'Maestros'], ['datos', 'Ajustes']];
  const foco = document.activeElement && document.activeElement.id === 'filtro-alumnos';
  vista.innerHTML = `<nav class="pestanas" role="tablist">${tabs.map(([id, t]) => `<button type="button" role="tab" data-t="${id}" aria-selected="${estado.pestana === id}">${t}</button>`).join('')}</nav><div id="panel"></div>`;
  vista.querySelectorAll('.pestanas button').forEach(b => b.addEventListener('click', () => { estado.pestana = b.dataset.t; panelDirectivo(); }));
  ({ tablero: () => tablero($('#panel')), alumnos: tabAlumnos, maestros: tabMaestros, datos: tabDatos })[estado.pestana]();
  if (foco) { const f = $('#filtro-alumnos'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
}

/* Alumnos */
function tabAlumnos() {
  const activos = estado.alumnos.filter(a => a.estado === 'activo');
  const bajas = estado.alumnos.filter(a => a.estado === 'baja');
  const [g, l] = [+estado.grupoSel[0], estado.grupoSel.slice(1)];
  let lista = estado.verBajas ? bajas : activos.filter(a => a.grado === g && a.grupo === l);
  const q = normal(estado.filtro);
  if (q) lista = (estado.verBajas ? bajas : activos).filter(a => normal(nombreCompleto(a) + ' ' + a.curp).includes(q));
  lista.sort(ordenAlumno);
  $('#panel').innerHTML = `
  <div class="tarjeta">
    <h2>Alumnos</h2>
    <div class="resumen"><div><b>${activos.length}</b>activos</div><div><b>${bajas.length}</b>dados de baja</div></div>
    <div class="fila-btn">
      <button type="button" class="btn oro" id="b-alta">Dar de alta a un alumno</button>
      <button type="button" class="btn linea" id="b-plantilla">Descargar plantilla Excel</button>
      <button type="button" class="btn linea" id="b-subir">Subir lista Excel</button>
      <input type="file" id="archivo-lista" accept=".xlsx" hidden>
    </div>
  </div>
  <div class="grupos" role="group" aria-label="Grupos">
    ${LISTA_GRUPOS.map(x => { const n = activos.filter(a => a.grado === x.grado && a.grupo === x.grupo).length;
      return `<button type="button" class="grupo g${x.grado}" data-g="${x.id}" aria-pressed="${!estado.verBajas && !q && estado.grupoSel === x.id}"><b>${x.grado}.° ${x.grupo}</b><span>${n} alumnos</span></button>`; }).join('')}
  </div>
  <div class="barra-acciones">
    <input id="filtro-alumnos" class="buscar" type="search" placeholder="Buscar en toda la escuela por nombre o CURP" value="${esc(estado.filtro)}" aria-label="Buscar alumno">
    <label class="check"><input type="checkbox" id="ver-bajas" ${estado.verBajas ? 'checked' : ''}> Ver alumnos dados de baja</label>
  </div>
  <div class="tabla-envol"><table>
    <thead><tr><th>N.°</th><th>Alumno</th><th class="ocultar-movil">CURP</th>${q || estado.verBajas ? '<th>Grupo</th>' : ''}<th></th></tr></thead>
    <tbody>${lista.map(a => `<tr>
      <td class="num">${a.lista || '—'}</td>
      <td>${esc(nombreCompleto(a))}${a.estado === 'baja' ? ` <span class="etiqueta baja">Baja</span>` : ''}</td>
      <td class="curp ocultar-movil">${esc(a.curp)}</td>
      ${q || estado.verBajas ? `<td>${a.grado}.° ${esc(a.grupo)}</td>` : ''}
      <td class="acc"><button type="button" class="btn linea chico" data-accion="ver" data-curp="${a.curp}">Opciones</button></td></tr>`).join('')}
    </tbody></table>
    ${lista.length ? '' : `<p class="vacio">${estado.verBajas ? 'No hay alumnos dados de baja.' : q ? 'Ningún alumno coincide con la búsqueda.' : 'Este grupo aún no tiene alumnos. Súbelos con la plantilla Excel o dalos de alta uno por uno.'}</p>`}
  </div>`;
  vista.querySelectorAll('.grupo').forEach(b => b.addEventListener('click', () => { estado.grupoSel = b.dataset.g; estado.verBajas = false; estado.filtro = ''; panelDirectivo(); }));
  $('#filtro-alumnos').addEventListener('input', e => { estado.filtro = e.target.value; panelDirectivo(); });
  $('#ver-bajas').addEventListener('change', e => { estado.verBajas = e.target.checked; panelDirectivo(); });
  $('#b-alta').addEventListener('click', () => formAlumno());
  $('#b-plantilla').addEventListener('click', plantillaAlumnos);
  $('#b-subir').addEventListener('click', () => $('#archivo-lista').click());
  $('#archivo-lista').addEventListener('change', e => { if (e.target.files[0]) leerLista(e.target.files[0]); e.target.value = ''; });
  vista.querySelectorAll('[data-accion="ver"]').forEach(b => b.addEventListener('click', () => opcionesAlumno(b.dataset.curp)));
}

const opcionesGrupo = (sel) => LISTA_GRUPOS.map(x => `<option value="${x.id}" ${sel === x.id ? 'selected' : ''}>${x.grado}.° ${x.grupo}</option>`).join('');

function formAlumno() {
  abrirModal('Dar de alta a un alumno', `
  <form id="f-alumno" novalidate>
    <div class="campo"><label for="a-curp">CURP</label><input id="a-curp" maxlength="18" autocapitalize="characters" autocomplete="off" required></div>
    <div class="campo"><label for="a-pat">Apellido paterno</label><input id="a-pat" required></div>
    <div class="campo"><label for="a-mat">Apellido materno</label><input id="a-mat"></div>
    <div class="campo"><label for="a-nom">Nombre(s)</label><input id="a-nom" required></div>
    <div class="campo"><label for="a-grupo">Grupo</label><select id="a-grupo">${opcionesGrupo(estado.grupoSel)}</select></div>
    <div class="campo"><label for="a-lista">Número de lista</label><input id="a-lista" type="number" min="1" max="99" inputmode="numeric"><span class="ayuda">Si lo dejas vacío, se le asigna el siguiente número del grupo.</span></div>
    <div class="campo"><label for="a-fecha">Fecha de ingreso</label><input id="a-fecha" type="date" value="${hoyISO()}"><span class="ayuda">Las lecturas anteriores a esta fecha no le contarán como pendientes.</span></div>
    <p id="a-error" class="error" role="alert"></p>
    <button class="btn oro" type="submit">Guardar alumno</button>
  </form>`);
  $('#f-alumno').addEventListener('submit', async e => {
    e.preventDefault();
    const curp = $('#a-curp').value.trim().toUpperCase(), err = $('#a-error');
    const paterno = limpiarNombre($('#a-pat').value), materno = limpiarNombre($('#a-mat').value), nombres = limpiarNombre($('#a-nom').value);
    if (!CURP_RE.test(curp)) { err.textContent = 'La CURP no es válida. Debe tener 18 caracteres, por ejemplo GORM120315HCCRDN05.'; return; }
    if (!paterno || !nombres) { err.textContent = 'Escribe al menos el apellido paterno y el nombre.'; return; }
    const existe = estado.alumnos.find(a => a.curp === curp);
    if (existe) { err.textContent = existe.estado === 'baja' ? 'Esa CURP pertenece a un alumno dado de baja. Búscalo en "Ver alumnos dados de baja" para reactivarlo.' : `Esa CURP ya está registrada: ${nombreCompleto(existe)}, ${existe.grado}.° ${existe.grupo}.`; return; }
    const gid = $('#a-grupo').value, grado = +gid[0], grupo = gid.slice(1);
    const mismos = estado.alumnos.filter(a => a.estado === 'activo' && a.grado === grado && a.grupo === grupo);
    const lista = +$('#a-lista').value || (Math.max(0, ...mismos.map(a => a.lista || 0)) + 1);
    const fecha = $('#a-fecha').value || hoyISO();
    await setDoc(doc(db, 'alumnos', curp), { curp, paterno, materno, nombres, grado, grupo, lista, estado: 'activo', fechaAlta: fecha, fechaBaja: null,
      historial: [{ ciclo: CICLO, grado, grupo, desde: fecha, movimiento: 'alta' }], actualizado: serverTimestamp() });
    bitacora('alta', `${nombreCompleto({ paterno, materno, nombres })} (${curp}) en ${grado}.° ${grupo}`);
    cerrarModal(); aviso('Alumno dado de alta.');
  });
}

function opcionesAlumno(curp) {
  const a = estado.alumnos.find(x => x.curp === curp); if (!a) return;
  const hist = (a.historial || []).map(h => `<li>${esc(h.desde)}: ${esc(h.movimiento || 'registro')}, ${h.grado}.° ${esc(h.grupo)}${h.motivo ? ` (${esc(h.motivo)})` : ''}</li>`).join('');
  abrirModal(nombreCompleto(a), `
    <p><span class="etiqueta">${a.grado}.° ${esc(a.grupo)}</span> <span class="etiqueta">N.° ${a.lista || '—'}</span> ${a.estado === 'baja' ? '<span class="etiqueta baja">Baja</span>' : ''}</p>
    <p class="ayuda">CURP ${esc(a.curp)}. Ingreso: ${esc(a.fechaAlta || '—')}${a.fechaBaja ? `. Baja: ${esc(a.fechaBaja)}` : ''}.</p>
    ${a.estado === 'activo' ? `
    <h3>Corregir datos</h3>
    <form id="f-editar" novalidate>
      <div class="campo"><label for="e-pat">Apellido paterno</label><input id="e-pat" value="${esc(a.paterno)}"></div>
      <div class="campo"><label for="e-mat">Apellido materno</label><input id="e-mat" value="${esc(a.materno)}"></div>
      <div class="campo"><label for="e-nom">Nombre(s)</label><input id="e-nom" value="${esc(a.nombres)}"></div>
      <div class="campo"><label for="e-lista">Número de lista</label><input id="e-lista" type="number" min="1" max="99" value="${a.lista || ''}"></div>
      <button class="btn chico" type="submit">Guardar corrección</button>
    </form>
    <h3 style="margin-top:1.4rem">Cambiar de grupo</h3>
    <form id="f-cambio" novalidate>
      <div class="campo"><label for="c-grupo">Nuevo grupo</label><select id="c-grupo">${opcionesGrupo(a.grado + a.grupo)}</select></div>
      <div class="campo"><label for="c-lista">Número de lista en el nuevo grupo</label><input id="c-lista" type="number" min="1" max="99"><span class="ayuda">Vacío: el siguiente disponible.</span></div>
      <button class="btn chico" type="submit">Cambiar de grupo</button>
    </form>
    <h3 style="margin-top:1.4rem">Dar de baja</h3>
    <form id="f-baja" novalidate>
      <div class="campo"><label for="b-fecha">Fecha de baja</label><input id="b-fecha" type="date" value="${hoyISO()}"></div>
      <div class="campo"><label for="b-motivo">Motivo (opcional)</label><input id="b-motivo" placeholder="Por ejemplo: cambio de escuela"></div>
      <p class="ayuda">No se borra nada: su historial se conserva y deja de contar en las estadísticas desde esta fecha.</p>
      <button class="btn peligro chico" type="submit">Dar de baja</button>
    </form>` : `
    <h3>Reactivar</h3>
    <form id="f-reactivar" novalidate>
      <div class="campo"><label for="r-grupo">Grupo</label><select id="r-grupo">${opcionesGrupo(a.grado + a.grupo)}</select></div>
      <div class="campo"><label for="r-fecha">Fecha de reingreso</label><input id="r-fecha" type="date" value="${hoyISO()}"></div>
      <button class="btn oro chico" type="submit">Reactivar alumno</button>
    </form>`}
    <h3 style="margin-top:1.4rem">Historial</h3><ul class="ayuda">${hist || '<li>Sin movimientos.</li>'}</ul>`);

  const ref = doc(db, 'alumnos', curp);
  const sigLista = (g, l) => Math.max(0, ...estado.alumnos.filter(x => x.estado === 'activo' && x.grado === g && x.grupo === l).map(x => x.lista || 0)) + 1;
  $('#f-editar')?.addEventListener('submit', async e => {
    e.preventDefault();
    const datos = { paterno: limpiarNombre($('#e-pat').value), materno: limpiarNombre($('#e-mat').value), nombres: limpiarNombre($('#e-nom').value), lista: +$('#e-lista').value || a.lista, actualizado: serverTimestamp() };
    if (!datos.paterno || !datos.nombres) { aviso('El apellido paterno y el nombre no pueden quedar vacíos.', true); return; }
    await updateDoc(ref, datos); bitacora('corrección', `${curp}: ${nombreCompleto(datos)}`); cerrarModal(); aviso('Datos corregidos.');
  });
  $('#f-cambio')?.addEventListener('submit', async e => {
    e.preventDefault(); const gid = $('#c-grupo').value, grado = +gid[0], grupo = gid.slice(1);
    if (grado === a.grado && grupo === a.grupo) { aviso('Elige un grupo distinto al actual.', true); return; }
    const lista = +$('#c-lista').value || sigLista(grado, grupo);
    await updateDoc(ref, { grado, grupo, lista, historial: [...(a.historial || []), { ciclo: CICLO, grado, grupo, desde: hoyISO(), movimiento: 'cambio de grupo' }], actualizado: serverTimestamp() });
    bitacora('cambio de grupo', `${nombreCompleto(a)}: ${a.grado}.° ${a.grupo} a ${grado}.° ${grupo}`); cerrarModal(); aviso(`Cambiado a ${grado}.° ${grupo}.`);
  });
  $('#f-baja')?.addEventListener('submit', async e => {
    e.preventDefault(); const fecha = $('#b-fecha').value || hoyISO(), motivo = $('#b-motivo').value.trim();
    if (!confirm(`¿Dar de baja a ${nombreCompleto(a)}?`)) return;
    await updateDoc(ref, { estado: 'baja', fechaBaja: fecha, historial: [...(a.historial || []), { ciclo: CICLO, grado: a.grado, grupo: a.grupo, desde: fecha, movimiento: 'baja', motivo }], actualizado: serverTimestamp() });
    bitacora('baja', `${nombreCompleto(a)} (${curp})${motivo ? ': ' + motivo : ''}`); cerrarModal(); aviso('Alumno dado de baja.');
  });
  $('#f-reactivar')?.addEventListener('submit', async e => {
    e.preventDefault(); const gid = $('#r-grupo').value, grado = +gid[0], grupo = gid.slice(1), fecha = $('#r-fecha').value || hoyISO();
    await updateDoc(ref, { estado: 'activo', grado, grupo, lista: sigLista(grado, grupo), fechaBaja: null, fechaAlta: fecha, historial: [...(a.historial || []), { ciclo: CICLO, grado, grupo, desde: fecha, movimiento: 'reingreso' }], actualizado: serverTimestamp() });
    bitacora('reingreso', `${nombreCompleto(a)} en ${grado}.° ${grupo}`); cerrarModal(); aviso('Alumno reactivado.');
  });
}

/* Plantilla Excel de alumnos */
async function plantillaAlumnos() {
  const wb = new ExcelJS.Workbook(); wb.creator = 'Raíces y Estrellas';
  const ws = wb.addWorksheet('Alumnos', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'CURP', key: 'curp', width: 22 }, { header: 'Apellido paterno', key: 'paterno', width: 20 },
    { header: 'Apellido materno', key: 'materno', width: 20 }, { header: 'Nombre(s)', key: 'nombres', width: 26 },
    { header: 'Grado', key: 'grado', width: 9 }, { header: 'Grupo', key: 'grupo', width: 9 }, { header: 'Número de lista', key: 'lista', width: 16 }];
  const cab = ws.getRow(1); cab.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cab.height = 22;
  cab.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16213F' } }; c.alignment = { vertical: 'middle' }; });
  // Si ya hay alumnos, la plantilla sale con la lista actual para editarla.
  estado.alumnos.filter(a => a.estado === 'activo').sort((a, b) => a.grado - b.grado || a.grupo.localeCompare(b.grupo) || ordenAlumno(a, b))
    .forEach(a => ws.addRow({ curp: a.curp, paterno: a.paterno, materno: a.materno, nombres: a.nombres, grado: a.grado, grupo: a.grupo, lista: a.lista }));
  for (let r = 2; r <= 400; r++) {
    ws.getCell(`E${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"1,2,3"'], showErrorMessage: true, errorTitle: 'Grado', error: 'Escribe 1, 2 o 3.' };
    ws.getCell(`F${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"G,H,I"'], showErrorMessage: true, errorTitle: 'Grupo', error: 'Elige G, H o I.' };
    ws.getCell(`A${r}`).dataValidation = { type: 'textLength', operator: 'equal', allowBlank: true, formulae: [18], showErrorMessage: true, errorTitle: 'CURP', error: 'La CURP debe tener 18 caracteres.' };
  }
  const ins = wb.addWorksheet('Instrucciones');
  ins.getColumn(1).width = 100;
  ['Cómo llenar la lista de alumnos', '',
    '1. Llena una fila por alumno en la hoja "Alumnos". No cambies los títulos de las columnas.',
    '2. La CURP es obligatoria: es lo que conserva el historial del alumno durante sus tres años.',
    '3. Grado: 1, 2 o 3. Grupo: G o H (y también I en primer grado).',
    '4. Número de lista: si lo dejas vacío, la plataforma lo asigna en orden alfabético.',
    '5. Puedes subir la escuela completa en un solo archivo o solo algunos grupos.',
    '6. Si un alumno ya existe, se actualizan sus datos; si cambió de grupo, se registra el cambio en su historial.',
    '7. Subir el archivo nunca da de baja a nadie. Las bajas se hacen desde el panel, alumno por alumno.']
    .forEach((t, i) => { const c = ins.getCell(`A${i + 1}`); c.value = t; if (i === 0) c.font = { bold: true, size: 14 }; });
  const buf = await wb.xlsx.writeBuffer();
  descargar('plantilla-alumnos-raices-y-estrellas.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

/* Subir lista Excel */
async function leerLista(archivo) {
  let filas = [];
  try {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await archivo.arrayBuffer());
    const ws = wb.getWorksheet('Alumnos') || wb.worksheets[0];
    const mapa = {}; ws.getRow(1).eachCell((c, i) => { mapa[normal(c.text)] = i; });
    const col = (...n) => n.map(x => mapa[x]).find(Boolean);
    const cC = col('curp'), cP = col('apellido paterno', 'paterno'), cM = col('apellido materno', 'materno'), cN = col('nombre(s)', 'nombres', 'nombre'), cG = col('grado'), cGr = col('grupo'), cL = col('numero de lista', 'no. de lista', 'lista');
    if (!cC || !cP || !cN || !cG || !cGr) { aviso('El archivo no tiene las columnas de la plantilla. Descarga la plantilla y úsala.', true); return; }
    ws.eachRow((row, i) => {
      if (i === 1) return;
      const v = c => c ? String(row.getCell(c).text ?? '').trim() : '';
      if (![cC, cP, cN].some(c => v(c))) return;
      filas.push({ fila: i, curp: v(cC).toUpperCase().replace(/\s/g, ''), paterno: limpiarNombre(v(cP)), materno: limpiarNombre(v(cM)), nombres: limpiarNombre(v(cN)), grado: +v(cG), grupo: v(cGr).toUpperCase(), lista: +v(cL) || 0 });
    });
  } catch (e) { console.error(e); aviso('No se pudo leer el archivo. Verifica que sea un Excel (.xlsx).', true); return; }

  const vistos = new Set();
  filas.forEach(f => {
    f.errores = [];
    if (!CURP_RE.test(f.curp)) f.errores.push('CURP no válida');
    if (vistos.has(f.curp)) f.errores.push('CURP repetida en el archivo'); vistos.add(f.curp);
    if (!f.paterno || !f.nombres) f.errores.push('Falta apellido o nombre');
    if (!(GRUPOS[f.grado] || []).includes(f.grupo)) f.errores.push('Grado o grupo no existe');
    const ex = estado.alumnos.find(a => a.curp === f.curp);
    f.tipo = f.errores.length ? 'error' : !ex ? 'nuevo' : ex.estado === 'baja' ? 'reingreso' : (ex.grado !== f.grado || ex.grupo !== f.grupo) ? 'cambio' : 'actualiza';
    f.previo = ex;
  });
  // Números de lista faltantes: orden alfabético dentro de cada grupo.
  LISTA_GRUPOS.forEach(x => {
    const del = filas.filter(f => f.tipo !== 'error' && f.grado === x.grado && f.grupo === x.grupo);
    const sin = del.filter(f => !f.lista).sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'));
    let n = Math.max(0, ...del.map(f => f.lista), ...estado.alumnos.filter(a => a.estado === 'activo' && a.grado === x.grado && a.grupo === x.grupo && !del.some(f => f.curp === a.curp)).map(a => a.lista || 0));
    sin.forEach(f => { f.lista = ++n; f.listaAuto = true; });
  });
  const cuenta = t => filas.filter(f => f.tipo === t).length;
  const validas = filas.filter(f => f.tipo !== 'error');
  const etiq = { nuevo: ['nuevo', 'Nuevo'], cambio: ['cambio', 'Cambio de grupo'], reingreso: ['cambio', 'Reingreso'], actualiza: ['', 'Actualiza'], error: ['error', 'Error'] };
  abrirModal('Revisar antes de guardar', `
    <div class="resumen"><div><b>${cuenta('nuevo')}</b>nuevos</div><div><b>${cuenta('cambio')}</b>cambios de grupo</div><div><b>${cuenta('reingreso')}</b>reingresos</div><div><b>${cuenta('actualiza')}</b>ya registrados</div><div><b>${cuenta('error')}</b>con error</div></div>
    ${cuenta('error') ? '<p class="error">Las filas con error no se guardarán. Corrígelas en el Excel y vuelve a subirlo cuando quieras.</p>' : ''}
    <label class="check" style="margin:.4rem 0 1rem"><input type="checkbox" id="mitad"> Los alumnos nuevos llegaron a mitad de ciclo (contar desde hoy y no desde el ${INICIO_CICLO.split('-').reverse().join('/')})</label>
    <div class="tabla-envol" style="max-height:45vh;overflow:auto"><table><thead><tr><th>Fila</th><th>Alumno</th><th>Grupo</th><th>Estado</th></tr></thead><tbody>
    ${filas.sort((a, b) => (a.tipo === 'error' ? -1 : 0) - (b.tipo === 'error' ? -1 : 0) || a.fila - b.fila).map(f => `<tr><td class="num">${f.fila}</td><td>${esc(nombreCompleto(f)) || '<em>Sin nombre</em>'}<br><span class="ayuda">${esc(f.curp)}</span></td><td>${f.grado || '?'}.° ${esc(f.grupo)}${f.lista ? `, n.° ${f.lista}` : ''}</td>
      <td><span class="etiqueta ${etiq[f.tipo][0]}">${etiq[f.tipo][1]}</span>${f.errores.length ? `<br><span class="ayuda">${f.errores.join('; ')}</span>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="fila-btn" style="margin-top:1rem"><button type="button" class="btn oro" id="confirmar-lista" ${validas.length ? '' : 'disabled'}>Guardar ${validas.length} alumnos</button><button type="button" class="btn linea" id="cancelar-lista">Cancelar</button></div>`);
  $('#cancelar-lista').addEventListener('click', cerrarModal);
  $('#confirmar-lista').addEventListener('click', async e => {
    e.target.disabled = true; e.target.textContent = 'Guardando…';
    const fechaNuevos = $('#mitad').checked ? hoyISO() : INICIO_CICLO;
    try {
      for (let i = 0; i < validas.length; i += 400) {
        const lote = writeBatch(db);
        validas.slice(i, i + 400).forEach(f => {
          const ref = doc(db, 'alumnos', f.curp), p = f.previo;
          const base = { curp: f.curp, paterno: f.paterno, materno: f.materno, nombres: f.nombres, grado: f.grado, grupo: f.grupo, lista: f.lista, estado: 'activo', actualizado: serverTimestamp() };
          if (f.tipo === 'nuevo') lote.set(ref, { ...base, fechaAlta: fechaNuevos, fechaBaja: null, historial: [{ ciclo: CICLO, grado: f.grado, grupo: f.grupo, desde: fechaNuevos, movimiento: 'alta' }] });
          else if (f.tipo === 'cambio') lote.update(ref, { ...base, historial: [...(p.historial || []), { ciclo: CICLO, grado: f.grado, grupo: f.grupo, desde: hoyISO(), movimiento: 'cambio de grupo' }] });
          else if (f.tipo === 'reingreso') lote.update(ref, { ...base, fechaAlta: hoyISO(), fechaBaja: null, historial: [...(p.historial || []), { ciclo: CICLO, grado: f.grado, grupo: f.grupo, desde: hoyISO(), movimiento: 'reingreso' }] });
          else lote.update(ref, base);
        });
        await lote.commit();
      }
      bitacora('lista Excel', `${cuenta('nuevo')} nuevos, ${cuenta('cambio')} cambios, ${cuenta('reingreso')} reingresos, ${cuenta('actualiza')} actualizados`);
      cerrarModal(); aviso(`Lista guardada: ${validas.length} alumnos.`);
    } catch (x) { console.error(x); aviso('No se pudo guardar. Revisa la conexión e inténtalo de nuevo.', true); e.target.disabled = false; e.target.textContent = 'Reintentar'; }
  });
}

/* Maestros */
function tabMaestros() {
  const ms = [...estado.maestros].sort((a, b) => (b.activo !== false) - (a.activo !== false) || a.nombre.localeCompare(b.nombre, 'es'));
  $('#panel').innerHTML = `
  <div class="tarjeta"><h2>Maestros</h2>
    <p class="ayuda">Todos entran con la contraseña general de docentes y eligen su nombre de esta lista. Las asignaturas definen qué lecturas les toca calificar según el calendario.</p>
    <button type="button" class="btn oro" id="b-maestro">Agregar maestro</button></div>
  <div class="tabla-envol"><table><thead><tr><th>Nombre</th><th>Asignaturas</th><th class="ocultar-movil">Grados</th><th></th></tr></thead><tbody>
  ${ms.map(m => `<tr><td>${esc(m.nombre)}${m.activo === false ? ' <span class="etiqueta baja">Inactivo</span>' : ''}</td><td>${esc((m.asignaturas || []).join(', '))}</td><td class="ocultar-movil">${(m.grados || []).map(g => g + '.°').join(', ')}</td>
    <td class="acc"><button type="button" class="btn linea chico" data-m="${m.id}">Editar</button></td></tr>`).join('')}
  </tbody></table>${ms.length ? '' : '<p class="vacio">Aún no hay maestros registrados.</p>'}</div>`;
  $('#b-maestro').addEventListener('click', () => formMaestro());
  vista.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => formMaestro(estado.maestros.find(m => m.id === b.dataset.m))));
}
function formMaestro(m) {
  const sel = new Set(m?.asignaturas || []), gr = new Set(m?.grados || [1, 2, 3]);
  abrirModal(m ? 'Editar maestro' : 'Agregar maestro', `
  <form id="f-maestro" novalidate>
    <div class="campo"><label for="m-nombre">Nombre como aparecerá en la lista</label><input id="m-nombre" value="${esc(m?.nombre || '')}" placeholder="Por ejemplo: Profra. Ana López Pérez"></div>
    <fieldset class="campo" style="border:0;padding:0"><legend style="font-weight:700;margin-bottom:.4rem">Asignaturas</legend>
      <div class="chips">${ASIGNATURAS.map(a => `<label><input type="checkbox" name="asig" value="${esc(a)}" ${sel.has(a) ? 'checked' : ''}>${esc(a)}</label>`).join('')}</div></fieldset>
    <fieldset class="campo" style="border:0;padding:0"><legend style="font-weight:700;margin-bottom:.4rem">Grados en los que da clase</legend>
      <div class="chips">${[1, 2, 3].map(g => `<label><input type="checkbox" name="grado" value="${g}" ${gr.has(g) ? 'checked' : ''}>${NOM_GRADO[g]}</label>`).join('')}</div></fieldset>
    ${m ? `<label class="check" style="margin-bottom:1rem"><input type="checkbox" id="m-activo" ${m.activo !== false ? 'checked' : ''}> Activo (aparece en la lista para entrar)</label>` : ''}
    <p id="m-error" class="error" role="alert"></p>
    <div class="fila-btn"><button class="btn oro" type="submit">Guardar</button>${m ? '<button type="button" class="btn peligro" id="m-borrar">Eliminar maestro</button>' : ''}</div>
  </form>`);
  $('#m-borrar')?.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar a ${m.nombre}? Sus calificaciones ya capturadas se conservan. Si solo dejará de participar un tiempo, mejor márcalo como inactivo.`)) return;
    await deleteDoc(doc(db, 'maestros', m.id)); delete mem.maestros.docs[m.id]; SYNC[1].aplicar(mem.maestros.docs); avisarBorrado(); bitacora('maestro eliminado', m.nombre); cerrarModal(); aviso('Maestro eliminado.');
  });
  $('#f-maestro').addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = limpiarNombre($('#m-nombre').value);
    const asignaturas = [...document.querySelectorAll('[name="asig"]:checked')].map(x => x.value);
    const grados = [...document.querySelectorAll('[name="grado"]:checked')].map(x => +x.value);
    if (!nombre) { $('#m-error').textContent = 'Escribe el nombre del maestro.'; return; }
    if (!asignaturas.length) { $('#m-error').textContent = 'Marca al menos una asignatura.'; return; }
    if (!grados.length) { $('#m-error').textContent = 'Marca al menos un grado.'; return; }
    const id = m?.id || (normal(nombre).replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + Date.now().toString(36));
    await setDoc(doc(db, 'maestros', id), { nombre, asignaturas, grados, activo: m ? $('#m-activo').checked : true, actualizado: serverTimestamp() });
    bitacora(m ? 'edición de maestro' : 'alta de maestro', nombre); cerrarModal(); aviso('Maestro guardado.');
  });
}

/* Claves y respaldo */
function tabDatos() {
  const pct = Math.round(estado.claves / LECTURAS.length * 100);
  $('#panel').innerHTML = `
  <div class="tarjeta"><h2>Firmas de los reportes</h2>
    <p class="ayuda">Aparecen al final de los reportes PDF de grupo y de escuela.</p>
    <form id="f-firmas" novalidate>
      <div class="campo"><label for="fi-dir">Nombre del director</label><input id="fi-dir" value="${esc(estado.config.director || 'Aurelio May Euan')}"></div>
      <div class="campo"><label for="fi-cdir">Cargo</label><input id="fi-cdir" value="${esc(estado.config.cargoDirector || 'Director')}"></div>
      <div class="campo"><label for="fi-sub">Nombre del subdirector</label><input id="fi-sub" value="${esc(estado.config.subdirector || 'Jesús Rodríguez García')}"></div>
      <div class="campo"><label for="fi-csub">Cargo</label><input id="fi-csub" value="${esc(estado.config.cargoSubdirector || 'Subdirector del Turno Vespertino')}"></div>
      <button class="btn chico" type="submit">Guardar firmas</button>
    </form>
  </div>
  <div class="tarjeta"><h2>Claves del docente</h2>
    <p>Las respuestas de las fábulas y las enseñanzas de leyendas y mitos solo se ven dentro de la plataforma.</p>
    <p><b>${estado.claves} de ${LECTURAS.length}</b> claves cargadas.</p>
    <div class="progreso" aria-hidden="true"><i style="width:${pct}%"></i></div>
    <div class="fila-btn" style="margin-top:1rem"><button type="button" class="btn ${estado.claves ? 'linea' : 'oro'}" id="b-claves">${estado.claves ? 'Volver a cargar el archivo de claves' : 'Cargar archivo de claves'}</button><input type="file" id="archivo-claves" accept=".json,application/json" hidden></div>
    <p class="ayuda" style="margin-top:.6rem">Usa el archivo <b>claves-docente-NO-SUBIR-A-GITHUB.json</b>.</p>
  </div>
  <div class="tarjeta"><h2>Respaldo completo</h2>
    <p>Descarga en un archivo toda la información: alumnos, maestros, claves, calificaciones e historial. Se recomienda hacerlo al cierre de cada mes y de cada trimestre.</p>
    <div class="fila-btn"><button type="button" class="btn oro" id="b-respaldo">Descargar respaldo</button><button type="button" class="btn linea" id="b-excel-alumnos">Descargar alumnos en Excel</button></div>
  </div>
  <div class="tarjeta"><h2>Borrar calificaciones de prueba</h2>
    <p>Elimina todas las calificaciones y faltas capturadas de una lectura, para empezar en limpio después de hacer pruebas. No se puede deshacer; descarga un respaldo antes.</p>
    <div class="campo"><label for="p-lec">Lectura</label><select id="p-lec">${[1, 2, 3].map(g => `<optgroup label="${NOM_GRADO[g]}">${LECTURAS.filter(l => l.grado === g).map(l => `<option value="${l.id}">Semana ${l.semana}: ${esc(l.titulo)}</option>`).join('')}</optgroup>`).join('')}</select></div>
    <button type="button" class="btn peligro" id="b-borrar-prueba">Borrar calificaciones de esta lectura</button>
  </div>`;
  $('#f-firmas').addEventListener('submit', async e => {
    e.preventDefault();
    const datos = { director: limpiarNombre($('#fi-dir').value), cargoDirector: limpiarNombre($('#fi-cdir').value), subdirector: limpiarNombre($('#fi-sub').value), cargoSubdirector: limpiarNombre($('#fi-csub').value) };
    await setDoc(doc(db, 'config', 'escuela'), datos, { merge: true }); Object.assign(estado.config, datos); aviso('Firmas guardadas.');
  });
  $('#b-claves').addEventListener('click', () => $('#archivo-claves').click());
  $('#archivo-claves').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    let datos; try { datos = JSON.parse(await f.text()); } catch { aviso('El archivo no es válido. Usa el archivo de claves que se te entregó.', true); return; }
    const ids = new Set(LECTURAS.map(l => l.id)), entradas = Object.entries(datos).filter(([k]) => ids.has(k));
    if (!entradas.length) { aviso('El archivo no contiene claves de estas lecturas.', true); return; }
    const lote = writeBatch(db); entradas.forEach(([k, v]) => lote.set(doc(db, 'claves', k), v));
    try { await lote.commit(); entradas.forEach(([k, v]) => { mem.claves.docs[k] = v; }); SYNC[4].aplicar(mem.claves.docs); guardarLocal('claves'); refrescar(); avisarBorrado(); bitacora('claves', `${entradas.length} claves cargadas`); aviso(`${entradas.length} claves cargadas.`); }
    catch (x) { console.error(x); aviso('No se pudieron guardar las claves. Revisa la conexión.', true); }
  });
  $('#b-respaldo').addEventListener('click', async e => {
    e.target.disabled = true; e.target.textContent = 'Preparando…';
    try {
      const salida = { plataforma: 'Raíces y Estrellas', ciclo: CICLO, fecha: new Date().toISOString() };
      for (const c of ['alumnos', 'maestros', 'claves', 'calificaciones', 'aplicaciones', 'config', 'bitacora']) {
        const s = await getDocs(collection(db, c));
        salida[c] = s.docs.map(d => { const x = d.data(); for (const k in x) if (x[k] && typeof x[k].toDate === 'function') x[k] = x[k].toDate().toISOString(); return { id: d.id, ...x }; });
      }
      descargar(`respaldo-raices-y-estrellas-${hoyISO()}.json`, new Blob([JSON.stringify(salida, null, 1)], { type: 'application/json' }));
      aviso('Respaldo descargado.');
    } catch (x) { console.error(x); aviso('No se pudo generar el respaldo. Revisa la conexión.', true); }
    e.target.disabled = false; e.target.textContent = 'Descargar respaldo';
  });
  $('#b-excel-alumnos').addEventListener('click', plantillaAlumnos);
  $('#b-borrar-prueba').addEventListener('click', async e => {
    const l = lecturaPorId($('#p-lec').value);
    const [cs, ap] = await Promise.all([getDocs(query(collection(db, 'calificaciones'), where('lectura', '==', l.id))), getDocs(query(collection(db, 'aplicaciones'), where('lectura', '==', l.id)))]);
    const total = cs.size + ap.size;
    if (!total) { aviso('Esa lectura no tiene calificaciones ni faltas registradas.'); return; }
    if (!confirm(`Se borrarán ${cs.size} calificaciones y ${ap.size} registros de faltas de «${l.titulo}». ¿Continuar?`)) return;
    e.target.disabled = true;
    const docs = [...cs.docs, ...ap.docs];
    for (let i = 0; i < docs.length; i += 400) { const lote = writeBatch(db); docs.slice(i, i + 400).forEach(d => lote.delete(d.ref)); await lote.commit(); }
    cs.docs.forEach(d => delete mem.calificaciones.docs[d.id]); ap.docs.forEach(d => delete mem.aplicaciones.docs[d.id]); avisarBorrado();
    bitacora('calificaciones borradas', `${l.id}: ${cs.size} calificaciones, ${ap.size} aplicaciones`);
    e.target.disabled = false; aviso(`Listo: se borraron ${total} registros de «${l.titulo}».`);
  });
}
