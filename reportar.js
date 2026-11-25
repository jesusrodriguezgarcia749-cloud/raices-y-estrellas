/* Raíces y Estrellas · Link personal de cada maestro para reportar incidencias: reportar.html?t=CLAVE.
   No pide contraseña: el link ya sabe quién es el maestro. Los reportes se guardan en buzon/CLAVE/inc
   y llegan a la pestaña Incidencias de la cuenta directiva. La Dirección puede desactivar el link. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, getDoc, getDocs, addDoc, updateDoc, collection } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp({
  apiKey: "AIzaSyB0IzYArTNquMl5-zphxdW9G4wcYmPgekA",
  authDomain: "raices-y-estrellas-est17.firebaseapp.com",
  projectId: "raices-y-estrellas-est17",
  storageBucket: "raices-y-estrellas-est17.firebasestorage.app",
  messagingSenderId: "666765040335",
  appId: "1:666765040335:web:a5bae72abc2dbd1b7035ba"
}, 'reportar');
const db = getFirestore(app);

const $ = s => document.querySelector(s);
const vista = $('#vista');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normal = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fLoc = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? String(iso).slice(0, 10) : d.toLocaleDateString('en-CA'); };
const fLarga = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]}`; };
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const horaAhora = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const hora12 = h => { if (!h) return ''; const [H, M] = h.split(':').map(Number); return `${((H + 11) % 12) + 1}:${String(M).padStart(2, '0')} ${H < 12 ? 'a. m.' : 'p. m.'}`; };
function aviso(t, mal = false) { const el = $('#aviso'); el.textContent = t; el.classList.toggle('mal', mal); el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { el.hidden = true; }, 3800); }

const TIPOS = ['Uniforme o presentación personal', 'Objetos no permitidos', 'Uso de celular', 'Conducta disruptiva en clase', 'Falta de respeto al docente o personal', 'Agresión física o verbal a compañeros', 'Acoso o uso indebido de redes sociales', 'Incumplimiento de tareas o material', 'Inasistencia, retardo o salida sin permiso', 'Daño a instalaciones o material', 'Otro'];
const GRAV = { leve: 'Leve', moderada: 'Moderada', grave: 'Grave' };
const EST = { pendiente: 'Pendiente', seguimiento: 'En seguimiento', atendido: 'Atendido' };
const RES = { asistio: 'Asistió', noasistio: 'No asistió', reprogramada: 'Se reprogramó' };

const token = new URLSearchParams(location.search).get('t') || '';
let B = null;          // datos del link: maestro, materias, alumnos
let vistaAct = 'nuevo';
const BORR = `rye_buzon_${token}`;
const leerBorr = () => { try { return JSON.parse(localStorage.getItem(BORR) || 'null'); } catch { return null; } };
const guardarBorr = d => { try { localStorage.setItem(BORR, JSON.stringify(d)); } catch { /* */ } };

function mensaje(t, x) { vista.innerHTML = `<div class="tarjeta rp-msj"><h1>${t}</h1><p>${x}</p></div>`; }

async function iniciar() {
  if (!/^[A-Za-z0-9]{16,40}$/.test(token)) { mensaje('Link incompleto', 'Este link no está completo. Pide a la Subdirección que te lo vuelva a enviar.'); return; }
  try { const s = await getDoc(doc(db, 'buzon', token)); if (!s.exists()) throw new Error('no'); B = s.data(); }
  catch (e) { console.error(e); mensaje('Este link ya no funciona', 'La Subdirección desactivó este link, o no hay conexión a internet. Pide uno nuevo a la Subdirección.'); return; }
  if (B.activo !== true) { mensaje('Este link ya no funciona', 'La Subdirección desactivó este link. Pide uno nuevo.'); return; }
  pintar();
}

function cab() {
  return `<div class="rp-alumno"><p class="rp-kicker">Reportes de incidencias · EST 17 Vespertino</p><h1>${esc(B.maestro)}</h1>${B.cargo && B.cargo !== 'Docente' ? `<p style="margin:0 0 .3rem;color:#fff"><b>${esc(B.cargo)}</b></p>` : ''}
    <p>Este link es solo tuyo: tus reportes llegan a la Subdirección con tu nombre. No lo compartas.</p></div>
    <div class="fila-btn" style="margin:0 0 1rem"><button type="button" class="btn ${vistaAct === 'nuevo' ? 'oro' : 'linea'}" data-v="nuevo">Nuevo reporte</button><button type="button" class="btn ${vistaAct === 'mios' ? 'oro' : 'linea'}" data-v="mios">Mis reportes</button>${B.tutorDe ? `<button type="button" class="btn ${vistaAct === 'grupo' ? 'oro' : 'linea'}" data-v="grupo">Mi grupo ${B.tutorDe[0]}.° ${B.tutorDe.slice(1)} (tutor)</button>` : ''}</div>`;
}
function pintar() { if (vistaAct === 'nuevo') formulario(); else if (vistaAct === 'grupo' && B.tutorDe) miGrupo(); else misReportes(); }
function ligarCab() { vista.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => { vistaAct = b.dataset.v; pintar(); scrollTo(0, 0); })); }

let alSel = null;
function formulario() {
  const p = leerBorr() || {};
  const doc_ = !B.cargo || B.cargo === 'Docente', atDef = doc_ ? 'maestro' : 'tutor';
  const grupos = [...new Set((B.alumnos || []).map(a => a.g))].sort();
  alSel = p.al ? (B.alumnos || []).find(a => a.c === p.al) || null : null;
  vista.innerHTML = `${cab()}
  <form class="tarjeta rp-form" id="f" novalidate>
    <h2>Nuevo reporte de incidencia</h2>
    <h3 style="border:0;padding-top:0;margin-top:.6rem">1. ¿Qué alumno?</h3>
    <div class="rp-nums"><div class="campo"><label for="f-g">Grupo</label><select id="f-g"><option value="">Todos</option>${grupos.map(g => `<option value="${g}" ${p.g === g ? 'selected' : ''}>${g[0]}.° ${g.slice(1)}</option>`).join('')}</select></div>
      <div class="campo"><label for="f-q">Busca por nombre o apellido</label><input id="f-q" type="search" autocomplete="off" placeholder="Escribe al menos dos letras"></div></div>
    <div id="f-res" class="rp-materias"></div>
    <div id="f-sel"></div>

    <h3>2. ¿Cuándo y en qué clase?</h3>
    <div class="rp-nums"><div class="campo"><label for="f-fecha">Fecha</label><input id="f-fecha" type="date" value="${p.fecha || hoyISO()}"></div>
      <div class="campo"><label for="f-hora">Hora</label><input id="f-hora" type="time" value="${p.hora || horaAhora()}"></div>
      <div class="campo"><label for="f-mat">${doc_ ? 'Asignatura o momento' : 'Momento o lugar'}</label><input id="f-mat" list="f-mats" value="${esc(p.mat || (doc_ ? (B.materias || [])[0] || '' : ''))}" placeholder="${doc_ ? '' : 'Receso, entrada, salida, pasillo…'}"><datalist id="f-mats">${[...(B.materias || []), 'Receso', 'Entrada', 'Salida', 'Honores', 'Pasillo', 'Baños', 'Cancha', 'Cooperativa'].map(m => `<option>${esc(m)}</option>`).join('')}</datalist></div></div>

    <h3>3. ¿Qué pasó?</h3>
    <fieldset class="rp-preg"><legend>Tipo de falta (marca las que apliquen)</legend><div class="rp-conductas">${TIPOS.map(t => `<label class="check"><input type="checkbox" data-t="${esc(t)}" ${(p.tipos || []).includes(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div></fieldset>
    <fieldset class="rp-preg" id="f-grav"><legend>Gravedad</legend><div class="rp-ops">${Object.entries(GRAV).map(([k, v], i) => `<button type="button" class="rp-op n${i}" data-gr="${k}" aria-pressed="${(p.grav || 'leve') === k}">${v}</button>`).join('')}</div>
      <p class="ayuda">«Grave»: agresión física, acoso, autolesión, objetos peligrosos o algo que requiera atención inmediata. Le llega como urgente a la Subdirección.</p></fieldset>
    <div class="campo"><label for="f-hechos">Describe lo que pasó</label><textarea id="f-hechos" rows="5" maxlength="2000">${esc(p.hechos || '')}</textarea>
      <p class="rp-ej">💡 Ejemplo: Durante la clase de Geografía, a las 3:10 p. m., el alumno se levantó varias veces de su lugar y le quitó el cuaderno a un compañero. Se le pidió que lo devolviera y contestó con groserías.</p></div>

    <h3>4. ¿Quién lo atiende?</h3>
    <fieldset class="rp-preg" id="f-at"><div class="rp-ops" style="grid-template-columns:1fr 1fr">
      ${doc_ ? `<button type="button" class="rp-op" data-at="maestro" style="text-align:left"><b>Lo atiendo yo</b><br><small>Faltas de material, tareas o conducta en clase. Usted cita al padre de familia y da seguimiento.</small></button>`
        : `<button type="button" class="rp-op" data-at="tutor" style="text-align:left"><b>Lo turno al tutor del grupo</b><br><small>Faltas leves o moderadas. La Subdirección le avisa al tutor para que le dé seguimiento con la familia.</small></button>`}
      <button type="button" class="rp-op" data-at="subdireccion" aria-pressed="${p.at === 'subdireccion'}" style="text-align:left"><b>Lo atendemos juntos con la Subdirección</b><br><small>${doc_ ? 'Para casos graves, como agresiones, acoso, autolesiones o reincidencia. Usted sigue como responsable; la Subdirección le acompaña en la cita y da el seguimiento legal cuando haga falta.' : 'Para casos graves, como agresiones, acoso, autolesiones o reincidencia. La Subdirección lo atiende con el tutor y la familia, y da el seguimiento legal cuando haga falta.'}</small></button></div></fieldset>
    <div id="f-cita">
      <div class="rp-nums"><div class="campo"><label for="f-cf">Día de la cita</label><input id="f-cf" type="date" value="${p.cf || ''}"></div>
        <div class="campo"><label for="f-ch">Hora</label><input id="f-ch" type="time" value="${p.ch || ''}"></div></div>
      <div class="campo"><label for="f-cm">Motivo de la cita</label><input id="f-cm" value="${esc(p.cm || '')}" maxlength="300"><p class="rp-ej">💡 Ejemplo: Platicar sobre su conducta en clase y acordar cómo apoyarlo desde casa.</p></div>
      <p class="ayuda" id="f-cita-ayuda">El citatorio lo envía la escuela por WhatsApp a la familia, para que quede como evidencia. Después de la cita, entra a «Mis reportes» y anota si asistió.</p>
    </div>

    <p id="f-err" class="error" role="alert"></p>
    <div class="fila-btn"><button type="submit" class="btn oro" id="f-ok">Enviar reporte</button></div>
  </form>`;
  ligarCab();
  const f = $('#f');
  const pintarSel = () => { $('#f-sel').innerHTML = alSel ? `<div class="aviso-dir" style="margin:.4rem 0"><b>${esc(alSel.n)}</b> · ${alSel.g[0]}.° ${alSel.g.slice(1)} <button type="button" class="btn-texto" id="f-otro" style="color:var(--corteza)">cambiar</button></div>` : '';
    $('#f-otro')?.addEventListener('click', () => { alSel = null; pintarSel(); borr(); $('#f-q').focus(); }); };
  const buscar = () => {
    const q = normal($('#f-q').value), g = $('#f-g').value;
    const r = q.length < 2 && !g ? [] : (B.alumnos || []).filter(a => (!g || a.g === g) && (q.length < 2 || normal(a.n).includes(q))).slice(0, q.length < 2 ? 60 : 10);
    $('#f-res').innerHTML = r.map(a => `<button type="button" class="rp-mat" data-c="${esc(a.c)}"><b>${esc(a.n)}</b><span>${a.g[0]}.° ${a.g.slice(1)}</span></button>`).join('') || (q.length >= 2 ? '<p class="ayuda">Ningún alumno coincide. Revisa el grupo.</p>' : '');
    $('#f-res').querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { alSel = B.alumnos.find(a => a.c === b.dataset.c); $('#f-res').innerHTML = ''; $('#f-q').value = ''; pintarSel(); borr(); }));
  };
  $('#f-q').addEventListener('input', buscar); $('#f-g').addEventListener('change', buscar);
  pintarSel();
  const ponAt = at => { f.querySelectorAll('[data-at]').forEach(x => x.setAttribute('aria-pressed', x.dataset.at === at)); $('#f-cita').hidden = at === 'tutor';
    $('#f-cita-ayuda').textContent = at === 'maestro' ? 'El citatorio lo envía la escuela por WhatsApp a la familia, para que quede como evidencia. Después de la cita, entra a «Mis reportes» y anota si asistió.' : 'Propón el día y la hora; la Subdirección la confirma y la escuela envía el citatorio por WhatsApp. Si no sabes cuándo, déjalo en blanco y la Subdirección te propone una fecha.'; };
  ponAt(p.at && f.querySelector(`[data-at="${p.at}"]`) ? p.at : atDef);
  f.querySelectorAll('[data-gr]').forEach(b => b.addEventListener('click', () => { f.querySelectorAll('[data-gr]').forEach(x => x.setAttribute('aria-pressed', x === b)); ponAt(b.dataset.gr === 'grave' ? 'subdireccion' : atDef); borr(); }));
  f.querySelectorAll('[data-at]').forEach(b => b.addEventListener('click', () => { ponAt(b.dataset.at); borr(); }));
  const leer = () => ({ al: alSel?.c || '', g: $('#f-g').value, fecha: $('#f-fecha').value, hora: $('#f-hora').value, mat: $('#f-mat').value.trim(),
    tipos: [...f.querySelectorAll('[data-t]:checked')].map(x => x.dataset.t), grav: f.querySelector('[data-gr][aria-pressed="true"]')?.dataset.gr || 'leve',
    hechos: $('#f-hechos').value.trim(), at: f.querySelector('[data-at][aria-pressed="true"]')?.dataset.at || atDef, cf: $('#f-cf').value, ch: $('#f-ch').value, cm: $('#f-cm').value.trim() });
  const borr = () => guardarBorr(leer());
  f.addEventListener('input', () => { borr(); $('#f-err').textContent = ''; });
  f.addEventListener('submit', async e => {
    e.preventDefault(); const d = leer(), err = $('#f-err');
    if (!alSel) { err.textContent = 'Elige al alumno.'; return; }
    if (!d.fecha) { err.textContent = 'Falta la fecha.'; return; }
    if (d.hechos.length < 10) { err.textContent = 'Describe lo que pasó.'; return; }
    if (d.at === 'maestro' && (!d.cf || !d.ch)) { err.textContent = 'Pon el día y la hora de la cita con el padre de familia.'; return; }
    if (d.at === 'tutor') { d.cf = ''; d.ch = ''; }
    if (d.at !== 'maestro' && !!d.cf !== !!d.ch) { err.textContent = 'Para proponer la cita pon el día y la hora, o deja los dos en blanco.'; return; }
    const conCita = d.at === 'maestro' || (d.cf && d.ch);
    const b = $('#f-ok'); b.disabled = true; b.textContent = 'Enviando…';
    const inc = { token, origen: 'maestro', maestro: B.maestro, reporta: B.maestro, cargoReporta: B.cargo || 'Docente', curp: alSel.c, alumno: alSel.n, grado: +alSel.g[0], grupo: alSel.g.slice(1),
      fecha: d.fecha, hora: d.hora, asignatura: d.mat, tipos: d.tipos, gravedad: d.grav, hechos: d.hechos.slice(0, 2000), atiende: d.at, estado: d.at === 'maestro' ? 'seguimiento' : 'pendiente', seg: [],
      cita: conCita ? { fecha: d.cf, hora: d.ch, motivo: d.cm, con: d.at === 'maestro' ? B.maestro : `${B.maestro} y Subdirección`, enviado: '', resultado: '', acuerdos: '', hist: [], ...(d.at === 'maestro' ? {} : { porConfirmar: true }) } : null,
      creadoISO: new Date().toISOString(), revisar: false };
    try { await addDoc(collection(db, 'buzon', token, 'inc'), inc); try { localStorage.removeItem(BORR); } catch { /* */ }
      alSel = null; vista.innerHTML = `${cab()}<div class="tarjeta rp-msj"><h2>✓ Reporte enviado</h2><p>Ya le llegó a la Subdirección${d.grav === 'grave' ? ' como <b>urgente</b>' : ''}. ${d.at === 'maestro' ? 'La escuela enviará el citatorio a la familia. Después de la cita, anota en «Mis reportes» si asistió.' : d.at === 'tutor' ? 'La Subdirección le avisará al tutor del grupo. Puede ver el avance en «Mis reportes».' : 'La Subdirección se pondrá de acuerdo con usted para atenderlo juntos. Puede ver el avance en «Mis reportes».'}</p>
        <div class="fila-btn"><button type="button" class="btn oro" data-v="nuevo">Hacer otro reporte</button><button type="button" class="btn linea" data-v="mios">Ver mis reportes</button></div></div>`; ligarCab(); scrollTo(0, 0);
    } catch (x) { console.error(x); b.disabled = false; b.textContent = 'Enviar reporte'; err.textContent = 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo; lo que escribiste no se borra.'; }
  });
}

async function misReportes() {
  vista.innerHTML = `${cab()}<div class="tarjeta"><p class="cargando">Cargando tus reportes…</p></div>`; ligarCab();
  let L = [];
  try { const s = await getDocs(collection(db, 'buzon', token, 'inc')); L = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.creadoISO || '').localeCompare(a.creadoISO || '')); }
  catch (e) { console.error(e); vista.innerHTML = `${cab()}<div class="tarjeta"><p>No se pudieron cargar tus reportes. Revisa tu conexión.</p></div>`; ligarCab(); return; }
  const anot = a => `${a.fecha ? fLarga(a.fecha) + ': ' : ''}${a.que || 'Atención'}${a.quien ? ` (${a.quien})` : ''}`;
  const visibles = i => i.confidencial ? [] : (i.seg || []).filter(a => a.docentes !== false && a.que);
  const citaTxt = c => !c ? '' : `<p style="margin:.4rem 0 0"><b>Cita con la familia:</b> ${fLarga(c.fecha)}, ${hora12(c.hora)}${c.motivo ? ` · ${esc(c.motivo)}` : ''}<br>
    ${c.enviado ? `<small>📨 La escuela envió el citatorio a la familia por WhatsApp el ${fLarga(fLoc(c.enviado))}.</small>` : '<small>⏳ La escuela todavía no envía el citatorio.</small>'}
    ${(c.hist || []).map(h => `<br><small>• ${fLarga(h.fecha)}: ${RES[h.resultado] || ''}${h.acuerdos ? ` · ${esc(h.acuerdos)}` : ''}</small>`).join('')}</p>`;
  vista.innerHTML = `${cab()}<div class="tarjeta"><h2>Mis reportes (${L.length})</h2>
    ${L.length ? L.map(i => `<div class="rep-fila" style="display:block">
      <div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap"><span><b>${esc(i.alumno)}</b> <small>· ${i.grado}.° ${esc(i.grupo)} · ${fLarga(i.fecha)}</small></span><span class="envio ${i.estado === 'atendido' ? 'ok' : 'pend'}">${EST[i.estado] || 'Pendiente'}</span></div>
      <p style="margin:.3rem 0">${esc(i.hechos)}</p>
      ${i.capturo ? '<small style="display:block;color:#6A5C4C">Lo registró la Subdirección con lo que usted le informó.</small>' : ''}
      ${i.avisoFam ? `<small style="display:block">📲 La escuela informó a la familia por WhatsApp el ${fLarga(fLoc(i.avisoFam))}.</small>` : !i.cita && !i.confidencial ? '<small style="display:block;color:#6A5C4C">⏳ La escuela todavía no informa a la familia.</small>' : ''}
      ${visibles(i).length ? `<small>${visibles(i).map(a => '• ' + esc(anot(a))).join('<br>')}</small>` : ''}
      ${citaTxt(i.cita)}
      ${i.cita && !i.cita.resultado ? `<div class="fila-btn" style="margin-top:.4rem"><button type="button" class="btn oro chico" data-res="${i.id}">Anotar cómo fue la cita</button></div>` : ''}
      ${i.cita && i.cita.resultado === 'noasistio' ? `<div class="fila-btn" style="margin-top:.4rem"><button type="button" class="btn linea chico" data-res="${i.id}">Nueva cita</button></div>` : ''}
    </div>`).join('') : '<p class="ayuda">Todavía no has enviado reportes con este link.</p>'}</div>`;
  ligarCab();
  vista.querySelectorAll('[data-res]').forEach(b => b.addEventListener('click', () => resultado(L.find(i => i.id === b.dataset.res))));
}

function resultado(i) {
  const c = i.cita;
  vista.innerHTML = `${cab()}<form class="tarjeta rp-form" id="r"><p class="rp-kicker">Cita con la familia</p><h2>${esc(i.alumno)}</h2>
    <p>${c.resultado === 'noasistio' ? 'La familia no asistió a la cita anterior. Pon la nueva fecha:' : `Cita del ${fLarga(c.fecha)}, ${hora12(c.hora)}.`}</p>
    <fieldset class="rp-preg"><legend>¿Cómo fue?</legend><div class="rp-ops">${Object.entries(RES).map(([k, v], n) => `<button type="button" class="rp-op n${n === 0 ? 0 : n === 1 ? 2 : 1}" data-r="${k}" aria-pressed="${c.resultado === 'noasistio' && k === 'reprogramada'}">${v}</button>`).join('')}</div></fieldset>
    <div class="campo" id="r-ac" hidden><label for="r-acu">Acuerdos con la familia</label><textarea id="r-acu" rows="3" maxlength="1000"></textarea><p class="rp-ej">💡 Ejemplo: La mamá revisará la libreta todos los días; el alumno se sentará al frente; nos volvemos a ver en dos semanas.</p></div>
    <div id="r-nueva" ${c.resultado === 'noasistio' ? '' : 'hidden'}><div class="rp-nums"><div class="campo"><label for="r-f">Nuevo día</label><input id="r-f" type="date"></div><div class="campo"><label for="r-h">Hora</label><input id="r-h" type="time" value="${c.hora || ''}"></div></div></div>
    <p id="r-err" class="error" role="alert"></p>
    <div class="fila-btn"><button type="submit" class="btn oro">Guardar</button><button type="button" class="btn linea" data-v="mios">Cancelar</button></div></form>`;
  ligarCab();
  let sel = c.resultado === 'noasistio' ? 'reprogramada' : '';
  vista.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { sel = b.dataset.r; vista.querySelectorAll('[data-r]').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#r-ac').hidden = sel !== 'asistio'; $('#r-nueva').hidden = sel === 'asistio'; }));
  $('#r').addEventListener('submit', async e => {
    e.preventDefault(); const err = $('#r-err');
    if (!sel) { err.textContent = 'Elige cómo fue la cita.'; return; }
    const hist = [...(c.hist || [])]; let cita;
    if (sel === 'asistio') { const ac = $('#r-acu').value.trim(); if (!ac) { err.textContent = 'Escribe los acuerdos.'; return; }
      cita = { ...c, resultado: 'asistio', acuerdos: ac, hist: [...hist, { fecha: hoyISO(), resultado: 'asistio', acuerdos: ac, cita: c.fecha }] }; }
    else { const nf = $('#r-f').value, nh = $('#r-h').value;
      if (sel === 'reprogramada' && !nf) { err.textContent = 'Pon el nuevo día de la cita.'; return; }
      if (c.resultado !== 'noasistio') hist.push({ fecha: hoyISO(), resultado: sel, cita: c.fecha });
      cita = nf ? { ...c, fecha: nf, hora: nh || c.hora, resultado: '', enviado: '', acuerdos: '', hist } : { ...c, resultado: sel, hist }; }
    try { await updateDoc(doc(db, 'buzon', token, 'inc', i.id), { cita, actualizado: new Date().toISOString() }); aviso('Guardado.'); vistaAct = 'mios'; misReportes(); }
    catch (x) { console.error(x); err.textContent = 'No se pudo guardar. Revisa tu conexión.'; }
  });
}

// ---------------------------------------------------------------- Tutor de grupo
// Los reportes de todo su grupo (de cualquier maestro, con todo el detalle), lo que hizo la escuela,
// «Registrar lo que hice» y los concentrados que le manda la Subdirección, con «Enterado».
const ACC_TUT = ['Platiqué con el alumno', 'Hablé con la familia', 'Lo canalicé a orientación o a trabajo social', 'Acordamos un compromiso'];
let GR = null, filtroConc = null;
async function miGrupo(recargar = true) {
  if (recargar || !GR) {
    vista.innerHTML = `${cab()}<div class="tarjeta"><p class="cargando">Cargando los reportes de tu grupo…</p></div>`; ligarCab();
    try {
      const [a, b, c] = await Promise.all([getDocs(collection(db, 'buzon', token, 'grupo')), getDocs(collection(db, 'buzon', token, 'conc')), getDocs(collection(db, 'buzon', token, 'seg'))]);
      GR = { L: a.docs.map(d => ({ ...d.data(), id: d.id })), C: b.docs.map(d => ({ ref: d.ref, ...d.data() })).sort((x, y) => (y.creado || '').localeCompare(x.creado || '')), S: c.docs.map(d => d.data()) };
    } catch (e) { console.error(e); vista.innerHTML = `${cab()}<div class="tarjeta"><h2>Mi grupo</h2><p>${e.code === 'permission-denied' ? 'La Subdirección está terminando de activar esta sección. Intenta más tarde.' : 'No se pudieron cargar los reportes. Revisa tu conexión.'}</p></div>`; ligarCab(); return; }
  }
  const g = B.tutorDe, S = new Set(filtroConc ? filtroConc.ids || [] : []);
  const L = GR.L.filter(i => !filtroConc || S.has(i.id)), porAl = {};
  L.forEach(i => (porAl[i.curp || i.alumno] ||= []).push(i));
  const al = Object.values(porAl).map(I => I.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))).sort((a, b) => b.length - a.length || a[0].alumno.localeCompare(b[0].alumno, 'es'));
  const pend = GR.L.filter(i => i.estado === 'pendiente').length, fh = iso => `${fLarga(fLoc(iso))}`;
  const anot = a => `${a.fecha ? fLarga(a.fecha) + ': ' : ''}${a.que || 'Atención'}${a.quien ? ` (${a.quien})` : ''}`;
  const misPend = id => GR.S.filter(x => x.inc === id);
  vista.innerHTML = `${cab()}
  <div class="tarjeta"><h2>Mi grupo: ${g[0]}.° ${esc(g.slice(1))}</h2>
    <p class="ayuda">Como tutor ves todos los reportes de tu grupo, de cualquier maestro, con el detalle completo, y lo que ya hizo la escuela. Registra aquí lo que haces con cada alumno: le llega a la Subdirección.</p>
    <p><b>${GR.L.length}</b> reportes · <b>${pend}</b> pendientes · <b>${Object.keys(porAl).length}</b> alumno${Object.keys(porAl).length === 1 ? '' : 's'}${filtroConc ? ' (filtrado)' : ''}</p></div>
  ${GR.C.length ? `<div class="tarjeta"><h3 style="margin-top:0">Concentrados que te envió la Subdirección</h3>${GR.C.map((c, k) => `<div class="rep-fila" style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap;align-items:center">
      <span><b>Del ${fLarga(c.d)} al ${fLarga(c.h)}</b> <small>· ${c.n} reporte${c.n === 1 ? '' : 's'} · ${fh(c.creado)}</small><br><small>${c.enterado ? `✓ Marcaste «Enterado» el ${fh(c.enterado)}` : '⏳ Falta que marques «Enterado»'}</small></span>
      <span class="fila-btn" style="margin:0"><button type="button" class="btn linea chico" data-cver="${k}">${filtroConc === c ? 'Ver todos' : 'Ver sus reportes'}</button>${c.enterado ? '' : `<button type="button" class="btn oro chico" data-cent="${k}">Enterado</button>`}</span></div>`).join('')}</div>` : ''}
  <div class="tarjeta"><h3 style="margin-top:0">Reportes por alumno</h3>
    ${al.length ? al.map(I => `<details class="tg-al" ${I.some(i => i.estado === 'pendiente') ? 'open' : ''}><summary><b>${esc(I[0].alumno)}</b> · ${I.length} reporte${I.length === 1 ? '' : 's'}${I.some(i => i.gravedad === 'grave') ? ' · <b style="color:#B3261E">grave</b>' : ''}${I.some(i => i.estado === 'pendiente') ? ' · pendiente' : ''}</summary>
      ${I.map(i => `<div class="rep-fila" style="display:block">
        <div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap"><span><b>${fLarga(i.fecha)}</b>${i.hora ? ` · ${hora12(i.hora)}` : ''} <small>· ${esc((i.tipos || []).join(', ') || 'Reporte')}${i.gravedad ? ` · ${GRAV[i.gravedad] || i.gravedad}` : ''}</small></span><span class="envio ${i.estado === 'atendido' ? 'ok' : 'pend'}">${EST[i.estado] || 'Pendiente'}</span></div>
        ${i.confidencial ? '<p style="margin:.3rem 0;color:#7A2E2E"><b>🔒 Confidencial:</b> trátalo personalmente con la Subdirección; no lo compartas con otros maestros ni con otros alumnos.</p>' : ''}
        <p style="margin:.3rem 0">${esc(i.hechos)}</p>
        <small>Reportó: ${esc(i.reporta || '—')}${i.cargoReporta && i.cargoReporta !== 'Docente' ? ` (${esc(i.cargoReporta)})` : ''}${i.asignatura ? ` · ${esc(i.asignatura)}` : ''}</small>
        ${i.avisoFam ? `<br><small>📲 La escuela informó a la familia el ${fh(i.avisoFam)}.</small>` : ''}
        ${i.cita ? `<br><small>📅 Cita con la familia: ${fLarga(i.cita.fecha)}, ${hora12(i.cita.hora)}${i.cita.enviado ? ' · citatorio enviado' : ' · falta citatorio'}${i.cita.resultado ? ` · ${RES[i.cita.resultado] || ''}${i.cita.acuerdos ? `: ${esc(i.cita.acuerdos)}` : ''}` : ''}</small>` : ''}
        ${(i.anots || []).length ? `<div class="tg-seg"><b>Seguimiento:</b><br>${i.anots.map(a => '• ' + esc(anot(a))).join('<br>')}</div>` : ''}
        ${misPend(i.id).map(x => `<div class="tg-seg tg-mio">• ${fLarga(x.fecha)}: ${esc([...(x.acciones || []), x.nota].filter(Boolean).join('. '))} <small>(tú · enviado a la Subdirección)</small></div>`).join('')}
        <div class="fila-btn" style="margin-top:.4rem"><button type="button" class="btn oro chico" data-hice="${esc(i.id)}">Registrar lo que hice</button></div>
        <div class="tg-form" id="tg-${esc(i.id)}" hidden></div></div>`).join('')}</details>`).join('') : '<p class="ayuda">Tu grupo no tiene reportes por ahora.</p>'}</div>`;
  ligarCab();
  vista.querySelectorAll('[data-cver]').forEach(b => b.addEventListener('click', () => { const c = GR.C[+b.dataset.cver]; filtroConc = filtroConc === c ? null : c; miGrupo(false); }));
  vista.querySelectorAll('[data-cent]').forEach(b => b.addEventListener('click', async () => { const c = GR.C[+b.dataset.cent]; b.disabled = true;
    try { const t = new Date().toISOString(); await updateDoc(c.ref, { enterado: t }); c.enterado = t; aviso('Listo: quedó como enterado.'); miGrupo(false); }
    catch (e) { console.error(e); b.disabled = false; aviso('No se pudo guardar. Revisa tu conexión.', true); } }));
  vista.querySelectorAll('[data-hice]').forEach(b => b.addEventListener('click', () => {
    const i = GR.L.find(z => z.id === b.dataset.hice), box = document.getElementById('tg-' + i.id);
    box.hidden = false; b.hidden = true;
    box.innerHTML = `<fieldset class="rp-preg"><legend>¿Qué hiciste?</legend><div class="rp-conductas">${ACC_TUT.map(a => `<label class="check"><input type="checkbox" data-a="${esc(a)}"> ${esc(a)}</label>`).join('')}</div></fieldset>
      <div class="rp-nums"><div class="campo"><label>Fecha</label><input type="date" data-f value="${hoyISO()}"></div></div>
      <div class="campo"><label>Nota breve</label><textarea data-n rows="3" maxlength="800"></textarea><p class="rp-ej">💡 Ejemplo: Platiqué con él al final de la clase; se comprometió a guardar el celular en la mochila. Lo reviso el viernes.</p></div>
      <p class="error" data-e role="alert"></p><div class="fila-btn"><button type="button" class="btn oro chico" data-ok>Guardar</button><button type="button" class="btn linea chico" data-x>Cancelar</button></div>`;
    box.querySelector('[data-x]').addEventListener('click', () => { box.hidden = true; b.hidden = false; });
    box.querySelector('[data-ok]').addEventListener('click', async ev => {
      const acc = [...box.querySelectorAll('[data-a]:checked')].map(x => x.dataset.a), nota = box.querySelector('[data-n]').value.trim(), fecha = box.querySelector('[data-f]').value || hoyISO();
      if (!acc.length && nota.length < 5) { box.querySelector('[data-e]').textContent = 'Marca qué hiciste o escribe una nota.'; return; }
      ev.target.disabled = true; ev.target.textContent = 'Guardando…';
      const x = { token, inc: i.id, alumno: i.alumno, acciones: acc, nota, fecha, creado: new Date().toISOString() };
      try { await addDoc(collection(db, 'buzon', token, 'seg'), x); GR.S.push(x); aviso('Guardado: le llegó a la Subdirección.'); miGrupo(false); }
      catch (e) { console.error(e); ev.target.disabled = false; ev.target.textContent = 'Guardar'; box.querySelector('[data-e]').textContent = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'; }
    });
  }));
}

iniciar();
