# Reglas de repreguntas del chat

Complementa la §4.3 de la especificación. Esas reglas dicen qué preguntar y en qué orden (dónde, cuándo, por qué medio, qué ofrecieron), pero no dicen cuándo una pregunta deja de tener sentido. Al probar el mockup salió el caso que lo muestra: alguien contó que venden droga en línea y el chat le preguntó a qué hora.

Estas reglas valen para el mockup (`lib/mock/conversacion.ts`, por palabras clave) y para el sistema real (`lib/ia/repreguntar.ts`, con el modelo). La batería de `lib/mock/conversacion.test.ts` sirve como set de evaluación para el prompt real.

## Qué se puede preguntar

| Campo | Pregunta | Opciones |
|---|---|---|
| Dónde | ¿Dónde pasó o dónde lo viste? ¿En la entrada, en la parada o por otro lado? | Adentro del plantel · En la entrada · En la parada · En la colonia · En línea · Otro lugar |
| Cuándo | ¿Más o menos cuándo fue? | En la mañana · En la tarde · En la noche · Fin de semana · Pasa seguido |
| Medio | ¿En qué app o juego? | TikTok · Instagram · WhatsApp · Telegram · Juego en línea · Otra app |
| Qué ofrecían | ¿Qué ofrecían o qué pedían a cambio? | Dinero · Llevar o guardar algo · Avisar o vigilar · Vender algo · Regalos · No dijeron qué |

Siempre se puede contestar con texto libre en vez de tocar una opción.

## Cuándo aplica cada pregunta

1. **Dónde**: solo si no se sabe el lugar y no fue en línea. "Afuera" o "por la escuela" no bastan, porque el mapa necesita una celda; en ese caso sí se pregunta.
2. **Cuándo**: solo si pasó en un lugar físico y no lo dijo. En línea no hay franja, así que nunca se pregunta. "Diario", "siempre" o "a la salida" cuentan como respuesta.
3. **Medio**: solo si fue en línea (o por mensajes) y no dijo la app o el juego.
4. **Qué ofrecían**: solo si hubo una oferta vaga ("lana fácil", "un jale", "chamba") sin decir qué había que hacer ni cuánto pagaban. Si no hubo oferta, no se pregunta.

Si pasó en los dos lados ("me escribieron por insta para vernos en la parada"), se tratan las dos partes: cuándo por lo físico y la app por lo digital.

Un maestro sin nada digital se toma como "adentro del plantel". Un maestro que escribe mensajes se trata como en línea.

## Cuándo no se pregunta nada

- **Riesgo inmediato**: cierra al momento con el bloque fijo, que dice que llame al 911, que si puede se meta a la escuela o a un lugar con gente y que no vaya solo a ningún lado. Si el riesgo aparece en una respuesta, también cierra así. Cuenta como riesgo inmediato:
  - amenaza directa ("me van a levantar", "si hablo me matan", "me va a ir mal", "me caen a la salida");
  - cita concreta ("lo vea en el oxxo mañana", "nos vemos en la parada");
  - traslado o retención ("se llevaron a mi primo", "me encerraron");
  - alguien que no aparece ("no ha regresado", "está desaparecida", "no contesta desde ayer");
  - que lo sigan o lo busquen ("me vienen siguiendo", "me andan buscando");
  - extorsión o cobro de piso, violencia sexual o un pedido de ayuda ("ayúdenme", "me pueden ayudar").

  Se busca la combinación de persona y daño, no palabras sueltas. "Si no voy a asesorías me reprueba", "lo subieron a TikTok" o "me citaron en orientación" no disparan el bloque.
- **Autolesión** ("me quiero matar", "ya no quiero vivir", "me corto"): cierra con un bloque fijo distinto, con el 911 y una línea de apoyo por confirmar. No muestra el conteo de parecidos ni el código.
- **Violencia pasada contra otros sin amenaza** ("hubo balacera", "trae pistola en la mochila"): el chat la trata como seria y sigue con las repreguntas. La gravedad interna es roja y el plantel recibe el aviso.
- **Prueba o broma**: solo cuando todo el mensaje es relleno ("hola", "prueba", "xd", "estoy probando la app"). No se pregunta ni se castiga. Un mensaje corto con contenido ("me levantaron", "hay fenta") es serio, igual que uno con saludo o risa y contenido.
- **Ya trae todo**: si no falta nada, cierra sin preguntar.

## Cómo escriben

Antes de buscar nada se pasa la escritura de celular a su forma normal: q → que, k → qu ("kieren"), x → por, dnd → donde, ban → van, "no c" → no sé, y las letras repetidas ("holaaa"). También se quitan cosas que confunden: "de mi salón" cuando describe a una persona, "maestro" usado como saludo, "estaba parada" (no es la parada del camión), "el trabajo en equipo" (no es una oferta de trabajo).

## Límites

- Máximo dos preguntas. Si faltan más cosas, se queda con las dos primeras en el orden de prioridad.
- Nunca se pregunta algo que ya dijo, ni en el primer mensaje ni en una respuesta anterior.
- Nunca se repite una pregunta, aunque la respuesta no haya servido.
- "No sé" o "no me acuerdo": se salta ese dato y sigue con el siguiente, si hay.
- "Prefiero no decir", "ya", "es todo": cierra sin insistir.
- Nunca se pregunta nada sobre quien escribe (nombre, grupo, edad) ni si le pasó a él o a otra persona.

## Ejemplos

| Mensaje | Preguntas |
|---|---|
| alguien vendía droga en línea | ¿En qué app o juego? |
| un wey afuera nos dijo que si queríamos ganar una lana fácil | ¿Dónde…? → ¿Cuándo…? |
| me ofrecieron lana fácil → *En línea* | ¿Dónde…? → ¿En qué app o juego? |
| me ofrecieron un jale por tiktok | ¿Qué ofrecían…? |
| vi que en la entrada venden vapes y mota todos los días | ninguna |
| el profe de química le toca la pierna a una compa en el laboratorio | ¿Cuándo…? |
| me dijeron que el viernes a la salida me esperan en la parada… | ninguna, bloque rojo |
| hola prueba jaja | ninguna, muestra el radar |

La lista completa está en `lib/mock/conversacion.test.ts` y en `lib/mock/revision/` (`npm test` corre todo). Para probar un mensaje: `npm run simular -- "mensaje" "respuesta"`.
