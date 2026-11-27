/* Raíces y Estrellas · Resultados EIA (Ejercicios Integradores del Aprendizaje, Fase 6)
   Pestaña del área «Convivencia y familias»: resumen, por grupo, aprendizajes, alumnos prioritarios,
   datos a revisar y una presentación para el Consejo Técnico que se arma paso a paso.
   Los totales vienen en eia-datos.js; la lista de alumnos va cifrada (AES-GCM) y se abre con la clave,
   que se guarda en reportes/_eia/privado/clave (solo la cuenta directiva la puede leer). */
import { EIA, EIA_PREV } from './eia-datos.js?v=2026112702';
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

/* ---------- Comparativos con el estado y cruces con la plataforma ---------- */
const R = EIA.ref;
const pctNiv = (niv, n) => niv.map(x => Math.round(x / n * 100));
const escCampo = c => pctNiv(EIA.niv[c], EIA.n);
const escGrado = (g, c) => pctNiv(EIA.grados[g].niv[c], EIA.grados[g].n);
const ap = v => v[0] + v[1];              // % en Sin evidencias + Requiere apoyo
const norm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-zñ ]/g, ' ').replace(/\s+/g, ' ').trim();
function cobertura() {
  const m = ctx?.matricula || {};
  const filas = EIA.grupos.map(g => ({ id: g.id, ev: g.n, mat: m[g.id] || 0 }));
  const ev = suma(filas.map(f => f.ev)), mat = suma(filas.map(f => f.mat));
  return { filas, ev, mat, ok: mat >= ev && filas.every(f => f.mat >= f.ev * .8) };
}
let cacheCruce = null;
function cruces() {
  if (!alumnos || !ctx?.plat) return null;
  if (cacheCruce) return cacheCruce;
  const porG = {}; ctx.plat.forEach(a => (porG[a.g] ||= []).push({ ...a, k: norm(a.nombre), t: new Set(norm(a.nombre).split(' ')) }));
  const unir = a => { const L = porG[a.g] || [], k = norm(a.nombre); let m = L.find(x => x.k === k); if (m) return m;
    const t = k.split(' '); let mejor = null, best = 0; L.forEach(x => { const n = t.filter(w => x.t.has(w)).length; if (n > best) { best = n; mejor = x; } }); return best >= Math.min(3, t.length) ? mejor : null; };
  const filas = alumnos.map(a => { const m = unir(a); return { a, lect: m?.lectura ?? null, rep: ctx.reportesDe(a.nombre, a.g), pri: esPrioritario(a), pts: suma(Object.values(a.v)) / Object.keys(a.v).length }; });
  const conL = filas.filter(f => f.lect != null);
  const promDe = A => A.length ? Math.round(suma(A) / A.length * 10) / 10 : null;
  const porNivelLEN = Object.fromEntries(L.map(l => [l, promDe(conL.filter(f => f.a.niv.LEN === l).map(f => f.lect))]));
  const corr = (() => { const n = conL.length; if (n < 8) return null; const x = conL.map(f => f.pts), y = conL.map(f => f.lect), mx = suma(x) / n, my = suma(y) / n;
    const sxy = suma(x.map((v, k) => (v - mx) * (y[k] - my))), sx = Math.sqrt(suma(x.map(v => (v - mx) ** 2))), sy = Math.sqrt(suma(y.map(v => (v - my) ** 2))); return sx && sy ? Math.round(sxy / sx / sy * 100) / 100 : null; })();
  const pri = filas.filter(f => f.pri), noPri = filas.filter(f => !f.pri);
  cacheCruce = { n: filas.length, conL: conL.length, porNivelLEN, corr,
    priLectRoja: pri.filter(f => f.lect != null && f.lect < 6).length, priConLect: pri.filter(f => f.lect != null).length,
    restoLectRoja: noPri.filter(f => f.lect != null && f.lect < 6).length, restoConLect: noPri.filter(f => f.lect != null).length,
    priConRep: pri.filter(f => f.rep > 0).length, nPri: pri.length, restoConRep: noPri.filter(f => f.rep > 0).length, nResto: noPri.length,
    repPri: promDe(pri.map(f => f.rep)), repResto: promDe(noPri.map(f => f.rep)) };
  return cacheCruce;
}
const fuerza = r => r == null ? '' : Math.abs(r) >= .5 ? 'fuerte' : Math.abs(r) >= .3 ? 'moderada' : 'débil';
const PCT = n => n == null ? '—' : `${n} %`;
function metas() {
  const M = [];
  [1, 2, 3].forEach(g => C.forEach(c => { const e = ap(escGrado(g, c)), s = ap(R.grado[g][c]); if (e - s >= 8) M.push({ g, c, e, s }); }));
  return M.sort((a, b) => (b.e - b.s) - (a.e - a.s));
}

/* ---------- Pestaña ---------- */
export async function tabEIA(c) {
  ctx = c;
  const p = ctx.panel;
  if (!alumnos) await intentarAbrir();
  const SUBS = [['resumen', 'Resumen'], ['comp', 'Frente al estado'], ['grupo', 'Por grupo'], ['aprend', 'Aprendizajes'], ['prior', 'Alumnos prioritarios'], ['cruces', 'Lectura y conducta'], ['revisar', 'Datos a revisar']];
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
  ({ resumen: vResumen, comp: vComp, grupo: vGrupo, aprend: vAprend, prior: vPrior, cruces: vCruces, revisar: vRevisar })[sub](p.querySelector('#eia-cuerpo'));
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

function vComp(el) {
  const fila = (t, v, marca = '') => `<div class="eia-fila chica2${marca}"><span class="eia-et">${t}</span>${barraPct(v)}</div>`;
  el.innerHTML = `<div class="tarjeta"><h3>Nuestra escuela frente al estado y la zona</h3><p class="ayuda">Fuente: ${esc(R.fuente)}. Zona escolar de secundarias técnicas ${R.zona.clave}.</p>${leyenda()}
    ${C.map(c => `<h4 class="eia-h4" style="color:${CC[c]}">${NC[c]}</h4>${fila('Nuestra escuela', escCampo(c), ' esc')}${fila('Técnicas del estado', R.tecnicas[c])}${fila('Secundarias del municipio', R.municipio[c])}${fila('Zona escolar', R.zona[c])}
      <p class="ayuda">Requiere apoyo: nosotros ${ap(escCampo(c))} %, técnicas del estado ${ap(R.tecnicas[c])} %, zona ${ap(R.zona[c])} %. Aprendizaje desarrollado: nosotros ${escCampo(c)[3]} %, estado ${R.tecnicas[c][3]} %, zona ${R.zona[c][3]} %.</p>`).join('')}</div>
    <div class="tarjeta"><h3>Cada grado frente al mismo grado en el estado</h3><p class="ayuda">Porcentaje en «Requiere apoyo» o «Sin evidencias». En rojo, donde estamos ocho puntos o más arriba del estado; en verde, donde estamos mejor.</p>
    <div class="eia-calor"><span></span>${C.map(c => `<b style="color:${CC[c]}">${c}</b>`).join('')}
    ${[1, 2, 3].map(g => `<b>${ORD[g]}</b>${C.map(c => { const e = ap(escGrado(g, c)), s = ap(R.grado[g][c]), d = e - s; return `<span class="${d >= 8 ? 'eia-mal' : d <= -3 ? 'eia-bien' : ''}">${e} % <small>estado ${s} %</small></span>`; }).join('')}`).join('')}</div></div>
    <div class="tarjeta"><h3>Lo que la SEDUC recomienda para secundaria</h3>${C.map(c => `<p><b style="color:${CC[c]}">${NC[c]}:</b> ${esc(R.recom[c])}</p>`).join('')}</div>
    <div class="tarjeta"><h3>Metas para la siguiente aplicación</h3><p class="ayuda">Donde estamos ocho puntos o más arriba del estado en «Requiere apoyo», la meta es llegar al promedio estatal.</p>
    ${metas().map(m => `<p>• <b>${ORD[m.g]}, ${NC[m.c]}:</b> bajar de ${m.e} % a ${m.s} % que requiere apoyo.</p>`).join('') || '<p>Estamos dentro del promedio estatal en todos los grados.</p>'}</div>`;
}
function vCruces(el) {
  const cb = cobertura(), X = cruces();
  el.innerHTML = `<div class="tarjeta"><h3>Cobertura: cuántos presentaron</h3>${cb.ok ? `<p class="ayuda">Matrícula actual de la plataforma (noviembre) contra alumnos con resultado en septiembre.</p>
    ${cb.filas.map(f => `<div class="eia-fila chica2"><span class="eia-et">${nomG(f.id)}</span><span class="eia-it-b" style="height:22px"><span style="width:${Math.min(100, pct(f.ev, f.mat))}%;background:#2E8B57"></span></span><b style="min-width:7rem;text-align:right">${f.ev} de ${f.mat} · ${pct(f.ev, f.mat)} %</b></div>`).join('')}
    <p><b>Total: ${cb.ev} de ${cb.mat} alumnos (${pct(cb.ev, cb.mat)} %).</b></p>` : '<p class="ayuda">No se pudo leer la matrícula.</p>'}</div>
    <div class="tarjeta"><h3>Comprensión lectora y EIA</h3>${X ? `<p class="ayuda">Promedio de lectura en Raíces y Estrellas (de cero a diez) según el nivel en Lenguajes de los EIA. Se pudieron cruzar ${X.conL} de ${X.n} alumnos.</p>
      ${L.filter(l => X.porNivelLEN[l] != null).map(l => `<div class="eia-fila chica2"><span class="eia-et" style="--c:${CL[l]}">${NL[l]}</span><span class="eia-it-b" style="height:22px"><span style="width:${X.porNivelLEN[l] * 10}%;background:${CL[l]}"></span></span><b style="min-width:3rem;text-align:right">${X.porNivelLEN[l]}</b></div>`).join('')}
      ${X.corr != null ? `<p>Relación entre el resultado de los EIA y la lectura: <b>${fuerza(X.corr)}</b> (coeficiente ${X.corr}).</p>` : ''}
      <p>De los prioritarios con calificación de lectura, <b>${X.priLectRoja} de ${X.priConLect}</b> están en rojo (menos de seis). En el resto de los alumnos son ${X.restoLectRoja} de ${X.restoConLect}.</p>` : '<p class="ayuda">🔒 Abre la lista de alumnos con la clave para hacer el cruce.</p>'}</div>
    <div class="tarjeta"><h3>Conducta y EIA</h3>${X ? `<p><b>${X.priConRep} de ${X.nPri}</b> alumnos prioritarios tienen al menos un reporte de conducta (${pct(X.priConRep, X.nPri)} %). En el resto: ${X.restoConRep} de ${X.nResto} (${pct(X.restoConRep, X.nResto)} %).</p>
      <p>Reportes por alumno: prioritarios ${X.repPri ?? 0}, resto ${X.repResto ?? 0}.</p><p class="ayuda">Los reportes salen de lo registrado en la plataforma en este ciclo.</p>` : '<p class="ayuda">🔒 Abre la lista de alumnos con la clave para hacer el cruce.</p>'}</div>`;
}
function barraPct(v) { return `<div class="eia-barra">${v.map((n, k) => n ? `<span class="eia-seg" style="--w:${n}%;background:${CL[L[k]]}" title="${NL[L[k]]}: ${n} %">${n >= 8 ? n + ' %' : ''}</span>` : '').join('')}</div>`; }

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

  const cb = cobertura();
  if (cb.ok) S.push({ pasos: 2, html: () => `<h2>¿Cuántos presentaron?</h2><div class="eia-dos">
    <div class="eia-barras" data-p="1">${cb.filas.map(f => `<div class="eia-fila chica"><span class="eia-et">${nomG(f.id)}</span><span class="eia-it-b" style="height:26px"><span class="eia-crece" style="--w:${Math.min(100, pct(f.ev, f.mat))}%;background:#2E8B57"></span></span></div><p class="eia-nota" style="margin:-2px 0 6px 82px">${f.ev} de ${f.mat} alumnos · ${pct(f.ev, f.mat)} %</p>`).join('')}</div>
    <div class="eia-ts">${tarjeta(1, `${cb.ev} de ${cb.mat} alumnos`, `<p>Presentó el <b>${pct(cb.ev, cb.mat)} %</b> de la matrícula actual del turno.</p><p class="eia-dato">Matrícula de la plataforma en noviembre; puede variar un poco por altas y bajas desde septiembre.</p>`, '#2E8B57')}
    ${tarjeta(2, 'Los que faltan', `<p>Los grupos con menos cobertura fueron ${cb.filas.slice().sort((a, b) => pct(a.ev, a.mat) - pct(b.ev, b.mat)).slice(0, 2).map(f => `<b>${nomG(f.id)}</b> (${pct(f.ev, f.mat)} %)`).join(' y ')}.</p><p>Los alumnos sin resultado no tienen diagnóstico: hay que valorarlos en el aula.</p>`, '#9A8F80')}</div></div>` });

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

  S.push({ pasos: 5, html: () => `<h2>¿Cómo estamos frente al estado y la zona?</h2><div class="eia-dos">
    <div class="eia-comp">${leyenda()}${C.map((c, k) => `<div data-p="${k + 1}"><h4 style="color:${CC[c]}">${NC[c]}</h4>
      <div class="eia-fila chica3"><span class="eia-et">Nosotros</span>${barraPct(escCampo(c))}</div><div class="eia-fila chica3"><span class="eia-et">Técnicas del estado</span>${barraPct(R.tecnicas[c])}</div><div class="eia-fila chica3"><span class="eia-et">Zona escolar</span>${barraPct(R.zona[c])}</div></div>`).join('')}</div>
    <div class="eia-ts">${C.map((c, k) => { const e = ap(escCampo(c)), t = ap(R.tecnicas[c]), z = ap(R.zona[c]);
      return tarjeta(k + 1, NC[c], `<p>Requiere apoyo: <b>nosotros ${e} %</b>, técnicas del estado ${t} %, zona ${z} %.</p><p>Aprendizaje desarrollado: <b>nosotros ${escCampo(c)[3]} %</b>, estado ${R.tecnicas[c][3]} %, zona ${R.zona[c][3]} %.</p>`, CC[c]); }).join('')}
    ${tarjeta(5, 'En resumen', `<p>Frente a las técnicas del estado estamos <b>${(m => m <= 3 ? 'parejos' : `hasta ${m} puntos arriba`)(Math.max(...C.map(c => ap(escCampo(c)) - ap(R.tecnicas[c]))))}</b> en «Requiere apoyo».</p><p>Frente a nuestra zona tenemos <b>entre ${Math.min(...C.map(c => ap(escCampo(c)) - ap(R.zona[c])))} y ${Math.max(...C.map(c => ap(escCampo(c)) - ap(R.zona[c])))} puntos más</b> en «Requiere apoyo», y en Ética, naturaleza y sociedades tenemos muy pocos alumnos en desarrollado: ${escCampo('ENS')[3]} % contra ${R.tecnicas.ENS[3]} % del estado.</p>`, '#16213F')}</div></div>` });

  S.push({ pasos: 4, html: () => `<h2>Cada grado frente al estado</h2><div class="eia-dos">
    <div><p class="eia-nota">«Requiere apoyo» en nuestra escuela y, abajo, en las secundarias del estado</p><div class="eia-calor grande comp"><span></span>${C.map(c => `<b style="color:${CC[c]}">${c}</b>`).join('')}
    ${[1, 2, 3].map(g => `<b data-p="${g}">${ORD[g]}</b>${C.map(c => { const e = ap(escGrado(g, c)), s = ap(R.grado[g][c]), d = e - s; return `<span data-p="${g}" class="${d >= 8 ? 'eia-mal' : d <= -3 ? 'eia-bien' : ''}">${e} %<small>estado ${s} %</small></span>`; }).join('')}`).join('')}</div></div>
    <div class="eia-ts">${[1, 2, 3].map(g => { const D = C.map(c => ({ c, d: ap(escGrado(g, c)) - ap(R.grado[g][c]) }));
      const peor = D.reduce((a, b) => b.d > a.d ? b : a), mejor = D.reduce((a, b) => b.d < a.d ? b : a);
      return tarjeta(g, ORD[g], `<p>${peor.d >= 8 ? `Más abajo que el estado en <b>${NC[peor.c]}</b>: ${peor.d} puntos más en «Requiere apoyo».` : 'Dentro del promedio estatal o mejor en los cuatro campos.'}</p>${mejor.d < 0 ? `<p>Mejor que el estado en <b>${NC[mejor.c]}</b> (${-mejor.d} puntos menos).</p>` : ''}`, peor.d >= 8 ? '#C8403A' : '#2E8B57'); }).join('')}
    ${tarjeta(4, 'La alerta está en tercero', `<p>Tercero está por encima del estado en los cuatro campos; en Saberes, ${ap(escGrado(3, 'SPC'))} % contra ${ap(R.grado[3].SPC)} %.</p><p>La SEDUC también marca a tercero de secundaria en Saberes como la principal señal de alerta del estado.</p>`, '#C8403A')}</div></div>` });

  /* ---- Comparativa con el ciclo 2025-2026 ---- */
  const PV = EIA_PREV, dif = c => ap(escCampo(c)) - ap(PV.niv[c]);
  const bajo = C.filter(c => dif(c) <= -3), subio = C.filter(c => dif(c) >= 3), lista = a => a.map(c => NC[c]).join(a.length > 2 ? ', ' : ' y ').replace(/, ([^,]*)$/, ' y $1');
  S.push({ pasos: 5, html: () => `<h2>¿Cómo veníamos el ciclo pasado?</h2><div class="eia-dos">
    <div class="eia-comp">${leyenda()}${C.map((c, k) => `<div data-p="${k + 1}"><h4 style="color:${CC[c]}">${NC[c]}</h4>
      <div class="eia-fila chica3"><span class="eia-et">2025-2026</span>${barraPct(PV.niv[c])}</div><div class="eia-fila chica3"><span class="eia-et">2026-2027</span>${barraPct(escCampo(c))}</div></div>`).join('')}</div>
    <div class="eia-ts">${C.map((c, k) => { const a = ap(PV.niv[c]), b = ap(escCampo(c)), d = b - a;
      return tarjeta(k + 1, NC[c], `<p>Requiere apoyo: <b>${a} %</b> el ciclo pasado y <b>${b} %</b> este ciclo.</p><p>${d <= -3 ? `Bajó ${-d} puntos: menos alumnos necesitan apoyo.` : d >= 3 ? `Subió ${d} puntos: más alumnos necesitan apoyo.` : 'Prácticamente igual.'}</p><p class="eia-dato">Aprendizaje desarrollado: ${PV.niv[c][3]} % antes, ${escCampo(c)[3]} % ahora.</p>`, d >= 3 ? '#C8403A' : d <= -3 ? '#2E8B57' : CC[c]); }).join('')}
    ${tarjeta(5, 'Como escuela', `${bajo.length ? `<p>Bajó «Requiere apoyo» en <b>${lista(bajo)}</b>.</p>` : ''}${subio.length ? `<p>Subió en <b>${lista(subio)}</b>.</p>` : ''}<p>Y en los cuatro campos hay más alumnos con el aprendizaje desarrollado.</p><p class="eia-dato">Ojo: son ejercicios distintos y otros alumnos. El ciclo pasado se evaluó a ${PV.n} alumnos y este a ${EIA.n}.</p>`, '#16213F')}</div></div>` });

  const GEN = [[1, 2], [2, 3]];
  const filaGen = (g0, g1, c) => { const a = ap(PV.grados[g0].niv[c]), b = ap(escGrado(g1, c)), d = b - a, col = d >= 5 ? '#C8403A' : d <= -5 ? '#2E8B57' : '#9A8F80';
    return `<div style="display:grid;grid-template-columns:.6fr .7fr .7fr .9fr;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid #E6DED0"><span style="font-weight:800;color:${CC[c]}" title="${NC[c]}">${c}</span><span>${a} %</span><span><b>${b} %</b></span><span style="background:${col};color:#fff;border-radius:999px;padding:3px 10px;text-align:center;font-weight:700">${d > 0 ? '+' : ''}${d} pts</span></div>`; };
  const genTxt = (g0, g1) => { const m = C.filter(c => ap(escGrado(g1, c)) - ap(PV.grados[g0].niv[c]) <= -5), p = C.filter(c => ap(escGrado(g1, c)) - ap(PV.grados[g0].niv[c]) >= 5); return { m, p }; };
  const G2 = genTxt(1, 2), G3 = genTxt(2, 3);
  S.push({ pasos: 3, html: () => `<h2>La misma generación, un año después</h2><div class="eia-dos">
    <div>${GEN.map(([g0, g1], k) => `<div data-p="${k + 1}" style="margin-bottom:12px"><h4 style="margin:0 0 4px">${ORD[g0]} de 2025-2026 que hoy es ${ORD[g1]}</h4><div style="display:grid;grid-template-columns:.6fr .7fr .7fr .9fr;gap:8px;font-size:.8em;color:#8A7F70"><span>Campo</span><span>2025-2026</span><span>2026-2027</span><span>Diferencia</span></div>${C.map(c => filaGen(g0, g1, c)).join('')}</div>`).join('')}</div>
    <div class="eia-ts">${tarjeta(1, 'La generación de segundo avanzó', `<p>${G2.m.length ? `Menos alumnos en «Requiere apoyo» en <b>${lista(G2.m)}</b>.` : 'Se mantuvo estable.'}${G2.p.length ? ` Pero subió en <b>${lista(G2.p)}</b>.` : ''}</p><p>Lo que se hizo con ellos el año pasado funcionó: vale la pena saber qué fue.</p>`, '#2E8B57')}
    ${tarjeta(2, 'La generación de tercero retrocedió', `<p>Más alumnos en «Requiere apoyo» en <b>${lista(G3.p)}</b>.</p>${G3.m.length ? `<p>En ${lista(G3.m)} mejoró un poco, pero sigue siendo el campo más difícil.</p>` : ''}<p>Es la alerta de la escuela: les queda un solo ciclo.</p>`, '#C8403A')}
    ${tarjeta(3, 'Cuidado al comparar', `<p>Cada grado responde un ejercicio distinto, y el ciclo pasado presentaron ${PV.grados[2].n} alumnos de segundo; este ciclo, ${EIA.grados[3].n} de tercero.</p><p>Es una señal para investigar, no una conclusión.</p>`, '#9A8F80')}</div></div>` });

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

  S.push({ pasos: 4, html: () => `<h2>Lo que pide la SEDUC para secundaria</h2><div class="eia-props dos">${C.map((c, k) => `<div class="eia-prop" data-p="${k + 1}" style="--c:${CC[c]}"><span>${c}</span><b>${NC[c]}</b><p>${esc(R.recom[c])}</p></div>`).join('')}</div>
    <p class="eia-nota" style="margin-top:14px">Coincide con lo que encontramos: argumentar, leer y producir textos, resolver problemas con datos reales y proponer acciones en la comunidad.</p>` });

  const totPri = suma(gs.map(g => g.prioritarios)), maxP = Math.max(...gs.map(g => g.prioritarios));
  S.push({ pasos: 2, html: () => `<h2>Alumnos prioritarios</h2><div class="eia-dos">
    <div class="eia-pri-g">${gs.map(g => `<button type="button" class="eia-pcol" data-p="1" data-ver="${g.id}"><b>${g.prioritarios}</b><span class="eia-pbar"><span style="--h:${g.prioritarios / maxP * 100}%"></span></span><em>${nomG(g.id)}</em></button>`).join('')}</div>
    <div class="eia-ts">${tarjeta(1, `${totPri} alumnos`, '<p>Quedaron en «Requiere apoyo» o «Sin evidencias» en <b>tres o cuatro</b> de los cuatro campos formativos.</p><p>Toca una columna para ver los nombres del grupo.</p>', '#C8403A')}
    ${tarjeta(2, '¿Qué hacemos con ellos?', '<p>Cada tutor recibe su lista impresa.</p><p>Seguimiento cercano en el aula, revisión con sus maestros, y en su caso, plática con la familia.</p><p>Se cruzan con asistencia y reportes de conducta que ya están en la plataforma.</p>', '#16213F')}</div></div>` });

  S.push({ pasos: 3, html: () => { const X = cruces(); if (!X) return `<h2>Lectura, conducta y EIA</h2><p class="eia-nota">🔒 Abre la lista de alumnos con la clave en la pestaña para ver este cruce.</p>`;
    return `<h2>Lectura, conducta y EIA</h2><div class="eia-dos">
    <div><p class="eia-nota" data-p="1">Promedio de lectura en Raíces y Estrellas según el nivel en Lenguajes</p><div class="eia-barras" data-p="1">${L.filter(l => X.porNivelLEN[l] != null).map(l => `<div class="eia-fila chica3"><span class="eia-et" style="--c:${CL[l]}">${NL[l]}</span><span class="eia-it-b" style="height:30px"><span class="eia-crece" style="--w:${X.porNivelLEN[l] * 10}%;background:${CL[l]}"></span></span></div><p class="eia-nota" style="margin:-4px 0 8px 200px"><b>${X.porNivelLEN[l]}</b> de diez</p>`).join('')}</div>
      <div class="eia-rev grande" style="margin-top:10px"><div data-p="3"><b>${X.priConRep} de ${X.nPri}</b><span>prioritarios con reportes de conducta</span></div></div></div>
    <div class="eia-ts">${tarjeta(1, X.corr != null && X.corr >= .3 ? 'Lectura y EIA van de la mano' : 'Lectura y EIA', `<p>${X.corr == null ? 'Todavía hay pocos alumnos con calificación de lectura para medir la relación.' : X.corr >= .3 ? `Entre más alto el nivel en Lenguajes, más alto el promedio de lectura: la relación es <b>${fuerza(X.corr)}</b>.` : `La relación entre los EIA y la lectura es <b>${fuerza(X.corr)}</b>: miden cosas distintas y se complementan.`}</p><p class="eia-dato">Se cruzaron ${X.conL} de ${X.n} alumnos con sus calificaciones de Raíces y Estrellas.</p>`, CC.LEN)}
    ${tarjeta(2, 'Los prioritarios leen con más dificultad', `<p><b>${X.priLectRoja} de ${X.priConLect}</b> prioritarios están en rojo en lectura, contra ${X.restoLectRoja} de ${X.restoConLect} del resto.</p><p>La estrategia lectora es una vía directa para apoyarlos.</p>`, '#C8403A')}
    ${tarjeta(3, 'Y la conducta', `<p>${pct(X.priConRep, X.nPri)} % de los prioritarios tiene reportes, contra ${pct(X.restoConRep, X.nResto)} % del resto.</p><p>El acompañamiento tiene que ser académico y de convivencia a la vez: tutor, familia y Subdirección.</p>`, CC.HYC)}</div></div>`; } });

  const M = metas();
  S.push({ pasos: Math.min(M.length, 6), html: () => `<h2>Metas para la siguiente aplicación</h2><p class="eia-nota">Llegar al promedio estatal donde hoy estamos ocho puntos o más arriba en «Requiere apoyo»</p>
    <div class="eia-metas">${M.slice(0, 6).map((m, k) => `<div data-p="${k + 1}"><b style="color:${CC[m.c]}">${ORD[m.g]} · ${NC[m.c]}</b><span class="eia-meta-n"><em>${m.e} %</em> hoy <i>→</i> <em class="ok">${m.s} %</em> meta</span></div>`).join('')}</div>` });

  const sinR = suma(gs.map(g => g.sinResultado.length)), falt = suma(gs.map(g => g.faltoUno));
  S.push({ pasos: 2, html: () => `<h2>Antes de sacar conclusiones</h2><div class="eia-dos">
    <div class="eia-rev grande"><div data-p="1"><b>${sinR}</b><span>números de lista sin resultado en los reportes</span></div><div data-p="2"><b>${falt}</b><span>alumnos con cero en todo un ejercicio</span></div></div>
    <div class="eia-ts">${tarjeta(1, 'Alumnos que no aparecen', `<p>En los reportes faltan ${sinR} números de lista: no presentaron o no se capturaron.</p><p>Ellos no tienen diagnóstico: hay que valorarlos en el aula.</p>`, '#9A8F80')}
    ${tarjeta(2, 'Ceros por inasistencia', `<p>${falt} alumnos tienen cero en todo el EIA uno o en todo el EIA dos. Lo más probable es que faltaran ese día.</p><p>Su nivel puede estar por debajo de lo que realmente saben.</p>`, '#9A8F80')}</div></div>` });

  S.push({ pasos: 6, html: () => `<h2>Del dato a la barrera: lo que vimos hoy</h2><p class="eia-nota">Antes de decir «no saben», preguntémonos qué barrera para el aprendizaje y la participación hay detrás</p>
    <div class="eia-props dos">
      <div class="eia-prop" data-p="1" style="--c:#C8403A"><span>D</span><b>Barrera didáctica</b><p>En tercero nadie resolvió el problema de área y perímetro. ¿Fue la consigna, larga y sin apoyo visual, la que les cerró la puerta?</p></div>
      <div class="eia-prop" data-p="2" style="--c:#E8893A"><span>E</span><b>Barrera estructural</b><p>Treinta números de lista sin resultado. Faltar a la evaluación también puede ser una barrera para participar: trabajo, traslado, avisos que no llegan.</p></div>
      <div class="eia-prop" data-p="3" style="--c:#7A4FB0"><span>A</span><b>Barrera actitudinal</b><p>«Tercero ya no tiene remedio.» Si lo creemos, dejamos de intentarlo. La generación de segundo demuestra que en un año sí se puede avanzar.</p></div>
      <div class="eia-prop" data-p="4" style="--c:#16213F"><span>N</span><b>Barrera en la evaluación</b><p>Si cada grupo lee la rúbrica a su manera, el resultado no refleja lo que el alumno sabe. Unificar criterios también es quitar una barrera.</p></div></div>
    <div class="eia-dos" style="margin-top:14px"><p class="eia-nota" data-p="5"><b>Diseño Universal para todo el grupo:</b> la fórmula «Yo pienso que… porque… por ejemplo…», textos discontinuos y problemas con datos reales, planeados desde el inicio para todos.</p>
    <p class="eia-nota" data-p="6"><b>Ajuste razonable para cada alumno prioritario:</b> barrera concreta, qué cambia, cuándo, quién lo hace y cómo sabremos que funcionó. No se trata de diversificar todo todos los días.</p></div>` });

  const PROP = [
    ['Argumentar en todas las materias', '«Yo pienso que… porque… por ejemplo…» y una rúbrica corta común.', CC.LEN],
    ['Leer y hacer textos discontinuos', 'Tablas, esquemas e infografías. Una lectura al mes de Raíces y Estrellas con texto discontinuo.', CC.LEN],
    ['Matemáticas con datos reales', 'Gráficas con datos del grupo, división con dos cifras y, en tercero, área y perímetro con planos de la escuela.', CC.SPC],
    ['Convivencia y derechos en el aula', 'Propuestas colectivas contra la violencia y el maltrato, de la mano de Formación Cívica y Tutoría.', CC.ENS],
    ['Ajustes razonables para prioritarios', 'Lista para cada tutor y un plan sencillo por alumno: barrera, ajuste, responsable y seguimiento quincenal con la familia.', CC.HYC],
    ['Calificar igual', 'Calibrar la rúbrica en academia con respuestas reales antes de la siguiente aplicación.', '#E8893A']
  ];
  S.push({ pasos: PROP.length, html: () => `<h2>Propuestas para trabajar</h2><div class="eia-props">${PROP.map(([t, d, c], k) => `<div class="eia-prop" data-p="${k + 1}" style="--c:${c}"><span>${k + 1}</span><b>${t}</b><p>${d}</p></div>`).join('')}</div>` });

  S.push({ pasos: 4, html: () => `<h2>Para el colectivo</h2><div class="eia-pregs">
    <div data-p="1"><span>1</span><p>¿Qué aprendizaje de esta lista trabajo yo en mi asignatura, aunque no sea mi campo?</p></div>
    <div data-p="2"><span>2</span><p>¿Qué acuerdo concreto podemos tomar hoy como academia para la próxima semana?</p></div>
    <div data-p="3"><span>3</span><p>¿Cómo vamos a saber, en la siguiente aplicación, si funcionó?</p></div>
    <div data-p="4"><span>4</span><p>¿Qué barrera, de nosotros y no del alumno, explica el resultado que más me preocupa de mis grupos?</p></div></div>` });

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
