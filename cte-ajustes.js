/* CTE · Ajustes razonables (Tema 3, Espacio para la reflexión y la transformación de la práctica, SEP 2026-2027)
   Sesión interactiva para proyectar: juego de arranque, datos de la escuela (EIA, sin nombres), la jornada de un
   alumno, priorización de barreras, los seis pasos con el cuadro de la SEP, aptitudes sobresalientes y el producto
   impreso en carta. Todo se guarda en este navegador (localStorage); no usa internet más que para cargar la página. */
(() => {
const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CLAVE = 'cte_ajustes_v1';
let E = {}; try { E = JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { E = {}; }
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(E)); } catch { /* sin espacio */ } };
E.jor ||= {}; E.bar ||= []; E.pasos ||= {}; E.cuadro ||= {}; E.juego ||= {}; E.acuerdos ||= ''; E.extra ||= {};

const SECC = [['inicio', 'Inicio'], ['juego', 'Juego'], ['datos', 'Nuestros datos'], ['jornada', 'La jornada'], ['prior', 'Priorizar'], ['pasos', 'Seis pasos'], ['sobres', 'Aptitudes sobresalientes'], ['producto', 'Producto']];
let sec = E.sec || 'inicio';

/* ---------- Juego: ¿accesibilidad, Diseño Universal o ajuste razonable? ---------- */
const OPS = [['acc', 'Accesibilidad universal'], ['dua', 'Diseño Universal (DUA)'], ['aju', 'Ajuste razonable'], ['no', 'No es un ajuste']];
const CASOS = [
  ['Poner pictogramas en los baños, la biblioteca, la dirección y los laboratorios.', 'acc', 'Es para toda la comunidad y se decide antes de conocer a quién lo va a usar: es accesibilidad.'],
  ['Planear la clase con un texto corto, un video con subtítulos y dejar que cada quien entregue un escrito, un dibujo o una exposición oral.', 'dua', 'Se diseña desde el inicio para todo el grupo, con varias formas de representar y de expresar: es Diseño Universal.'],
  ['Leer en voz alta las consignas del examen a todo el grupo.', 'dua', 'Es para todos, no para un alumno en particular. La SEP es clara: aplicar lo mismo a todo el grupo no es un ajuste razonable.'],
  ['A Mariana, que lee con mucha dificultad, darle la consigna leída, un esquema de apoyo y diez minutos más en el examen.', 'aju', 'Parte de una barrera concreta de una alumna específica, no baja la exigencia y no la separa del grupo: es un ajuste razonable.'],
  ['Mandar a un alumno a la biblioteca a hacer «algo más fácil» mientras el grupo trabaja.', 'no', 'Separarlo del grupo y bajarle la exigencia es justo lo que la SEP dice que NO es un ajuste razonable.'],
  ['Que la plataforma de la escuela abra en cualquier celular y funcione con lector de pantalla.', 'acc', 'Es una condición del entorno digital, para todas las personas: accesibilidad.'],
  ['A un alumno con baja visión, darle las lecturas en letra grande y sentarlo cerca del pizarrón.', 'aju', 'Responde a la necesidad de un alumno en particular cuando el diseño general no alcanzó: ajuste razonable.'],
  ['Esperar a que el alumno traiga su diagnóstico del médico para empezar a apoyarlo.', 'no', 'La SEP dice que no hay que esperar un diagnóstico clínico para quitar una barrera que ya se observa.'],
  ['Dejar que todo el grupo elija si entrega su producto como podcast, cartel o texto.', 'dua', 'Múltiples formas de acción y expresión para todos desde la planeación: Diseño Universal.'],
  ['A una alumna con aptitudes sobresalientes en Lenguajes, proponerle coordinar el periódico escolar con los temas que ve el grupo.', 'aju', 'Es enriquecimiento curricular individualizado, ligado a los contenidos del grupo y sin separarla: un ajuste razonable para aptitudes sobresalientes.'],
];

/* ---------- Datos de la escuela (reportes oficiales EIA, septiembre 2026; sin nombres) ---------- */
const DATOS = {
  alumnos: 165, prioritarios: 32, sinResultado: 30, faltaron: 5, sobresalientes: 9,
  lectura3: [['Uso de la infografía', 83], ['Estructura del texto de divulgación', 81]],
  mate3: [['Resolución del problema de área y perímetro', 100], ['Estrategia de solución', 92], ['Uso de lenguaje matemático', 92]],
  textoDisc1: 52, argumentar: '34 % a 63 %'
};
// Caso real de un alumno prioritario de tercero, con nombre ficticio.
const CASO = { nombre: 'Diego', grado: 'tercer grado', niveles: 'Requiere apoyo en los cuatro campos formativos',
  ceros: ['Comprensión del tema (texto de divulgación)', 'Estructura del texto', 'Oportunidades que propicia o limita un proceso técnico'],
  unos: 'Uno en casi todo lo demás: argumentación, estrategia de solución, uso de lenguaje matemático, propuestas éticas, infografía.' };

const MOMENTOS = ['Acceso y movilidad', 'Comunicación', 'Participación en actividades', 'Materiales y recursos', 'Evaluación', 'Interacción con sus pares', 'Familia y comunidad'];
const CRIT = ['Impacto en su derecho a participar y aprender', 'Frecuencia con que aparece', 'Depende de decisiones de la escuela', 'Viabilidad del cambio', 'Se puede dar seguimiento'];
const PASOS = [['situacion', 'Situación', '¿Qué actividad o experiencia educativa queremos garantizar?', 'Ej.: Que Diego comprenda y resuelva los problemas escritos de Matemáticas en clase y en los exámenes.'],
  ['barrera', 'Barrera', '¿Qué condición del entorno está dificultando el acceso, la participación o el aprendizaje?', 'Ej.: Las consignas son textos largos sin apoyo visual; se le evalúa solo por escrito y con el mismo tiempo que al grupo.'],
  ['necesidad', 'Necesidad', '¿Qué requiere para participar en igualdad de condiciones?', 'Ej.: Acceder al contenido de la consigna sin que su nivel de lectura le impida mostrar lo que sabe de Matemáticas.'],
  ['ajuste', 'Ajuste razonable', '¿Qué modificación concreta, necesaria y adecuada podemos implementar?', 'Ej.: Consigna leída en voz baja por el docente, esquema con los datos del problema y quince minutos adicionales; misma exigencia que el grupo.'],
  ['implementa', 'Implementación', '¿Quién lo hará, cuándo, con qué recursos y en qué espacios?', 'Ej.: Docentes de Matemáticas y Ciencias, en cada examen y actividad escrita a partir de diciembre; el tutor lo comunica a la familia.'],
  ['seguimiento', 'Seguimiento', '¿Cómo sabremos si funcionó y qué debemos modificar?', 'Ej.: Su calificación quincenal de lectura en Raíces y Estrellas y su nivel en Saberes en la siguiente aplicación de los EIA; se revisa en el CTE de enero.']];
const CUADRO = [['bap', 'BAP'], ['ambito', 'Ámbito (escolar, áulico, sociofamiliar-comunitario)'], ['particip', 'Participación en actividades'], ['nna', 'NNA o grupo involucrado'], ['ajustes', 'Ajuste(s) razonable(s) propuesto(s)'], ['recursos', 'Recursos y apoyos requeridos'], ['evidencia', 'Evidencia de avance'], ['resp', 'Responsables'], ['fecha', 'Fecha de revisión']];

/* ---------- Pantallas ---------- */
const V = {};
V.inicio = () => `<h1>Ajustes razonables en la atención de niñas, niños y adolescentes con discapacidad y aptitudes sobresalientes</h1>
  <p style="font-size:22px;color:var(--tinta2);margin-top:0">Consejo Técnico Escolar · Escuela Secundaria Técnica N.° 17, Turno Vespertino · Campo formativo de Lenguajes</p>
  <div class="guia"><b>Para quien conduce:</b> cada pantalla trae en un recuadro como este qué hacer y cuánto tiempo. Lo que escriban se guarda solo en esta computadora. Al final, en «Producto», se imprime o se guarda en PDF el producto de la sesión.</div>
  <div class="tarjeta"><h3 style="margin-top:0">Ruta sugerida</h3>
  <ol style="margin:0;padding-left:1.4em">
    <li><b>Juego</b> de arranque: ¿accesibilidad, Diseño Universal o ajuste razonable? · 10 min</li>
    <li><b>Nuestros datos:</b> qué barreras se asoman en los EIA · 10 min</li>
    <li><b>La jornada</b> de un alumno real de la escuela, con nombre ficticio · 20 min</li>
    <li><b>Priorizar</b> las barreras con los cinco criterios de la SEP · 10 min</li>
    <li><b>Seis pasos</b> y el cuadro de la SEP · 20 min</li>
    <li><b>Aptitudes sobresalientes</b> y enriquecimiento · 10 min</li>
    <li><b>Producto</b> y acuerdos · 10 min</li></ol>
  <p class="ej">Se puede intercalar con la exposición de cada parte del documento: el juego después de los conceptos (páginas tres a cinco), la jornada y los seis pasos con las páginas ocho a diez.</p></div>`;

V.juego = () => {
  const J = E.juego, i = Math.min(J.i || 0, CASOS.length), r = J.r || {};
  const pts = CASOS.map((_, k) => `<i class="${r[k] === undefined ? '' : r[k] === CASOS[k][1] ? 'ok' : 'x'}${k === i ? ' act' : ''}"></i>`).join('');
  if (i >= CASOS.length) { const bien = CASOS.filter((c, k) => r[k] === c[1]).length;
    return `<h2>Juego: ¿accesibilidad, Diseño Universal o ajuste razonable?</h2><div class="puntos">${pts}</div>
      <div class="tarjeta" style="text-align:center"><p class="marcador" style="font-size:44px">El colectivo acertó ${bien} de ${CASOS.length}</p>
      <p>${bien >= 8 ? 'Tenemos claros los conceptos. ¡Bien!' : 'Los casos que fallamos son justo los que conviene platicar ahora.'}</p>
      <p class="ej">Lo que más se confunde: aplicar lo mismo a todo el grupo es Diseño Universal, no un ajuste razonable.</p>
      <div class="fila" style="justify-content:center"><button type="button" class="btn linea" data-j="reini">Volver a jugar</button></div></div>`; }
  const c = CASOS[i], resp = r[i];
  return `<h2>Juego: ¿accesibilidad, Diseño Universal o ajuste razonable?</h2>
    <div class="guia"><b>Cómo se juega (10 min):</b> lee la situación en voz alta; el colectivo vota a mano alzada por cada opción; toca la que ganó. Se revela la respuesta y su explicación.</div>
    <div class="puntos">${pts}</div><p class="ej">Situación ${i + 1} de ${CASOS.length}</p>
    <p class="caso">${esc(c[0])}</p>
    <div class="ops">${OPS.map(([k, t]) => `<button type="button" class="op${resp !== undefined ? (k === c[1] ? ' bien' : ' mal') : ''}" data-k="${k}" ${resp !== undefined ? 'disabled' : ''}>${t}</button>`).join('')}</div>
    ${resp !== undefined ? `<div class="expl" style="border-color:${resp === c[1] ? 'var(--dua)' : 'var(--no)'}"><b>${resp === c[1] ? '✅ ¡Correcto!' : `❌ Era: ${OPS.find(o => o[0] === c[1])[1]}`}</b><br>${esc(c[2])}</div>
      <div class="fila" style="margin-top:14px"><button type="button" class="btn" data-j="sig">${i + 1 < CASOS.length ? 'Siguiente situación' : 'Ver resultado'}</button></div>` : ''}`;
};

V.datos = () => `<h2>¿Qué barreras se asoman en nuestros datos?</h2>
  <div class="guia"><b>Para conducir (10 min):</b> la SEP pregunta en la página catorce: «¿Las actividades permiten demostrar el aprendizaje sin que una barrera influya en el resultado?». Estos datos de los EIA de septiembre ayudan a contestarla.</div>
  <div class="dato-grande"><div><b>${DATOS.prioritarios}</b>alumnos requieren apoyo en tres o cuatro campos formativos</div><div><b>${DATOS.sinResultado}</b>números de lista sin resultado: no participaron en la evaluación</div><div><b>${DATOS.lectura3[0][1]} %</b>de tercero sacó cero o uno en el uso de la infografía</div></div>
  <div class="tarjeta" style="margin-top:18px"><h3 style="margin-top:0">Una barrera que cruza todos los campos: la lectura</h3>
  <p>En tercero, el ${DATOS.mate3[0][1]} % no resolvió el problema de área y perímetro y el ${DATOS.lectura3[1][1]} % no logró la estructura del texto. En primero, la mitad no pudo presentar información en un texto discontinuo, y en los tres grados argumentar es lo más débil (de ${DATOS.argumentar} en cero o uno).</p>
  <p><b>Pregunta para el colectivo:</b> ¿el alumno que falló en Matemáticas no sabe calcular, o no comprendió la consigna escrita? Si es lo segundo, la barrera no está en él: está en cómo le presentamos la información y en cómo lo evaluamos.</p>
  <p class="ej">Fuente: reportes oficiales de los EIA Fase 6, 30 de septiembre de 2026. El cruce con la lectura de Raíces y Estrellas está en la plataforma de la escuela.</p></div>
  <div class="tres"><div style="--c:var(--acc)"><h4>Accesibilidad</h4>Toda la escuela: la plataforma abre en cualquier celular; señalética clara; libros en formato accesible.</div>
  <div style="--c:var(--dua)"><h4>Diseño Universal</h4>Todo el grupo: consignas leídas en voz alta, apoyos visuales y varias formas de entregar.</div>
  <div style="--c:var(--aju)"><h4>Ajuste razonable</h4>Un alumno: consigna leída, esquema y más tiempo para quien tiene la barrera de lectura.</div></div>`;

V.jornada = () => `<h2>La jornada de ${CASO.nombre}</h2>
  <div class="guia"><b>Para conducir (20 min):</b> es un alumno real de la escuela con nombre ficticio. Recorran juntos su día, momento por momento, y escriban lo que el colectivo identifica. Es la tabla de la página ocho del documento.</div>
  <div class="perfil"><div class="tarjeta"><h3 style="margin-top:0">${CASO.nombre}, ${CASO.grado}</h3>
    <p><span class="niv">Lenguajes RA</span><span class="niv">Saberes RA</span><span class="niv">Ética RA</span><span class="niv">Humano y comunitario RA</span></p>
    <p><b>Cero</b> en: ${CASO.ceros.map(esc).join('; ')}.</p><p>${esc(CASO.unos)}</p></div>
    <div class="tarjeta"><h3 style="margin-top:0">Lo que sabe el colectivo de ${CASO.nombre}</h3>
    <div class="campo"><label>¿Cómo lee? ¿Cómo escribe?</label><input data-x="lee" value="${esc(E.extra.lee || '')}" placeholder="Ej.: lee despacio, se pierde en textos largos"></div>
    <div class="campo"><label>Asistencia, conducta, familia</label><input data-x="contexto" value="${esc(E.extra.contexto || '')}" placeholder="Ej.: falta los lunes; la mamá trabaja todo el día"></div>
    <div class="campo"><label>¿Qué le gusta? ¿En qué destaca?</label><input data-x="fortalezas" value="${esc(E.extra.fortalezas || '')}" placeholder="Ej.: dibuja muy bien, le gusta el futbol"></div></div></div>
  <table class="tabla"><thead><tr><th>Momento</th><th>¿Qué puede ser una barrera?</th><th>¿Qué recursos favorecen la participación y el aprendizaje?</th><th>¿Qué necesitamos cambiar?</th></tr></thead>
  <tbody>${MOMENTOS.map((m, k) => `<tr data-fila="${k}"><td>${m}</td>${['b', 'r', 'c'].map(col => `<td><textarea rows="2" data-jor="${k}.${col}">${esc(E.jor[`${k}.${col}`] || '')}</textarea></td>`).join('')}</tr>`).join('')}</tbody></table>`;

V.prior = () => {
  const auto = MOMENTOS.map((m, k) => (E.jor[`${k}.b`] || '').trim()).filter(Boolean);
  auto.forEach(t => { if (!E.bar.some(b => b.t === t)) E.bar.push({ t, p: {} }); });
  guardar();
  return `<h2>Priorizar las barreras</h2>
  <div class="guia"><b>Para conducir (10 min):</b> las barreras que escribieron en la jornada ya están aquí. Califiquen cada criterio del uno al cinco, a mano alzada o por consenso. La lista se ordena sola: atiendan primero una o dos.</div>
  <div class="tarjeta" style="overflow-x:auto"><table class="tabla crit"><thead><tr><th>Barrera</th>${CRIT.map(c => `<th>${c}</th>`).join('')}<th>Total</th><th></th></tr></thead>
  <tbody>${E.bar.map((b, k) => `<tr><td><textarea rows="2" data-bt="${k}">${esc(b.t)}</textarea></td>${CRIT.map((_, c) => `<td><input type="number" min="1" max="5" data-bp="${k}.${c}" value="${b.p[c] || ''}"></td>`).join('')}<td><b style="font-size:24px" id="tot-${k}">${totalB(b) || ''}</b></td><td><button type="button" class="btn linea chico" data-bx="${k}">✕</button></td></tr>`).join('')}</tbody></table>
  <div class="fila" style="margin-top:10px"><button type="button" class="btn linea chico" data-badd>+ Agregar otra barrera</button></div></div>
  <div id="rank">${rankHTML()}</div>`;
};
const totalB = b => CRIT.reduce((s, _, k) => s + (+b.p[k] || 0), 0);
function rankHTML() {
  const orden = E.bar.map((b, k) => ({ b, k, s: totalB(b) })).sort((a, z) => z.s - a.s);
  return `${orden.some(o => o.s) ? `<div class="tarjeta rank"><h3 style="margin-top:0">Barreras prioritarias</h3>${orden.filter(o => o.s).slice(0, 3).map((o, n) => `<p><b>${n + 1}</b>${esc(o.b.t)} <span class="ej">(${o.s} de 25)</span></p>`).join('')}
    <button type="button" class="btn" data-usar="${orden[0].k}">Llevar la primera a los seis pasos</button></div>` : ''}`;
}

V.pasos = () => {
  const p = E.pasoAct || 0;
  return `<h2>Los seis pasos para un ajuste razonable</h2>
  <div class="guia"><b>Para conducir (20 min):</b> con la barrera prioritaria, recorran los seis pasos de la página nueve. Debajo de cada uno hay un ejemplo de guía. Al final, el cuadro de la página diez se llena casi solo con lo que escribieron.</div>
  <div class="pasos">${PASOS.map(([k, t], n) => `<div class="${n <= p ? 'on' : ''}" data-ir="${n}">${n + 1}. ${t}</div>`).join('')}</div>
  <div class="tarjeta">${PASOS.map(([k, t, q, ej], n) => `<div class="campo" ${n > p ? 'hidden' : ''}><label><span class="paso-ayuda">${n + 1}. ${t}:</span> ${q}</label><textarea rows="2" data-p="${k}">${esc(E.pasos[k] || '')}</textarea><p class="ej">${esc(ej)}</p></div>`).join('')}
  ${p < PASOS.length - 1 ? '<button type="button" class="btn" data-pmas>Siguiente paso</button>' : ''}</div>
  ${p >= PASOS.length - 1 ? `<div class="tarjeta"><h3 style="margin-top:0">Cuadro de la SEP</h3><table class="tabla"><tbody>${CUADRO.map(([k, t]) => `<tr><td>${t}</td><td><textarea rows="2" data-c="${k}">${esc(E.cuadro[k] ?? prellenar(k))}</textarea></td></tr>`).join('')}</tbody></table></div>` : ''}`;
};
function prellenar(k) {
  const P = E.pasos;
  return { bap: P.barrera || '', ajustes: P.ajuste || '', evidencia: P.seguimiento || '', resp: (P.implementa || '').split(',')[0] || '', particip: P.situacion || '', nna: `${CASO.nombre} (${CASO.grado}) y alumnos con la misma barrera` }[k] || '';
}

V.sobres = () => `<h2>Aptitudes sobresalientes: también son ajustes razonables</h2>
  <div class="guia"><b>Para conducir (10 min):</b> la SEP dice que no se trata de darles más trabajo ni de adelantarles temas, sino de enriquecer el currículo ligado a lo que ve el grupo (página seis).</div>
  <div class="dato-grande"><div><b style="color:var(--dua)">${DATOS.sobresalientes}</b>alumnos con aprendizaje desarrollado en tres o cuatro campos formativos</div>
  <div style="grid-column:span 2"><p style="margin:0">Son candidatos a enriquecimiento, no un diagnóstico. Siete son del mismo grupo de primero, por lo que antes conviene revisar en academia cómo se valoró la rúbrica en ese grupo.</p></div></div>
  <div class="tarjeta" style="margin-top:18px"><h3 style="margin-top:0">Ideas de enriquecimiento desde Lenguajes</h3>
  <ul><li>Coordinar el periódico o la radio escolar con los temas del grupo.</li><li>Preparar a sus compañeros para el concurso de oratoria o declamación.</li><li>Escribir textos de divulgación sobre lo que se investiga en Ciencias, con fuentes reales.</li><li>Moderar debates en clase y redactar la relatoría.</li><li>Crear infografías que el grupo use como material de estudio.</li></ul>
  <div class="campo"><label>Idea que acuerda el colectivo</label><textarea rows="2" data-x="enriq">${esc(E.extra.enriq || '')}</textarea></div></div>`;

V.producto = () => `<h2>Producto de la sesión y acuerdos</h2>
  <div class="guia"><b>Para conducir (10 min):</b> escriban los acuerdos y toquen «Imprimir o guardar en PDF». Sale en tamaño carta con la portada de la escuela, como evidencia del Consejo.</div>
  <div class="tarjeta"><div class="campo"><label>Acuerdos del colectivo (para el Programa de mejora continua)</label><textarea rows="5" data-x="acuerdos">${esc(E.extra.acuerdos || '')}</textarea><p class="ej">Ej.: A partir de diciembre, en todas las asignaturas las consignas de examen se leen en voz alta y llevan un esquema; los tutores identifican a los alumnos con barrera de lectura para darles ajuste razonable.</p></div>
  <div class="campo"><label>Quiénes expusieron</label><input data-x="exponen" value="${esc(E.extra.exponen || '')}" placeholder="Docentes del campo formativo de Lenguajes"></div>
  <div class="fila"><button type="button" class="btn" data-imp>🖨️ Imprimir o guardar en PDF</button><button type="button" class="btn linea" data-borrar>Borrar todo y empezar de nuevo</button></div></div>`;

/* ---------- Producto impreso ---------- */
function producto() {
  const fila = (t, v) => `<tr><th style="width:30%">${t}</th><td>${esc(v || '')}</td></tr>`;
  const J = E.juego.r || {}, aciertos = CASOS.filter((c, k) => J[k] === c[1]).length;
  return `<div class="p-cab"><img src="logo-escuela.jpg" alt=""><div><b>Escuela Secundaria Técnica N.° 17 · Turno Vespertino</b><span>C.C.T. 04DST0017E · San Francisco de Campeche, Campeche · Ciclo escolar 2026-2027</span></div></div>
  <h1>Consejo Técnico Escolar · Ajustes razonables en la atención de niñas, niños y adolescentes con discapacidad y aptitudes sobresalientes</h1>
  <p>Fecha: ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}. Expone: ${esc(E.extra.exponen || 'Campo formativo de Lenguajes')}.${Object.keys(J).length ? ` Juego de conceptos: el colectivo acertó ${aciertos} de ${CASOS.length}.` : ''}</p>
  <h2>1. Caso analizado: ${CASO.nombre}, ${CASO.grado} (nombre ficticio)</h2>
  <table>${fila('Resultados EIA', CASO.niveles)}${fila('Lectura y escritura', E.extra.lee)}${fila('Contexto', E.extra.contexto)}${fila('Fortalezas', E.extra.fortalezas)}</table>
  <h2>2. Lectura de la realidad: la jornada</h2>
  <table><thead><tr><th>Momento</th><th>¿Qué puede ser una barrera?</th><th>¿Qué recursos favorecen?</th><th>¿Qué necesitamos cambiar?</th></tr></thead><tbody>${MOMENTOS.map((m, k) => `<tr><td>${m}</td><td>${esc(E.jor[`${k}.b`] || '')}</td><td>${esc(E.jor[`${k}.r`] || '')}</td><td>${esc(E.jor[`${k}.c`] || '')}</td></tr>`).join('')}</tbody></table>
  <h2>3. Barreras priorizadas</h2>
  <table><thead><tr><th>Barrera</th>${CRIT.map(c => `<th>${c}</th>`).join('')}<th>Total</th></tr></thead><tbody>${E.bar.map(b => ({ b, s: CRIT.reduce((s, _, k) => s + (+b.p[k] || 0), 0) })).sort((a, z) => z.s - a.s).map(({ b, s }) => `<tr><td>${esc(b.t)}</td>${CRIT.map((_, k) => `<td>${b.p[k] || ''}</td>`).join('')}<td>${s}</td></tr>`).join('')}</tbody></table>
  <h2>4. Los seis pasos</h2><table>${PASOS.map(([k, t]) => fila(t, E.pasos[k])).join('')}</table>
  <h2>5. Cuadro de ajustes razonables</h2><table>${CUADRO.map(([k, t]) => fila(t, E.cuadro[k] ?? prellenar(k))).join('')}</table>
  <h2>6. Aptitudes sobresalientes: enriquecimiento acordado</h2><p>${esc(E.extra.enriq || '')}</p>
  <h2>7. Acuerdos del colectivo</h2><p style="white-space:pre-wrap">${esc(E.extra.acuerdos || '')}</p>
  <div class="p-firmas"><div>Docentes del campo formativo de Lenguajes</div><div>Dirección / Subdirección</div></div>`;
}

/* ---------- Navegación y eventos ---------- */
function pintar() {
  E.sec = sec; guardar();
  $('#nav').innerHTML = SECC.map(([k, t]) => `<button type="button" data-s="${k}" aria-pressed="${k === sec}">${t}</button>`).join('');
  $('#vista').innerHTML = V[sec]();
  const n = SECC.findIndex(s => s[0] === sec);
  $('#donde').textContent = `${n + 1} de ${SECC.length} · ${SECC[n][1]}`;
  $('#ant').disabled = n === 0; $('#sig').disabled = n === SECC.length - 1;
  scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.s) { sec = t.dataset.s; pintar(); return; }
  if (t.id === 'sig' || t.id === 'ant') { const n = SECC.findIndex(s => s[0] === sec) + (t.id === 'sig' ? 1 : -1); if (SECC[n]) { sec = SECC[n][0]; pintar(); } return; }
  const J = E.juego;
  if (t.classList.contains('op')) { (J.r ||= {})[J.i || 0] = t.dataset.k; guardar(); pintar(); return; }
  if (t.dataset.j === 'sig') { J.i = (J.i || 0) + 1; guardar(); pintar(); return; }
  if (t.dataset.j === 'reini') { E.juego = {}; guardar(); pintar(); return; }
  if (t.dataset.badd !== undefined) { E.bar.push({ t: '', p: {} }); guardar(); pintar(); return; }
  if (t.dataset.bx) { E.bar.splice(+t.dataset.bx, 1); guardar(); pintar(); return; }
  if (t.dataset.usar) { const b = E.bar[+t.dataset.usar]; if (b) E.pasos.barrera = b.t; sec = 'pasos'; guardar(); pintar(); return; }
  if (t.dataset.pmas !== undefined) { E.pasoAct = Math.min((E.pasoAct || 0) + 1, PASOS.length - 1); guardar(); pintar(); return; }
  if (t.dataset.imp !== undefined) { $('#impresion').innerHTML = producto(); setTimeout(() => print(), 300); return; }
  if (t.dataset.borrar !== undefined) { if (confirm('¿Borrar todo lo escrito en esta sesión? No se puede deshacer.')) { localStorage.removeItem(CLAVE); location.reload(); } return; }
});
document.addEventListener('click', e => { const d = e.target.closest('.pasos [data-ir]'); if (d) { E.pasoAct = Math.max(E.pasoAct || 0, +d.dataset.ir); guardar(); pintar(); } });
document.addEventListener('input', e => {
  const x = e.target, d = x.dataset;
  if (d.jor) E.jor[d.jor] = x.value;
  else if (d.x) E.extra[d.x] = x.value;
  else if (d.bt) E.bar[+d.bt].t = x.value;
  else if (d.bp) { const [b, c] = d.bp.split('.'); E.bar[+b].p[c] = Math.max(1, Math.min(5, +x.value || 0)) || ''; const t = document.getElementById('tot-' + b); if (t) t.textContent = totalB(E.bar[+b]) || ''; const r = document.getElementById('rank'); if (r) r.innerHTML = rankHTML(); }
  else if (d.p) E.pasos[d.p] = x.value;
  else if (d.c) E.cuadro[d.c] = x.value;
  else return;
  guardar();
});
document.addEventListener('focusin', e => { const tr = e.target.closest('tr[data-fila]'); document.querySelectorAll('tr[data-fila]').forEach(r => r.classList.toggle('act', r === tr)); });
addEventListener('keydown', e => { if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return; if (e.key === 'ArrowRight' || e.key === 'PageDown') $('#sig').click(); if (e.key === 'ArrowLeft' || e.key === 'PageUp') $('#ant').click(); });
pintar();
})();
