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

/** Expresiones coloquiales que no son riesgo: "me quiero morir de risa", "me muero de hambre". */
const COLOQUIALES =
  /\b(morir|muero|muriendo|morirme|matar|mato|matarme|matando)( me)? de (la )?(risa|hambre|sueno|aburrimiento|pena|verguenza|envidia|calor|frio|ganas|amor|cansancio|nervios|emocion|flojera)\b/g;

/** Normaliza para buscar frases de alarma: sin acentos, números como letras, signos como espacios. */
function paraAlarma(texto: string): string {
  return ` ${normalizar(texto)
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t")
    .replace(/[^a-zñ]+/g, " ")
    .replace(/\bk(?=[ie])/g, "qu").replace(/\bq(?=[ie])/g, "qu").replace(/ququ/g, "qu") // "me kiero", "qiero"
    .replace(COLOQUIALES, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function contiene(t: string, frase: string): boolean {
  const f = paraAlarma(frase).trim();
  if (t.includes(` ${f}`)) return true;
  // Frases largas escritas sin espacios ("mequieromorir").
  const junta = f.replace(/ /g, "");
  return junta.length >= 11 && t.replace(/ /g, "").includes(junta);
}

/** "segura": activa la crisis siempre. "revisar": ambigua, la puede descartar el modelo. null: nada. */
export function nivelAlarma(texto: string, alarma: string[], alarmaRevisar: string[] = []): "segura" | "revisar" | null {
  const t = paraAlarma(texto);
  if (alarma.some((f) => contiene(t, f))) return "segura";
  if (alarmaRevisar.some((f) => contiene(t, f))) return "revisar";
  return null;
}

/** true si el texto contiene alguna frase de alarma (segura o ambigua). */
export function hayAlarma(texto: string, alarma: string[], alarmaRevisar: string[] = []): boolean {
  return nivelAlarma(texto, alarma, alarmaRevisar) !== null;
}

/** Sin modelo: letras al azar, sólo risas, sólo emojis o signos. */
export function pareceSinSentido(texto: string): boolean {
  const t = normalizar(texto);
  const letras = t.replace(/[^a-zñ]/g, "");
  if (letras.length === 0) return true;
  if (/^(ja|je|ji|jo|ha|he|lol|xd|js|jsj|wa)+[jahs]*$/.test(letras)) return true;
  if (/(.)\1{3,}/.test(letras) && new Set(letras).size <= 2) return true;
  if (/asdf|qwer|zxcv|hjkl|dfgh|wert/.test(letras)) return true;
  return t.split(/\s+/).every((p) => p.length >= 4 && !/[aeiou]/.test(p));
}

/** Sin modelo: insulto dirigido a Eco ("eres un bot pendejo", "chinga tu madre"). */
export function esGroseriaDirigida(texto: string): boolean {
  const t = normalizar(texto);
  return /(chinga tu|tu madre|vete a la|eres (un|una)?\s*\w*\s*(pendej|idiota|estupid|tont|mierda|culer|put)|bot (pendej|idiota|estupid|culer|put|de mierda))/.test(t);
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
// Nombres de pila frecuentes. Se tapan aunque vengan en minúscula o abran la oración.
// Se dejan fuera los que también son palabras comunes (rosa, luz, paz, sol, alma, ángel, cruz…).
const NOMBRES_COMUNES = new Set(
  (
    "juan jose luis carlos jorge miguel pedro pablo david daniel diego mario manuel fernando francisco javier " +
    "ricardo roberto alejandro eduardo enrique sergio raul ramon rafael alberto arturo antonio andres adrian " +
    "alan axel brandon bryan cesar christian cristian emiliano emilio erick erik fabian gael gustavo hector hugo " +
    "ivan jesus joel jonathan josue kevin leonardo martin mateo matias mauricio maximiliano oscar omar " +
    "rodrigo ruben santiago sebastian ulises uriel victor yahir abraham aaron angelo isaac israel samuel saul " +
    "maria guadalupe lupita fernanda ana andrea alejandra adriana araceli ariadna brenda camila carmen carolina " +
    "cecilia citlali claudia daniela diana elena elizabeth erika estefania fatima gabriela isabel itzel jacqueline " +
    "jessica jimena joana johana julia karen karla kimberly laura leticia lizbeth lorena lucia marisol martha " +
    "marta melanie monica montserrat nancy natalia nayeli paola patricia regina renata rocio sandra sara sofia " +
    "susana tania valeria valentina vanessa veronica ximena yesenia yolanda yuridia zoe ashley " +
    "frida hannah karina lupe mariana miriam noemi pamela perla priscila rebeca silvia teresa vianey wendy " +
    "pepe pancho memo beto lalo chuy paco toño quique kike"
  ).split(" ").map(normalizar),
);

// Palabras de parentesco o cercanía: lo que sigue suele ser un nombre ("mi primo juan").
const CERCANIA =
  "primo|prima|tio|tia|tío|tía|maestro|maestra|profe|profesor|profesora|amigo|amiga|novio|novia|vecino|vecina|" +
  "hermano|hermana|carnal|carnala|compa|compañero|compañera|padrastro|madrastra|cuñado|cuñada|jefe|jefa|director|directora";

// Palabras que pueden venir justo después ("mi primo me dijo") y no son nombres.
const DESPUES_NO_NOMBRE = new Set(
  (
    "me te le nos les se lo la los las que y o pero porque cuando no si ya es era esta está estaba anda andaba " +
    "dice dijo tiene tenia hace hizo va iba fue son eran mas más tambien también siempre nunca nada todo muy bien " +
    "mal de del en con por para a al sin sobre entre un una mayor menor chico chica grande favorito favorita " +
    "nuevo nueva mejor peor otro otra"
  ).split(" ").map(normalizar),
);

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
    /(?<!\[)\b(calle|av\.?|avenida|privada|cerrada|colonia|col\.|fracc\.?|fraccionamiento|barrio|esquina|manzana|mz\.?|lote|n[uú]m(ero)?\.?|#)\s*[^,.;!?\n]{1,40}/gi,
    marca("[lugar]"),
  );
  // Nombres propios: palabras con mayúscula inicial que no abren oración
  t = t.replace(/(^|[^.!?¿¡\s]\s+)([A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,})(?=\b)/g, (m, antes: string, palabra: string) => {
    if (NO_NOMBRES.has(normalizar(palabra))) return m;
    encontrado = true;
    return `${antes}[nombre]`;
  });
  // Escuelas con número o siglas: "secu 23", "prepa 5", "técnica 12", "cbtis 45"
  t = t.replace(
    /\b(secu|secundaria|prepa|preparatoria|primaria|t[eé]cnica|telesecundaria|cbtis|cetis|cbta|conalep|cecyt|cobach|colegio|bachilleres|escuela|vocacional|voca)\s*(n[uú]m(ero)?\.?\s*)?\d{1,4}\b/gi,
    marca("[escuela]"),
  );
  // Parentesco + nombre poco común: "mi primo xoel me pega". Sólo si después viene un pronombre,
  // conjunción o el final, para no tapar verbos ("mi tío abusa de mí" debe llegar entero al modelo).
  t = t.replace(
    new RegExp(`\\b(${CERCANIA})\\s+([a-záéíóúñü]{3,})(?=\\s+(me|te|le|nos|les|se|y|e|ya|no)\\b|\\s*[,.;!?]|\\s*$)`, "gi"),
    (m, rel: string, palabra: string) => {
      if (DESPUES_NO_NOMBRE.has(normalizar(palabra))) return m;
      encontrado = true;
      return `${rel} [nombre]`;
    },
  );
  // Nombres de pila frecuentes en cualquier posición o caja
  t = t.replace(/[A-Za-zÁÉÍÓÚÑáéíóúñü]{3,}/g, (palabra) => {
    if (!NOMBRES_COMUNES.has(normalizar(palabra))) return palabra;
    encontrado = true;
    return "[nombre]";
  });
  // "se llama X", "le dicen X", "el X" (apodos en minúscula tras estas frases)
  t = t.replace(/\b(se llama|le dicen|le apodan|alias|apodo)\s+\w+/gi, (m) => {
    encontrado = true;
    return m.replace(/\s+\w+$/, " [nombre]");
  });

  return { texto: t, encontrado };
}
