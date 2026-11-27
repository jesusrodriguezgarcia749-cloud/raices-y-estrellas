/* Contenido de la sesión de CTE «Ajustes razonables» (Tema 3, SEP 2026-2027) para EST 17 Vespertino.
   PASOS = el orden de la sesión: diapositivas (tipo 'dia', se encienden por partes) y actividades individuales
   (tipo 'act') que cada maestro contesta en su celular. Lo usan cte-ajustes.js (proyector) y cte.js (celular). */
window.CTE = (() => {
const OPS = [['acc', 'Accesibilidad universal'], ['dua', 'Diseño Universal (DUA)'], ['aju', 'Ajuste razonable'], ['no', 'No es un ajuste']];
const JUEGO = [
  ['Poner pictogramas en los baños, la biblioteca, la dirección y los laboratorios.', 'acc', 'Es para toda la comunidad y se decide antes de conocer a quién lo usará: accesibilidad.'],
  ['Planear la clase con un texto corto, un video con subtítulos y dejar que cada quien entregue un escrito, un dibujo o una exposición.', 'dua', 'Se diseña desde el inicio para todo el grupo con varias formas de representar y expresar: Diseño Universal.'],
  ['Leer en voz alta las consignas del examen a todo el grupo.', 'dua', 'Es para todos. La SEP es clara: aplicar lo mismo a todo el grupo no es un ajuste razonable; es Diseño Universal.'],
  ['A Mariana, que lee con mucha dificultad, darle la consigna leída, un esquema de apoyo y diez minutos más en el examen.', 'aju', 'Parte de una barrera concreta de una alumna, no baja la exigencia y no la separa: ajuste razonable.'],
  ['A Diego le permites contestar el examen oralmente, pero solo le preguntas la mitad de los reactivos.', 'no', 'Lo oral puede ser un buen ajuste, pero quitarle la mitad de los reactivos reduce la exigencia: eso NO es ajuste razonable.'],
  ['Mandar a un alumno a la biblioteca a hacer «algo más fácil» mientras el grupo trabaja.', 'no', 'Separarlo y bajarle la exigencia es justo lo que la SEP dice que no es un ajuste.'],
  ['Esperar a que el alumno traiga su diagnóstico del médico para empezar a apoyarlo.', 'no', 'No hay que esperar un diagnóstico clínico para quitar una barrera que ya se observa.'],
  ['Que la plataforma de la escuela abra en cualquier celular y funcione con lector de pantalla.', 'acc', 'Es una condición del entorno digital para todas las personas: accesibilidad.'],
  ['A una alumna que termina todo muy rápido, darle el doble de ejercicios del mismo tipo para que no se aburra.', 'no', 'Más trabajo del mismo tipo no es enriquecimiento; la SEP advierte que desmotiva.'],
  ['A una alumna con aptitudes sobresalientes en Lenguajes, proponerle coordinar el periódico escolar con los temas que ve el grupo.', 'aju', 'Enriquecimiento individualizado, ligado a los contenidos del grupo y sin separarla: ajuste razonable.'],
  ['A un alumno que se dispersa en actividades largas, dividirle la tarea en partes cortas con una lista de pasos y pausas breves.', 'aju', 'Responde a la necesidad de un alumno concreto sin bajar lo que se espera que aprenda: ajuste razonable.'],
  ['Escribir en el pizarrón la lista de pasos de la actividad para todo el grupo.', 'dua', 'Es un apoyo para todos desde la planeación: Diseño Universal.'],
  ['Pedirle a un compañero que haga la actividad en lugar del alumno con discapacidad motriz.', 'no', 'Sustituir su participación no es un ajuste: el ajuste busca que él participe.'],
  ['Poner rampa y barandal en el acceso a la cancha.', 'acc', 'Infraestructura para toda la comunidad: accesibilidad.'],
  ['A un alumno con baja audición, sentarlo al frente y darle por escrito las indicaciones que se dan en voz alta.', 'aju', 'Modificaciones concretas para un alumno específico cuando el diseño general no alcanzó: ajuste razonable.'],
];
const MOMENTOS = ['Acceso y movilidad', 'Comunicación', 'Participación en actividades', 'Materiales y recursos', 'Evaluación', 'Interacción con sus pares', 'Familia y comunidad'];
const CRIT = ['Impacto en su derecho a participar y aprender', 'Frecuencia con que aparece', 'Depende de decisiones de la escuela', 'Viabilidad del cambio', 'Se puede dar seguimiento'];
const SEIS = [['situacion', 'Situación', '¿Qué actividad o experiencia quieres garantizar?', 'Ej.: Que Diego resuelva los problemas escritos de mi clase.'],
  ['barrera', 'Barrera', '¿Qué condición del entorno le está estorbando?', 'Ej.: Consignas largas sin apoyo visual y examen solo escrito.'],
  ['necesidad', 'Necesidad', '¿Qué requiere para participar en igualdad?', 'Ej.: Entender la consigna sin que su lectura le impida mostrar lo que sabe.'],
  ['ajuste', 'Ajuste razonable', '¿Qué modificación concreta harás?', 'Ej.: Consigna leída en voz baja, esquema con los datos y quince minutos más; misma exigencia.'],
  ['implementa', 'Implementación', '¿Quién, cuándo, con qué recursos?', 'Ej.: Yo, en cada examen desde diciembre; aviso al tutor y a la familia.'],
  ['seguimiento', 'Seguimiento', '¿Cómo sabrás si funcionó?', 'Ej.: Sus resultados en mis exámenes y su lectura quincenal en Raíces y Estrellas.']];
const CASO = { nombre: 'Diego', grado: 'tercer grado', niveles: ['Lenguajes', 'Saberes', 'Ética', 'Humano y comunitario'],
  ceros: 'Comprensión del tema y estructura del texto de divulgación; oportunidades que propicia un proceso técnico',
  unos: 'Argumentación, estrategia de solución, lenguaje matemático, propuestas éticas, infografía' };

const OPS2 = [['actit', 'Actitudinal'], ['estr', 'Estructural'], ['did', 'Didáctica'], ['norm', 'Normativa']];
const JUEGO2 = [
  ['«Ese alumno no va a poder; mejor que no participe en la exposición.»', 'actit', 'Es una creencia sobre lo que el alumno puede hacer: barrera actitudinal. Decide por él antes de darle la oportunidad.'],
  ['El examen de todas las asignaturas es solo escrito, con consignas largas y sin ningún ejemplo.', 'did', 'Es una forma de evaluar que no responde a las necesidades reales: barrera didáctica.'],
  ['El reglamento dice que quien llega tarde ya no entra a clase, aunque venga de trabajar o de otra comunidad.', 'norm', 'Es una regla de la escuela que impide participar: barrera normativa.'],
  ['Desde hace años, a los alumnos «problema» se les sienta hasta atrás y nadie lo cuestiona.', 'estr', 'Es una exclusión que se volvió costumbre: barrera estructural.'],
  ['En Educación Física las actividades siempre son de velocidad; quien no corre rápido se queda sentado.', 'did', 'Es la forma de plantear la actividad la que deja fuera: barrera didáctica.'],
  ['«Con tantos alumnos no puedo atender a uno por uno; que lo apoye su familia.»', 'actit', 'Es una forma de ver la diversidad como carga ajena: barrera actitudinal.'],
  ['Solo pueden ir al concurso de oratoria los alumnos con promedio de nueve o más.', 'norm', 'Es una disposición que excluye sin relación con la habilidad que se evalúa: barrera normativa.'],
  ['Los avisos a las familias se mandan solo por el grupo de WhatsApp, y varias familias no tienen datos.', 'estr', 'Es la forma en que la escuela se organiza y que deja fuera a algunos, sin que nadie lo decida: barrera estructural.'],
];
const SALIDA = [
  ['Poner en la entrada de la escuela avisos con letra grande y pictogramas.', 'acc', 'Es para toda la comunidad y está en el entorno: accesibilidad.'],
  ['Planear fracciones con material concreto y un video, y que cada quien explique su resultado de forma oral o por escrito.', 'dua', 'Se pensó desde el inicio para todo el grupo, con varias formas de aprender y de demostrar: Diseño Universal.'],
  ['A Luis, que tiene baja visión, darle las copias en letra grande y dejarlo usar la cámara del celular para ampliar el pizarrón.', 'aju', 'Responde a la barrera de un alumno concreto, sin bajar la meta: ajuste razonable.'],
  ['A Sofía, que escribe despacio por su condición motriz, quitarle la mitad de las preguntas del examen.', 'no', 'Reduce lo que se le pide aprender. Lo razonable sería más tiempo o responder de forma oral: eso no es un ajuste.'],
  ['A Andrés, sobresaliente en Matemáticas, pedirle que diseñe problemas del mismo tema para el grupo y los explique.', 'aju', 'Enriquecimiento ligado al tema del grupo y sin separarlo: ajuste razonable.'],
  ['Mientras llega el diagnóstico de USAER, no hacer nada diferente con el alumno.', 'no', 'No se espera un diagnóstico para quitar una barrera que ya se ve.'],
];
const TRAYECTO = [['Comprender el tema de un texto', 'Lenguajes', 72], ['Plantear la estrategia de solución', 'Saberes', 92], ['Usar el lenguaje matemático', 'Saberes', 92], ['Resolver el problema de área y perímetro', 'Saberes', 100]];
const DIA_DIEGO = ['Llegada', 'En el aula', 'Cambio de actividad', 'Recreo', 'Educación Física', 'Trabajo en equipo', 'Materiales', 'Evaluación', 'Salida'];
const GALERIA = ['Parte de una barrera concreta', 'Mantiene la exigencia', 'No lo separa del grupo', 'Dice quién, cuándo y cómo se valora'];

const P = [];
const dia = (titulo, partes, nota = '') => P.push({ t: 'dia', titulo, partes, nota });
/* fig: diagrama completo que empieza tenue; cada «Siguiente» enciende las piezas con data-p igual al número de tarjeta
   y la explicación cae en una tarjeta al lado. */
const fig = (titulo, figura, tarjetas, nota = '') => P.push({ t: 'dia', titulo, fig: figura, partes: tarjetas, nota });
const tj = (c, t, txt) => `<div class="tj" style="--c:${c}"><b>${t}</b>${txt}</div>`;
const act = (o) => P.push({ t: 'act', ...o });
const C = { n: 'var(--noche)', o: 'var(--oro)', a: 'var(--acc)', d: 'var(--dua)', j: 'var(--aju)', r: 'var(--no)' };

dia('Ajustes razonables en la atención de niñas, niños y adolescentes con discapacidad y aptitudes sobresalientes',
  ['<p class="sub">Consejo Técnico Escolar · Escuela Secundaria Técnica N.° 17, Turno Vespertino · Campo formativo de Lenguajes</p>',
   '<div class="qr-aviso">Saquen su celular: hoy cada quien participa desde su teléfono. Escaneen el código de la derecha.</div>'], 'portada');

fig('¿Para qué esta sesión?',
  `<div class="vruta">${[['Comprender', 'qué es un ajuste razonable'], ['Distinguir', 'tres conceptos que se confunden'], ['Identificar', 'las barreras de nuestra escuela'], ['Vincular', 'con el Programa Analítico y la mejora continua']]
    .map(([a, b], n) => `<div data-p="${n + 1}"><i>${n + 1}</i><span><b>${a}</b>${b}</span></div>`).join('')}</div>`,
  [tj(C.n, 'Comprender', 'Diseñar e implementar ajustes razonables dentro de nuestras aulas, no en un papel.'),
   tj(C.a, 'Distinguir', 'Ajuste razonable, accesibilidad universal y Diseño Universal para el Aprendizaje: un derecho, no un privilegio.'),
   tj(C.r, 'Identificar', 'Las Barreras para el Aprendizaje y la Participación que hay en nuestra escuela, con nuestros propios datos.'),
   tj(C.d, 'Vincular', 'Que lo que decidamos hoy entre al Programa Analítico y al Programa de mejora continua.')]);

fig('La inclusión no es solo estar inscrito',
  `<div class="escalera">${['Acceder', 'Participar', 'Aprender', 'Comunicarse', 'Demostrar lo que sabe'].map((t, n) => `<div data-p="1" style="--h:${34 + n * 16}%;--d:${n * .18}s"><span>${t}</span></div>`).join('')}
    <div class="meta" data-p="2">La misma meta de aprendizaje para todo el grupo</div><div class="sello" data-p="3">Derecho,<br>no privilegio</div></div>`,
  [tj(C.d, 'Incluir es una escalera completa', 'Que cada estudiante pueda acceder, participar, aprender, comunicarse y demostrar lo que sabe, en igualdad de condiciones.'),
   tj(C.o, 'Sin bajar la meta', 'Un ajuste razonable cambia la organización, los espacios, la comunicación, los materiales, la didáctica o la evaluación… sin reducir las expectativas y sin separarlo del grupo.'),
   tj(C.r, 'No es algo «especial» aparte', 'Es transformar lo que le estorba. No es un favor: es garantizar un derecho.')]);

act({ id: 'refl', tipo: 'abiertas', min: 5, titulo: 'Para reflexionar', instr: 'Contesta con tus palabras, pensando en tu propia práctica. Nadie verá tu nombre en la pantalla.',
  preguntas: [['¿Qué hacemos en nuestra escuela para facilitar la participación de todas y todos nuestros estudiantes?', 'Ej.: En Ciencias formamos equipos mixtos y rotamos los roles.'],
    ['¿Qué hacemos o dejamos de hacer, sin querer, que obstaculiza el aprendizaje de algunos estudiantes?', 'Ej.: Dicto rápido y no reviso que todos hayan copiado la indicación.']] });

fig('La discapacidad desde un enfoque de derechos',
  `<div class="ecuacion" data-p="1"><div style="--c:var(--noche)">Características<br>de la persona</div><em>+</em><div style="--c:var(--no)">Barreras<br>del entorno</div><em>=</em><div style="--c:var(--oro)">Discapacidad</div></div>
   <div class="pilares">${[['Convención y Ley General para la Inclusión', 'Ajustes necesarios y adecuados, sin carga desproporcionada'], ['Ley General de Educación', 'La escuela está obligada a hacerlos'], ['Plan de Estudio 2022', 'Lectura de la realidad, codiseño y evaluación formativa']]
     .map(([a, b], n) => `<div data-p="${n + 2}"><b>${a}</b><span>${b}</span></div>`).join('')}<div class="techo">Derecho a la educación</div></div>`,
  [tj(C.r, 'La discapacidad está en la interacción', 'No solo en la persona: aparece cuando sus características chocan con barreras del entorno. Si quitamos la barrera, cambia el resultado.'),
   tj(C.n, 'Convención y Ley General para la Inclusión', 'Ajustes necesarios y adecuados, sin carga desproporcionada, para ejercer los derechos en igualdad.'),
   tj(C.n, 'Ley General de Educación', 'La escuela está obligada a hacer ajustes razonables, en especial para discapacidad, aptitudes sobresalientes y trastornos.'),
   tj(C.n, 'Plan de Estudio 2022', 'Lectura de la realidad, codiseño en el Programa Analítico, eje articulador de Inclusión y evaluación formativa.')]);

fig('Tres conceptos que se confunden',
  `<svg class="ondas" viewBox="0 0 520 520" role="img" aria-label="Círculos concéntricos">
    <g data-p="1"><circle cx="260" cy="260" r="250" fill="#DCE7F8" stroke="#2F6FD1" stroke-width="4"/><text x="260" y="52" text-anchor="middle" class="t1" fill="#1F4F9E">Accesibilidad universal</text><text x="260" y="80" text-anchor="middle" class="t2">toda la comunidad</text></g>
    <g data-p="2"><circle cx="260" cy="275" r="168" fill="#D7EFE0" stroke="#2E8B57" stroke-width="4"/><text x="260" y="152" text-anchor="middle" class="t1" fill="#1E6B41">Diseño Universal</text><text x="260" y="180" text-anchor="middle" class="t2">todo el grupo</text></g>
    <g data-p="3"><circle cx="260" cy="300" r="92" fill="#F6E3BF" stroke="#C98A2C" stroke-width="4"/><text x="260" y="296" text-anchor="middle" class="t1" fill="#8A5A12" style="font-size:22px">Ajuste razonable</text><text x="260" y="324" text-anchor="middle" class="t2">una o un estudiante</text></g></svg>`,
  [tj(C.a, 'Accesibilidad universal', '<b>Para:</b> toda la comunidad. <b>Cuándo:</b> desde la infraestructura y los sistemas. Rampas, señalética, pictogramas, plataformas accesibles.'),
   tj(C.d, 'Diseño Universal (DUA)', '<b>Para:</b> todo el grupo. <b>Cuándo:</b> al planear. Varias formas de presentar, de participar y de demostrar lo aprendido.'),
   tj(C.j, 'Ajuste razonable', '<b>Para:</b> una o un estudiante concreto. <b>Cuándo:</b> cuando lo anterior no alcanzó. Macrotipo, más tiempo, consigna leída, mesa a su altura.')]);

dia('Un ajuste razonable sí implica… y no significa…', [
  '<div class="dos"><div class="caja ok"><b>Sí implica</b><ul><li>Partir de la situación concreta de la persona.</li><li>Identificar la barrera antes de decidir el ajuste.</li><li>Involucrar docentes, directivos, familia y al estudiante.</li><li>Definir qué cambia, para qué, quién lo hace y cómo se valora.</li></ul></div>',
  '<div class="caja mal"><b>No significa</b><ul><li>Esperar un diagnóstico clínico.</li><li>Bajar la exigencia o quitar contenidos.</li><li>Que alguien más haga la actividad por él.</li><li>Separarlo del grupo.</li><li>Aplicar el mismo ajuste a todo el grupo.</li></ul></div></div>']);

act({ id: 'juego', tipo: 'juego', min: 10, titulo: 'Juego: ¿accesibilidad, Diseño Universal o ajuste razonable?', instr: 'Elige tu respuesta en tu celular. Cuando todos contesten se revela la correcta.', casos: JUEGO });

fig('Aptitudes sobresalientes: también llevan ajustes',
  `<div class="rama"><div class="raiz">Una alumna termina todo antes que el grupo</div>
    <div class="ramas"><div data-p="1" class="mal"><b>Más de lo mismo</b><span>El doble de ejercicios</span><span>Separarla del grupo</span><span>Temas de otro grado sin sentido</span><em>Se aburre y se desmotiva</em></div>
    <div data-p="2" class="ok"><b>Enriquecer</b><span>Proyecto de investigación</span><span>Problemas abiertos</span><span>Crear, programar, coordinar</span><em>Ligado a lo que ve el grupo</em></div></div>
    <div class="contador" data-p="3"><b data-cnt="9">9</b><span>alumnos con aprendizaje desarrollado en tres o cuatro campos de los EIA</span></div></div>`,
  [tj(C.r, 'No es más trabajo', 'Dar el doble de ejercicios, separarlo o adelantarle temas sin ton ni son desmotiva.'),
   tj(C.d, 'Es enriquecer', 'Proyectos de investigación, problemas abiertos, creación artística, programación, lectura especializada, ligados al tema del grupo.'),
   tj(C.o, 'En nuestra escuela', 'Nueve alumnos destacan en tres o cuatro campos. Son candidatos, no un diagnóstico. También hay que ver sus dificultades.')]);

fig('Barreras para el Aprendizaje y la Participación',
  `<div class="muros"><div class="m n" data-p="1"><b>Actitudinales</b>creencias y trato</div><div class="m o" data-p="2"><b>Estructurales</b>exclusión hecha costumbre</div>
    <div class="alumno">Estudiante</div><div class="m e" data-p="3"><b>Didácticas</b>cómo enseñamos y evaluamos</div><div class="m s" data-p="4"><b>Normativas</b>reglas que impiden</div></div>
    <div class="dims" data-p="5"><span>Culturas</span><span>Políticas</span><span>Prácticas</span></div>`,
  [tj(C.r, 'Actitudinales', 'Creencias y formas de trato hacia la diversidad. «Ese no va a poder.»'),
   tj(C.r, 'Estructurales', 'La exclusión que se volvió costumbre y ya nadie ve.'),
   tj(C.r, 'Didácticas', 'Métodos de enseñanza y evaluación que no responden a las necesidades reales.'),
   tj(C.r, 'Normativas', 'Reglas, disposiciones y políticas que impiden participar.'),
   tj(C.n, 'Tres dimensiones para reconocerlas', '<b>Culturas</b> (valores y creencias), <b>políticas</b> (cómo nos organizamos) y <b>prácticas</b> (lo que hacemos en el aula).')],
  'Para profundizar: Manual de Apoyo a la Educación Inclusiva, USAER, Secretaría de Educación del Estado de Campeche, 2017.');

act({ id: 'barr', tipo: 'juego', min: 7, ops: OPS2, titulo: 'Juego: ¿qué tipo de barrera es?', instr: 'Lee la situación y elige el tipo de barrera en tu celular.', casos: JUEGO2 });

fig('¿Qué barreras se asoman en nuestros datos?',
  `<div class="cifras2">${[['100', ' %', 'de tercero sacó cero o uno al resolver el problema de área y perímetro'], ['83', ' %', 'de tercero no logró usar la infografía'], ['30', '', 'números de lista sin resultado: no presentaron'], ['32', '', 'alumnos requieren apoyo en tres o cuatro campos']]
    .map(([v, s, t], n) => `<div data-p="${n + 1}"><b data-cnt="${v}" data-suf="${s}">${v}${s}</b><span>${t}</span></div>`).join('')}</div>
    <p class="pregunta" data-p="5">«¿Las actividades permiten demostrar el aprendizaje sin que una barrera influya en el resultado?»</p>`,
  [tj(C.r, 'Área y perímetro', 'Ni un solo alumno de tercero resolvió bien el problema.'),
   tj(C.r, 'Infografía', 'Ocho de cada diez no lograron usarla para explicar.'),
   tj(C.o, 'No presentaron', 'Treinta alumnos sin resultado. No participar también es un dato.'),
   tj(C.r, 'Apoyo en casi todo', 'Treinta y dos alumnos requieren apoyo en tres o cuatro campos.'),
   tj(C.n, 'La pregunta de la SEP', 'Antes de decir «no saben», preguntémonos si la forma de evaluar fue la barrera.')],
  'Fuente: reportes oficiales de los EIA Fase 6, 30 de septiembre de 2026.');

fig('¿No saben matemáticas… o no comprendieron la consigna?',
  `<div class="trayecto">${TRAYECTO.map(([t, c, v], n) => `<div class="est" data-p="${n + 1}"><div class="aro" style="--v:${v}"><b data-cnt="${v}" data-suf=" %">${v} %</b></div><span>${t}</span><small>${c}</small></div>`).join('<div class="flecha"></div>')}</div>
    <div class="bifurca"><div data-p="5" class="lect"><b>Si la falla empieza al leer</b>La barrera está en cómo presentamos: consignas largas, sin apoyo visual. <i>Ajuste en la consigna.</i></div>
    <div data-p="5" class="mat"><b>Si leyó bien y no planteó</b>Falta enseñanza matemática: estrategias y lenguaje. <i>Ajuste en la didáctica.</i></div></div>`,
  [tj(C.r, 'Primero, leer', 'En el mismo examen, siete de cada diez alumnos de tercero no comprendieron el tema de un texto.'),
   tj(C.r, 'Después, plantear', 'Nueve de cada diez no plantearon una estrategia de solución.'),
   tj(C.r, 'El lenguaje matemático', 'Nueve de cada diez no lo usaron de forma adecuada.'),
   tj(C.r, 'Y al final, resolver', 'Nadie resolvió el problema. La falla no aparece al final: viene desde el principio del camino.'),
   tj(C.n, 'Dos caminos, dos ajustes distintos', 'Es una pregunta para investigar, no una conclusión. Saber dónde empieza la falla nos dice qué ajuste hacer. La lectura de Raíces y Estrellas nos da la otra mitad del dato.')],
  'Porcentaje de alumnos de tercero con nivel cero o uno en cada criterio. Fuente: EIA Fase 6, 30 de septiembre de 2026.');

act({ id: 'analisis', tipo: 'abiertas', min: 8, titulo: 'Analicemos nuestros datos', instr: 'Piensa en los datos de la escuela y en tus grupos. Escribe ideas concretas.',
  preguntas: [['En tercero nadie resolvió el problema de área y perímetro. ¿Qué barreras, más allá de «no saben», pueden explicar ese resultado?', 'Ej.: La consigna era larga y con términos que no usamos en clase.'],
    ['Argumentar es lo más débil en los tres grados. ¿Qué hacemos o dejamos de hacer en clase que contribuye a eso?', 'Ej.: Aceptamos respuestas de una palabra y no pedimos el porqué.'],
    ['Treinta alumnos no presentaron los EIA. ¿Qué barreras de participación puede haber detrás de un alumno que falta a una evaluación?', 'Ej.: Trabaja por las tardes; nadie le avisó a la familia de la fecha.'],
    ['Piensa en un alumno de tus grupos, sin decir su nombre. ¿Qué barrera enfrenta y qué haces hoy para disminuirla?', 'Ej.: Un alumno de 2.° no escucha bien; lo siento al frente pero no le doy nada por escrito.']] });

fig(`Leer la realidad: la jornada de ${CASO.nombre}`,
  `<div class="ficha" data-p="1"><b>${CASO.nombre}</b><span>${CASO.grado} · nombre ficticio, datos reales</span><div>${CASO.niveles.map(n => `<em>${n}: requiere apoyo</em>`).join('')}</div></div>
   <div class="camino">${DIA_DIEGO.map((m, n) => `<div data-p="2" style="--d:${n * .22}s"><i>${n + 1}</i>${m}</div>`).join('')}</div>
   <p class="pregunta" data-p="3">¿En qué momento del día aparece una barrera?</p>`,
  [tj(C.r, CASO.nombre, `Requiere apoyo en los cuatro campos. Sacó <b>cero</b> en: ${CASO.ceros}. Sacó <b>uno</b> en: ${CASO.unos}.`),
   tj(C.n, 'Recorramos su día', 'De la llegada a la salida. Las barreras no solo están en el examen: también en el recreo, en el equipo, en los materiales.'),
   tj(C.o, 'Ahora tú', 'En tu celular, escribe qué podría ser una barrera para Diego en cada momento.')]);

act({ id: 'jornada', tipo: 'jornada', min: 8, titulo: `La jornada de ${CASO.nombre}`, instr: 'En cada momento escribe qué podría ser una barrera para Diego. Deja vacío lo que no identifiques.', momentos: MOMENTOS });

fig('Priorizar: no todo a la vez',
  `<div class="embudo"><div data-p="1" style="--w:100%">Todas las barreras que encontramos</div><div data-p="2" style="--w:78%">Cinco criterios de la SEP</div><div data-p="3" style="--w:50%">Una o dos barreras</div></div>`,
  [tj(C.n, 'Empezamos con muchas', 'Todo lo que vimos en la jornada de Diego y en nuestros datos.'),
   tj(C.o, 'Las pasamos por cinco criterios', `<ol>${CRIT.map(c => `<li>${c}</li>`).join('')}</ol>`),
   tj(C.d, 'Nos quedamos con una o dos', 'Las de mayor impacto y que podamos cambiar pronto. Lo demás espera su turno.')]);

act({ id: 'prior', tipo: 'priorizar', min: 6, titulo: 'Priorizar las barreras', instr: 'Califica cada barrera del uno al cinco en cada criterio.', crit: CRIT });

fig('Los seis pasos de un ajuste razonable',
  `<div class="ciclo"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="#E3D7BF" stroke-width="1.4" stroke-dasharray="2 2"/></svg><div class="centro">Ajuste<br>razonable</div>
    ${SEIS.map(([k, t], n) => { const a = (-90 + n * 60) * Math.PI / 180; return `<div class="nodo" data-p="${n + 1}" style="left:${(50 + 38 * Math.cos(a)).toFixed(1)}%;top:${(50 + 38 * Math.sin(a)).toFixed(1)}%"><i>${n + 1}</i>${t}</div>`; }).join('')}</div>`,
  SEIS.map(([k, t, q, ej], n) => tj(n === 3 ? C.j : C.n, `${n + 1}. ${t}`, `${q}<br><small>${ej}</small>`)));

act({ id: 'ajuste', tipo: 'pasos', min: 10, titulo: 'Mi ajuste razonable para Diego', instr: 'Desde tu asignatura, diseña un ajuste para Diego con los seis pasos.', pasos: SEIS });

fig('Ajustes razonables, Programa Analítico y mejora continua',
  `<div class="serp">${['Lectura de la realidad', 'Diagnóstico', 'Codiseño', 'Programa Analítico', 'Planeación', 'Evaluación formativa', 'Seguimiento', 'Mejora continua'].map((t, n) => `<div data-p="${n < 5 ? 1 : 2}" style="--d:${(n % 5) * .2}s"><i>${n + 1}</i>${t}</div>`).join('')}</div>`,
  [tj(C.n, 'No es un documento aparte', 'El ajuste se integra a la planeación y al Programa Analítico, desde la lectura de la realidad.'),
   tj(C.d, 'Si se repite, es de la escuela', 'Una barrera que aparece en varios grupos entra al Programa de mejora continua con objetivos, metas y acciones. Deja de depender de la buena voluntad de un solo docente.')]);

act({ id: 'salida', tipo: 'juego', min: 6, compara: 'juego', titulo: 'Juego de salida: ¿cuánto aprendimos?', instr: 'Situaciones nuevas. Al final comparamos con el juego del inicio.', casos: SALIDA });

act({ id: 'compromiso', tipo: 'compromiso', min: 4, titulo: 'Mi compromiso', instr: 'Escribe un cambio o un ajuste concreto que aplicarás en tu clase la próxima semana.' });

dia('Gracias', ['<p class="grande">No se trata de diversificar todo, para cada alumno, todos los días. Se trata de <b>quitar la barrera que más estorba</b>, en el momento en que estorba.</p>',
  '<p class="grande">Llévate la <a href="cte-hoja.html" target="_blank"><b>hoja de ajustes razonables</b></a>: los conceptos, cuatro preguntas para revisar tu aula y tu plan.</p>'], 'cierre');

return { PASOS: P, OPS, OPS2, MOMENTOS, CRIT, SEIS, CASO, JUEGO, GALERIA };
})();
