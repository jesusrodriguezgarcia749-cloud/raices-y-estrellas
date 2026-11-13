/* Raíces y Estrellas · Hoja que llena cada maestro para el «Reporte general del alumno».
   Se abre con el link que comparte la Dirección: reporte.html?r=CLAVE. No pide contraseña:
   el link solo abre ese reporte, solo deja escribir la parte de una asignatura y deja de funcionar cuando la Dirección lo cierra. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp({
  apiKey: "AIzaSyB0IzYArTNquMl5-zphxdW9G4wcYmPgekA",
  authDomain: "raices-y-estrellas-est17.firebaseapp.com",
  projectId: "raices-y-estrellas-est17",
  storageBucket: "raices-y-estrellas-est17.firebasestorage.app",
  messagingSenderId: "666765040335",
  appId: "1:666765040335:web:a5bae72abc2dbd1b7035ba"
}, 'reporte');
const db = getFirestore(app);

const $ = s => document.querySelector(s);
const vista = $('#vista');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fLarga = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; };
function aviso(t, mal = false) { const el = $('#aviso'); el.textContent = t; el.classList.toggle('mal', mal); el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { el.hidden = true; }, 3800); }

const token = new URLSearchParams(location.search).get('r') || '';
let R = null;            // el reporte
let M = null;            // la asignatura elegida
const CLAVE_LOCAL = id => `rye_rep_${token}_${id}`;
const leerLocal = id => { try { return JSON.parse(localStorage.getItem(CLAVE_LOCAL(id)) || 'null'); } catch { return null; } };
const guardarLocal = (id, d) => { try { localStorage.setItem(CLAVE_LOCAL(id), JSON.stringify(d)); } catch { /* sin espacio */ } };

function mensaje(titulo, texto) {
  vista.innerHTML = `<div class="tarjeta rp-msj"><h1>${titulo}</h1><p>${texto}</p></div>`;
}

async function iniciar() {
  if (!/^[A-Za-z0-9]{16,40}$/.test(token)) { mensaje('Link incompleto', 'Este link no está completo. Pide a la Dirección que te lo vuelva a enviar.'); return; }
  try {
    const s = await getDoc(doc(db, 'reportes', token));
    if (!s.exists()) { mensaje('Reporte no encontrado', 'Este reporte ya no existe. Pide a la Dirección el link correcto.'); return; }
    R = s.data();
  } catch (e) {
    console.error(e);
    mensaje('Este reporte ya se cerró', 'La Dirección ya cerró este reporte, o no hay conexión a internet. Si aún necesitas llenarlo, pide que lo vuelvan a abrir.');
    return;
  }
  if (R.estado !== 'abierto') { mensaje('Este reporte ya se cerró', 'La Dirección ya cerró este reporte. Gracias.'); return; }
  elegir();
}

function cabecera() {
  return `<div class="rp-alumno">
    <p class="rp-kicker">Reporte general del alumno · solicitado por la Dirección</p>
    <h1>${esc(R.alumno.nombre)}</h1>
    <p>${esc(R.alumno.grado)}.° «${esc(R.alumno.grupo)}» · Periodo: del ${fLarga(R.desde)} al ${fLarga(R.hasta)}</p>
    ${R.limite ? `<p class="rp-limite">Llénalo a más tardar el <b>${fLarga(R.limite)}</b>.</p>` : ''}
  </div>`;
}

function elegir() {
  const env = R.enviados || {};
  vista.innerHTML = `${cabecera()}
  <div class="tarjeta">
    <h2>¿Cuál es tu asignatura?</h2>
    <p class="ayuda">Toca la tuya. Solo llenas tu parte; te toma unos dos minutos. Si das clase de dos asignaturas a este alumno, llena una y luego la otra.</p>
    <div class="rp-materias">${R.materias.map(m => `<button type="button" class="rp-mat${env[m.id] ? ' hecha' : ''}" data-m="${m.id}">
      <b>${esc(m.materia)}</b><span>${esc(m.docente)}</span>${env[m.id] ? '<em>✓ Ya enviado</em>' : ''}</button>`).join('')}</div>
  </div>`;
  vista.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
    M = R.materias.find(m => m.id === b.dataset.m);
    if (env[M.id] && !leerLocal(M.id) && !confirm(`La parte de ${M.materia} ya se envió. Si la llenas de nuevo, se reemplaza. ¿Continuar?`)) return;
    formulario(); scrollTo(0, 0);
  }));
}

function formulario() {
  const prev = leerLocal(M.id) || {};
  const opcion = o => `<fieldset class="rp-preg" data-op="${o.id}"><legend>${esc(o.nombre)}</legend><div class="rp-ops">
    ${o.ops.map((t, i) => `<button type="button" class="rp-op n${i}" data-v="${i}" aria-pressed="${prev[o.id] === i}">${esc(t)}</button>`).join('')}</div></fieldset>`;
  vista.innerHTML = `${cabecera()}
  <form class="tarjeta rp-form" id="rp-form" novalidate>
    <p class="rp-kicker">Tu asignatura</p>
    <h2>${esc(M.materia)}</h2>
    <div class="campo"><label for="rp-docente">Tu nombre</label><input id="rp-docente" value="${esc(prev.docente ?? (/sin docente/i.test(M.docente) ? '' : M.docente))}" placeholder="Nombre del maestro o maestra" autocomplete="name"></div>

    <h3>Asistencia y calificación</h3>
    <div class="rp-nums">
      <div class="campo"><label for="rp-faltas">Faltas en el periodo</label><input id="rp-faltas" type="number" inputmode="numeric" min="0" max="200" value="${prev.faltas ?? ''}"></div>
      <div class="campo"><label for="rp-retardos">Retardos</label><input id="rp-retardos" type="number" inputmode="numeric" min="0" max="200" value="${prev.retardos ?? ''}"></div>
      <div class="campo"><label for="rp-cal">Calificación a la fecha</label><input id="rp-cal" type="number" inputmode="decimal" min="0" max="10" step="0.1" value="${prev.calificacion ?? ''}" placeholder="5 a 10"></div>
      <div class="campo"><label for="rp-tent">Tareas entregadas</label><div class="rp-de"><input id="rp-tent" type="number" inputmode="numeric" min="0" max="300" value="${prev.tareasEnt ?? ''}" aria-label="Tareas entregadas"><span>de</span><input id="rp-ttot" type="number" inputmode="numeric" min="0" max="300" value="${prev.tareasTot ?? ''}" aria-label="Tareas encargadas"></div></div>
    </div>
    <p class="ayuda">Si no llevas el dato exacto de tareas, déjalo en blanco y contesta la pregunta de «Tareas» de abajo.</p>
    <label class="check rp-riesgo"><input type="checkbox" id="rp-riesgo" ${prev.riesgo ? 'checked' : ''}> <span><b>Está en riesgo de reprobar mi asignatura</b><br><small>Se marca sola si la calificación es menor de ${MINIMA_REPORTE}.</small></span></label>

    <h3>Hábitos y trabajo</h3>
    ${OPCIONES_REPORTE.map(opcion).join('')}

    <h3>Conducta en mi clase</h3>
    <p class="ayuda">Marca todo lo que hayas observado en el periodo.</p>
    <div class="rp-conductas">
      ${CONDUCTAS_REPORTE.map((c, i) => `<label class="check"><input type="checkbox" data-c="${i}" ${(prev.conducta || []).includes(c) ? 'checked' : ''}> ${esc(c)}</label>`).join('')}
      <label class="check rp-ninguna"><input type="checkbox" id="rp-ninguna" ${prev.sinProblemas ? 'checked' : ''}> <b>Ninguna: su conducta es adecuada</b></label>
    </div>

    <h3>Observaciones</h3>
    ${TEXTOS_REPORTE.map(t => `<div class="campo"><label for="rp-${t.id}">${esc(t.nombre)}</label>
      <textarea id="rp-${t.id}" rows="3" maxlength="1200">${esc(prev[t.id] || '')}</textarea>
      <p class="rp-ej">💡 ${esc(t.ej)}</p></div>`).join('')}

    <p id="rp-error" class="error" role="alert"></p>
    <div class="fila-btn">
      <button type="submit" class="btn oro" id="rp-enviar">Enviar mi parte</button>
      <button type="button" class="btn linea" id="rp-volver">Cambiar de asignatura</button>
    </div>
  </form>`;

  const form = $('#rp-form');
  form.querySelectorAll('.rp-preg').forEach(fs => fs.querySelectorAll('.rp-op').forEach(b => b.addEventListener('click', () => {
    fs.querySelectorAll('.rp-op').forEach(x => x.setAttribute('aria-pressed', x === b)); fs.classList.remove('falta'); guardarBorrador();
  })));
  const ninguna = $('#rp-ninguna');
  ninguna.addEventListener('change', () => { if (ninguna.checked) form.querySelectorAll('[data-c]').forEach(x => { x.checked = false; }); guardarBorrador(); });
  form.querySelectorAll('[data-c]').forEach(x => x.addEventListener('change', () => { if (x.checked) ninguna.checked = false; guardarBorrador(); }));
  $('#rp-cal').addEventListener('input', () => { const v = parseFloat($('#rp-cal').value); if (!isNaN(v) && v < MINIMA_REPORTE) $('#rp-riesgo').checked = true; });
  form.addEventListener('input', () => { guardarBorrador(); $('#rp-error').textContent = ''; });
  $('#rp-volver').addEventListener('click', () => { M = null; elegir(); scrollTo(0, 0); });
  form.addEventListener('submit', e => { e.preventDefault(); enviar(); });
}

const num = (id, max) => { const v = $(id).value.trim(); if (v === '') return null; const n = Number(v); return isNaN(n) ? null : Math.max(0, Math.min(max, n)); };
function leerForm() {
  const d = {
    docente: $('#rp-docente').value.replace(/\s+/g, ' ').trim().slice(0, 120),
    faltas: num('#rp-faltas', 200), retardos: num('#rp-retardos', 200),
    calificacion: (() => { const v = num('#rp-cal', 10); return v == null ? null : Math.round(v * 10) / 10; })(),
    tareasEnt: num('#rp-tent', 300), tareasTot: num('#rp-ttot', 300),
    riesgo: $('#rp-riesgo').checked,
    conducta: [...document.querySelectorAll('[data-c]:checked')].map(x => CONDUCTAS_REPORTE[+x.dataset.c]),
    sinProblemas: $('#rp-ninguna').checked
  };
  OPCIONES_REPORTE.forEach(o => { const b = document.querySelector(`[data-op="${o.id}"] [aria-pressed="true"]`); d[o.id] = b ? +b.dataset.v : null; });
  TEXTOS_REPORTE.forEach(t => { d[t.id] = $('#rp-' + t.id).value.trim().slice(0, 1200); });
  if (d.calificacion != null && d.calificacion < MINIMA_REPORTE) d.riesgo = true;
  return d;
}
function guardarBorrador() { if (M) guardarLocal(M.id, leerForm()); }

async function enviar() {
  const d = leerForm(), err = $('#rp-error');
  const faltan = [];
  if (!d.docente) faltan.push('tu nombre');
  if (d.faltas == null) faltan.push('las faltas (pon 0 si no tiene)');
  OPCIONES_REPORTE.forEach(o => { if (d[o.id] == null) { faltan.push(o.nombre.toLowerCase()); document.querySelector(`[data-op="${o.id}"]`).classList.add('falta'); } });
  if (!d.conducta.length && !d.sinProblemas) faltan.push('la conducta (marca al menos una opción, o «Ninguna»)');
  if (d.tareasEnt != null && d.tareasTot != null && d.tareasEnt > d.tareasTot) faltan.push('las tareas: entregadas no puede ser mayor que encargadas');
  if (faltan.length) { err.textContent = 'Falta: ' + faltan.join(', ') + '.'; err.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  err.textContent = '';
  const b = $('#rp-enviar'); b.disabled = true; b.textContent = 'Enviando…';
  try {
    await setDoc(doc(db, 'reportes', token, 'respuestas', M.id), { ...d, materia: M.materia, enviado: serverTimestamp() });
    await updateDoc(doc(db, 'reportes', token), { [`enviados.${M.id}`]: true }).catch(() => {});
    R.enviados = { ...(R.enviados || {}), [M.id]: true };
    guardarLocal(M.id, d);
    vista.innerHTML = `${cabecera()}<div class="tarjeta rp-msj"><h2>✓ ¡Gracias! Tu parte de ${esc(M.materia)} quedó enviada.</h2>
      <p>La Dirección ya puede verla. Si te equivocaste, puedes corregirla desde este mismo teléfono mientras el reporte siga abierto.</p>
      <div class="fila-btn"><button type="button" class="btn linea" id="rp-corregir">Corregir mi parte</button><button type="button" class="btn linea" id="rp-otra">Llenar otra asignatura</button></div></div>`;
    $('#rp-corregir').addEventListener('click', () => formulario());
    $('#rp-otra').addEventListener('click', () => { M = null; elegir(); });
    scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    b.disabled = false; b.textContent = 'Enviar mi parte';
    err.textContent = 'No se pudo enviar. Revisa tu conexión e inténtalo otra vez; lo que escribiste sigue guardado en este teléfono. Si el problema sigue, quizá la Dirección ya cerró el reporte.';
  }
}

iniciar();
