/* CTE en vivo · celular de cada maestro. Entra con el código de la sesión (cte.html?s=1234), elige su nombre
   y contesta la actividad que esté en la pantalla. Cada respuesta se guarda en cte/{código}/r y se puede corregir. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const app = initializeApp({ apiKey: 'AIzaSyB0IzYArTNquMl5-zphxdW9G4wcYmPgekA', authDomain: 'raices-y-estrellas-est17.firebaseapp.com', projectId: 'raices-y-estrellas-est17',
  storageBucket: 'raices-y-estrellas-est17.firebasestorage.app', messagingSenderId: '666765040335', appId: '1:666765040335:web:a5bae72abc2dbd1b7035ba' }, 'cte');
const db = getFirestore(app);
const { PASOS, OPS, MOMENTOS, CRIT, SEIS, CASO } = window.CTE;
const $ = s => document.querySelector(s), vista = $('#vista');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
let sid = (new URLSearchParams(location.search).get('s') || '').replace(/\D/g, ''), S = null, yo = '', clave = '';

if (!sid) pedirCodigo(); else entrar();
function pedirCodigo() {
  vista.innerHTML = `<div class="tarjeta"><h1>Entrar a la sesión</h1><label>Código que aparece en la pantalla</label><input id="c" inputmode="numeric" maxlength="4" placeholder="Ej.: 4827"><button class="btn" id="ir">Entrar</button></div>`;
  $('#ir').onclick = () => { const c = $('#c').value.replace(/\D/g, ''); if (c.length === 4) { sid = c; history.replaceState(null, '', `?s=${c}`); entrar(); } };
}
function entrar() {
  yo = localStorage.getItem(`cte_p_${sid}`) || '';
  onSnapshot(doc(db, 'cte', sid), s => {
    if (!s.exists()) { vista.innerHTML = '<div class="tarjeta"><p class="err">Ese código no existe. Revísalo en la pantalla.</p></div>'; setTimeout(pedirCodigo, 2500); return; }
    S = s.data(); reloj();
    if (!S.activo) { vista.innerHTML = '<div class="tarjeta espera"><b>La sesión terminó</b>Gracias por participar.</div>'; return; }
    if (!yo) return elegir();
    pintar();
  }, e => { console.error(e); vista.innerHTML = '<div class="tarjeta"><p class="err">No se pudo conectar. Revisa tu internet y recarga.</p></div>'; });
}
function elegir() {
  const N = S.nombres || [];
  vista.innerHTML = `<div class="tarjeta"><h1>¿Quién eres?</h1><p class="instr">Elige tu nombre. En la pantalla solo aparece una palomita cuando contestas; tus respuestas salen sin nombre.</p>
    <select id="n"><option value="">Elige tu nombre…</option>${N.map(n => `<option>${esc(n)}</option>`).join('')}<option value="__otro">Otro (escribir mi nombre)</option></select>
    <input id="otro" placeholder="Tu nombre completo" style="margin-top:8px" hidden><button class="btn" id="ok">Entrar</button></div>`;
  $('#n').onchange = () => { $('#otro').hidden = $('#n').value !== '__otro'; };
  $('#ok').onclick = async () => {
    const n = $('#n').value === '__otro' ? $('#otro').value.trim() : $('#n').value; if (n.length < 3) return;
    yo = n; localStorage.setItem(`cte_p_${sid}`, yo); clave = '';
    try { await setDoc(doc(db, 'cte', sid, 'r', `${slug(yo)}__join`), { p: yo, act: 'join', i: 0, v: '', t: new Date().toISOString() }); } catch (e) { console.error(e); }
    pintar();
  };
}
async function pintar() {
  $('#yo').textContent = yo ? yo.split(' ').slice(0, 2).join(' ') : '';
  const P = PASOS[S.k || 0];
  const k2 = `${S.k}|${P.tipo === 'juego' ? `${S.i}|${S.rev}` : ''}|${P.tipo === 'priorizar' ? (S.barreras || []).join('¦') : ''}`;
  if (k2 === clave) return; clave = k2;
  if (P.t === 'dia') { vista.innerHTML = `<div class="tarjeta espera">👀<b>Atento a la pantalla</b>${esc(P.titulo)}</div>`; return; }
  const id = P.tipo === 'juego' ? `${slug(yo)}__${P.id}__${S.i || 0}` : `${slug(yo)}__${P.id}`;
  let previo = null; try { const s = await getDoc(doc(db, 'cte', sid, 'r', id)); if (s.exists()) previo = s.data().v; } catch { /* nuevo */ }
  if (clave !== k2) return;
  F[P.tipo](P, id, previo);
}
const guardar = async (P, id, v, btn) => {
  const msg = $('#msg'); if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
  try { await setDoc(doc(db, 'cte', sid, 'r', id), { p: yo, act: P.id, i: P.tipo === 'juego' ? (S.i || 0) : 0, v: typeof v === 'string' ? v : JSON.stringify(v), t: new Date().toISOString() });
    if (msg) msg.innerHTML = '<p class="ok">✓ Enviado. Si quieres, corrige y vuelve a enviar.</p>'; }
  catch (e) { console.error(e); if (msg) msg.innerHTML = '<p class="err">No se envió. Revisa tu internet y vuelve a tocar el botón.</p>'; }
  if (btn) { btn.disabled = false; btn.textContent = 'Enviar'; }
};
const prev = v => { try { return JSON.parse(v) || {}; } catch { return {}; } };
const F = {};
F.abiertas = (P, id, v) => { const o = prev(v);
  vista.innerHTML = `<div class="tarjeta"><h2>${esc(P.titulo)}</h2><p class="instr">${esc(P.instr)}</p>${P.preguntas.map(([q, ej], n) => `<label>${n + 1}. ${esc(q)}</label><textarea data-q="${n}">${esc(o[`q${n}`] || '')}</textarea><p class="ej">${esc(ej)}</p>`).join('')}
    <button class="btn" id="env">Enviar</button><div id="msg">${v ? '<p class="ok">✓ Ya habías enviado. Puedes corregir.</p>' : ''}</div></div>`;
  $('#env').onclick = e => { const r = {}; vista.querySelectorAll('[data-q]').forEach(t => { r[`q${t.dataset.q}`] = t.value.trim().slice(0, 900); }); if (!Object.values(r).some(Boolean)) return; guardar(P, id, r, e.target); };
};
F.juego = (P, id, v) => {
  const i = S.i || 0;
  if (i >= P.casos.length) { vista.innerHTML = '<div class="tarjeta espera">🏁<b>Terminó el juego</b>Mira los resultados en la pantalla.</div>'; return; }
  const c = P.casos[i], mio = v || '';
  vista.innerHTML = `<div class="tarjeta"><p class="instr">Situación ${i + 1} de ${P.casos.length}</p><p class="caso">${esc(c[0])}</p>
    ${(P.ops || OPS).map(([k, t]) => `<button class="op ${S.rev ? (k === c[1] ? 'bien' : k === mio ? 'mal' : '') : k === mio ? 'sel' : ''}" data-k="${k}" ${S.rev ? 'disabled' : ''}>${t}</button>`).join('')}
    <div id="msg">${S.rev ? `<p class="${mio === c[1] ? 'ok' : 'err'}">${mio === c[1] ? '✓ ¡Correcto!' : mio ? 'No era esa.' : 'No contestaste.'}</p><p class="instr">${esc(c[2])}</p>` : mio ? '<p class="ok">✓ Respuesta enviada. Espera a que se revele.</p>' : ''}</div></div>`;
  if (!S.rev) vista.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { vista.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('sel', x === b)); guardar(P, id, b.dataset.k); });
};
F.jornada = (P, id, v) => { const o = prev(v);
  vista.innerHTML = `<div class="tarjeta"><h2>${esc(P.titulo)}</h2><p class="instr">${esc(P.instr)}</p><p class="ej">${CASO.nombre}, ${CASO.grado}: requiere apoyo en los cuatro campos; sacó cero en comprensión y estructura del texto.</p>
    ${MOMENTOS.map((m, k) => `<label>${m}: ¿qué puede ser una barrera?</label><textarea data-m="${k}" style="min-height:60px">${esc(o[`m${k}`] || '')}</textarea>`).join('')}
    <p class="ej">Ej. en Evaluación: «El examen es solo escrito, con consignas largas y el mismo tiempo para todos».</p>
    <button class="btn" id="env">Enviar</button><div id="msg">${v ? '<p class="ok">✓ Ya habías enviado. Puedes corregir.</p>' : ''}</div></div>`;
  $('#env').onclick = e => { const r = {}; vista.querySelectorAll('[data-m]').forEach(t => { r[`m${t.dataset.m}`] = t.value.trim().slice(0, 300); }); guardar(P, id, r, e.target); };
};
F.priorizar = (P, id, v) => { const o = prev(v), B = S.barreras || [];
  if (!B.length) { vista.innerHTML = '<div class="tarjeta espera">⏳<b>Un momento</b>En la pantalla están eligiendo las barreras a calificar.</div>'; return; }
  vista.innerHTML = `<div class="tarjeta"><h2>${esc(P.titulo)}</h2><p class="instr">${esc(P.instr)} Cinco es lo más alto.</p>
    ${B.map((b, n) => `<p class="barr">${esc(b)}</p><div class="crit">${CRIT.map((c, k) => `<span>${c}</span><select data-b="${n}" data-c="${k}"><option value="">–</option>${[1, 2, 3, 4, 5].map(x => `<option ${(o[`b${n}`] || {})[k] == x ? 'selected' : ''}>${x}</option>`).join('')}</select>`).join('')}</div>`).join('')}
    <button class="btn" id="env">Enviar</button><div id="msg">${v ? '<p class="ok">✓ Ya habías enviado. Puedes corregir.</p>' : ''}</div></div>`;
  $('#env').onclick = e => { const r = {}; vista.querySelectorAll('[data-b]').forEach(s => { if (s.value) (r[`b${s.dataset.b}`] ||= {})[s.dataset.c] = +s.value; }); guardar(P, id, r, e.target); };
};
F.pasos = (P, id, v) => { const o = prev(v);
  vista.innerHTML = `<div class="tarjeta"><h2>${esc(P.titulo)}</h2><p class="instr">${esc(P.instr)}</p><label>Tu asignatura</label><input data-s="asig" value="${esc(o.asig || '')}" placeholder="Ej.: Matemáticas">
    ${SEIS.map(([k, t, q, ej], n) => `<label>${n + 1}. ${t}: ${q}</label><textarea data-s="${k}" style="min-height:64px">${esc(o[k] || '')}</textarea><p class="ej">${esc(ej)}</p>`).join('')}
    <button class="btn" id="env">Enviar</button><div id="msg">${v ? '<p class="ok">✓ Ya habías enviado. Puedes corregir.</p>' : ''}</div></div>`;
  $('#env').onclick = e => { const r = {}; vista.querySelectorAll('[data-s]').forEach(t => { r[t.dataset.s] = t.value.trim().slice(0, 600); }); if (!r.ajuste) { $('#msg').innerHTML = '<p class="err">Escribe al menos el ajuste razonable (paso cuatro).</p>'; return; } guardar(P, id, r, e.target); };
};
F.compromiso = (P, id, v) => { const o = prev(v);
  vista.innerHTML = `<div class="tarjeta"><h2>${esc(P.titulo)}</h2><p class="instr">${esc(P.instr)}</p><label>Tu asignatura</label><input data-s="asig" value="${esc(o.asig || '')}">
    <label>Mi compromiso para la próxima semana</label><textarea data-s="txt">${esc(o.txt || '')}</textarea><p class="ej">Ej.: En mis exámenes de Ciencias leeré en voz alta las consignas y daré un esquema; a dos alumnos con barrera de lectura les daré quince minutos más.</p>
    <button class="btn" id="env">Enviar</button><div id="msg">${v ? '<p class="ok">✓ Ya habías enviado. Puedes corregir.</p>' : ''}</div></div>`;
  $('#env').onclick = e => { const r = {}; vista.querySelectorAll('[data-s]').forEach(t => { r[t.dataset.s] = t.value.trim().slice(0, 800); }); if (!r.txt) return; guardar(P, id, r, e.target); };
};
/* Tiempo restante de la actividad, el mismo que se ve en el proyector. */
function reloj() {
  const el = $('#reloj'); if (!el || !S) return;
  const P = PASOS[S.k || 0], q = S.tfin && P.t === 'act' ? Math.round((S.tfin - Date.now()) / 1000) : null;
  el.textContent = q == null ? '' : q > 0 ? `⏱ ${Math.floor(q / 60)}:${String(q % 60).padStart(2, '0')}` : '⏱ Tiempo';
  el.style.color = q != null && q <= 60 ? '#FF9B8F' : '#F3DDA8';
}
setInterval(reloj, 1000);
