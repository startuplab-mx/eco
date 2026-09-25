# Revisión del chat: dónde nos quedamos (25 sep 2026)

## Qué ya está

- El chat ya no hace siempre las mismas dos preguntas. `lib/mock/conversacion.ts` detecta qué trae el mensaje y pregunta solo lo que falta, con las reglas de `docs/repreguntas.md`. Arregla el caso reportado: algo en línea ya no pregunta la hora.
- La batería propia (`npm test`) tiene 53 casos y pasa completa.
- Todavía no se publica en https://eco-ten-tau.vercel.app; ese link sigue con la versión anterior.

## Qué encontró la revisión adversarial

Un agente revisor probó 180 conversaciones escritas como las mandaría un estudiante: jerga, abreviaturas y mensajes largos. Fallan 133. Los casos y lo que se espera de cada uno están en `lib/mock/revision/`. Para correrlos: `node lib/mock/revision/revisar.mjs`.

Fallas graves:

1. **Riesgo real tratado como broma.** La regla de "menos de 3 palabras es broma" convierte en broma mensajes como "me levantaron", "ayuda porfa" o "me encerraron".
2. **Amenazas que no se reconocen.** No se detectan las formas verbales ("me va a matar", "me andan buscando"), la jerga ("me caen", "dar piso", "partir la madre"), las condicionales con consecuencia ("si hablo me matan", "me va a ir mal") ni las citas ("lo vea en el oxxo", "nos vemos en la parada"). Tampoco la escritura de celular ("me kieren levantar", "me ban a madrear", "saben dnd vivo").
3. **Falsos rojos.** "si no voy a asesorías me reprueba", "lo subieron a TikTok", "me citaron en orientación" y "desapareció mi cartera" disparan el bloque de emergencia.
4. **Limpieza.** A veces borra el mensaje completo ("soy la que se sienta atrás y vi que…" queda vacío) y a veces deja el nombre ("Soy Ana López", "ME LLAMO JUAN", "att Karla del 5C").

Fallas de pregunta: sinónimos y plurales que faltan (canchas, recreo, microbús, whatsap, tictok, fornite, classroom), palabras que confunden ("historia" la materia, "trabajo en equipo", "estaba parada", "puesto" como participio, "maestro" como saludo) y respuestas como "ya es todo" que no cierran.

## Plan para seguir

1. **Broma solo si todo el mensaje es relleno** (saludos, risas, "prueba"). Nunca por ser corto.
2. **Riesgo por combinaciones:** persona más verbo de daño ("me/lo van a matar"), consecuencias ("me va a ir mal", "me matan"), cita concreta, traslado o desaparición de una persona, extorsión, violencia sexual y pedidos de ayuda. Se quitan los disparadores sueltos que causan falsos rojos ("si no voy", "no aparece", "me subieron").
3. **Normalizar escritura de celular** antes de detectar: q, k, x, dnd, ban, "no c", letras repetidas.
4. **Oferta vaga por ventana:** verbo de ofrecer seguido, en la misma frase, de algo vago ("un jale", "chamba", "lana"). Se quita el número de 3 cifras como monto.
5. **Limpieza que corta en la siguiente "y", "pero" o coma**, en vez de borrar hasta el final. Se agregan "soy Nombre", "me dicen el…", "att…" y "matrícula:".
6. Pasar los 180 casos a `npm test`, junto con los 53 de ahora.

## Decisiones que necesitan a Pedro o a la embajada

- **Autolesión** ("me quiero matar", "me corto"). La especificación no lo cubre. El bloque rojo actual ("no vayas solo a ningún lado") no sirve para esto. Propuesta: un bloque fijo aparte, con una línea de apoyo que confirmen especialistas. Candidata: Línea de la Vida.
- **Balacera o armas sin amenaza directa** ("hubo balacera", "trae pistola en la mochila"). Según la especificación no son riesgo inmediato, así que el chat no muestra el bloque de emergencia, pero la gravedad interna sí es roja y el plantel recibe el aviso. Hay que confirmar que así se queda.
- **El código de seguimiento.** Ver la conversación del 25 de septiembre: aporta poco y puede delatar a quien lo guarda en el celular.
