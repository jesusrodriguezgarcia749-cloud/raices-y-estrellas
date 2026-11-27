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

const P = [];
const dia = (titulo, partes, nota = '') => P.push({ t: 'dia', titulo, partes, nota });
const act = (o) => P.push({ t: 'act', ...o });

dia('Ajustes razonables en la atención de niñas, niños y adolescentes con discapacidad y aptitudes sobresalientes',
  ['<p class="sub">Consejo Técnico Escolar · Escuela Secundaria Técnica N.° 17, Turno Vespertino · Campo formativo de Lenguajes</p>',
   '<div class="qr-aviso">Saquen su celular: hoy cada quien participa desde su teléfono. Escaneen el código de la derecha.</div>'], 'portada');
dia('¿Para qué esta sesión?', [
  '<div class="caja"><b>Propósito general</b>Comprender, diseñar e implementar ajustes razonables dentro de nuestras aulas.</div>',
  '<div class="caja">Distinguir <b>ajuste razonable</b>, <b>accesibilidad universal</b> y <b>Diseño Universal para el Aprendizaje</b>, como un derecho y no como un privilegio.</div>',
  '<div class="caja">Identificar, disminuir o eliminar las <b>Barreras para el Aprendizaje y la Participación</b> de nuestra escuela.</div>',
  '<div class="caja">Vincularlo con el <b>Programa Analítico</b> y el <b>Programa de mejora continua</b>.</div>']);
dia('La inclusión no es solo estar inscrito', [
  '<p class="grande">Incluir es que cada estudiante pueda <b>acceder</b>, <b>participar</b>, <b>aprender</b>, <b>comunicarse</b> y <b>demostrar lo que sabe</b> en igualdad de condiciones.</p>',
  '<div class="caja">Un <b>ajuste razonable</b> modifica la organización, los espacios, la comunicación, los materiales, la didáctica o la evaluación…</div>',
  '<div class="caja aviso">…sin reducir las expectativas de aprendizaje y sin separar al estudiante de su grupo.</div>',
  '<p class="grande">No es hacer algo «especial» aparte: es <b>transformar lo que le estorba</b>. No es un privilegio: es garantizar un derecho.</p>']);
act({ id: 'refl', tipo: 'abiertas', titulo: 'Para reflexionar', instr: 'Contesta con tus palabras, pensando en tu propia práctica. Nadie verá tu nombre en la pantalla.',
  preguntas: [['¿Qué hacemos en nuestra escuela para facilitar la participación de todas y todos nuestros estudiantes?', 'Ej.: En Ciencias formamos equipos mixtos y rotamos los roles.'],
    ['¿Qué hacemos o dejamos de hacer, sin querer, que obstaculiza el aprendizaje de algunos estudiantes?', 'Ej.: Dicto rápido y no reviso que todos hayan copiado la indicación.']] });
dia('La discapacidad desde un enfoque de derechos', [
  '<p class="grande">La discapacidad no está solo en la persona: resulta de la <b>interacción</b> entre sus características y las <b>barreras</b> del entorno.</p>',
  '<div class="caja">Convención sobre los Derechos de las Personas con Discapacidad y Ley General para la Inclusión: ajustes <b>necesarios y adecuados</b>, sin carga desproporcionada, para ejercer los derechos en igualdad.</div>',
  '<div class="caja">Ley General de Educación: la escuela está <b>obligada</b> a hacer ajustes razonables, en especial para discapacidad, aptitudes sobresalientes y trastornos.</div>',
  '<div class="caja">Plan de Estudio 2022: lectura de la realidad, codiseño en el Programa Analítico, eje articulador de Inclusión y evaluación formativa.</div>']);
dia('Tres conceptos que se confunden', [
  '<div class="tres"><div style="--c:#2F6FD1"><h4>Accesibilidad universal</h4><p><b>Para:</b> toda la comunidad.<br><b>Cuándo:</b> desde la infraestructura y los sistemas.</p><p class="ej">Rampas, señalética, pictogramas, plataformas accesibles.</p></div>',
  '<div style="--c:#2E8B57"><h4>Diseño Universal (DUA)</h4><p><b>Para:</b> todo el grupo.<br><b>Cuándo:</b> al planear.</p><p class="ej">Varias formas de presentar la información, de participar y de demostrar lo aprendido.</p></div>',
  '<div style="--c:#C98A2C"><h4>Ajuste razonable</h4><p><b>Para:</b> una o un estudiante concreto.<br><b>Cuándo:</b> cuando lo anterior no alcanzó.</p><p class="ej">Textos en macrotipo, más tiempo, consigna leída, mesa a su altura.</p></div></div>']);
dia('Un ajuste razonable sí implica… y no significa…', [
  '<div class="dos"><div class="caja ok"><b>Sí implica</b><ul><li>Partir de la situación concreta de la persona.</li><li>Identificar la barrera antes de decidir el ajuste.</li><li>Involucrar docentes, directivos, familia y al estudiante.</li><li>Definir qué cambia, para qué, quién lo hace y cómo se valora.</li></ul></div>',
  '<div class="caja mal"><b>No significa</b><ul><li>Esperar un diagnóstico clínico.</li><li>Bajar la exigencia o quitar contenidos.</li><li>Que alguien más haga la actividad por él.</li><li>Separarlo del grupo.</li><li>Aplicar el mismo ajuste a todo el grupo.</li></ul></div></div>']);
act({ id: 'juego', tipo: 'juego', titulo: 'Juego: ¿accesibilidad, Diseño Universal o ajuste razonable?', instr: 'Elige tu respuesta en tu celular. Cuando todos contesten se revela la correcta.', casos: JUEGO });
dia('Aptitudes sobresalientes: también llevan ajustes', [
  '<div class="caja mal"><b>No es</b> dar más trabajo, separarlo del grupo ni adelantarle temas de grados superiores sin ton ni son: eso desmotiva.</div>',
  '<div class="caja ok"><b>Es</b> enriquecer: proyectos de investigación, problemas abiertos, creación artística, programación, lectura especializada, ligados a lo que ve el grupo.</div>',
  '<div class="caja">Considerar sus fortalezas <b>y también</b> sus dificultades. En nuestros EIA, <b>nueve alumnos</b> tienen aprendizaje desarrollado en tres o cuatro campos: son candidatos, no un diagnóstico.</div>']);
dia('Barreras para el Aprendizaje y la Participación', [
  '<div class="cuatro"><div><b>Actitudinales</b>Creencias y formas de trato hacia la diversidad.</div><div><b>Estructurales</b>La exclusión que se volvió costumbre.</div><div><b>Didácticas</b>Métodos de enseñanza y evaluación que no responden a las necesidades reales.</div><div><b>Normativas</b>Reglas, disposiciones y políticas que impiden.</div></div>',
  '<div class="caja">Para quitarlas hay que reconocerlas en tres dimensiones: <b>culturas</b> (valores y creencias), <b>políticas</b> (cómo nos organizamos) y <b>prácticas</b> (lo que hacemos en el aula).</div>']);
dia('¿Qué barreras se asoman en nuestros datos?', [
  '<p class="grande">La SEP pregunta: <b>«¿Las actividades permiten demostrar el aprendizaje sin que una barrera influya en el resultado?»</b></p>',
  '<div class="cifras"><div><b>100 %</b>de tercero sacó cero o uno al resolver el problema de área y perímetro</div><div><b>83 %</b>de tercero no logró usar la infografía</div><div><b>30</b>números de lista sin resultado: no participaron</div><div><b>32</b>alumnos requieren apoyo en tres o cuatro campos</div></div>',
  '<div class="caja aviso">¿No saben calcular… o no comprendieron una consigna escrita y larga? Si es lo segundo, la barrera no está en el alumno: está en cómo presentamos y evaluamos.</div>'], 'Fuente: reportes oficiales de los EIA Fase 6, 30 de septiembre de 2026.');
act({ id: 'analisis', tipo: 'abiertas', titulo: 'Analicemos nuestros datos', instr: 'Piensa en los datos de la escuela y en tus grupos. Escribe ideas concretas.',
  preguntas: [['En tercero nadie resolvió el problema de área y perímetro. ¿Qué barreras, más allá de «no saben», pueden explicar ese resultado?', 'Ej.: La consigna era larga y con términos que no usamos en clase.'],
    ['Argumentar es lo más débil en los tres grados. ¿Qué hacemos o dejamos de hacer en clase que contribuye a eso?', 'Ej.: Aceptamos respuestas de una palabra y no pedimos el porqué.'],
    ['Treinta alumnos no presentaron los EIA. ¿Qué barreras de participación puede haber detrás de un alumno que falta a una evaluación?', 'Ej.: Trabaja por las tardes; nadie le avisó a la familia de la fecha.'],
    ['Piensa en un alumno de tus grupos, sin decir su nombre. ¿Qué barrera enfrenta y qué haces hoy para disminuirla?', 'Ej.: Un alumno de 2.° no escucha bien; lo siento al frente pero no le doy nada por escrito.']] });
dia(`Leer la realidad: la jornada de ${CASO.nombre}`, [
  `<div class="caso"><b>${CASO.nombre}</b>, ${CASO.grado} (nombre ficticio, datos reales)<br>${CASO.niveles.map(n => `<span class="niv">${n}: Requiere apoyo</span>`).join(' ')}</div>`,
  `<div class="caja">Sacó <b>cero</b> en: ${CASO.ceros}.<br>Sacó <b>uno</b> en: ${CASO.unos}.</div>`,
  '<p class="grande">Recorre su día: llegada, aula, cambios de actividad, recreo, Educación Física, trabajo en equipo, materiales, evaluación y salida. ¿Dónde aparece una barrera?</p>']);
act({ id: 'jornada', tipo: 'jornada', titulo: `La jornada de ${CASO.nombre}`, instr: 'En cada momento escribe qué podría ser una barrera para Diego. Deja vacío lo que no identifiques.', momentos: MOMENTOS });
dia('Priorizar: no todo a la vez', [
  '<p class="grande">Elegimos <b>una o dos barreras</b>: las de mayor impacto y que podamos cambiar pronto.</p>',
  `<div class="caja"><b>Criterios de la SEP:</b><ol>${CRIT.map(c => `<li>${c}</li>`).join('')}</ol></div>`]);
act({ id: 'prior', tipo: 'priorizar', titulo: 'Priorizar las barreras', instr: 'Califica cada barrera del uno al cinco en cada criterio.', crit: CRIT });
dia('Los seis pasos de un ajuste razonable', [
  `<div class="seis">${SEIS.map(([k, t, q], n) => `<div><b>${n + 1}</b><span>${t}</span><small>${q}</small></div>`).join('')}</div>`]);
act({ id: 'ajuste', tipo: 'pasos', titulo: 'Mi ajuste razonable para Diego', instr: 'Desde tu asignatura, diseña un ajuste para Diego con los seis pasos.', pasos: SEIS });
dia('Ajustes razonables, Programa Analítico y mejora continua', [
  '<div class="caja">El ajuste no es un documento aparte: se integra a la <b>planeación</b> y al <b>Programa Analítico</b>.</div>',
  '<div class="caja">Si una barrera se repite, entra al <b>Programa de mejora continua</b> con objetivos, metas y acciones: deja de depender de la buena voluntad de un docente.</div>',
  '<div class="ruta"><span>Lectura de la realidad</span><span>Diagnóstico</span><span>Codiseño</span><span>Programa Analítico</span><span>Planeación</span><span>Evaluación formativa</span><span>Seguimiento</span><span>Mejora continua</span></div>']);
act({ id: 'compromiso', tipo: 'compromiso', titulo: 'Mi compromiso', instr: 'Escribe un cambio o un ajuste concreto que aplicarás en tu clase la próxima semana.' });
dia('Gracias', ['<p class="grande">El producto de la sesión, con la participación y los compromisos, se imprime desde esta pantalla.</p>'], 'cierre');

return { PASOS: P, OPS, MOMENTOS, CRIT, SEIS, CASO, JUEGO };
})();
