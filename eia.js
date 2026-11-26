/* Raíces y Estrellas · Resultados EIA (Ejercicios Integradores del Aprendizaje, Fase 6)
   Pestaña del área «Convivencia y familias»: resumen, por grupo, aprendizajes, alumnos prioritarios,
   datos a revisar y una presentación para el Consejo Técnico que se arma paso a paso.
   Los totales vienen en eia-datos.js; la lista de alumnos va cifrada (AES-GCM) y se abre con la clave,
   que se guarda en reportes/_eia/privado/clave (solo la cuenta directiva la puede leer). */
import { EIA } from './eia-datos.js?v=2026112601';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const C = ['LEN', 'SPC', 'ENS', 'HYC'];
const NC = { LEN: 'Lenguajes', SPC: 'Saberes y pensamiento científico', ENS: 'Ética, naturaleza y sociedades', HYC: 'De lo humano y lo comunitario' };
const CC = { LEN: '#2F6FD1', SPC: '#2F6B4F', ENS: '#7A5230', HYC: '#3A3F8F' };
const L = ['SE', 'RA', 'EPD', 'AD'];
const NL = { SE: 'Sin evidencias', RA: 'Requiere apoyo', EPD: 'En proceso de desarrollo', AD: 'Aprendizaje desarrollado' };
const DL = {
  SE: 'No se obtuvieron respuestas, o son insuficientes para conocer cómo va el aprendizaje.',
  RA: 'Las respuestas muestran un aprendizaje incipiente: necesita acompañamiento cercano en el aula.',
  EPD: 'Las respuestas muestran aprendizajes en proceso que hay que seguir trabajando.',
  AD: 'Las respuestas confirman que el aprendizaje está desarrollado e integrado.'
};
const CL = { SE: '#9A8F80', RA: '#C8403A', EPD: '#E0B321', AD: '#2E8B57' };
const CV = ['#C8403A', '#E8893A', '#E0B321', '#2E8B57'];
const GRADO = { 1: 'Primero', 2: 'Segundo', 3: 'Tercero' };
const ORD = { 1: '1.er grado', 2: '2.º grado', 3: '3.er grado' };
const nomG = id => `${id[0]}.° ${id.slice(1)}`;
const pct = (n, t) => t ? Math.round(n / t * 100) : 0;
const suma = a => a.reduce((s, x) => s + x, 0);
const apoyo = niv => niv[0] + niv[1]; // sin evidencias + requiere apoyo
const PALABRAS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const deCada10 = p => PALABRAS[Math.round(p / 10)] || String(Math.round(p / 10));

let ctx = null, alumnos = null, sub = 'resumen', gSel = '1G', grSel = 1, abriendo = null;
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Clave y descifrado ---------- */
const b64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
async function descifrar(clave) {
  const c = EIA.cifrado;
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(c.salt), iterations: c.it, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(c.iv) }, key, b64(c.datos));
  return JSON.parse(new TextDecoder().decode(pt));
}
const refClave = () => doc(ctx.db, 'reportes', '_eia', 'privado', 'clave');
async function abrirConClave(clave, guardar) {
  clave = String(clave || '').trim().toLowerCase();
  alumnos = await descifrar(clave);
  try { localStorage.setItem('rye_eia_clave', clave); } catch { /* sin espacio */ }
  if (guardar) await setDoc(refClave(), { clave, guardada: new Date().toISOString() }).catch(e => console.warn(e));
}
function intentarAbrir() {
  if (alumnos || abriendo) return abriendo;
  abriendo = (async () => {
    let k = null; try { k = localStorage.getItem('rye_eia_clave'); } catch { /* */ }
    if (k) { try { await abrirConClave(k, false); return; } catch { /* clave vieja */ } }
    try { const s = await getDoc(refClave()); if (s.exists()) await abrirConClave(s.data().clave, false); } catch (e) { console.warn(e); }
  })().finally(() => { abriendo = null; });
  return abriendo;
}
const deGrupo = id => (alumnos || []).filter(a => a.g === id).sort((a, b) => a.n - b.n);
const enApoyo = a => C.filter(c => a.niv[c] === 'RA' || a.niv[c] === 'SE');
const esPrioritario = a => enApoyo(a).length >= 3;
const titulo = s => s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, e, l) => e + l.toUpperCase()).replace(/\b(De|Del|La|Las|Los|Y)\b/g, w => w.toLowerCase());

/* ---------- Piezas visuales ---------- */
function barra(niv, { etiquetas = true, alto = '' } = {}) {
  const t = suma(niv);
  return `<div class="eia-barra" ${alto ? `style="height:${alto}"` : ''}>${niv.map((n, k) => n ? `<span class="eia-seg" style="--w:${n / t * 100}%;background:${CL[L[k]]}" title="${NL[L[k]]}: ${n} de ${t} (${pct(n, t)} %)">${etiquetas && n / t >= .08 ? pct(n, t) + ' %' : ''}</span>` : '').join('')}</div>`;
}
function barraV(dist) {
  const t = suma(dist);
  return `<div class="eia-barra">${dist.map((n, k) => n ? `<span class="eia-seg" style="--w:${n / t * 100}%;background:${CV[k]}" title="Valoración ${k}: ${n} de ${t} (${pct(n, t)} %)">${n / t >= .08 ? pct(n, t) + ' %' : ''}</span>` : '').join('')}</div>`;
}
const leyenda = () => `<div class="eia-ley">${L.map(l => `<span><i style="background:${CL[l]}"></i>${NL[l]}</span>`).join('')}</div>`;
const leyendaV = () => `<div class="eia-ley">${CV.map((c, k) => `<span><i style="background:${c}"></i>Valoración ${k}</span>`).join('')}</div>`;
const chip = l => `<span class="eia-chip" style="background:${CL[l]}">${l}</span>`;

/* ---------- Pestaña ---------- */
export async function tabEIA(c) {
  ctx = c;
  const p = ctx.panel;
  if (!alumnos) await intentarAbrir();
  const SUBS = [['resumen', 'Resumen'], ['grupo', 'Por grupo'], ['aprend', 'Aprendizajes'], ['prior', 'Alumnos prioritarios'], ['revisar', 'Datos a revisar']];
  p.innerHTML = `<div class="tarjeta eia-cab">
      <div><p class="eia-kicker">Ejercicios Integradores del Aprendizaje · Fase 6</p>
      <h2>Resultados EIA del turno vespertino</h2>
      <p class="ayuda">${EIA.n} alumnos de siete grupos, en los cuatro campos formativos. Reportes oficiales del 30 de septiembre de 2026, folio ${EIA.folio}.</p></div>
      <button type="button" class="btn oro eia-presentar" id="eia-pres">▶ Presentar en el Consejo Técnico</button>
    </div>
    ${alumnos ? '' : `<div class="tarjeta eia-candado"><p><b>🔒 La lista de alumnos está protegida.</b> Los totales y gráficas se ven sin clave; los nombres solo aparecen con la clave de los resultados. Escríbela una vez y queda guardada para la cuenta directiva.</p>
      <div class="fila-btn"><input id="eia-clave" placeholder="Clave de los resultados" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="btn oro chico" id="eia-abrir">Abrir</button></div></div>`}
    <nav class="eia-subs">${SUBS.map(([k, t]) => `<button type="button" data-sub="${k}" aria-pressed="${sub === k}">${t}</button>`).join('')}</nav>
    <div id="eia-cuerpo"></div>`;
  p.querySelector('#eia-pres').addEventListener('click', () => presentar());
  p.querySelectorAll('[data-sub]').forEach(b => b.addEventListener('click', () => { sub = b.dataset.sub; tabEIA(ctx); }));
  const ab = p.querySelector('#eia-abrir');
  if (ab) {
    const ir = async () => {
      ab.disabled = true; ab.textContent = 'Abriendo…';
      try { await abrirConClave(p.querySelector('#eia-clave').value, true); ctx.aviso('Listo: la lista de alumnos quedó abierta.'); tabEIA(ctx); }
      catch { ctx.aviso('Esa clave no abre los resultados. Revísala letra por letra.', true); ab.disabled = false; ab.textContent = 'Abrir'; }
    };
    ab.addEventListener('click', ir);
    p.querySelector('#eia-clave').addEventListener('keydown', e => { if (e.key === 'Enter') ir(); });
  }
  ({ resumen: vResumen, grupo: vGrupo, aprend: vAprend, prior: vPrior, revisar: vRevisar })[sub](p.querySelector('#eia-cuerpo'));
}

function vResumen(el) {
  const tot = suma(C.map(c => suma(EIA.niv[c])));
  const nivT = L.map((_, k) => suma(C.map(c => EIA.niv[c][k])));
  el.innerHTML = `<div class="tarjeta"><h3>La escuela en los cuatro campos</h3>${leyenda()}
    ${C.map(c => `<div class="eia-fila"><span class="eia-et" style="--c:${CC[c]}">${NC[c]}</span>${barra(EIA.niv[c])}</div>`).join('')}
    <p class="ayuda" style="margin-top:.8rem">Sumando los cuatro campos de los ${EIA.n} alumnos: ${pct(nivT[2], tot)} % en proceso, ${pct(nivT[3], tot)} % con aprendizaje desarrollado y ${pct(nivT[0] + nivT[1], tot)} % que requiere apoyo.</p></div>
    <div class="tarjeta"><h3>Porcentaje que requiere apoyo, por grado y campo</h3>
    <p class="ayuda">Incluye «Sin evidencias». Entre más intenso el color, más alumnos necesitan acompañamiento.</p>
    <div class="eia-calor"><span></span>${C.map(c => `<b style="color:${CC[c]}">${c}</b>`).join('')}
    ${[1, 2, 3].map(g => { const G = EIA.grados[g]; return `<b>${ORD[g]}</b>${C.map(c => { const v = pct(apoyo(G.niv[c]), G.n); return `<span style="background:rgba(200,64,58,${(v / 70).toFixed(2)});color:${v > 40 ? '#fff' : 'inherit'}">${v} %</span>`; }).join('')}`; }).join('')}</div></div>
    <div class="tarjeta"><h3>Por grupo</h3>${leyenda()}
    <div class="eia-tabla-g"><span></span>${C.map(c => `<b>${c}</b>`).join('')}${EIA.grupos.map(g => `<b>${nomG(g.id)} <small>(${g.n})</small></b>${C.map(c => barra(g.niv[c], { etiquetas: false })).join('')}`).join('')}</div></div>`;
}

function vGrupo(el) {
  const g = EIA.grupos.find(x => x.id === gSel);
  const al = deGrupo(gSel);
  el.innerHTML = `<div class="tarjeta"><div class="eia-sel">${EIA.grupos.map(x => `<button type="button" data-g="${x.id}" aria-pressed="${x.id === gSel}">${nomG(x.id)}</button>`).join('')}</div>
    <h3>${nomG(gSel)} · ${g.n} alumnos evaluados</h3>${leyenda()}
    ${C.map(c => `<div class="eia-fila"><span class="eia-et" style="--c:${CC[c]}">${NC[c]}</span>${barra(g.niv[c])}</div>`).join('')}
    <p class="ayuda" style="margin-top:.6rem">Prioritarios (requieren apoyo en tres o cuatro campos): <b>${g.prioritarios}</b>.${g.sinResultado.length ? ` Números de lista sin resultado: ${g.sinResultado.join(', ')}.` : ''}</p></div>
    <div class="tarjeta"><div class="eia-tit-fila"><h3>Alumnos</h3>${alumnos ? '<button type="button" class="btn linea chico" id="eia-imp-g">🖨️ Imprimir la lista del grupo</button>' : ''}</div>
    ${alumnos ? tablaAlumnos(al) : '<p class="ayuda">🔒 Escribe la clave arriba para ver los nombres.</p>'}</div>`;
  el.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { gSel = b.dataset.g; vGrupo(el); }));
  el.querySelector('#eia-imp-g')?.addEventListener('click', () => ctx.imprimir(hojaGrupo(gSel)));
  ligarAlumnos(el);
}
function tablaAlumnos(al, { grupo = false } = {}) {
  return `<div class="eia-alumnos">${al.map(a => { const r = ctx.reportesDe(a.nombre, a.g), pr = esPrioritario(a);
    return `<button type="button" class="eia-al${pr ? ' pri' : ''}" data-al="${a.g}-${a.n}"><span class="n">${grupo ? nomG(a.g) + ' · ' : ''}${a.n}</span><span class="nom">${esc(titulo(a.nombre))}${pr ? ' <small class="eia-pri">prioritario</small>' : ''}${a.falto.length ? ' <small class="eia-falto">faltó a un ejercicio</small>' : ''}${r ? ` <small class="eia-rep">${r} reporte${r > 1 ? 's' : ''} de conducta</small>` : ''}</span><span class="niv">${C.map(c => chip(a.niv[c])).join('')}</span></button>`; }).join('')}</div>
    <p class="ayuda eia-orden">Orden de los niveles: ${C.map(c => `<b>${c}</b> ${NC[c]}`).join(' · ')}. Toca un alumno para ver su detalle.</p>`;
}
function ligarAlumnos(el) {
  el.querySelectorAll('[data-al]').forEach(b => b.addEventListener('click', () => {
    const [g, n] = b.dataset.al.split('-'); const a = alumnos.find(x => x.g === g && x.n === +n); if (a) detalleAlumno(a);
  }));
}
function detalleAlumno(a) {
  const items = EIA.grados[a.g[0]].items;
  ctx.abrirModal(`${titulo(a.nombre)} · ${nomG(a.g)}, n.º ${a.n}`, `${a.falto.length ? `<p class="aviso-noap">Tiene cero en todo el ${a.falto.join(' y ')}: probablemente faltó ese día. Su nivel puede no reflejar lo que sabe.</p>` : ''}
    ${C.map(c => `<div class="eia-det"><h4 style="color:${CC[c]}">${NC[c]} ${chip(a.niv[c])}</h4>
      ${items.filter(i => i.campo === c).sort((x, y) => x.id.localeCompare(y.id)).map(i => `<div class="eia-det-f"><span class="eia-v v${a.v[i.id]}">${a.v[i.id]}</span><span>${esc(i.crit)}</span></div>`).join('')}</div>`).join('')}
    <p class="ayuda">Cada criterio se valoró de cero a tres con la rúbrica oficial.</p>`);
}
function hojaGrupo(id) {
  const g = EIA.grupos.find(x => x.id === id), al = deGrupo(id);
  return `<div class="hoja-imp eia-imp"><div class="imp-membrete">Escuela Secundaria Técnica No. 17 · Turno vespertino · Resultados EIA Fase 6 (septiembre de 2026)</div>
    <h2 style="margin:0 0 4pt">${nomG(id)} · ${g.n} alumnos evaluados</h2>
    <p style="font:9pt Arial">SE Sin evidencias · RA Requiere apoyo · EPD En proceso de desarrollo · AD Aprendizaje desarrollado. Prioritario: requiere apoyo en tres o cuatro campos.</p>
    <table class="eia-imp-t"><thead><tr><th>N.º</th><th>Alumno</th>${C.map(c => `<th>${c}</th>`).join('')}<th>Nota</th></tr></thead>
    <tbody>${al.map(a => `<tr${esPrioritario(a) ? ' class="pri"' : ''}><td>${a.n}</td><td>${esc(titulo(a.nombre))}</td>${C.map(c => `<td>${a.niv[c]}</td>`).join('')}<td>${[esPrioritario(a) ? 'Prioritario' : '', a.falto.length ? 'Faltó a un ejercicio' : ''].filter(Boolean).join('; ')}</td></tr>`).join('')}</tbody></table></div>`;
}

function vAprend(el) {
  const G = EIA.grados[grSel];
  el.innerHTML = `<div class="tarjeta"><div class="eia-sel">${[1, 2, 3].map(g => `<button type="button" data-gr="${g}" aria-pressed="${g === grSel}">${ORD[g]}</button>`).join('')}</div>
    <h3>${ORD[grSel]}: de lo más difícil a lo menos difícil</h3>
    <p class="ayuda">Porcentaje de alumnos que sacaron cero o uno en cada criterio. Toca uno para ver cómo le fue a cada grupo.</p>
    <div class="eia-items">${G.items.map(i => `<button type="button" class="eia-item" data-it="${i.id}"><span class="eia-it-c" style="background:${CC[i.campo]}">${i.campo}</span>
      <span class="eia-it-t"><b>${esc(i.crit)}</b><small>${esc(i.desc)}</small></span>
      <span class="eia-it-b"><span style="width:${i.p01}%;background:${i.p01 >= 60 ? '#C8403A' : i.p01 >= 40 ? '#E8893A' : '#E0B321'}"></span></span><span class="eia-it-p">${Math.round(i.p01)} %</span></button>`).join('')}</div></div>`;
  el.querySelectorAll('[data-gr]').forEach(b => b.addEventListener('click', () => { grSel = +b.dataset.gr; vAprend(el); }));
  el.querySelectorAll('[data-it]').forEach(b => b.addEventListener('click', () => {
    const i = G.items.find(x => x.id === b.dataset.it), gs = EIA.grupos.filter(g => g.grado === grSel);
    ctx.abrirModal(i.crit, `<p><b>Aprendizaje:</b> ${esc(i.desc)}</p><p><b>Campo:</b> ${NC[i.campo]} · <b>Consigna:</b> ${i.id}</p>
      <h4>Cero o uno, por grupo</h4>${gs.map(g => `<div class="eia-fila"><span class="eia-et">${nomG(g.id)}</span><span class="eia-it-b"><span style="width:${g.items[i.id].p01}%;background:#C8403A"></span></span><span class="eia-it-p">${Math.round(g.items[i.id].p01)} %</span></div>`).join('')}
      <h4>Valoraciones de todo el grado</h4>${leyendaV()}${barraV(i.dist)}`);
  }));
}

function vPrior(el) {
  const gs = EIA.grupos;
  el.innerHTML = `<div class="tarjeta"><div class="eia-tit-fila"><h3>Alumnos prioritarios</h3>${alumnos ? '<button type="button" class="btn linea chico" id="eia-imp-p">🖨️ Imprimir para los tutores</button>' : ''}</div>
    <p class="ayuda">Son los que quedaron en «Requiere apoyo» o «Sin evidencias» en tres o cuatro de los cuatro campos formativos. Son ${suma(gs.map(g => g.prioritarios))} en total. Si aparecen reportes de conducta, salen de lo que ya está registrado en la plataforma.</p>
    ${gs.map(g => `<h4 class="eia-h4">${nomG(g.id)} · ${g.prioritarios} de ${g.n}</h4>${alumnos ? (deGrupo(g.id).filter(esPrioritario).length ? tablaAlumnos(deGrupo(g.id).filter(esPrioritario)) : '<p class="ayuda">Ninguno.</p>') : ''}`).join('')}
    ${alumnos ? '' : '<p class="ayuda">🔒 Escribe la clave arriba para ver los nombres.</p>'}</div>`;
  ligarAlumnos(el);
  el.querySelector('#eia-imp-p')?.addEventListener('click', () => ctx.imprimir(gs.filter(g => g.prioritarios).map(g => {
    const al = deGrupo(g.id).filter(esPrioritario);
    return `<div class="hoja-imp eia-imp"><div class="imp-membrete">Escuela Secundaria Técnica No. 17 · Turno vespertino · Resultados EIA Fase 6 · Para el tutor de ${nomG(g.id)}</div>
      <h2 style="margin:0 0 4pt">Alumnos prioritarios de ${nomG(g.id)}</h2>
      <p style="font:9.5pt Arial">Requieren apoyo en tres o cuatro campos formativos. Se sugiere darles seguimiento cercano, revisar con sus maestros qué les cuesta y hablar con la familia.</p>
      <table class="eia-imp-t"><thead><tr><th>N.º</th><th>Alumno</th>${C.map(c => `<th>${c}</th>`).join('')}<th>Campos que requieren apoyo</th><th>Seguimiento</th></tr></thead>
      <tbody>${al.map(a => `<tr><td>${a.n}</td><td>${esc(titulo(a.nombre))}${a.falto.length ? '<br><small>Faltó a un ejercicio</small>' : ''}</td>${C.map(c => `<td>${a.niv[c]}</td>`).join('')}<td>${enApoyo(a).map(c => NC[c]).join(', ')}</td><td style="width:22%"></td></tr>`).join('')}</tbody></table></div>`;
  }).join('')));
}

function vRevisar(el) {
  const gs = EIA.grupos, sinR = suma(gs.map(g => g.sinResultado.length)), falt = suma(gs.map(g => g.faltoUno));
  const tres = gs.map(g => ({ id: g.id, p: pct(g.dist[3], suma(g.dist)), c: pct(g.dist[0], suma(g.dist)) }));
  el.innerHTML = `<div class="tarjeta"><h3>Antes de sacar conclusiones</h3>
    <div class="eia-rev"><div><b>${sinR}</b><span>números de lista sin resultado en los reportes (no presentaron o no se capturaron).</span></div>
    <div><b>${falt}</b><span>alumnos con cero en todo un ejercicio: es probable que faltaran ese día y su nivel salga más bajo de lo real.</span></div></div>
    ${gs.map(g => g.sinResultado.length ? `<p class="ayuda"><b>${nomG(g.id)}:</b> n.º ${g.sinResultado.join(', ')}</p>` : '').join('')}
    ${alumnos ? `<h4 class="eia-h4">Con cero en todo un ejercicio</h4>${tablaAlumnos(alumnos.filter(a => a.falto.length), { grupo: true })}` : ''}</div>
    <div class="tarjeta"><h3>Cómo se calificó en cada grupo</h3>
    <p class="ayuda">Todas las valoraciones de cero a tres de cada grupo. Si un grupo se ve muy distinto, vale la pena revisar juntos la rúbrica para que todos califiquemos igual.</p>${leyendaV()}
    ${gs.map(g => `<div class="eia-fila"><span class="eia-et">${nomG(g.id)}</span>${barraV(g.dist)}</div>`).join('')}
    <p class="ayuda" style="margin-top:.6rem">En 1.° I ${tres.find(t => t.id === '1I').c === 0 ? 'no hay ninguna valoración de cero' : ''} y ${tres.find(t => t.id === '1I').p} % son tres; en los demás grupos los tres van de ${Math.min(...tres.filter(t => t.id !== '1I').map(t => t.p))} a ${Math.max(...tres.filter(t => t.id !== '1I').map(t => t.p))} %.</p></div>`;
  ligarAlumnos(el);
}

/* =====================================================================
   PRESENTACIÓN · se arma con «siguiente», como las diapositivas de clase.
   Cada diapositiva tiene N pasos; los elementos con data-p="k" se encienden
   cuando el paso llega a k, y las tarjetas data-solo="k" solo se ven en su paso.
   ===================================================================== */
function diapositivas() {
  const D = EIA, gs = D.grupos, tot = suma(C.map(c => suma(D.niv[c])));
  const nivT = L.map((_, k) => suma(C.map(c => D.niv[c][k])));
  const tarjeta = (k, titulo, texto, color = '#16213F', extra = '') => `<div class="eia-t" data-solo="${k}" style="--c:${color}"><h3>${titulo}</h3>${texto}${extra}</div>`;
  const S = [];

  S.push({ pasos: 0, html: () => `<div class="eia-portada"><p class="eia-k">Consejo Técnico Escolar · Escuela Secundaria Técnica No. 17 · Turno vespertino</p>
    <h1>Resultados de los Ejercicios Integradores del Aprendizaje</h1><p class="eia-sub">Fase 6 · Aplicación de septiembre de 2026</p>
    <div class="eia-cont"><div><b data-cuenta="${D.n}">0</b><span>alumnos evaluados</span></div><div><b data-cuenta="7">0</b><span>grupos</span></div><div><b data-cuenta="4">0</b><span>campos formativos</span></div></div></div>` });

  S.push({ pasos: 3, html: () => `<h2>¿Qué miden los EIA?</h2><div class="eia-dos">
    <div class="eia-flujo"><div class="eia-caja" data-p="1"><b>Dos ejercicios</b><span>EIA uno y EIA dos, con varias consignas sobre temas de la vida real</span></div><i data-p="2">↓</i>
    <div class="eia-caja" data-p="2"><b>Cada criterio, de cero a tres</b><span>El maestro valora cada respuesta con la rúbrica oficial</span></div><i data-p="3">↓</i>
    <div class="eia-caja" data-p="3"><b>Un nivel por campo formativo</b><span>Con esas valoraciones se asigna el nivel de integración del aprendizaje</span></div></div>
    <div class="eia-ts">${tarjeta(1, 'Temas de la vida real', '<p>En primero y segundo los ejercicios giraron en torno a la violencia de género y el maltrato infantil. En tercero, al arte latinoamericano, la divulgación científica, la geometría, la nutrición y la sustentabilidad.</p>', CC.LEN)}
    ${tarjeta(2, 'Una rúbrica por criterio', '<p>Cero: no responde o no corresponde. Uno: respuesta incipiente. Dos: en proceso. Tres: logrado.</p><p>No es un examen de opción múltiple: se valora cómo explica, argumenta y propone el alumno.</p>', CC.SPC)}
    ${tarjeta(3, 'Cuatro campos formativos', `<p>${C.map(c => `<b style="color:${CC[c]}">${NC[c]}</b>`).join(', ')}.</p><p>El resultado no es una calificación: es un diagnóstico para planear.</p>`, CC.HYC)}</div></div>` });

  S.push({ pasos: 4, html: () => `<h2>Los cuatro niveles de integración</h2><div class="eia-dos">
    <div class="eia-escalera">${L.map((l, k) => `<div class="eia-esc" data-p="${k + 1}" style="--h:${30 + k * 22}%;--c:${CL[l]}"><b>${l}</b><span>${NL[l]}</span><em>${pct(nivT[k], tot)} %</em></div>`).join('')}</div>
    <div class="eia-ts">${L.map((l, k) => tarjeta(k + 1, NL[l], `<p>${DL[l]}</p><p class="eia-dato">En nuestra escuela: <b>${nivT[k]}</b> de ${tot} resultados por campo (${pct(nivT[k], tot)} %).</p>`, CL[l])).join('')}</div></div>` });

  S.push({ pasos: 5, html: () => `<h2>Panorama de la escuela</h2><div class="eia-dos">
    <div class="eia-barras">${leyenda()}${C.map((c, k) => `<div class="eia-fila" data-p="${k + 1}"><span class="eia-et" style="--c:${CC[c]}">${NC[c]}</span>${barra(D.niv[c], { alto: '46px' })}</div>`).join('')}</div>
    <div class="eia-ts">${C.map((c, k) => { const n = D.niv[c]; return tarjeta(k + 1, NC[c], `<p><b>${pct(apoyo(n), D.n)} %</b> requiere apoyo, <b>${pct(n[2], D.n)} %</b> está en proceso y <b>${pct(n[3], D.n)} %</b> tiene el aprendizaje desarrollado.</p><p class="eia-dato">${apoyo(n)} alumnos necesitan acompañamiento cercano en este campo.</p>`, CC[c]); }).join('')}
    ${tarjeta(5, 'Lo que nos dice', `<p>La mayoría está <b>en proceso</b>: ${deCada10(pct(nivT[2], tot))} de cada diez resultados.</p><p>Solo <b>${deCada10(pct(nivT[3], tot))}</b> de cada diez tiene el aprendizaje desarrollado, y casi <b>${deCada10(pct(nivT[0] + nivT[1], tot))}</b> de cada diez requieren apoyo.</p><p>El campo más difícil fue <b>${NC[C.reduce((a, c) => apoyo(D.niv[c]) > apoyo(D.niv[a]) ? c : a)]}</b>.</p>`, '#16213F')}</div></div>` });

  const calor = C.flatMap(c => [1, 2, 3].map(g => ({ c, g, v: pct(apoyo(D.grados[g].niv[c]), D.grados[g].n) }))), peor = calor.reduce((a, b) => b.v > a.v ? b : a);
  S.push({ pasos: 4, html: () => `<h2>¿Qué grado necesita más apoyo?</h2><div class="eia-dos">
    <div><p class="eia-nota">Porcentaje de alumnos en «Requiere apoyo» o «Sin evidencias»</p><div class="eia-calor grande"><span></span>${C.map(c => `<b style="color:${CC[c]}">${c}</b>`).join('')}
    ${[1, 2, 3].map(g => `<b data-p="${g}">${ORD[g]}</b>${C.map(c => { const v = pct(apoyo(D.grados[g].niv[c]), D.grados[g].n); return `<span data-p="${g}" class="${peor.c === c && peor.g === g ? 'eia-peor' : ''}" style="background:rgba(200,64,58,${(v / 70).toFixed(2)});color:${v > 40 ? '#fff' : 'inherit'}">${v} %</span>`; }).join('')}`).join('')}</div></div>
    <div class="eia-ts">${[1, 2, 3].map(g => { const G = D.grados[g], w = C.reduce((a, c) => apoyo(G.niv[c]) > apoyo(G.niv[a]) ? c : a), b = C.reduce((a, c) => G.niv[c][3] > G.niv[a][3] ? c : a);
      return tarjeta(g, `${ORD[g]} · ${G.n} alumnos`, `<p>Donde más apoyo necesita: <b>${NC[w]}</b> (${pct(apoyo(G.niv[w]), G.n)} %).</p><p>Donde mejor le fue: <b>${NC[b]}</b>, con ${pct(G.niv[b][3], G.n)} % en aprendizaje desarrollado.</p>`, CC[w]); }).join('')}
    ${tarjeta(4, 'Focos rojos', `<p>El punto más preocupante es <b>${ORD[peor.g]} en ${NC[peor.c]}</b>: ${peor.v} % requiere apoyo.</p><p>Tercero es el grado con más alumnos en «Requiere apoyo» en los cuatro campos: es el que menos tiempo tiene antes de egresar.</p>`, '#C8403A')}</div></div>` });

  [1, 2, 3].forEach(gr => {
    const gg = gs.filter(g => g.grado === gr), extra = gr === 1 ? 1 : 0;
    S.push({ pasos: gg.length + 1 + extra, html: () => `<h2>${GRADO[gr]} grado por grupo</h2><div class="eia-dos">
      <div class="eia-grupos">${leyenda()}${gg.map((g, k) => `<div class="eia-gbloque" data-p="${k + 1}"><h4>${nomG(g.id)} <small>· ${g.n} alumnos</small></h4>${C.map(c => `<div class="eia-fila chica"><span class="eia-et" style="--c:${CC[c]}">${c}</span>${barra(g.niv[c])}</div>`).join('')}</div>`).join('')}</div>
      <div class="eia-ts">${gg.map((g, k) => { const w = C.reduce((a, c) => apoyo(g.niv[c]) > apoyo(g.niv[a]) ? c : a), ad = suma(C.map(c => g.niv[c][3]));
        return tarjeta(k + 1, `${nomG(g.id)}`, `<p>Requiere más apoyo en <b>${NC[w]}</b>: ${apoyo(g.niv[w])} de ${g.n} alumnos.</p><p>Resultados en aprendizaje desarrollado, sumando los cuatro campos: <b>${ad}</b> de ${g.n * 4}.</p><p class="eia-dato">Alumnos prioritarios: <b>${g.prioritarios}</b>.</p>`, CC[w]); }).join('')}
      ${tarjeta(gg.length + 1, 'Comparando grupos', `<p>Resultados en «Requiere apoyo», sumando los cuatro campos:</p><p>${gg.map(g => `<b>${nomG(g.id)}</b>: ${pct(suma(C.map(c => apoyo(g.niv[c]))), g.n * 4)} %`).join(' · ')}</p><p>La diferencia entre grupos del mismo grado nos dice dónde concentrar el acompañamiento.</p>`, '#16213F')}
      ${extra ? tarjeta(gg.length + 2, 'Un dato para revisar juntos', `<p>1.° I tiene más de la mitad del grupo en aprendizaje desarrollado en Lenguajes y en Saberes, mientras que 1.° G y 1.° H tienen menos del diez por ciento.</p><p>Puede ser un logro real, pero antes de concluirlo conviene revisar cómo se aplicó y se valoró. Lo vemos en la siguiente diapositiva.</p>`, '#E8893A') : ''}</div></div>` });
  });

  const tres = gs.map(g => ({ id: g.id, p: pct(g.dist[3], suma(g.dist)), c: pct(g.dist[0], suma(g.dist)) })), otros = tres.filter(t => t.id !== '1I');
  S.push({ pasos: 3, html: () => `<h2>¿Calificamos todos igual?</h2><div class="eia-dos">
    <div class="eia-barras">${leyendaV()}${gs.map(g => `<div class="eia-fila chica${g.id === '1I' ? ' eia-marca' : ''}" data-p="1"><span class="eia-et">${nomG(g.id)}</span>${barraV(g.dist)}</div>`).join('')}</div>
    <div class="eia-ts">${tarjeta(1, 'Todas las valoraciones de cero a tres', '<p>Cada barra junta todas las valoraciones que se dieron en el grupo, criterio por criterio.</p><p>El verde son los tres: respuestas que se consideraron logradas.</p>', CV[3])}
    ${tarjeta(2, 'Un grupo muy distinto', `<p>En <b>1.° I</b> no hay ninguna valoración de cero y <b>${tres.find(t => t.id === '1I').p} %</b> son tres.</p><p>En los demás grupos los tres van de ${Math.min(...otros.map(t => t.p))} a ${Math.max(...otros.map(t => t.p))} %.</p>`, '#E8893A')}
    ${tarjeta(3, 'No es para señalar a nadie', '<p>Es para <b>unificar criterios</b>: si cada quien lee la rúbrica a su manera, los resultados no se pueden comparar.</p><p>Propuesta: en academia, calificar juntos tres o cuatro respuestas reales antes de la siguiente aplicación.</p>', '#16213F')}</div></div>` });

  const SUG = {
    1: '<p>Armar en clase <b>esquemas, tablas e infografías</b> a partir de un texto, no solo resúmenes.</p><p>Practicar la <b>división con divisor de dos cifras</b> planteando primero el problema en palabras.</p><p>Pedir siempre que expliquen <b>por qué</b> una acción colectiva ayuda, no solo qué harían.</p>',
    2: '<p>Construir <b>gráficas con datos reales</b> del grupo, cuidando título, ejes y etiquetas.</p><p>Después de calcular la moda, pedir que <b>expliquen qué significa</b> para el problema.</p><p>Trabajar <b>propuestas colectivas</b> contra la violencia de género con argumentos.</p>',
    3: '<p><b>Área y perímetro de figuras compuestas</b> con planos reales: el salón, la cancha, la escuela.</p><p>Escribir <b>textos de divulgación</b> con su estructura completa y apoyarse en infografías.</p><p>En Tecnología, explicar cómo un <b>proceso técnico</b> abre o cierra oportunidades.</p>'
  };
  [1, 2, 3].forEach(gr => {
    const it = D.grados[gr].items.slice(0, 5);
    S.push({ pasos: it.length + 1, html: () => `<h2>${GRADO[gr]}: los aprendizajes que más costaron</h2><div class="eia-dos">
      <div class="eia-top"><p class="eia-nota">Porcentaje de alumnos con cero o uno</p>${it.map((i, k) => `<div class="eia-topf" data-p="${k + 1}"><span class="eia-it-c" style="background:${CC[i.campo]}">${i.campo}</span><span class="eia-topt">${esc(i.crit)}</span><span class="eia-it-b"><span class="eia-crece" style="--w:${i.p01}%;background:${i.p01 >= 60 ? '#C8403A' : '#E8893A'}"></span></span><b>${Math.round(i.p01)} %</b></div>`).join('')}</div>
      <div class="eia-ts">${it.map((i, k) => tarjeta(k + 1, esc(i.crit), `<p><b>${(t => t[0].toUpperCase() + t.slice(1))(deCada10(i.p01))} de cada diez</b> alumnos de ${GRADO[gr].toLowerCase()} sacaron cero o uno.</p><p class="eia-dato"><b>Aprendizaje:</b> ${esc(i.desc)}</p><p class="eia-dato">${NC[i.campo]}</p>`, CC[i.campo])).join('')}
      ${tarjeta(it.length + 1, 'Para el aula', SUG[gr], '#2E8B57')}</div></div>` });
  });

  const args = [1, 2, 3].flatMap(gr => D.grados[gr].items.filter(i => /argument/i.test(i.crit)).map(i => ({ ...i, gr }))).sort((a, b) => b.p01 - a.p01);
  S.push({ pasos: 2, html: () => `<h2>Lo que se repite: argumentar</h2><div class="eia-dos">
    <div class="eia-top" data-p="1"><p class="eia-nota">Criterios de argumentación · alumnos con cero o uno</p>${args.map(i => `<div class="eia-topf"><span class="eia-it-c" style="background:${CC[i.campo]}">${ORD[i.gr].split(' ')[0]}</span><span class="eia-topt">${esc(i.crit)}</span><span class="eia-it-b"><span class="eia-crece" style="--w:${i.p01}%;background:${i.p01 >= 50 ? '#C8403A' : '#E8893A'}"></span></span><b>${Math.round(i.p01)} %</b></div>`).join('')}</div>
    <div class="eia-ts">${tarjeta(1, 'En todos los grados y en varios campos', `<p>Argumentar aparece en ${args.length} criterios distintos: en Lenguajes, en Saberes y pensamiento científico, y en Ética, naturaleza y sociedades.</p><p>Nuestros alumnos <b>saben responder qué</b>, pero les cuesta <b>explicar por qué</b>.</p>`, CC.LEN)}
    ${tarjeta(2, 'Una estrategia de toda la escuela', '<p>Usar en todas las asignaturas la misma fórmula: <b>«Yo pienso que… porque… por ejemplo…»</b>.</p><p>Y una misma rúbrica corta: tiene postura, tiene razón, tiene evidencia.</p>', '#2E8B57')}</div></div>` });

  const totPri = suma(gs.map(g => g.prioritarios)), maxP = Math.max(...gs.map(g => g.prioritarios));
  S.push({ pasos: 2, html: () => `<h2>Alumnos prioritarios</h2><div class="eia-dos">
    <div class="eia-pri-g">${gs.map(g => `<button type="button" class="eia-pcol" data-p="1" data-ver="${g.id}"><b>${g.prioritarios}</b><span class="eia-pbar"><span style="--h:${g.prioritarios / maxP * 100}%"></span></span><em>${nomG(g.id)}</em></button>`).join('')}</div>
    <div class="eia-ts">${tarjeta(1, `${totPri} alumnos`, '<p>Quedaron en «Requiere apoyo» o «Sin evidencias» en <b>tres o cuatro</b> de los cuatro campos formativos.</p><p>Toca una columna para ver los nombres del grupo.</p>', '#C8403A')}
    ${tarjeta(2, '¿Qué hacemos con ellos?', '<p>Cada tutor recibe su lista impresa.</p><p>Seguimiento cercano en el aula, revisión con sus maestros, y en su caso, plática con la familia.</p><p>Se cruzan con asistencia y reportes de conducta que ya están en la plataforma.</p>', '#16213F')}</div></div>` });

  const sinR = suma(gs.map(g => g.sinResultado.length)), falt = suma(gs.map(g => g.faltoUno));
  S.push({ pasos: 2, html: () => `<h2>Antes de sacar conclusiones</h2><div class="eia-dos">
    <div class="eia-rev grande"><div data-p="1"><b>${sinR}</b><span>números de lista sin resultado en los reportes</span></div><div data-p="2"><b>${falt}</b><span>alumnos con cero en todo un ejercicio</span></div></div>
    <div class="eia-ts">${tarjeta(1, 'Alumnos que no aparecen', `<p>En los reportes faltan ${sinR} números de lista: no presentaron o no se capturaron.</p><p>Ellos no tienen diagnóstico: hay que valorarlos en el aula.</p>`, '#9A8F80')}
    ${tarjeta(2, 'Ceros por inasistencia', `<p>${falt} alumnos tienen cero en todo el EIA uno o en todo el EIA dos. Lo más probable es que faltaran ese día.</p><p>Su nivel puede estar por debajo de lo que realmente saben.</p>`, '#9A8F80')}</div></div>` });

  const PROP = [
    ['Argumentar en todas las materias', '«Yo pienso que… porque… por ejemplo…» y una rúbrica corta común.', CC.LEN],
    ['Leer y hacer textos discontinuos', 'Tablas, esquemas e infografías. Una lectura al mes de Raíces y Estrellas con texto discontinuo.', CC.LEN],
    ['Matemáticas con datos reales', 'Gráficas con datos del grupo, división con dos cifras y, en tercero, área y perímetro con planos de la escuela.', CC.SPC],
    ['Convivencia y derechos en el aula', 'Propuestas colectivas contra la violencia y el maltrato, de la mano de Formación Cívica y Tutoría.', CC.ENS],
    ['Seguimiento a prioritarios', 'Lista para cada tutor, revisión quincenal y contacto con la familia cuando haga falta.', CC.HYC],
    ['Calificar igual', 'Calibrar la rúbrica en academia con respuestas reales antes de la siguiente aplicación.', '#E8893A']
  ];
  S.push({ pasos: PROP.length, html: () => `<h2>Propuestas para trabajar</h2><div class="eia-props">${PROP.map(([t, d, c], k) => `<div class="eia-prop" data-p="${k + 1}" style="--c:${c}"><span>${k + 1}</span><b>${t}</b><p>${d}</p></div>`).join('')}</div>` });

  S.push({ pasos: 3, html: () => `<h2>Para el colectivo</h2><div class="eia-pregs">
    <div data-p="1"><span>1</span><p>¿Qué aprendizaje de esta lista trabajo yo en mi asignatura, aunque no sea mi campo?</p></div>
    <div data-p="2"><span>2</span><p>¿Qué acuerdo concreto podemos tomar hoy como academia para la próxima semana?</p></div>
    <div data-p="3"><span>3</span><p>¿Cómo vamos a saber, en la siguiente aplicación, si funcionó?</p></div></div>` });

  S.push({ pasos: 0, html: () => `<div class="eia-portada fin"><h1>Gracias</h1><p class="eia-sub">Los resultados por grupo, por alumno y por aprendizaje están en la plataforma, en Convivencia y familias, pestaña «Resultados EIA».</p>
    <p class="eia-k">Análisis elaborado con apoyo de inteligencia artificial a partir de los reportes oficiales de la SEP.</p></div>` });
  return S;
}

function presentar() {
  const S = diapositivas();
  let i = 0, paso = 0;
  const ov = document.createElement('div'); ov.className = 'eia-pres'; ov.tabIndex = -1;
  ov.innerHTML = `<div class="eia-marco"><div class="eia-escena" id="eia-esc"></div></div>
    <div class="eia-ctrl"><button type="button" data-a="salir" title="Salir (Esc)">✕</button><button type="button" data-a="pant" title="Pantalla completa (F)">⛶</button>
    <span class="eia-prog"><span id="eia-prog"></span></span><span id="eia-num"></span>
    <button type="button" data-a="ant" title="Anterior">◀</button><button type="button" data-a="sig" class="sig" title="Siguiente">Siguiente ▶</button></div><div id="eia-lista" class="eia-lista" hidden></div>`;
  document.body.appendChild(ov); document.body.classList.add('eia-presentando');
  const esc$ = ov.querySelector('#eia-esc');
  const ajustar = () => { const m = ov.querySelector('.eia-marco'), s = Math.min(m.clientWidth / 1280, m.clientHeight / 720); esc$.style.transform = `translate(-50%,-50%) scale(${s})`; };
  const aplicar = () => {
    esc$.querySelectorAll('[data-p]').forEach(e => e.classList.toggle('on', paso >= +e.dataset.p));
    esc$.querySelectorAll('[data-solo]').forEach(e => e.classList.toggle('on', paso === +e.dataset.solo));
    const pAct = esc$.querySelectorAll(`[data-p="${paso}"]`); pAct.forEach(e => { e.classList.remove('act'); void e.offsetWidth; e.classList.add('act'); });
    const totP = suma(S.map(s => s.pasos + 1)), hecho = suma(S.slice(0, i).map(s => s.pasos + 1)) + paso + 1;
    ov.querySelector('#eia-prog').style.width = `${hecho / totP * 100}%`;
    ov.querySelector('#eia-num').textContent = `${i + 1} / ${S.length}`;
  };
  const pintar = () => {
    esc$.innerHTML = `<section class="eia-d">${S[i].html()}</section>`;
    esc$.querySelectorAll('[data-cuenta]').forEach(b => { const fin = +b.dataset.cuenta, t0 = performance.now(); const f = t => { const k = Math.min(1, (t - t0) / 1200); b.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    esc$.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); verLista(b.dataset.ver); }));
    requestAnimationFrame(aplicar);
  };
  const verLista = id => {
    const box = ov.querySelector('#eia-lista');
    const al = alumnos ? deGrupo(id).filter(esPrioritario) : null;
    box.innerHTML = `<div><h3>Prioritarios de ${nomG(id)}</h3>${al ? (al.length ? `<ol>${al.map(a => `<li><b>${a.n}.</b> ${esc(titulo(a.nombre))} <span>${C.map(c => chip(a.niv[c])).join('')}</span></li>`).join('')}</ol>` : '<p>Ninguno.</p>') : '<p>🔒 Abre la lista de alumnos con la clave en la pestaña para ver los nombres.</p>'}<button type="button" class="btn oro chico">Cerrar</button></div>`;
    box.hidden = false; box.querySelector('button').addEventListener('click', () => { box.hidden = true; });
  };
  const sig = () => { if (paso < S[i].pasos) { paso++; aplicar(); } else if (i < S.length - 1) { i++; paso = 0; pintar(); } };
  const ant = () => { if (paso > 0) { paso--; aplicar(); } else if (i > 0) { i--; paso = S[i].pasos; pintar(); } };
  const salir = () => { removeEventListener('keydown', tecla); removeEventListener('resize', ajustar); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); ov.remove(); document.body.classList.remove('eia-presentando'); };
  const pant = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else ov.requestFullscreen?.().catch(() => {}); };
  const tecla = e => {
    if (!ov.querySelector('#eia-lista').hidden) { if (e.key === 'Escape') ov.querySelector('#eia-lista').hidden = true; return; }
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); sig(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); ant(); }
    else if (e.key === 'Escape' && !document.fullscreenElement) salir();
    else if (e.key === 'f' || e.key === 'F') pant();
  };
  ov.querySelector('[data-a=sig]').addEventListener('click', sig);
  ov.querySelector('[data-a=ant]').addEventListener('click', ant);
  ov.querySelector('[data-a=salir]').addEventListener('click', salir);
  ov.querySelector('[data-a=pant]').addEventListener('click', pant);
  // Tocar la diapositiva avanza (lado derecho) o regresa (lado izquierdo); deslizar también.
  let x0 = null;
  ov.querySelector('.eia-marco').addEventListener('pointerdown', e => { x0 = e.clientX; });
  ov.querySelector('.eia-marco').addEventListener('pointerup', e => {
    if (x0 == null || e.target.closest('[data-ver],button')) { x0 = null; return; }
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) { if (dx < 0) sig(); else ant(); }
    else if (e.clientX > innerWidth * .4) sig(); else ant();
  });
  addEventListener('keydown', tecla); addEventListener('resize', ajustar);
  document.addEventListener('fullscreenchange', () => setTimeout(ajustar, 60));
  ajustar(); pintar(); ov.focus();
}
