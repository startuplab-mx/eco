// Datos y guiones falsos para el lado del estudiante. Nada de esto llama a un
// modelo ni guarda nada: el chat sigue un guion según lo que se escriba.

import textos from "@/config/textos.json";

export type FilaRadar = keyof typeof textos.filas;
export type Periodo = "semana" | "mes";

export const FILAS: FilaRadar[] = [
  "dinero_chamba",
  "molestan_amenazan",
  "broncas",
  "maestro",
  "otras",
];

// Mensajes serios del plantel (excluye pruebas y bromas).
export const radar: Record<Periodo, Record<FilaRadar, number>> = {
  semana: { dinero_chamba: 6, molestan_amenazan: 5, broncas: 4, maestro: 3, otras: 5 },
  mes: { dinero_chamba: 22, molestan_amenazan: 20, broncas: 18, maestro: 9, otras: 20 },
};

export const MINIMO = 5;

export function totalRadar(p: Periodo) {
  return FILAS.reduce((s, f) => s + radar[p][f], 0);
}

// --- Chat ------------------------------------------------------------------

export type Escenario = "normal" | "rojo" | "broma" | "primero";

// Textos de ejemplo para el demo (se precargan con ?e=escenario).
export const ejemplos: Record<Escenario, string> = {
  normal: "un wey afuera nos dijo que si queríamos ganar una lana fácil",
  rojo: "me dijeron que el viernes a la salida me esperan en la parada para llevar algo y que si no voy ya saben dónde vivo",
  broma: "hola prueba jaja",
  primero: "un profe le manda mensajes en la noche a una compa y le regala cosas, soy de su mismo grupo",
};

// En el sistema real esto lo decide el modelo (seriedad, gravedad, riesgo).
// Aquí es un filtro burdo para que el demo responda con sentido.
export function inferirEscenario(texto: string): Escenario {
  const s = texto.toLowerCase().trim();
  if (s.length < 14 || /^(hola|prueba|test|jaja|xd)\b/.test(s)) return "broma";
  if (/(me esperan|ya saben d[oó]nde|me van a|me amenaz|si no voy|me llevaron)/.test(s)) return "rojo";
  if (/(profe|maestr)/.test(s)) return "primero";
  return "normal";
}

// Capa 1 simulada: quita lo que identifica a quien escribe.
export function limpiar(texto: string) {
  const limpio = texto
    .replace(/,?\s*\b(soy|me llamo|mi nombre es|estoy en)\b[^,.;]*/gi, "")
    .trim();
  return { limpio, cambio: limpio !== texto.trim() };
}

export const parecidos: Record<Escenario, number> = {
  normal: 6,
  rojo: 3,
  primero: 0,
  broma: 0,
};

// Repreguntas. En el sistema real las genera el modelo según el campo que
// falte (dónde, cuándo, por qué medio, qué ofrecieron). Máximo dos.
export const repreguntas = {
  dondeCuando: "¿Fue en la entrada, en la parada o por otro lado? ¿Y más o menos cuándo?",
  cuando: "¿Y más o menos cuándo?",
  medio: "¿Por dónde le escribe? ¿WhatsApp, Instagram u otra app?",
};

// Celdas gruesas: el estudiante elige, nunca GPS.
export const lugares = ["Adentro del plantel", "En la entrada", "En la parada", "En la colonia", "En línea"];
export const franjas = ["En la mañana", "En la tarde", "En la noche", "Fin de semana"];
export const medios = ["WhatsApp", "Instagram", "TikTok", "Otra app"];

export const CODIGO_DEMO = "K7P2QX";
