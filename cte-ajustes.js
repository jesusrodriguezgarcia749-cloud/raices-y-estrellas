/* CTE en vivo · pantalla del proyector (la maneja quien conduce, con la cuenta directiva).
   Abre una sesión cte/{código}; los maestros entran desde su celular a cte.html?s=código y contestan cada actividad.
   Aquí se ven las diapositivas, quién ya contestó (palomita) y las respuestas sin nombre. Al final, el producto en carta. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, getDocs, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp({ apiKey: 'AIzaSyB0IzYArTNquMl5-zphxdW9G4wcYmPgekA', authDomain: 'raices-y-estrellas-est17.firebaseapp.com', projectId: 'raices-y-estrellas-est17',
  storageBucket: 'raices-y-estrellas-est17.firebasestorage.app', messagingSenderId: '666765040335', appId: '1:666765040335:web:a5bae72abc2dbd1b7035ba' });
const auth = getAuth(app), db = getFirestore(app);
const { PASOS, OPS, MOMENTOS, CRIT, SEIS, CASO, GALERIA } = window.CTE;
const opsDe = P => P.ops || OPS;
const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vista = $('#vista');
const URL_CEL = c => new URL(`cte.html?s=${c}`, location.href).href;

let sid = localStorage.getItem('cte_sid') || '', S = null, R = [], guia = false, verQ = 0, desuscribir = [], visto = '', chk = {};
const parse = v => { try { return JSON.parse(v); } catch { return v; } };

/* ---------- Entrada ---------- */
onAuthStateChanged(auth, u => { if (u && u.email === 'directivos@est17.mx') inicio(); else login(); });
function login() {
  vista.innerHTML = `<div class="login tarjeta"><h2>Entrar como Dirección</h2><p>Para abrir la sesión en vivo se usa la cuenta directiva (la misma del panel de Raíces y Estrellas).</p>
    <div class="campo"><label>Contraseña de la cuenta directiva</label><input id="pw" type="password"></div><p id="err" style="color:var(--no)"></p><button class="btn" id="ok">Entrar</button></div>`;
  const ir = async () => { try { await signInWithEmailAndPassword(auth, 'directivos@est17.mx', $('#pw').value); } catch { $('#err').textContent = 'Contraseña incorrecta.'; } };
  $('#ok').onclick = ir; $('#pw').onkeydown = e => { if (e.key === 'Enter') ir(); };
}
async function inicio() {
  if (sid) { try { const s = await getDoc(doc(db, 'cte', sid)); if (s.exists() && s.data().activo) return conectar(); } catch (e) { return errorReglas(e); } }
  vista.innerHTML = `<div class="login tarjeta"><h2>Sesión en vivo del CTE</h2><p>Se abre una sesión con un código. Los maestros la siguen desde su celular.</p>
    <button class="btn" id="nueva">Abrir sesión nueva</button>${sid ? `<p class="mini">La sesión anterior (${sid}) está cerrada.</p>` : ''}</div>`;
  $('#nueva').onclick = nueva;
}
async function nueva() {
  let nombres = [];
  try { const s = await getDocs(collection(db, 'buzon')); nombres = [...new Set(s.docs.map(d => d.data()).filter(b => b.activo && b.maestro).map(b => b.maestro.trim()))].sort((a, b) => a.localeCompare(b, 'es')); } catch { /* sin lista: escriben su nombre */ }
  const code = String(1000 + Math.floor(Math.random() * 9000));
  try { await setDoc(doc(db, 'cte', code), { activo: true, creado: new Date().toISOString(), nombres, k: 0, r: 0, i: 0, rev: false, barreras: [] }); }
  catch (e) { return errorReglas(e); }
  sid = code; localStorage.setItem('cte_sid', sid); conectar();
}
function errorReglas(e) {
  console.error(e);
  vista.innerHTML = `<div class="login tarjeta"><h2>Falta un permiso en Firebase</h2><p>Para la sesión en vivo hay que pegar las reglas nuevas de Firestore (el archivo completo que te pasó Claude) y publicarlas. Después recarga esta página.</p><p class="mini">${esc(e.code || e.message || '')}</p></div>`;
}
function conectar() {
  desuscribir.forEach(f => f()); desuscribir = [];
  desuscribir.push(onSnapshot(doc(db, 'cte', sid), s => { S = s.data(); pintar(); }, errorReglas));
  desuscribir.push(onSnapshot(collection(db, 'cte', sid, 'r'), s => { R = s.docs.map(d => ({ id: d.id, ...d.data() })); pintarVivo(); }, e => console.error(e)));
}
const mover = async cambios => { Object.assign(S, cambios); pintar(); try { await updateDoc(doc(db, 'cte', sid), cambios); } catch (e) { console.error(e); } };

/* ---------- Datos en vivo ---------- */
const conectados = () => new Set(R.filter(r => r.act === 'join').map(r => r.p));
const resp = (act, i = null) => R.filter(r => r.act === act && (i === null || r.i === i));
const corto = n => esc(n.split(' ').slice(0, 2).join(' '));

/* ---------- Pintar ---------- */
function pintar() {
  if (!S) return;
  const k = S.k || 0, P = PASOS[k];
  $('#cod').textContent = `Código: ${sid}`;
  $('#donde').textContent = `${k + 1} de ${PASOS.length}`;
  $('#nav').innerHTML = `${P.t === 'act' ? `<span class="reloj" id="reloj"></span><button type="button" data-crono>${S.tfin ? 'Detener tiempo' : `⏱ ${P.min || 5} min`}</button>` : ''}<button type="button" data-qr>QR</button><button type="button" data-prod>Producto</button><button type="button" data-cerrar>Cerrar sesión</button>`;
  const lado = P.t === 'act' || P.nota === 'portada';
  vista.innerHTML = `<div class="wrap${lado ? '' : ' sin-lado'}"><div class="esc" id="esc">${guia ? `<div class="guia-txt">${esc(guiaTxt(P))}</div>` : ''}${P.t === 'dia' ? diaHTML(P, S.r || 0) : '<div id="act"></div>'}</div>${lado ? '<aside class="lado" id="lado"></aside>' : ''}</div>`;
  if (P.nota === 'portada') ponerQR('#qr-port');
  encender(P, S.r || 0);
  pintarVivo(); tic();
}
/* Enciende las piezas del diagrama hasta la tarjeta actual; lo recién encendido entra con animación y cuenta sus números. */
function encender(P, r) {
  if (P.t !== 'dia') return;
  const clave = `${S.k}|${r}`, nuevo = clave !== visto; visto = clave;
  const pon = (el, n) => { if (n < r) el.classList.add('on'); if (n === r - 1) el.classList.add('now'); };
  vista.querySelectorAll('.fig [data-p]').forEach(el => { const n = +el.dataset.p - 1; if (n === r - 1 && nuevo) requestAnimationFrame(() => requestAnimationFrame(() => { pon(el, n); contar(el); })); else pon(el, n); });
  vista.querySelectorAll('.tjs [data-r]').forEach((el, n) => { if (n === r - 1 && nuevo) requestAnimationFrame(() => requestAnimationFrame(() => pon(el, n))); else pon(el, n); });
}
function contar(el) {
  [...el.querySelectorAll('[data-cnt]'), ...(el.matches('[data-cnt]') ? [el] : [])].forEach(b => {
    const fin = +b.dataset.cnt, suf = b.dataset.suf || '', t0 = performance.now();
    const paso = t => { const x = Math.min(1, (t - t0) / 1100); b.textContent = Math.round(fin * (1 - Math.pow(1 - x, 3))) + suf; if (x < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  });
}
/* Cronómetro de la actividad: se guarda en la sesión para que también lo vean los celulares. */
function tic() {
  const el = $('#reloj'); if (!el) return;
  if (!S.tfin) { el.textContent = ''; el.className = 'reloj'; return; }
  const q = Math.round((S.tfin - Date.now()) / 1000);
  el.textContent = q > 0 ? `${Math.floor(q / 60)}:${String(q % 60).padStart(2, '0')}` : 'Tiempo';
  el.className = `reloj${q <= 60 ? ' poco' : ''}${q <= 0 ? ' fin' : ''}`;
}
setInterval(() => S && tic(), 1000);
function guiaTxt(P) {
  if (P.t === 'dia') return `Diapositiva: «${P.titulo}». Toca «Siguiente» para encender cada parte y coméntala con el colectivo antes de avanzar.`;
  return { abiertas: 'Pide que contesten en su celular. A la derecha ves quién ya contestó. Cambia de pregunta con los botones para comentar las respuestas del muro.',
    juego: 'Lee la situación en voz alta. Espera a que casi todos contesten (derecha) y toca «Revelar». Comenta la explicación y pasa a la siguiente.',
    jornada: 'Cada quien escribe las barreras que ve en cada momento. Toquen en el muro las más importantes (hasta cinco): esas se califican en el siguiente paso.',
    priorizar: 'Cada quien califica en su celular las barreras elegidas. Aquí se ordenan solas por el promedio del colectivo.',
    pasos: 'Cada maestro diseña su ajuste desde su asignatura. Lean en voz alta dos o tres del muro y coméntenlos.',
    compromiso: 'Cada quien escribe su compromiso. Al final imprime el producto con el botón «Producto».' }[P.tipo] || '';
}
function diaHTML(P, r) {
  if (P.fig) return `<h2>${esc(P.titulo)}</h2><div class="dg"><div class="fig">${P.fig}</div><div class="tjs">${P.partes.map(h => `<div data-r>${h}</div>`).join('')}</div></div>${P.nota ? `<p class="mini">${esc(P.nota)}</p>` : ''}`;
  const partes = P.partes.map((h, n) => `<div data-r class="${n < r ? 'on' : ''}">${h}</div>`).join('');
  if (P.nota === 'portada') return `<div class="portada"><div><h1>${esc(P.titulo)}</h1>${partes}</div><div class="qr" id="qr-port"></div></div>`;
  return `<h2>${esc(P.titulo)}</h2>${partes}${P.nota && P.nota !== 'cierre' ? `<p class="mini">${esc(P.nota)}</p>` : ''}`;
}
function ponerQR(sel) {
  const el = $(sel); if (!el) return;
  try { const q = qrcode(0, 'M'); q.addData(URL_CEL(sid)); q.make(); el.innerHTML = `${q.createSvgTag({ cellSize: 6, margin: 2, scalable: true })}<b>${sid}</b><span class="mini">${esc(URL_CEL(sid).replace(/^https?:\/\//, ''))}</span>`; }
  catch { el.innerHTML = `<b>${sid}</b><span class="mini">${esc(URL_CEL(sid))}</span>`; }
}

function pintarVivo() {
  if (!S) return;
  const P = PASOS[S.k || 0], lado = $('#lado'), con = conectados();
  if (lado) {
    if (P.t === 'act') {
      const ya = new Set(resp(P.id, P.tipo === 'juego' ? (S.i || 0) : null).map(r => r.p));
      const todos = [...new Set([...con, ...ya])].sort((a, b) => a.localeCompare(b, 'es'));
      lado.innerHTML = `<h4>Ya contestaron</h4><p class="cuenta">${ya.size} <span class="mini">de ${con.size} conectados</span></p><div class="gente">${todos.map(n => `<span class="${ya.has(n) ? 'ok' : ''}">${ya.has(n) ? '✓ ' : ''}${corto(n)}</span>`).join('')}</div>`;
    } else lado.innerHTML = `<h4>Conectados</h4><p class="cuenta">${con.size}</p><div class="gente">${[...con].sort((a, b) => a.localeCompare(b, 'es')).map(n => `<span class="ok">✓ ${corto(n)}</span>`).join('')}</div>`;
  }
  const a = $('#act'); if (!a || P.t !== 'act') return;
  a.innerHTML = `<h2>${esc(P.titulo)}</h2>${V[P.tipo](P)}`;
}

/* ---------- Vistas en vivo por tipo de actividad ---------- */
const V = {};
V.abiertas = P => {
  const L = resp(P.id).map(r => parse(r.v) || {}), q = Math.min(verQ, P.preguntas.length - 1);
  const muro = L.map(o => o[`q${q}`]).filter(x => x && String(x).trim());
  return `<div class="chips">${P.preguntas.map((_, n) => `<button type="button" data-q="${n}" aria-pressed="${n === q}">Pregunta ${n + 1}</button>`).join('')}</div>
    <p class="grande" style="font-size:26px;margin:12px 0">${esc(P.preguntas[q][0])}</p><p class="mini">${muro.length} respuestas</p>
    <div class="muro">${muro.map(t => `<div>${esc(t)}</div>`).join('') || '<p class="mini">Aún no hay respuestas.</p>'}</div>`;
};
V.juego = P => {
  const i = S.i || 0;
  if (i >= P.casos.length) {
    const tot = P.casos.map((c, n) => { const L = resp(P.id, n); return { c, total: L.length, bien: L.filter(r => r.v === c[1]).length }; });
    const T = tot.reduce((s, x) => s + x.total, 0), B = tot.reduce((s, x) => s + x.bien, 0);
    const peores = tot.filter(x => x.total).sort((a, b) => a.bien / a.total - b.bien / b.total).slice(0, P.compara ? 2 : 3);
    const ahora = T ? Math.round(B / T * 100) : 0, antes = P.compara ? aciertos(P.compara) : null;
    const comp = P.compara ? `<div class="compara"><div><span>Al inicio</span><div class="cb"><i style="--w:${antes}%;--c:var(--tinta2)"></i></div><b>${antes} %</b></div><div><span>Al final</span><div class="cb"><i style="--w:${ahora}%;--c:var(--dua)"></i></div><b>${ahora} %</b></div></div>
      <p class="grande">${ahora > antes ? `¡Subimos ${ahora - antes} puntos! Eso es lo que aprendimos hoy.` : ahora === antes ? 'Nos quedamos igual: vale la pena repasar los casos que más costaron.' : 'Bajamos un poco: repasemos los casos que más costaron.'}</p>` : `<p class="grande">El colectivo acertó <b>${ahora} %</b> de ${T} respuestas.</p>`;
    return `${comp}<h3>Las que más costaron</h3>
      ${peores.map(x => `<div class="caja"><b>${Math.round(x.bien / x.total * 100)} % de aciertos</b>${esc(x.c[0])}<br><span class="mini">Respuesta: ${opsDe(P).find(o => o[0] === x.c[1])[1]}. ${esc(x.c[2])}</span></div>`).join('')}
      <div class="fila"><button class="btn linea" data-jant>Volver a la última situación</button></div>`;
  }
  const c = P.casos[i], L = resp(P.id, i), n = L.length || 1;
  return `<p class="mini">Situación ${i + 1} de ${P.casos.length}</p><p class="grande" style="font-size:34px;font-weight:700">${esc(c[0])}</p>
    ${opsDe(P).map(([k, t]) => { const v = L.filter(r => r.v === k).length; return `<div class="barra-v${S.rev && k === c[1] ? ' correcta' : ''}"><span>${S.rev && k === c[1] ? '✅ ' : ''}${t}</span><span class="b"><span style="width:${S.rev ? v / n * 100 : 0}%"></span></span><b>${S.rev ? v : ''}</b></div>`; }).join('')}
    ${S.rev ? `<div class="caja ok"><b>${opsDe(P).find(o => o[0] === c[1])[1]}</b>${esc(c[2])}</div>` : `<p class="mini">${L.length} respuestas. Los votos se muestran al revelar.</p>`}
    <div class="fila" style="margin-top:12px">${S.rev ? `<button class="btn" data-jsig>${i + 1 < P.casos.length ? 'Siguiente situación' : 'Ver resultados'}</button>` : '<button class="btn" data-rev>Revelar respuesta</button>'}${i > 0 ? '<button class="btn linea" data-jant>Situación anterior</button>' : ''}</div>`;
};
V.jornada = P => {
  const L = resp(P.id).map(r => parse(r.v) || {}), sel = new Set(S.barreras || []);
  return `<p class="mini">Toquen las barreras más importantes para llevarlas a priorizar (hasta cinco). Elegidas: ${sel.size}.</p>
    <div class="cols">${MOMENTOS.map((m, k) => `<div><h4>${m}</h4><div class="muro" style="grid-template-columns:1fr">${L.map(o => o[`m${k}`]).filter(x => x && x.trim()).map(t => `<div class="${sel.has(t.trim()) ? 'sel' : ''}" data-bsel="${esc(t.trim())}" style="cursor:pointer">${esc(t)}</div>`).join('') || '<span class="mini">—</span>'}</div></div>`).join('')}</div>
    <div class="fila" style="margin-top:10px"><input id="b-otra" placeholder="Agregar otra barrera" style="flex:1;font-size:18px;padding:8px;border-radius:8px;border:1.5px solid var(--linea)"><button class="btn chico" data-badd>Agregar</button></div>
    ${sel.size ? `<div class="caja aviso"><b>Elegidas para priorizar</b>${[...sel].map(esc).join('<br>')}</div>` : ''}`;
};
const promedios = () => { const L = resp('prior').map(r => parse(r.v) || {});
  return { n: L.length, filas: (S.barreras || []).map((b, n) => { const prom = CRIT.map((_, c) => { const v = L.map(o => +((o[`b${n}`] || {})[c]) || 0).filter(Boolean); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : 0; });
    return { b, prom, tot: prom.reduce((a, x) => a + x, 0) }; }).sort((a, z) => z.tot - a.tot) }; };
V.priorizar = () => {
  if (!(S.barreras || []).length) return '<p class="grande">Primero elijan las barreras en la jornada (toquen las del muro).</p>';
  const { n, filas } = promedios();
  return `<table class="tabla"><thead><tr><th>Barrera</th>${CRIT.map(c => `<th style="font-size:14px">${c}</th>`).join('')}<th>Total</th></tr></thead>
    <tbody>${filas.map((f, k) => `<tr><td>${k === 0 && f.tot ? '🥇 ' : ''}${esc(f.b)}</td>${f.prom.map(x => `<td>${x ? x.toFixed(1) : ''}</td>`).join('')}<td><b style="font-size:22px">${f.tot ? f.tot.toFixed(1) : ''}</b></td></tr>`).join('')}</tbody></table><p class="mini">Promedio de ${n} maestros, de uno a cinco por criterio.</p>`;
};
V.pasos = P => {
  const L = resp(P.id).map(r => ({ id: r.id, o: parse(r.v) || {} })).filter(x => x.o.ajuste), D = S.dest || [];
  if (S.gal) {
    const G = L.filter(x => D.includes(x.id));
    return `<p class="mini">Galería: ${G.length} ajustes sin nombre. Para cada uno, el colectivo decide si cumple; toca cada criterio para marcarlo.</p><div class="galeria">${G.map((x, n) => `<div><h4>Ajuste ${n + 1} · ${esc(x.o.asig || 'Asignatura')}</h4>
      ${SEIS.map(s => x.o[s[0]] ? `<p><span class="mini">${s[1]}:</span> ${s[0] === 'ajuste' ? `<b>${esc(x.o[s[0]])}</b>` : esc(x.o[s[0]])}</p>` : '').join('')}
      <div class="crits">${GALERIA.map((g, k) => { const v = (chk[x.id] || [])[k] || 0; return `<button type="button" data-chk="${esc(x.id)}" data-k="${k}" class="v${v}">${v === 1 ? '✓ ' : v === 2 ? '✗ ' : ''}${g}</button>`; }).join('')}</div></div>`).join('') || '<p class="grande">Primero toca en el muro los ajustes que quieras comentar.</p>'}</div>
      <div class="fila" style="margin-top:12px"><button class="btn linea" data-gal>Volver al muro</button></div>`;
  }
  return `<div class="fila"><p class="mini" style="margin:0">${L.length} ajustes diseñados. Toca hasta cuatro para comentarlos en la galería.</p><button class="btn chico" data-gal ${D.length ? '' : 'disabled'}>Ver galería (${D.length})</button></div>
    <div class="muro" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))">${L.map(({ id, o }) => `<div data-dest="${esc(id)}" class="${D.includes(id) ? 'sel' : ''}" style="cursor:pointer"><b>${esc(o.asig || 'Asignatura')}</b><br><span class="mini">Barrera:</span> ${esc(o.barrera || '')}<br><span class="mini">Ajuste:</span> <b>${esc(o.ajuste)}</b><br><span class="mini">Seguimiento:</span> ${esc(o.seguimiento || '')}</div>`).join('')}</div>`;
};
const aciertos = id => { const J = PASOS.find(p => p.id === id); if (!J) return 0; let T = 0, B = 0; J.casos.forEach((c, n) => { const L = resp(id, n); T += L.length; B += L.filter(r => r.v === c[1]).length; }); return T ? Math.round(B / T * 100) : 0; };
V.compromiso = P => {
  const L = resp(P.id).map(r => parse(r.v) || {}).filter(o => o.txt);
  return `<p class="mini">${L.length} compromisos</p><div class="muro">${L.map(o => `<div>${esc(o.txt)}<br><span class="mini">${esc(o.asig || '')}</span></div>`).join('')}</div>`;
};

/* ---------- Navegación ---------- */
function avanzar(d) {
  const k = S.k || 0, P = PASOS[k];
  if (P.t === 'dia' && d > 0 && (S.r || 0) < P.partes.length) return mover({ r: (S.r || 0) + 1 });
  if (P.t === 'dia' && d < 0 && (S.r || 0) > 0) return mover({ r: (S.r || 0) - 1 });
  const n = k + d; if (n < 0 || n >= PASOS.length) return;
  verQ = 0; mover({ k: n, r: d > 0 ? 0 : PASOS[n].t === 'dia' ? PASOS[n].partes.length : 0, tfin: null, gal: false, i: 0, rev: false });
}
$('#sig').onclick = () => S && avanzar(1);
$('#ant').onclick = () => S && avanzar(-1);
$('#guia').onclick = () => { guia = !guia; $('#guia').textContent = guia ? 'Ocultar guía' : 'Ver guía'; pintar(); };
addEventListener('keydown', e => { if (!S || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) return; if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); avanzar(1); } if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); avanzar(-1); } });
document.addEventListener('click', e => {
  const b = e.target.closest('button,[data-bsel],[data-dest]'); if (!b || !S) return;
  if (b.dataset.q) { verQ = +b.dataset.q; pintarVivo(); }
  else if (b.dataset.crono !== undefined) { const P = PASOS[S.k || 0]; mover({ tfin: S.tfin ? null : Date.now() + (P.min || 5) * 60000 }); }
  else if (b.dataset.dest !== undefined) { const t = b.dataset.dest, D = [...(S.dest || [])], x = D.indexOf(t); if (x >= 0) D.splice(x, 1); else if (D.length < 4) D.push(t); mover({ dest: D }); }
  else if (b.dataset.gal !== undefined) mover({ gal: !S.gal });
  else if (b.dataset.chk !== undefined) { const a = chk[b.dataset.chk] ||= []; a[+b.dataset.k] = ((a[+b.dataset.k] || 0) + 1) % 3; pintarVivo(); }
  else if (b.dataset.rev !== undefined) mover({ rev: true });
  else if (b.dataset.jsig !== undefined) mover({ i: (S.i || 0) + 1, rev: false });
  else if (b.dataset.jant !== undefined) mover({ i: Math.max(0, (S.i || 0) - 1), rev: true });
  else if (b.dataset.bsel !== undefined) { const t = b.dataset.bsel, B = [...(S.barreras || [])]; const x = B.indexOf(t); if (x >= 0) B.splice(x, 1); else if (B.length < 5) B.push(t); mover({ barreras: B }); }
  else if (b.dataset.badd !== undefined) { const t = $('#b-otra').value.trim(); if (t && (S.barreras || []).length < 5) mover({ barreras: [...(S.barreras || []), t] }); }
  else if (b.dataset.qr !== undefined) { const w = document.createElement('div'); w.style.cssText = 'position:fixed;inset:0;background:rgba(14,22,48,.8);display:flex;align-items:center;justify-content:center;z-index:20'; w.innerHTML = '<div class="qr" id="qr-big" style="width:440px"></div>'; w.onclick = () => w.remove(); document.body.appendChild(w); ponerQR('#qr-big'); }
  else if (b.dataset.prod !== undefined) { $('#impresion').innerHTML = producto(); setTimeout(() => print(), 300); }
  else if (b.dataset.cerrar !== undefined) { if (confirm('¿Cerrar la sesión? Los celulares ya no podrán contestar. Imprime antes el producto.')) { updateDoc(doc(db, 'cte', sid), { activo: false }).then(() => { localStorage.removeItem('cte_sid'); sid = ''; S = null; desuscribir.forEach(f => f()); inicio(); }); } }
});

/* ---------- Producto en carta ---------- */
function producto() {
  const nombres = [...conectados()].sort((a, b) => a.localeCompare(b, 'es'));
  const acts = PASOS.filter(p => p.t === 'act');
  const part = n => acts.filter(a => R.some(r => r.p === n && r.act === a.id)).length;
  const lista = (act, f) => resp(act).map(r => parse(r.v) || {}).map(f).filter(Boolean);

  const abiertas = P => P.preguntas.map((q, n) => `<h3 style="font-size:10.5pt;margin:6pt 0 2pt">${esc(q[0])}</h3><ul style="margin:0 0 4pt">${lista(P.id, o => o[`q${n}`] && `<li>${esc(o[`q${n}`])}</li>`).join('') || '<li>Sin respuestas.</li>'}</ul>`).join('');
  const ref = PASOS.find(p => p.id === 'refl'), ana = PASOS.find(p => p.id === 'analisis');
  const comp = resp('compromiso').map(r => ({ p: r.p, o: parse(r.v) || {} })).filter(x => x.o.txt).sort((a, b) => a.p.localeCompare(b.p, 'es'));
  return `<div class="p-cab"><img src="logo-escuela.jpg" alt=""><div><b>Escuela Secundaria Técnica N.° 17 · Turno Vespertino</b><span>C.C.T. 04DST0017E · San Francisco de Campeche, Campeche · Ciclo escolar 2026-2027</span></div></div>
  <h1>Consejo Técnico Escolar · Ajustes razonables en la atención de niñas, niños y adolescentes con discapacidad y aptitudes sobresalientes</h1>
  <p>Fecha: ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}. Expone: campo formativo de Lenguajes. Participaron ${nombres.length} docentes desde su celular.</p>
  <h2>1. Participación</h2><table><thead><tr><th>Docente</th><th>Actividades contestadas (de ${acts.length})</th></tr></thead><tbody>${nombres.map(n => `<tr><td>${esc(n)}</td><td>${part(n)}</td></tr>`).join('')}</tbody></table>
  <h2>2. Juegos</h2><table><tbody><tr><td>Conceptos, al inicio de la sesión</td><td style="width:22%">${aciertos('juego')} % de aciertos</td></tr><tr><td>Tipos de barrera</td><td>${aciertos('barr')} % de aciertos</td></tr><tr><td>Juego de salida</td><td>${aciertos('salida')} % de aciertos</td></tr></tbody></table>
  <h2>3. Reflexión inicial</h2>${ref ? abiertas(ref) : ''}
  <h2>4. Análisis de nuestros datos</h2>${ana ? abiertas(ana) : ''}
  <h2>5. La jornada de ${CASO.nombre}: barreras identificadas</h2><table><tbody>${MOMENTOS.map((m, k) => `<tr><th style="width:24%">${m}</th><td>${lista('jornada', o => o[`m${k}`] && esc(o[`m${k}`])).join('<br>')}</td></tr>`).join('')}</tbody></table>
  <h2>6. Barreras priorizadas (promedio del colectivo)</h2><table><tbody>${promedios().filas.map((x, n) => `<tr><td style="width:6%">${n + 1}</td><td>${esc(x.b)}</td><td style="width:14%">${x.tot.toFixed(1)} de 25</td></tr>`).join('')}</tbody></table>
  <h2>7. Ajustes razonables diseñados</h2><table><thead><tr><th>Asignatura</th>${SEIS.map(s => `<th>${s[1]}</th>`).join('')}</tr></thead><tbody>${lista('ajuste', o => o.ajuste && `<tr><td>${esc(o.asig || '')}</td>${SEIS.map(s => `<td>${esc(o[s[0]] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <h2>8. Compromisos de cada docente</h2><table><thead><tr><th style="width:30%">Docente</th><th>Compromiso</th></tr></thead><tbody>${comp.map(x => `<tr><td>${esc(x.p)}<br><small>${esc(x.o.asig || '')}</small></td><td>${esc(x.o.txt)}</td></tr>`).join('')}</tbody></table>
  <div class="p-firmas"><div>Docentes del campo formativo de Lenguajes</div><div>Dirección / Subdirección</div></div>`;
}
