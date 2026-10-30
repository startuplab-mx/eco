// Detección de riesgo y filtro de identificadores sobre texto libre.
// Etapa 1: reglas. En la etapa 3 se suma un clasificador de lenguaje,
// porque los jóvenes usan modismos locales que una lista no alcanza.

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** true si el texto contiene alguna frase de alarma. */
export function hayAlarma(texto: string, alarma: string[]): boolean {
  const t = normalizar(texto);
  return alarma.some((frase) => t.includes(normalizar(frase)));
}

// Palabras que suelen ir en mayúscula y no son nombres de personas.
const NO_NOMBRES = new Set(
  [
    "yo", "dios", "mexico", "eco", "no", "si", "me", "mi", "mis", "el", "la", "los", "las", "un", "una",
    "que", "pero", "porque", "cuando", "a", "y", "o", "en", "de", "con", "por", "para", "es", "se",
    "ya", "nadie", "todos", "tengo", "quiero", "siento", "estoy", "creo", "hay", "ok", "jaja",
    "mama", "papa", "abuela", "abuelo", "tia", "tio", "hermano", "hermana", "maestro", "maestra",
    "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo", "navidad",
  ].map(normalizar),
);

export interface ResultadoFiltro {
  texto: string;
  /** true si se encontró y se quitó al menos un identificador. */
  encontrado: boolean;
}

/**
 * Quita nombres propios, apodos con @, teléfonos, direcciones y placas.
 * Es conservador: prefiere tachar de más que dejar pasar un nombre.
 */
export function filtrarIdentificadores(entrada: string): ResultadoFiltro {
  let encontrado = false;
  const marca = (reemplazo: string) => () => {
    encontrado = true;
    return reemplazo;
  };

  let t = entrada;
  // Teléfonos y números largos
  t = t.replace(/(\+?\d[\d\s\-().]{6,}\d)/g, marca("[número]"));
  // Placas tipo ABC-123-D / ABC1234
  t = t.replace(/\b[A-Z]{2,3}[-\s]?\d{2,4}[-\s]?[A-Z]?\b/g, marca("[placa]"));
  // Usuarios de redes
  t = t.replace(/@\w+/g, marca("[usuario]"));
  // Direcciones: palabra de lugar + lo que sigue hasta signo de puntuación
  t = t.replace(
    /\b(calle|av\.?|avenida|privada|cerrada|colonia|col\.|fracc\.?|fraccionamiento|barrio|esquina|manzana|mz\.?|lote|n[uú]m(ero)?\.?|#)\s*[^,.;!?\n]{1,40}/gi,
    marca("[lugar]"),
  );
  // Nombres propios: palabras con mayúscula inicial que no abren oración
  t = t.replace(/(^|[^.!?¿¡\s]\s+)([A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,})(?=\b)/g, (m, antes: string, palabra: string) => {
    if (NO_NOMBRES.has(normalizar(palabra))) return m;
    encontrado = true;
    return `${antes}[nombre]`;
  });
  // "se llama X", "le dicen X", "el X" (apodos en minúscula tras estas frases)
  t = t.replace(/\b(se llama|le dicen|le apodan|alias|apodo)\s+\w+/gi, (m) => {
    encontrado = true;
    return m.replace(/\s+\w+$/, " [nombre]");
  });

  return { texto: t, encontrado };
}
