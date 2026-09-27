/* Raíces y Estrellas · Plataforma docente · Entrega 2: acceso, panel directivo y calificación */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, serverTimestamp, addDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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
const estado = { rol: null, nombre: null, alumnos: [], maestros: [], claves: 0, califs: {}, aplic: {}, pestana: 'alumnos', grupoSel: '1G', verBajas: false, filtro: '', subs: [] };

function escuchar() {
  estado.subs.forEach(f => f()); estado.subs = [];
  estado.subs.push(onSnapshot(collection(db, 'alumnos'), s => { estado.alumnos = s.docs.map(d => d.data()); refrescar(); }, errorDatos));
  estado.subs.push(onSnapshot(collection(db, 'maestros'), s => { estado.maestros = s.docs.map(d => ({ id: d.id, ...d.data() })); refrescar(); }, errorDatos));
  estado.subs.push(onSnapshot(collection(db, 'claves'), s => { estado.claves = s.size; refrescar(); }, errorDatos));
}
function errorDatos(e) { console.error(e); aviso('No se pudieron leer los datos. Revisa que las reglas de seguridad estén publicadas.', true); }
let refrescar = () => {};

/* ---------- Acceso ---------- */
onAuthStateChanged(auth, usuario => {
  if (!usuario) { estado.subs.forEach(f => f()); estado.subs = []; pantallaAcceso(); return; }
  estado.rol = usuario.email === CUENTAS.directivo ? 'directivo' : usuario.email === CUENTAS.maestro ? 'maestro' : null;
  if (!estado.rol) { signOut(auth); return; }
  $('#cab-usuario').hidden = false;
  escuchar();
  if (estado.rol === 'directivo') { estado.nombre = 'Directivo'; $('#cab-nombre').textContent = 'Panel directivo'; refrescar = panelDirectivo; panelDirectivo(); }
  else { estado.nombre = localStorage.getItem('rye_docente'); refrescar = pantallaDocente; pantallaDocente(); }
});
$('#btn-salir').addEventListener('click', async () => { localStorage.removeItem('rye_docente'); await signOut(auth); });

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
let subCalifs = null, subAplic = null, clavesCache = {};

function escucharCalificaciones(ids) {
  const clave = ids.slice().sort().join(',');
  if (escucharCalificaciones.clave === clave) return;
  escucharCalificaciones.clave = clave;
  if (subCalifs) subCalifs.forEach(f => f()); subCalifs = [];
  estado.califs = {};
  for (let i = 0; i < ids.length; i += 30) {
    const lote = ids.slice(i, i + 30);
    subCalifs.push(onSnapshot(query(collection(db, 'calificaciones'), where('lectura', 'in', lote)), s => {
      s.docChanges().forEach(ch => { if (ch.type === 'removed') delete estado.califs[ch.doc.id]; else estado.califs[ch.doc.id] = ch.doc.data(); });
      refrescar();
    }, errorDatos));
  }
  if (subAplic) subAplic(); 
  subAplic = onSnapshot(collection(db, 'aplicaciones'), s => { estado.aplic = {}; s.docs.forEach(d => { estado.aplic[d.id] = d.data(); }); refrescar(); }, errorDatos);
}

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
  escucharCalificaciones([...ids]);
  if (ui.pantalla === 'calificar' && ui.lec) return pantallaCalificar();
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
          return `<div class="apl"><b>${l.grado}.° ${gr}</b>${ap ? `<span class="ok">Aplicada · ${ap.faltas?.length || 0} faltas</span>` : '<span>Sin registrar</span>'}
          <div class="fila-btn"><button type="button" class="btn linea chico" data-hojas="${l.id}" data-g="${l.grado}" data-gr="${gr}">Imprimir hojas</button><button type="button" class="btn chico" data-faltas="${l.id}" data-g="${l.grado}" data-gr="${gr}">${ap ? 'Editar faltas' : 'Registrar faltas'}</button></div></div>`; }).join('')}</div></div>`).join('') || '<p class="vacio">No tienes grados asignados.</p>'}
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

  html += `<section class="tarjeta"><h2>Calificar otra lectura</h2><p class="ayuda">Por ejemplo, si cubres a un compañero.</p>
    <div class="otra"><select id="o-lec" aria-label="Lectura">${[1, 2, 3].map(g => `<optgroup label="${NOM_GRADO[g]}">${LECTURAS.filter(l => l.grado === g && l.semana <= Math.max(ultima, 1)).map(l => `<option value="${l.id}">Semana ${l.semana}: ${esc(l.titulo)}</option>`).join('')}</optgroup>`).join('')}</select>
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
    await lote.commit();
    cerrarModal(); aviso(`Lectura registrada en ${g}.° ${gr}: ${lista.length} faltas.`);
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
  if (!clavesCache[lecId]) getDoc(doc(db, 'claves', lecId)).then(d => { clavesCache[lecId] = d.exists() ? d.data() : {}; if (ui.pantalla === 'calificar') pantallaCalificar(); }).catch(() => {});
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
  const clave = clavesCache[lec.id];
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
function volverInicio() { ui.pantalla = 'inicio'; ui.lec = null; ui.borrador = null; pantallaDocente(); scrollTo(0, 0); }
function irA(i) { ui.idx = i; ui.borrador = null; pantallaCalificar(); document.querySelector('.tira')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); document.querySelector('.punto.actual')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }

async function guardarCalif(a, datos) {
  const lec = ui.lec, id = idCalif(a.curp, lec.id), previa = califDe(a.curp, lec.id);
  const reg = { curp: a.curp, lectura: lec.id, grado: ui.grado, grupo: ui.grupo, docente: estado.nombre, ciclo: CICLO, fecha: serverTimestamp(), ...datos };
  estado.califs[id] = { ...reg }; // respuesta inmediata en pantalla
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
    await lote.commit();
    aGuardar.filter(f => f.tipo === 'cambio').forEach(f => bitacora('corrección de calificación (Excel)', `${f.nombre}, ${lec.id}: ${f.previa.estado === 'calificado' ? f.previa.calificacion : f.previa.estado} a ${txt(f)}`));
    cerrarModal(); aviso(`${aGuardar.length} calificaciones guardadas.`);
  });
}

/* ---------- Panel directivo ---------- */
function panelDirectivo() {
  const tabs = [['alumnos', 'Alumnos'], ['maestros', 'Maestros'], ['datos', 'Claves y respaldo']];
  const foco = document.activeElement && document.activeElement.id === 'filtro-alumnos';
  vista.innerHTML = `<nav class="pestanas" role="tablist">${tabs.map(([id, t]) => `<button type="button" role="tab" data-t="${id}" aria-selected="${estado.pestana === id}">${t}</button>`).join('')}</nav><div id="panel"></div>`;
  vista.querySelectorAll('.pestanas button').forEach(b => b.addEventListener('click', () => { estado.pestana = b.dataset.t; panelDirectivo(); }));
  ({ alumnos: tabAlumnos, maestros: tabMaestros, datos: tabDatos })[estado.pestana]();
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
    await deleteDoc(doc(db, 'maestros', m.id)); bitacora('maestro eliminado', m.nombre); cerrarModal(); aviso('Maestro eliminado.');
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
  $('#b-claves').addEventListener('click', () => $('#archivo-claves').click());
  $('#archivo-claves').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    let datos; try { datos = JSON.parse(await f.text()); } catch { aviso('El archivo no es válido. Usa el archivo de claves que se te entregó.', true); return; }
    const ids = new Set(LECTURAS.map(l => l.id)), entradas = Object.entries(datos).filter(([k]) => ids.has(k));
    if (!entradas.length) { aviso('El archivo no contiene claves de estas lecturas.', true); return; }
    const lote = writeBatch(db); entradas.forEach(([k, v]) => lote.set(doc(db, 'claves', k), v));
    try { await lote.commit(); bitacora('claves', `${entradas.length} claves cargadas`); aviso(`${entradas.length} claves cargadas.`); }
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
    bitacora('calificaciones borradas', `${l.id}: ${cs.size} calificaciones, ${ap.size} aplicaciones`);
    e.target.disabled = false; aviso(`Listo: se borraron ${total} registros de «${l.titulo}».`);
  });
}
