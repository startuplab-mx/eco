// Tipos del guion y del motor de Eco.
// El guion vive en data/guion.json; este archivo describe su forma.

export type EscalaId = "E5" | "A5" | "T5";

export interface Opcion {
  id: string;
  label: string;
  valor?: number;
  /** Termina el bloque actual (p. ej. "Saltar este tema"). */
  fin?: boolean;
  /** Termina la conversación y pasa al cierre. */
  terminar?: boolean;
  /** Sale de la conversación sin cierre completo. */
  salir?: boolean;
  /** Raíces de palabras (sin acentos) que se reconocen en texto libre. */
  sinonimos?: string[];
}

/** Condición para mostrar un paso o una reacción. */
export type Condicion =
  | { paso: string; gte?: number; lte?: number; en?: string[]; incluye?: string[]; respondido?: boolean }
  | { todos: Condicion[] }
  | { alguno: Condicion[] }
  | { no: Condicion }
  | { cuenta: { pasos: string[]; gte: number }; min: number }
  | { emocionPrincipal: string[] }
  | { amarillo: true }
  | { unaEmocion: boolean };

export interface Reaccion {
  /** Si se omite "paso", la condición se evalúa sobre la respuesta del propio paso. */
  si?: Condicion | { gte?: number; lte?: number; en?: string[]; incluye?: string[] };
  texto: string;
}

export type TipoPaso = "mensaje" | "opcion" | "multiple" | "abierta" | "numero" | "ejercicio" | "directorio";

export type EjercicioId = "respiracion" | "punos" | "mano" | "anclaje";

export interface Paso {
  id: string;
  tipo: TipoPaso;
  /** Una o varias burbujas de Eco antes de pedir respuesta. Admite marcadores {…}. */
  texto?: string | string[];
  escala?: EscalaId;
  opciones?: Opcion[];
  /** Opciones que se agregan a una escala (p. ej. "Prefiero no decir"). */
  opcionesExtra?: Opcion[];
  /** La caja de texto va primero y las opciones abajo, como etiquetas. */
  textoPrimero?: boolean;
  /** Si lo escrito no corresponde a ninguna opción, se registra como "otro" con sus palabras. */
  aceptaOtro?: boolean;
  /** No se puede saltar (consentimiento): un desvío sólo redirige. */
  noSaltar?: boolean;
  /** No hacer espejo corto (ofrecimientos como "¿Quieres hacer un ejercicio?"). */
  sinEspejo?: boolean;
  /** Al responder escribiendo, Eco repite lo que entendió y pregunta si es así. */
  espejo?: { plantilla: string; textos: Record<string, string>; sinConfirmar?: string[]; siNo: string };
  /** En el índice se invierte (4 - valor) para que toda la variable apunte al mismo lado. */
  invertido?: boolean;
  placeholder?: string;
  /** En "numero": rangos en los que se guarda el número (el número exacto no se guarda). */
  /** Mensaje si el número cae en un rango fuera de la población (p. ej. edad menor de 12 o mayor de 18). */
  avisoRango?: Record<string, string>;
  /** Versión completa de la pregunta para repetirla sola cuando la original depende de la oración anterior. */
  repetir?: string;
  rangos?: { id: string; min: number; max: number }[];
  /** En preguntas abiertas: botones rápidos además del texto libre. */
  rapidas?: Opcion[];
  /** Código de variable (V1…V22) y del ítem, para índices y registro. */
  variable?: string;
  item?: string;
  si?: Condicion;
  reacciones?: Reaccion[];
  /** Ejercicio fijo o "@emocion" para elegirlo según la emoción principal. */
  ejercicio?: EjercicioId | "@emocion";
  /** Mensaje que el modelo puede reescribir conservando su sentido. */
  reescribible?: boolean;
  /** Burbuja con estilo de crisis. */
  estilo?: "crisis";
  /** En directorio: ids de líneas que no se muestran (p. ej. 089 en crisis). */
  excluir?: string[];
}

export interface Bloque {
  id: string;
  nombre: string;
  /** núcleo (V1–V9), módulo (A–I) o fijo (bienvenida, cierre…). */
  clase: "fijo" | "nucleo" | "modulo";
  /** Grupo con introducción compartida (p. ej. "emociones" para V2–V5). */
  grupo?: string;
  pasos: Paso[];
}

export interface Guion {
  version: string;
  escalas: Record<EscalaId, Opcion[]>;
  grupos: Record<string, { texto: string; noAlInicio?: boolean }>;
  validaciones: Record<string, string>;
  ejercicios: Record<EjercicioId, { titulo: string; pasos: string[]; /** Para qué sirve, en una frase. */ para?: string; /** Qué vas a hacer, en una frase. */ como?: string }>;
  /** Preguntas que cuentan para la cobertura (el 80%), en orden de referencia. */
  nucleo?: string[];
  /** Información aprobada que la IA puede usar al responder preguntas del joven. */
  ia?: { privacidad: string; proposito: string; rondaIntro: string; ofertaEjercicio?: string };
  ruta: {
    prioridad: string[];
    porEmocion: Record<string, string[]>;
    porAmbito: Record<string, string[]>;
    relleno: string[];
    minModulos: number;
    maxModulos: number;
    ordenNucleo: string[];
  };
  preguntasCierre: string[];
  /** Textos fijos para respuestas desviadas (revisables por el equipo psicológico). */
  desvios: {
    redirigir: string[]; fueraDeTema?: string[]; groseria: string[]; saltarNoQuiere: string[]; saltarInsiste: string[];
    otroDia: string; seQuiereIr: string; privacidad: string[]; orientacion: string[];
  };
  /** Frases que activan la crisis siempre. */
  alarma: string[];
  /** Frases ambiguas ("me corto", "me obligan"): activan la crisis salvo que el modelo descarte el riesgo. */
  alarmaRevisar: string[];
  bloques: Record<string, Bloque>;
}

export interface Instancia {
  escuela: string;
  orientador: { nombre: string; lugar: string; horario: string };
  directorio: { id: string; label: string; numero?: string; detalle: string }[];
}

export type Valor = string | string[] | number;

export interface Respuesta {
  valor: Valor;
  /** Para escalas: valor numérico normalizado 0–4 (E5, A5) o 1–5 (T5: 1 Muy poquito … 5 Muy fuerte). */
  num?: number;
}

export type Nivel = "verde" | "amarillo" | "rojo";

export type Salida =
  | { tipo: "eco"; texto: string; /** El modelo puede reescribirla (reacciones y validaciones). */ reescribible?: boolean }
  | { tipo: "eco-crisis"; texto: string }
  | { tipo: "usuario"; texto: string }
  | { tipo: "ejercicio"; ejercicio: EjercicioId }
  | { tipo: "directorio"; excluir: string[] };

export interface Espera {
  paso: Paso;
  /** Pregunta tal como la vio el joven (marcadores ya resueltos). */
  pregunta?: string;
  /** Botones que muestra la pantalla. */
  opciones: Opcion[];
  multiple: boolean;
  textoLibre: boolean;
}

export interface Estado {
  codigo: string;
  semana: string;
  cola: string[];
  bloque: string | null;
  indice: number;
  respuestas: Record<string, Respuesta>;
  /** Texto libre ya filtrado; sólo en memoria, nunca se guarda tal cual. */
  textos: Record<string, string>;
  esperando: Espera | null;
  /** Lo que se esperaba antes de "pausa" o "salir". */
  esperandoPrevio?: Espera;
  pausa: null | "pausa" | "salir" | "otrodia";
  /** Desvíos acumulados (sin sentido, groserías, fuera de tema) desde la última oferta de "otro día". */
  desvios: number;
  /** Total de desvíos en la sesión (calidad de datos). */
  desviosTotal: number;
  /** Desvíos por pregunta. */
  desviosPaso: Record<string, number>;
  /** Preguntas saltadas porque el joven no quiso contestar o insistió en desviarse. */
  omitidas: string[];
  /** Respuesta escrita que Eco entendió y está confirmando con el joven ("¿Es así?"). */
  confirmacion?: { entrada: { opcion?: string; opciones?: string[]; texto?: string; sinReglas?: boolean; confirmado?: boolean; otro?: string }; previa: Espera };
  gruposMostrados: string[];
  modulosHechos: string[];
  modulosEnRuta: string[];
  bloquesHechos: string[];
  rojo: boolean;
  avisoIdentificador: boolean;
  recursos: string[];
  completa: boolean;
  terminada: boolean;
  preguntaCierre: number;
  /** "ia": la IA conduce la plática; "guion": el motor de preguntas fijas (inicio, ronda, cierre, crisis). */
  modo?: "guion" | "ia";
  /** Estado de la conversación con IA (sólo en memoria). */
  ia?: EstadoIA;
  /** Preguntas de la ronda rápida final (las que faltan para llegar al 80%). */
  ronda?: string[];
}

export interface EstadoIA {
  /** Mensajes del joven en la fase de IA. */
  turnos: number;
  /** Pregunta medida que la IA acaba de hacer (sus opciones se muestran como etiquetas). */
  item: string | null;
  /** Últimos mensajes de la plática con IA, ya filtrados. Nunca se guardan. */
  historial: { quien: "eco" | "joven"; texto: string }[];
  /** Módulos opcionales (A–I) que ya se tocaron. */
  opcionales: string[];
  /** Respiración por termómetro alto: pendiente de ofrecer, ofrecida o no aplica. */
  respiracion: "no" | "pendiente" | "ofrecida";
  /** Ejercicios ya mostrados. */
  ejercicios: string[];
  /** Ejercicios ofrecidos (aceptados o no). Máximo dos por plática. */
  ofrecidos?: string[];
  /** Ejercicio ofrecido que espera un sí o un no; "hecho": se mostró y espera "Listo". */
  oferta?: string | null;
}
