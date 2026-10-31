# Rúbrica de codificación de Eco (guion v0.3)

Generada automáticamente desde el guion con `npx tsx scripts/rubrica.ts`. No se edita a mano.

## Reglas

1. **Sólo las escalas llevan número.** Son tres (frecuencia, qué tanto y termómetro), con cinco opciones cada una y siempre codificadas 0, 1, 2, 3, 4.
2. **El número dice cuánto de lo que se pregunta:** más seguido, más fuerte o más. En los datos nunca se invierte.
3. **Todo lo demás se guarda como texto**, para contar y graficar por categoría: sí/no, desde cuándo, cuánto duele, ¿crees que lo puedes lograr?, cómo te sientes ahora, emociones, zona del cuerpo, etc. En las columnas de Airtable aparece la etiqueta ("Desde hace semanas"); en el campo "Respuestas (datos)" aparece el código corto (`semanas`). Los dos se listan abajo.
4. **Los mismos códigos significan lo mismo en todas las preguntas:** `si`, `no`, `nose` (No sé) y `nd` (Prefiero no decir).
5. **"No sé" y "Prefiero no decir" son dato faltante:** no cuentan como 0 ni entran a los índices.
6. **Preguntas abiertas:** sólo se registra si escribió o no. El texto nunca se guarda.
7. **Índices 0–100:** promedio de las escalas de la variable ÷ 4 × 100. Cada índice tiene una dirección fija (ver abajo). Si una pregunta va en contra de su índice, se invierte sólo al calcularlo (4 − valor).
8. **En Airtable cada pregunta con opciones tiene su columna:** las escalas como número 0–4 (para sacar promedios) y lo demás con la etiqueta. Si saltó una pregunta, aparece en "Preguntas que saltó"; una celda vacía que no está ahí = no le tocó o dejó la plática antes. Las preguntas abiertas no tienen columna.

## Escalas

| Valor | Frecuencia (E5) | Qué tanto (A5) | Termómetro (T5) |
|---|---|---|---|
| 0 | Nunca | Nada | Muy poquito |
| 1 | Casi nunca | Un poco | Poquito |
| 2 | A veces | Más o menos | Más o menos |
| 3 | Seguido | Bastante | Fuerte |
| 4 | Casi siempre | Mucho | Muy fuerte |

Si el joven escribe un número del 1 al 10 en el termómetro, se convierte: 1–2 → 0, 3–4 → 1, 5–6 → 2, 7–8 → 3, 9–10 → 4.

## Índices

| Índice | Dirección | Preguntas que entran |
|---|---|---|
| V1 Exposición a violencia | Riesgo: más alto = peor | `v1_colonia`, `v1_escuela` |
| V2 Miedo y ansiedad | Riesgo: más alto = peor | `v2_miedo`, `v2_alerta`, `v2_dormir` |
| V3 Tristeza y desesperanza | Riesgo: más alto = peor | `v3_triste`, `v3_desesperanza` |
| V4 Enojo | Riesgo: más alto = peor | `v4_enojo` |
| V5 Culpa y lealtad | Riesgo: más alto = peor | `v5_lealtad`, `v5_culpa` |
| V6 Normalización | Riesgo: más alto = peor | `v6_normal`, `v6_dinero` |
| V7 Presión | Riesgo: más alto = peor | `v7_presion` |
| V8 Proyecto de vida | Protección: más alto = mejor | `v8_escuela` |
| V11 Pertenencia escolar | Protección: más alto = mejor | `ma_parte` |
| V12 Clima familiar | Protección: más alto = mejor | `mb_carino`, `mb_tension` (invertida) |
| V13 Autoestima | Protección: más alto = mejor | `md_valiosa` |
| V14 Estrés traumático | Riesgo: más alto = peor | `me_imagenes`, `me_evito`, `me_sobresalto` |
| V15 Consumo para afrontar | Riesgo: más alto = peor | `mf_consumo` |
| V16 Narcocultura en redes | Riesgo: más alto = peor | `mg_contenido` |
| V18 Resiliencia | Protección: más alto = mejor | `md_salir` |
| Malestar global | Riesgo: más alto = peor | Promedio de los índices V2, V3, V4 y V5 |
| Cambio emocional | Positivo = bajó la intensidad | Termómetro inicial − final (−4 a 4) |

## Cuándo una sesión es amarilla

- Termómetro inicial en Muy fuerte (4).
- Desesperanza en Seguido o más (3+).
- Malestar global mayor a 60.
- Presión en Seguido o más (3+).
- No tiene un adulto de confianza (`v9_adulto` = No).

Una sesión roja (alarma) sólo registra escuela y semana.

## Preguntas

### V20 Reconocimiento emocional

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Cómo te sientes hoy? Escríbelo como quieras o elige una o varias. | Emociones | `V20.emocion` | Texto · varias categorías | En calma (`tranquilo`) · Con alegría (`contento`) · Con cansancio (`cansado`) · Con tristeza (`triste`) · Con enojo (`enojado`) · Con miedo (`miedo`) · Con preocupación (`preocupado`) · Con vacío (`vacio`) · Con soledad (`solo`) · Con vergüenza (`avergonzado`) · Con confusión (`confundido`) · No sé cómo me siento (`nose`) |
| ¿Lo que sientes se parece más a algo pesado, a algo que quema o a algo que aprieta? | Sensación | `V20.sensacion` | Texto · una categoría | Pesado (`pesado`) · Quema (`quema`) · Aprieta (`aprieta`) · Como sin energía (`apagado`) |
| Si … pudiera hablar, ¿qué diría? Escríbelo con tus palabras o elige la frase que más se parezca. | — | `V20.voz` | Sí/no escribió (el texto no se guarda) | — |
| ¿Qué te ayuda a sentirte así? | — | `V20.recurso` | Sí/no escribió (el texto no se guarda) | — |

### V21 Intensidad y cronicidad

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Qué tan fuerte sientes eso ahorita? | Termómetro inicial | `V21.inicial` | Número 0–4 (Termómetro) | ver escala |
| ¿Desde cuándo te sientes así? | Desde cuándo | `V21.cronicidad` | Texto · una categoría | Solo hoy (`hoy`) · Esta semana (`semana`) · Desde hace semanas (`semanas`) · Desde hace mucho (`mucho`) · Casi siempre me siento así (`siempre`) |
| ¿Qué tan fuerte sientes ahorita lo que sentías al principio? | Termómetro final | `V21.final` | Número 0–4 (Termómetro) | ver escala |

### V22 Expresión somática

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿En qué parte del cuerpo lo sientes? | Zona del cuerpo | `V22.zona` | Texto · varias categorías | Pecho (`pecho`) · Estómago (`estomago`) · Garganta (`garganta`) · Cabeza (`cabeza`) · Manos o brazos (`manos`) · Todo el cuerpo (`todo`) · En ninguna parte (`ninguna`) |

### Ámbito

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Qué crees que te hace sentir así? No tienes que contar qué pasó. | Ámbito | `ambito` | Texto · una categoría | La escuela (`escuela`) · Mi casa (`casa`) · Mi colonia (`colonia`) · Alguien que extraño (`extrano`) · Algo que vi o escuché (`vi`) · Las redes (`redes`) · Mis amistades (`amigos`) · Mi futuro (`futuro`) · No sé (`nose`) · Prefiero no decir (`nd`) |

### V1 Exposición a violencia

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Qué tan seguido pasan cosas que dan miedo en tu colonia? | V1 · Cosas que dan miedo en la colonia | `V1.comunitaria` | Número 0–4 (Frecuencia) | ver escala |
| ¿Qué tan seguido te sientes en peligro en la escuela o en el camino a la escuela? | V1 · Peligro en la escuela o el camino | `V1.escolar` | Número 0–4 (Frecuencia) | ver escala |
| ¿Le ha pasado algo grave a alguien que conoces? No tienes que decirme qué. | V1 · Supo de algo grave a alguien que conoce | `V1.indirecta` | Texto · una categoría | Sí (`si`) · No (`no`) · Prefiero no decir (`nd`) |

### V2 Miedo y ansiedad

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Qué tan seguido te da miedo que te pase algo a ti o a tu familia? | V2 · Miedo a que le pase algo | `V2.miedo` | Número 0–4 (Frecuencia) | ver escala |
| ¿Qué tan seguido sientes que no puedes relajarte, como si algo malo fuera a pasar? | V2 · No puede relajarse | `V2.hipervigilancia` | Número 0–4 (Frecuencia) | ver escala |
| ¿Qué tan seguido te cuesta dormir por pensar en lo que pasa a tu alrededor? | V2 · Le cuesta dormir por pensar | `V2.sueno` | Número 0–4 (Frecuencia) | ver escala |

### V3 Tristeza y desesperanza

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Qué tan seguido te sientes triste o sin ganas de hacer nada? | V3 · Triste o sin ganas | `V3.animo` | Número 0–4 (Frecuencia) | ver escala |
| ¿Qué tan seguido sientes que las cosas no van a mejorar, hagas lo que hagas? | V3 · Las cosas no van a mejorar | `V3.desesperanza` | Número 0–4 (Frecuencia) | ver escala |

### V4 Enojo

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Qué tan seguido te enojas tanto que sientes que vas a explotar? | V4 · Siente que va a explotar | `V4.enojo` | Número 0–4 (Frecuencia) | ver escala |

### V5 Culpa y lealtad

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Qué tan seguido sientes que no puedes contar algo para proteger a alguien? | V5 · No puede contar algo para proteger a alguien | `V5.lealtad` | Número 0–4 (Frecuencia) | ver escala |
| ¿Qué tan seguido sientes culpa por algo que no puedes platicar con nadie? | V5 · Culpa por algo que no puede platicar | `V5.culpa` | Número 0–4 (Frecuencia) | ver escala |

### V6 Normalización

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| Donde vives, ¿qué tanto se ve la violencia como algo normal? | V6 · La violencia se ve normal donde vive | `V6.aceptacion` | Número 0–4 (Qué tanto) | ver escala |
| ¿Qué tanto crees que vale la pena ganar dinero rápido, aunque sea peligroso? | V6 · Vale la pena el dinero rápido aunque sea peligroso | `V6.atractivo` | Número 0–4 (Qué tanto) | ver escala |

### V7 Presión

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Qué tan seguido alguien te presiona para hacer cosas peligrosas? | V7 · Presión para hacer cosas peligrosas | `V7.presion` | Número 0–4 (Frecuencia) | ver escala |
| Si alguien te presiona para hacer algo peligroso, ¿podrías decirle que no? | V7 · Podría decir que no | `V7.libertad` | Texto · una categoría | Sí (`si`) · No (`no`) · No sé (`nose`) |

### V8 Proyecto de vida

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Te imaginas cómo te gustaría que fuera tu vida en 5 años? | V8 · Se imagina su vida en 5 años | `V8.metas` | Texto · una categoría | Sí (`si`) · Más o menos (`mas_menos`) · No (`no`) |
| ¿Me cuentas un poco cómo te imaginas? | — | `V8.metas_texto` | Sí/no escribió (el texto no se guarda) | — |
| ¿Qué tan importante es para ti terminar la escuela? | V8 · Importancia de terminar la escuela | `V8.escuela` | Número 0–4 (Qué tanto) | ver escala |
| Si pudieras ser lo que quisieras de grande, ¿qué serías? | — | `V8.aspiracion` | Sí/no escribió (el texto no se guarda) | — |
| ¿Crees que puedes llegar a ser eso? | V8 · Cree que puede lograr lo que quiere ser | `V8.expectativa` | Texto · una categoría | Sí (`si`) · Tal vez (`tal_vez`) · Lo veo muy difícil (`dificil`) · No sé (`nose`) |
| ¿Qué es algo pequeño que podrías hacer para empezar? | — | `V8.primer_paso` | Sí/no escribió (el texto no se guarda) | — |

### V9 Apoyo y afrontamiento

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Tienes a un adulto en quien confíes para platicar cosas difíciles? | V9 · Tiene un adulto de confianza | `V9.adulto` | Texto · una categoría | Sí (`si`) · No (`no`) · No sé (`nose`) |
| ¿Tienes amigos o amigas con quienes te sientas en confianza y a salvo? | V9 · Tiene amistades de confianza | `V9.pares` | Texto · una categoría | Sí (`si`) · No (`no`) |
| Cuando te sientes mal, ¿qué haces? Puedes elegir varias. | V9 · Qué hace cuando se siente mal | `V9.estrategias` | Texto · varias categorías | Deporte (`deporte`) · Música (`musica`) · Hablar con alguien (`hablar`) · Encerrarme (`encerrarme`) · Tomar, fumar o vapear (`consumir`) · Pelear (`pelear`) · Otra cosa (`otra`) |

### V11 Pertenencia escolar

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| Hablemos de la escuela. ¿Qué tanto te sientes parte de tu escuela? | V11 · Se siente parte de su escuela | `V11.pertenencia` | Número 0–4 (Qué tanto) | ver escala |
| ¿Hay algún maestro o maestra con quien te sientas en confianza? | V11 · Tiene un maestro o maestra de confianza | `V11.vinculo_docente` | Texto · una categoría | Sí (`si`) · No (`no`) · No sé (`nose`) |
| ¿Qué es lo que más te gusta de venir a la escuela? | — | `V11.significado` | Sí/no escribió (el texto no se guarda) | — |
| ¿Qué cambiarías de tu escuela para sentirte mejor ahí? | V11 · Qué cambiaría de su escuela | `V11.cambio` | Texto · una categoría | Más deporte o arte (`deporte_arte`) · Que me escuchen (`escuchen`) · Sentir más seguridad (`seguro`) · Menos presión (`presion`) · Nada (`nada`) · Otra cosa… (`otra`) |
| ¿Qué cambiarías? | — | `V11.cambio_texto` | Sí/no escribió (el texto no se guarda) | — |

### V12 Clima familiar

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Qué tan seguido sientes cariño en tu casa? | V12 · Cariño en casa | `V12.afecto` | Número 0–4 (Frecuencia) | ver escala |
| ¿Qué tan seguido se siente pesado el ambiente en tu casa? | V12 · Ambiente pesado en casa | `V12.tension` | Número 0–4 (Frecuencia) · **invertida en el índice** | ver escala |
| ¿Puedes platicar en tu casa de lo que sientes? | V12 · Puede platicar en casa lo que siente | `V12.comunicacion` | Texto · una categoría | Sí (`si`) · A veces (`a_veces`) · No (`no`) |
| Si pudieras pedir una cosa para tu casa, ¿qué sería? | — | `V12.deseo` | Sí/no escribió (el texto no se guarda) | — |

### V10 Duelo

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Ha muerto alguien importante para ti, o alguien se fue y ya no sabes de esa persona? | V10 · Perdió a alguien importante | `V10.perdida` | Texto · una categoría | Sí (`si`) · No (`no`) · Prefiero no decir (`nd`) |
| Lo siento mucho. ¿Qué tanto te sigue doliendo? | V10 · Cuánto le sigue doliendo | `V10.duelo` | Texto · una categoría | Casi nada (`casi_nada`) · Un poco (`poco`) · Bastante (`bastante`) · Mucho, todos los días (`mucho`) |
| Si pudieras decirle algo a esa persona, ¿qué le dirías? Sin nombres. | — | `V10.expresion` | Sí/no escribió (el texto no se guarda) | — |

### V13 Autoestima

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Qué tanto sientes que vales como persona? | V13 · Siente que vale como persona | `V13.autovaloracion` | Número 0–4 (Qué tanto) | ver escala |
| ¿Qué es algo que te sale bien o que te gusta de ti? | — | `V13.fortalezas` | Sí/no escribió (el texto no se guarda) | — |
| Va, te ayudo. ¿Se parece a alguna de estas? Puedes elegir varias. | V13 · Fortalezas | `V13.fortalezas_opcion` | Texto · varias categorías | Cuido mis amistades (`amigo`) · Hago reír (`reir`) · Soy fuerte (`fuerte`) · Cuido a otros (`cuido`) · Algo se me da bien: deporte, música, dibujo… (`habilidad`) |

### V18 Resiliencia

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| Cuando te pasa algo difícil, ¿qué tanto sientes que puedes salir adelante? | V18 · Siente que puede salir adelante | `V18.recuperacion` | Número 0–4 (Qué tanto) | ver escala |
| ¿Qué te da fuerza para seguir cuando las cosas están difíciles? | — | `V18.sentido` | Sí/no escribió (el texto no se guarda) | — |

### V14 Estrés traumático

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Qué tan seguido te llegan a la mente recuerdos feos sin que tú quieras? | V14 · Recuerdos feos sin querer | `V14.intrusivos` | Número 0–4 (Frecuencia) | ver escala |
| ¿Qué tan seguido evitas lugares, ruidos o personas porque te recuerdan algo que te asustó? | V14 · Evita lugares, ruidos o personas | `V14.evitacion` | Número 0–4 (Frecuencia) | ver escala |
| ¿Qué tan seguido te asustas fácil con ruidos fuertes, como cohetes o portazos? | V14 · Se asusta fácil con ruidos | `V14.sobresalto` | Número 0–4 (Frecuencia) | ver escala |
| Eso le pasa a mucha gente después de vivir algo fuerte, y hay quien te puede ayudar. ¿Quieres saber dónde buscar ese apoyo? | V14 · Quiso saber dónde buscar apoyo | `V14.busca_apoyo` | Texto · una categoría | Sí, quiero saber (`como`) · Ahora no (`no`) |

### V15 Consumo para afrontar

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| Cuando te sientes mal, ¿qué tan seguido tomas alcohol, vapeas o usas otra sustancia? | V15 · Toma, vapea o usa sustancias cuando se siente mal | `V15.frecuencia` | Número 0–4 (Frecuencia) | ver escala |
| Cuando usas algo así, ¿para qué te ayuda? | V15 · Para qué le ayuda | `V15.motivo` | Texto · varias categorías | Relajarme (`relajarme`) · Olvidar (`olvidar`) · Encajar con otros (`encajar`) · Dormir (`dormir`) · Otro (`otro`) |

### V16 Narcocultura en redes

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| Sobre redes: ¿qué tan seguido ves videos o escuchas música de armas, dinero fácil o grupos criminales? | V16 · Ve contenido de armas, dinero fácil o grupos criminales | `V16.consumo` | Número 0–4 (Frecuencia) | ver escala |
| Cuando ves ese tipo de contenido, ¿cómo te sientes? Puedes elegir varias. | V16 · Cómo se siente con ese contenido | `V16.impacto` | Texto · varias categorías | Con emoción (`emocionado`) · Me da igual (`igual`) · Con incomodidad (`incomodo`) · Con miedo (`miedo`) · Con tristeza (`triste`) |
| ¿Qué tipo de contenido te hace sentir bien? | — | `V16.contenido_positivo` | Sí/no escribió (el texto no se guarda) | — |

### V17 Modelos

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿A quién admiras? | V17 · A quién admira | `V17.modelo` | Texto · una categoría | Alguien de mi familia (`familia`) · Una amistad (`amigo`) · Un maestro o maestra (`maestro`) · Deportista o artista (`deportista`) · Influencer (`influencer`) · Nadie (`nadie`) · Otro (`otro`) |
| ¿Qué es lo que admiras de esa persona? Sin nombres. | — | `V17.razon` | Sí/no escribió (el texto no se guarda) | — |

### V19 Confianza institucional

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| Si te pasara algo serio, ¿a quién le pedirías ayuda? | V19 · A quién acudiría | `V19.confianza` | Texto · varias categorías | Familia (`familia`) · Amistades (`amigos`) · Alguien de la escuela (`escuela`) · Centro de salud (`salud`) · Iglesia (`iglesia`) · Policía (`policia`) · Nadie (`nadie`) |
| ¿Qué te frenaría para pedir ayuda? Puedes elegir varias. | V19 · Qué le frenaría para pedir ayuda | `V19.barreras` | Texto · varias categorías | Miedo (`miedo`) · Vergüenza (`verguenza`) · Sentir que no sirve de nada (`no_sirve`) · Que me puedan ubicar (`ubicar`) · No saber a dónde ir (`no_sabe_donde`) · Otro (`otro`) |

### Espacio libre

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Hay algo más de cómo te sientes que quieras contarme? Recuerda: sin nombres ni lugares. | — | `libre.espacio` | Sí/no escribió (el texto no se guarda) | — |
| (pregunta de cierre que varía según la plática) | — | `libre.pregunta_cierre` | Sí/no escribió (el texto no se guarda) | — |

### Cierre

| Pregunta | Columna en Airtable | Código | Se guarda como | Opciones |
|---|---|---|---|---|
| ¿Cómo te sientes ahora, después de platicar? | Cómo termina | `cierre.como` | Texto · una categoría | Mejor (`mejor`) · Igual (`igual`) · Peor (`peor`) · No sé (`nose`) |

### Datos generales

| Pregunta | Se guarda como | Opciones |
|---|---|---|
| Para empezar, ¿cuántos años tienes? | Rango de edad (texto) | 12 a 14 · 15 a 16 · 17 a 18 · Menor de 12 · Adulto |
| ¿Cómo te identificas? | Texto · una categoría | Mujer (`mujer`) · Hombre (`hombre`) · Otro (`otro`) · Prefiero no decir (`nd`) |
| ¿Con quién vives? Puedes elegir varias. | Texto · varias categorías | Mamá (`mama`) · Papá (`papa`) · Abuelos (`abuelos`) · Hermanas o hermanos (`hermanos`) · Otros familiares (`otros_familiares`) · Pareja (`pareja`) · Nadie más (`solo`) · Prefiero no decir (`nd`) |
