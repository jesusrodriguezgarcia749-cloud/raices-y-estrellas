/* Raíces y Estrellas · Reporte general del alumno (EST 17, Turno Vespertino).
   Datos compartidos por el panel directivo (app.js) y la hoja que llenan los maestros (reporte.html).
   · PLANTILLA_INICIAL: asignaturas y maestros de cada grupo, tomados del Horario General Oficial 2026-2027.
     El directivo la puede corregir desde la pestaña «Reportes» (se guarda en Firebase y manda sobre esta).
   · RUBROS_REPORTE: lo que llena cada maestro de su asignatura. */

const PLANTILLA_INICIAL = {
  "1G": [
    ["Español", "Sin docente asignado"], ["Inglés", "Alicia Gpe. Alcántara Arenas"], ["Matemáticas", "Minerva de la C. Martínez Carrillo"],
    ["Ciencias: Biología", "Karla Canul Villalobos"], ["Geografía", "Jorge Antonio Cruz Cosgaya"], ["Historia", "Beatriz A. Avilez Salazar"],
    ["Formación Cívica y Ética", "Beatriz A. Avilez Salazar"], ["Artes", "Omar Ortega Pacheco"], ["Educación Física", "Nelson Tun Burgos"],
    ["Tecnología: Informática", "Antonio Tadeo Quijano Cu"], ["Tecnología: Electrónica-Robótica", "Ramonita Díaz S."],
    ["Integración Curricular", "Diana Cabañas Hau"], ["Tutoría y Educación Socioemocional", "Diana Cabañas Hau"]
  ],
  "1H": [
    ["Español", "Sin docente asignado"], ["Inglés", "Alicia Gpe. Alcántara Arenas"], ["Matemáticas", "Minerva de la C. Martínez Carrillo"],
    ["Ciencias: Biología", "Karla Canul Villalobos"], ["Geografía", "Jorge Antonio Cruz Cosgaya"], ["Historia", "Anastasia Vivas Manrique"],
    ["Formación Cívica y Ética", "Simón Perera Dzul"], ["Artes", "Omar Ortega Pacheco"], ["Educación Física", "Nelson Tun Burgos"],
    ["Tecnología: Preparación y Conservación de Alimentos", "Cynthia Rodríguez Cetz"],
    ["Integración Curricular", "Simón Perera Dzul"], ["Tutoría y Educación Socioemocional", "Simón Perera Dzul"]
  ],
  "1I": [
    ["Español", "Sin docente asignado"], ["Inglés", "Alicia Gpe. Alcántara Arenas"], ["Matemáticas", "Minerva de la C. Martínez Carrillo"],
    ["Ciencias: Biología", "Karla Canul Villalobos"], ["Geografía", "Jorge Antonio Cruz Cosgaya"], ["Historia", "Ingrid R. de la Gala Soberanis"],
    ["Formación Cívica y Ética", "Simón Perera Dzul"], ["Artes", "Alejandra R. Rodríguez Estrada"], ["Educación Física", "Nelson Tun Burgos"],
    ["Tecnología: Electrónica-Robótica", "Ramonita Díaz S."],
    ["Integración Curricular", "Ramonita Díaz S."], ["Tutoría y Educación Socioemocional", "Ramonita Díaz S."]
  ],
  "2G": [
    ["Español", "Sin docente asignado"], ["Inglés", "Alicia Gpe. Alcántara Arenas"], ["Matemáticas", "Marcos Gutiérrez Ramírez"],
    ["Ciencias: Física", "Elvira Asalia Garfias Hernández"], ["Historia", "Anastasia Vivas Manrique"],
    ["Formación Cívica y Ética", "Ingrid R. de la Gala Soberanis"], ["Artes", "Alejandra R. Rodríguez Estrada"], ["Educación Física", "Nelson Tun Burgos"],
    ["Tecnología: Informática", "Antonio Tadeo Quijano Cu"],
    ["Integración Curricular", "Ingrid R. de la Gala Soberanis"], ["Tutoría y Educación Socioemocional", "Ingrid R. de la Gala Soberanis"]
  ],
  "2H": [
    ["Español", "Sin docente asignado"], ["Inglés", "Alicia Gpe. Alcántara Arenas"], ["Matemáticas", "Marcos Gutiérrez Ramírez"],
    ["Ciencias: Física", "Geydi C. Gómez Brito"], ["Historia", "Anastasia Vivas Manrique"],
    ["Formación Cívica y Ética", "Simón Perera Dzul"], ["Artes", "Alejandra R. Rodríguez Estrada"], ["Educación Física", "Nelson Tun Burgos"],
    ["Tecnología: Preparación y Conservación de Alimentos", "Cynthia Rodríguez Cetz"],
    ["Integración Curricular", "Geydi C. Gómez Brito"], ["Tutoría y Educación Socioemocional", "Geydi C. Gómez Brito"]
  ],
  "3G": [
    ["Español", "Guadalupe I. Quiñones Heredia"], ["Inglés", "Alicia Gpe. Alcántara Arenas"], ["Matemáticas", "José Escamilla León"],
    ["Ciencias: Química", "Flor M. Zavala Lizárraga"], ["Historia", "Beatriz A. Avilez Salazar"],
    ["Formación Cívica y Ética", "Simón Perera Dzul"], ["Artes", "Alejandra R. Rodríguez Estrada"], ["Educación Física", "Nelson Tun Burgos"],
    ["Tecnología: Electrónica-Robótica", "Ramonita Díaz S."],
    ["Integración Curricular", "Guadalupe I. Quiñones Heredia"], ["Tutoría y Educación Socioemocional", "Guadalupe I. Quiñones Heredia"]
  ],
  "3H": [
    ["Español", "Alfredo Hernández Ehuan"], ["Inglés", "Alicia Gpe. Alcántara Arenas"], ["Matemáticas", "José Escamilla León"],
    ["Ciencias: Química", "Luisa Wong Sierra"], ["Historia", "Lizette Ortega Aranda"],
    ["Formación Cívica y Ética", "Simón Perera Dzul"], ["Artes", "Alejandra R. Rodríguez Estrada"], ["Educación Física", "Nelson Tun Burgos"],
    ["Tecnología: Preparación y Conservación de Alimentos", "Cynthia Rodríguez Cetz"],
    ["Integración Curricular", "Lizette Ortega Aranda"], ["Tutoría y Educación Socioemocional", "Lizette Ortega Aranda"]
  ]
};

/* Preguntas de opción (una sola respuesta). nivel: 0 = bien, 1 = a veces, 2 = problema. */
const OPCIONES_REPORTE = [
  { id: 'asistencia', nombre: 'Asistencia', corto: 'Asist.', ops: ['Asiste regularmente', 'Falta a veces', 'Falta con frecuencia'] },
  { id: 'puntualidad', nombre: 'Puntualidad', corto: 'Puntual.', ops: ['Llega a tiempo', 'A veces llega tarde', 'Llega tarde o se sale sin permiso'] },
  { id: 'uniforme', nombre: 'Uniforme y presentación', corto: 'Unif.', ops: ['Completo', 'A veces incompleto', 'Incompleto o no lo porta'] },
  { id: 'material', nombre: 'Material de trabajo', corto: 'Mat.', ops: ['Siempre lo trae', 'A veces lo olvida', 'Casi nunca lo trae'] },
  { id: 'tareas', nombre: 'Tareas', corto: 'Tareas', ops: ['Entrega todas o casi todas', 'Entrega algunas', 'Casi no entrega'] },
  { id: 'trabajo', nombre: 'Trabajo en clase', corto: 'Trab.', ops: ['Trabaja y termina', 'Trabaja a medias', 'No trabaja'] },
  { id: 'actitud', nombre: 'Actitud y participación', corto: 'Actitud', ops: ['Participa y se interesa', 'Distraído o apático', 'Desafiante o se niega a trabajar'] }
];

/* Conductas que el maestro puede marcar (varias). */
const CONDUCTAS_REPORTE = [
  'Falta de respeto al docente', 'Burlas o falta de respeto a compañeros', 'Lenguaje inapropiado o groserías',
  'Uso del celular en clase', 'Juegos bruscos o agresión física', 'Interrumpe la clase o platica constantemente',
  'No sigue indicaciones', 'Sale del salón sin permiso', 'Daña mobiliario o material', 'Se duerme o no pone atención'
];

/* Textos abiertos, con ejemplo guía (de otro caso) debajo de cada uno. */
const TEXTOS_REPORTE = [
  { id: 'incidencias', nombre: 'Incidencias o reportes en el periodo', ej: 'Ej.: 22 de octubre, aventó la mochila de un compañero por la ventana; se le levantó reporte y se habló con él.' },
  { id: 'fortalezas', nombre: 'Fortalezas del alumno', ej: 'Ej.: Es muy hábil para dibujar y explica bien a sus compañeros cuando entiende el tema.' },
  { id: 'recomendacion', nombre: 'Lo que le pido a la familia', ej: 'Ej.: Revisar cada noche la libreta y firmar las tareas; que traiga su calculadora los martes y jueves.' }
];

const MOTIVOS_REPORTE = ['Incumplimiento de tareas y trabajos', 'Conducta', 'Bajo rendimiento o riesgo de reprobación', 'Inasistencias o retardos', 'Uniforme y presentación', 'Seguimiento general'];

/* Calificación mínima aprobatoria; debajo de esto se marca «en riesgo de reprobar». */
const MINIMA_REPORTE = 6;
