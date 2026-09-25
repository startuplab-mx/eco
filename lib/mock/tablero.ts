// Datos sintéticos del tablero de la embajada. Todo es inventado para el demo.
// Regla que el mock respeta: ningún conteo de 1 a 4 se muestra (sale "< 5").

export const MINIMO = 5;
export const PLANTEL = "Plantel piloto (por confirmar)";
export const CORTE = "28 de septiembre de 2026";

export const oculto = (n: number) => n < MINIMO;

// --- Resumen ---------------------------------------------------------------

export const semanas = [
  { semana: "4 ago", serios: 18 },
  { semana: "11 ago", serios: 17 },
  { semana: "18 ago", serios: 18 },
  { semana: "25 ago", serios: 21 },
  { semana: "1 sep", serios: 20 },
  { semana: "8 sep", serios: 20 },
  { semana: "15 sep", serios: 26 },
  { semana: "22 sep", serios: 23 },
];

export const filasMes = [
  { id: "dinero_chamba", nombre: "Dinero o \"chamba\"", n: 22 },
  { id: "molestan_amenazan", nombre: "Molesta, insiste o amenaza", n: 20 },
  { id: "broncas", nombre: "Broncas entre compas", n: 18 },
  { id: "maestro", nombre: "Algo raro con un maestro", n: 9 },
  { id: "otras", nombre: "Otras cosas", n: 20 },
];

export const gravedadMes = { verde: 53, amarillo: 31, rojo: 5 };

export const resumen = {
  reclutamientoMes: 26,
  reclutamientoMesAnterior: 17,
  seriosSemana: 23,
  promedio4Semanas: 21.8,
  recibidosMes: 110,
  filtradosMes: 21,
  rojosMes: 5,
  alertasNuevas: 3,
};

// --- Mapa físico -------------------------------------------------------------

export const ETAPAS = ["contacto", "oferta", "tarea", "enganche", "amenaza"] as const;
export type Etapa = (typeof ETAPAS)[number];
export type PeriodoMapa = "7d" | "30d" | "90d";

export type Celda = {
  id: string;
  nombre: string;
  tipo: "adentro" | "entrada" | "parada" | "colonia" | "en_linea";
  medio: string;
  oferta: string;
  franja: string;
  // Conteos de reportes con señal de reclutamiento, por etapa, en el orden de ETAPAS.
  conteos: Record<PeriodoMapa, [number, number, number, number, number]>;
};

export const celdas: Celda[] = [
  {
    id: "parada",
    nombre: "Parada de la avenida",
    tipo: "parada",
    medio: "Presencial",
    oferta: "Llevar paquete · $500 a $1,500 por encargo",
    franja: "Vespertino (salida)",
    conteos: { "7d": [1, 2, 1, 0, 1], "30d": [2, 3, 2, 0, 1], "90d": [6, 6, 4, 1, 2] },
  },
  {
    id: "colonia_norte",
    nombre: "Colonia norte",
    tipo: "colonia",
    medio: "Presencial",
    oferta: "Avisar · $3,000 a $5,000 al mes",
    franja: "Noche",
    conteos: { "7d": [0, 1, 1, 0, 1], "30d": [1, 2, 2, 0, 1], "90d": [4, 4, 3, 1, 2] },
  },
  {
    id: "entrada",
    nombre: "Entrada principal",
    tipo: "entrada",
    medio: "Presencial",
    oferta: "Chamba sin detalle (\"lana fácil\")",
    franja: "Vespertino (salida)",
    conteos: { "7d": [1, 1, 0, 0, 0], "30d": [2, 2, 1, 0, 0], "90d": [5, 4, 2, 0, 0] },
  },
  {
    id: "adentro",
    nombre: "Adentro del plantel",
    tipo: "adentro",
    medio: "Presencial",
    oferta: "Regalos",
    franja: "Matutino",
    conteos: { "7d": [0, 0, 0, 0, 0], "30d": [1, 1, 0, 0, 0], "90d": [3, 2, 1, 0, 0] },
  },
  {
    id: "colonia_sur",
    nombre: "Colonia sur",
    tipo: "colonia",
    medio: "Presencial",
    oferta: "Chamba sin detalle",
    franja: "Vespertino",
    conteos: { "7d": [0, 0, 0, 0, 0], "30d": [0, 0, 0, 0, 0], "90d": [2, 2, 1, 0, 0] },
  },
  {
    id: "en_linea",
    nombre: "En línea",
    tipo: "en_linea",
    medio: "TikTok y juego en línea",
    oferta: "Regalos (recargas, skins)",
    franja: "Noche",
    conteos: { "7d": [1, 1, 0, 0, 0], "30d": [2, 2, 1, 0, 0], "90d": [5, 5, 2, 0, 0] },
  },
];

// --- Canales digitales ------------------------------------------------------

export const TIPOS_CONTENIDO = ["Oferta", "Corridos", "Retos", "\"Padrino\""] as const;

// Últimos 90 días. Celdas de 1 a 4 ya vienen suprimidas (0 = no hubo o se ocultó).
export const plataformas = [
  { nombre: "TikTok", valores: [11, 14, 6, 5] },
  { nombre: "Juego en línea", valores: [12, 0, 0, 7] },
  { nombre: "WhatsApp", valores: [15, 0, 0, 0] },
  { nombre: "Instagram", valores: [5, 8, 0, 0] },
];
export const plataformasOcultas = ["Telegram", "Otras apps"];

export const meses = ["jun", "jul", "ago", "sep"];
export const evolucion = [
  { nombre: "TikTok", valores: [8, 10, 12, 14] },
  { nombre: "Juego en línea", valores: [5, 6, 6, 7] },
  { nombre: "WhatsApp", valores: [6, 5, 5, 5] },
];

// --- Modo de operar ---------------------------------------------------------

export const zonas = ["Todas las zonas", "Parada de la avenida", "Colonia norte", "Entrada principal", "En línea"] as const;
export type Zona = (typeof zonas)[number];

// Embudo: [contacto, oferta, tarea, enganche, amenaza]. Anterior = jun–jul, actual = ago–sep.
export const embudos: Record<Zona, { anterior: number[]; actual: number[]; escalamiento: number | null }> = {
  "Todas las zonas": { anterior: [11, 10, 5, 0, 0], actual: [12, 13, 8, 5, 5], escalamiento: 1.7 },
  "Parada de la avenida": { anterior: [6, 5, 0, 0, 0], actual: [6, 8, 6, 0, 5], escalamiento: 2.4 },
  "Colonia norte": { anterior: [5, 5, 0, 0, 0], actual: [5, 6, 5, 0, 0], escalamiento: 2.1 },
  "Entrada principal": { anterior: [5, 0, 0, 0, 0], actual: [6, 5, 0, 0, 0], escalamiento: null },
  "En línea": { anterior: [5, 5, 0, 0, 0], actual: [6, 6, 0, 0, 0], escalamiento: null },
};

export const ofertas = [
  { tipo: "Chamba sin detalle", n: 12, monto: "Sin monto (\"lana fácil\")" },
  { tipo: "Avisar", n: 11, monto: "$4,000 al mes (de $3,000 a $5,000)" },
  { tipo: "Llevar paquete", n: 9, monto: "$800 por encargo (de $500 a $1,500)" },
  { tipo: "Regalos", n: 6, monto: "Recargas, skins, tenis" },
  { tipo: "Grabar", n: 3, monto: "" },
  { tipo: "Vender", n: 2, monto: "" },
];

export const pruebas = [
  { tarea: "Avisar o vigilar", n: 8 },
  { tarea: "Llevar algo de un lugar a otro", n: 6 },
  { tarea: "Guardar algo", n: 5 },
  { tarea: "Traer a otro compa", n: 3 },
  { tarea: "Grabar o tomar fotos", n: 2 },
];

export const porFranja = [
  { franja: "Matutino", n: 6 },
  { franja: "Vespertino", n: 22 },
  { franja: "Noche", n: 10 },
  { franja: "Fin de semana", n: 5 },
];

// --- Alertas de patrón -------------------------------------------------------

export type Ficha = {
  id: string;
  regla: string;
  descripcion: string;
  zona: string;
  periodo: string;
  reportes: number;
  medio: string;
  ofertaTarea: string;
  monto: string;
  franja: string;
  etapa: string;
  escalamiento: string;
  confianza: { reportes: number; coincidentes: number; descartados: number };
  grupo?: boolean;
  estado: "nueva" | "revisada";
};

export const fichas: Ficha[] = [
  {
    id: "p-014",
    regla: "Concentración",
    descripcion: "8 o más mensajes serios en la misma celda en 7 días",
    zona: "Parada de la avenida",
    periodo: "15 al 21 de septiembre",
    reportes: 9,
    medio: "Presencial",
    ofertaTarea: "Llevar paquete",
    monto: "$800 por encargo",
    franja: "Vespertino",
    etapa: "Oferta → tarea",
    escalamiento: "Sí, ×2.4 frente a jun–jul",
    confianza: { reportes: 12, coincidentes: 3, descartados: 2 },
    estado: "nueva",
  },
  {
    id: "p-013",
    regla: "Actor persistente",
    descripcion: "Mismo descriptor de actor en 5 o más mensajes en 3 o más semanas",
    zona: "Parada de la avenida",
    periodo: "1 al 28 de septiembre (4 semanas)",
    reportes: 6,
    medio: "Presencial",
    ofertaTarea: "Chamba sin detalle, luego llevar paquete",
    monto: "$800 por encargo",
    franja: "Vespertino",
    etapa: "Contacto → oferta",
    escalamiento: "Sí",
    confianza: { reportes: 7, coincidentes: 0, descartados: 1 },
    grupo: true,
    estado: "nueva",
  },
  {
    id: "p-012",
    regla: "Escalamiento",
    descripcion: "La proporción de tarea y amenaza sobre contacto y oferta crece 2× entre periodos",
    zona: "Colonia norte",
    periodo: "jun–jul frente a ago–sep",
    reportes: 16,
    medio: "Presencial",
    ofertaTarea: "Avisar",
    monto: "$4,000 al mes",
    franja: "Noche",
    etapa: "Tarea",
    escalamiento: "Sí, ×2.1",
    confianza: { reportes: 18, coincidentes: 2, descartados: 3 },
    estado: "nueva",
  },
  {
    id: "p-011",
    regla: "Coincidencia",
    descripcion: "3 o más testigos independientes de una misma cita (lugar, franja y fecha)",
    zona: "Entrada principal",
    periodo: "18 de septiembre",
    reportes: 5,
    medio: "Presencial",
    ofertaTarea: "Chamba sin detalle",
    monto: "Sin monto",
    franja: "Vespertino",
    etapa: "Contacto",
    escalamiento: "No",
    confianza: { reportes: 5, coincidentes: 5, descartados: 0 },
    estado: "revisada",
  },
  {
    id: "p-010",
    regla: "Medio nuevo",
    descripcion: "Una plataforma o término aparece por primera vez y se repite 3 o más veces",
    zona: "En línea",
    periodo: "2 al 28 de septiembre",
    reportes: 5,
    medio: "Telegram",
    ofertaTarea: "Oferta de dinero por avisar",
    monto: "Sin monto",
    franja: "Noche",
    etapa: "Oferta",
    escalamiento: "No",
    confianza: { reportes: 6, coincidentes: 0, descartados: 1 },
    estado: "revisada",
  },
];

// --- Respuesta institucional -----------------------------------------------

export const respuesta = [
  { mes: "junio", rojos: 2, riesgo: 1, mediana: "< 1 min", entregados: "todos" },
  { mes: "julio", rojos: 3, riesgo: 1, mediana: "< 1 min", entregados: "todos" },
  { mes: "agosto", rojos: 5, riesgo: 2, mediana: "< 1 min", entregados: "todos" },
  { mes: "septiembre", rojos: 5, riesgo: 3, mediana: "< 1 min", entregados: "todos" },
];

// --- Léxico -----------------------------------------------------------------

export const lexicoPropuestas = [
  { termino: "hacer la vuelta", n: 8, primera: "3 sep", significado: "Llevar algo por encargo", categoria: "tarea_encargada" },
  { termino: "clavo", n: 7, primera: "30 ago", significado: "Algo escondido que hay que guardar", categoria: "tarea_encargada" },
  { termino: "el bono", n: 6, primera: "28 ago", significado: "Pago por avisar o por un encargo", categoria: "oferta" },
  { termino: "ponerse trucha", n: 5, primera: "9 sep", significado: "Vigilar y avisar", categoria: "tarea_encargada" },
  { termino: "el patrón", n: 5, primera: "12 sep", significado: "Adulto que ofrece el trabajo", categoria: "contacto" },
];

// --- Registro de accesos ----------------------------------------------------

export const accesos = [
  { fecha: "25 sep", franja: "Matutino", usuario: "Embajada · analista 1", vista: "Alertas de patrón" },
  { fecha: "25 sep", franja: "Matutino", usuario: "Embajada · analista 1", vista: "Resumen" },
  { fecha: "24 sep", franja: "Vespertino", usuario: "StartupLab · administración", vista: "Léxico" },
  { fecha: "24 sep", franja: "Vespertino", usuario: "Embajada · coordinación", vista: "Mapa físico" },
  { fecha: "22 sep", franja: "Matutino", usuario: "Embajada · analista 2", vista: "Modo de operar" },
  { fecha: "18 sep", franja: "Vespertino", usuario: "Embajada · analista 1", vista: "Respuesta institucional" },
  { fecha: "15 sep", franja: "Matutino", usuario: "Embajada · coordinación", vista: "Canales digitales" },
];
