// Tipos del guion y del motor de Eco.
// El guion vive en data/guion.json; este archivo describe su forma.

export type EscalaId = "E5" | "A5" | "T10";

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

export type TipoPaso = "mensaje" | "opcion" | "multiple" | "abierta" | "ejercicio" | "directorio";

export type EjercicioId = "respiracion" | "punos" | "mano" | "anclaje";

export interface Paso {
  id: string;
  tipo: TipoPaso;
  /** Una o varias burbujas de Eco antes de pedir respuesta. Admite marcadores {…}. */
  texto?: string | string[];
  escala?: EscalaId;
  opciones?: Opcion[];
  /** En preguntas abiertas: botones rápidos además del texto libre. */
  rapidas?: Opcion[];
  /** Código de variable (V1…V22) y del ítem, para índices y registro. */
  variable?: string;
  item?: string;
  si?: Condicion;
  reacciones?: Reaccion[];
  /** Ejercicio fijo o "@emocion" para elegirlo según la emoción principal. */
  ejercicio?: EjercicioId | "@emocion";
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
  ejercicios: Record<EjercicioId, { titulo: string; pasos: string[] }>;
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
  alarma: string[];
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
  /** Para escalas: valor numérico normalizado 0–4 (E5, A5) o 1–10 (T10). */
  num?: number;
}

export type Nivel = "verde" | "amarillo" | "rojo";

export type Salida =
  | { tipo: "eco"; texto: string }
  | { tipo: "eco-crisis"; texto: string }
  | { tipo: "usuario"; texto: string }
  | { tipo: "ejercicio"; ejercicio: EjercicioId }
  | { tipo: "directorio"; excluir: string[] };

export interface Espera {
  paso: Paso;
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
  pausa: null | "pausa" | "salir";
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
}
