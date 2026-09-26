# Prototipo: canal anónimo y radar para planteles CONALEP

> Documento de especificación para construir el prototipo con Claude Code. Nombre del producto por definir (los estudiantes lo bautizan). En este documento se le llama **el Radar**.
>
> Estado: versión 1.1, 25 de septiembre de 2026. Cambios sobre la versión 1, decididos al revisar el mockup: sin código de seguimiento (§4.3); textos sin masculino genérico hacia quien escribe; taxonomía v0.2 con las vías de enganche que afectan más a chavas (§5, Anexo A); bloque de peligro con 911 y buscar un lugar con gente, y bloque aparte para autolesión (§4.3). Detalle en `docs/revision-chat.md`.
>
> Versión 1, 25 de septiembre de 2026. Cliente: Embajada de Estados Unidos en México (Sección de Diplomacia Pública / equipo antirreclutamiento). Desarrolla: StartupLab MX. Beneficiario: CONALEP, piloto en un plantel de la Zona Metropolitana del Valle de México.

---

## 1. Qué es y para qué sirve

El reclutamiento de adolescentes por el crimen organizado es un proceso con etapas observables (contacto → oferta → tarea de prueba → enganche → amenaza) que ocurre dentro de una **zona de silencio**: todos saben algo, nadie lo dice, cada quien cree que es el único que sabe.

El Radar es un canal digital, anónimo y sin operadores humanos, para que los estudiantes de un plantel cuenten lo que ven, lo que les pasa o lo que les preocupa. Lo que cuentan se procesa con IA para:

1. Devolverle al estudiante, de inmediato, la señal de que **no es la única persona** que habla ("6 personas más contaron algo parecido").
2. Construir un **radar** de lo que se está reportando alrededor del plantel, que los estudiantes consultan aunque no tengan nada que contar.
3. Extraer **patrones de reclutamiento** (dónde, cuándo, por qué medio, con qué oferta, en qué etapa) para un tablero que la embajada usa para ubicar zonas y modos de operar.
4. Avisar a CONALEP cuando hay un caso rojo.

Lo que **no** es: no es un sistema de gestión de casos para CONALEP, no es una herramienta educativa, no es un chatbot que aconseja, no tiene personas detrás.

El canal se abre a cualquier tema (broncas, maestros, acoso, lo que sea). El reclutamiento se encuentra **porque** se abrió a todo: nadie escribe "me están reclutando"; escribe "me ofrecieron 4,000 al mes por un jale". La IA separa por atrás.

---

## 2. Principios no negociables

Estas reglas gobiernan cualquier decisión de diseño o código. Si una funcionalidad las contradice, no se construye.

1. **No se protege la identidad; no se tiene.** El sistema no recaba nada que identifique a quien escribe. Lo que no existe no se puede filtrar, pedir ni hackear.
2. **Sin personas detrás.** Todo lo que el estudiante recibe es automático. Los únicos trabajos humanos son fuera de línea: curar el léxico y auditar una muestra mensual.
3. **Nunca prometer acción institucional.** Solo se promete lo que el sistema cumple solo: nadie sabrá que fuiste tú, tu aviso se junta con los de otros, verás en el radar lo que pasa cerca de tu plantel.
4. **El estudiante no clasifica ni aprende.** Cuenta como quiera. Las categorías, etapas y semáforo viven en la IA, no en la pantalla.
5. **Patrones, no personas.** Nada que salga del sistema hacia la embajada contiene texto libre, nombres ni celdas con menos de 5 registros.
6. **Ante duda en gravedad, se clasifica hacia arriba.** El único error grave es un rojo tratado como broma.
7. **La broma no se castiga.** El primer mensaje casi siempre es una prueba de confianza. Al estudiante nunca se le dice que su mensaje fue descartado.
8. **Bajo costo.** Sin costo fijo de operación. Web estática + funciones en la nube + base de datos + llamadas a modelo por mensaje.

---

## 3. Usuarios y qué ve cada uno

| Usuario | Qué ve | Qué no ve |
|---|---|---|
| **Estudiante** | El radar (cinco filas + conteo), el chat, la respuesta "X personas más contaron algo parecido" | Categorías internas, semáforo, cualquier texto de otros, nombres |
| **Embajada** (2–3 personas) | Tablero: resumen, mapa físico, canales digitales, modo de operar, alertas de patrón, respuesta institucional | Texto libre, mensajes individuales, códigos, celdas < 5, horas exactas |
| **CONALEP** (una persona designada por plantel) | Un mensaje al teléfono del cargo cuando hay rojo, con resumen de dos líneas | Todo lo demás; no hay sistema de seguimiento para CONALEP en este alcance |
| **StartupLab** (administrador) | Todo, con registro de cada acceso | — |

Tipos de estudiante que el sistema debe reconocer por inferencia (nunca por selección del usuario):

- Al que lo quieren reclutar (afectado directo, etapa de contacto u oferta).
- El que ya está adentro y tiene miedo o dudas.
- El que vio algo raro (testigo).

---

## 4. Producto para el estudiante: radar + chat

### 4.1 Acceso

- Página web ligera (PWA), sin cuenta, sin teléfono, sin correo, sin instalación, sin permisos del navegador.
- Se abre por QR o link corto. El QR vive donde uno está solo con el celular (baños, butacas, stickers) y, sobre todo, como link en el chat del salón mandado por un compañero.
- Botón de **salida rápida** siempre visible: cierra la sesión y reemplaza la página por una neutra.
- Sin logo de CONALEP, sin fotos de autoridades, sin la palabra "denuncia" ni "sistema" en pantalla. Lenguaje y aspecto de los estudiantes.

### 4.2 El radar (pantalla de entrada)

Lo primero que aparece, antes de pedir nada:

```
Esta semana en tu plantel
23 compas contaron algo aquí.

· Alguien ofreciendo dinero o "chamba"      6
· Alguien que acosa, molesta o amenaza      5
· Broncas entre compas                      4
· Algo raro con un maestro o maestra        3
· Otras cosas                               5

[ Contar algo ]
```

Reglas:

- Cinco filas fijas, en ese lenguaje. Una fila solo muestra número si tiene 5 o más registros en el periodo; si no, muestra "—".
- El conteo de arriba es el total de mensajes serios de la semana en el plantel (excluye los marcados como prueba o broma).
- Periodo: semana en curso, con opción "este mes".
- La fila "dinero o chamba" es donde cae el reclutamiento. No se explica.

### 4.3 El chat

No es un chatbot conversacional; es un **extractor de máximo tres turnos** que completa lo que falta para que el mensaje sirva.

```
Bot:    ¿Qué viste, qué te pasó o qué te preocupa? Cuéntalo como quieras.
        Nadie sabrá que fuiste tú.
Chavo:  un wey afuera nos dijo que si queríamos ganar una lana fácil
Bot:    ¿Fue en la entrada, en la parada o por otro lado? ¿Y más o menos cuándo?
Chavo:  en la parada saliendo, ayer
Bot:    Recibido. 6 personas más contaron algo parecido cerca de tu plantel este mes.
```

Reglas del chat:

- Las repreguntas no son fijas. El modelo pregunta solo por los campos que el texto no trae, en este orden de prioridad: **dónde**, **cuándo (franja)**, **por qué medio**, **qué ofrecieron o qué pidieron**. Máximo dos repreguntas. Si el mensaje ya trae todo, no pregunta.
- Nunca pide nombres. Nunca pide datos del que escribe.
- Nunca da consejos, opina, califica ("eso es reclutamiento") ni promete acción.
- Tono: corto, directo, en su registro. Sin emojis en exceso, sin institucionalidad.
- Se puede adjuntar una captura de pantalla; el navegador le quita metadatos (EXIF, ubicación, modelo) antes de enviar.
- Al cerrar, siempre devuelve el conteo de parecidos:
  - Si hay parecidos: "N personas más contaron algo parecido cerca de tu plantel este mes."
  - Si no hay: "Nadie había contado algo así aquí. Si alguien más lo cuenta, lo vas a ver en el radar."
  - Si el mensaje se marcó como prueba o broma: "Recibido. Por ahora no se suma a nada; esto es lo que otros han contado cerca de ti." y muestra el radar.
- **Excepción rojo con riesgo inmediato** (cita en tiempo y lugar, amenaza directa, traslado, desaparición, extorsión, violencia sexual, trata): el cierre incluye un bloque fijo, aprobado, no generado: llama al 911; si puedes, métete a la escuela o a un lugar con gente; no vayas a ningún lado sin compañía; línea anónima. Nada más.
- **Autolesión** ("me quiero matar", "me corté"): bloque fijo distinto, con el 911 y una línea de apoyo que deben validar especialistas. Sin conteo de parecidos.
- **Sin código de seguimiento** (cambio de la v1.1). Aportaba poco más que el radar, y un código guardado en el celular puede delatar a quien contó algo.
- Lenguaje sin masculino genérico hacia quien escribe: "personas", "alguien", "compas".

### 4.4 Lo que la página no hace

No guarda IP, ni agente de usuario, ni cookies, ni huella del dispositivo, ni analítica de terceros. No pide ubicación al navegador: el lugar lo elige el estudiante entre celdas gruesas.

---

## 5. Tratamiento de la información (el núcleo)

Cada mensaje pasa por cinco capas. Todas automáticas.

### Capa 1: Limpieza

Antes de guardar, el modelo elimina lo que identifica a **quien escribe** (nombre propio, salón, "soy el de…", apodo propio) y conserva lo que describe a terceros y al hecho. Se persiste **solo la versión limpia**; el texto original nunca se escribe en disco. Si se eliminó algo, el chat lo avisa en una línea ("quitamos datos que te identifican").

### Capa 2: Etiquetado (la ficha)

El texto limpio se convierte en una ficha estructurada, validada contra un esquema JSON. Campos:

| Campo | Valores | Notas |
|---|---|---|
| `quien_habla` | afectado, testigo, involucrado, indeterminado | |
| `hechos[]` | oferta, contacto, tarea_encargada, amenaza, aislamiento_observado, violencia, conducta_maestro, bronca, acoso, enganche_afectivo, fotos_intimas, explotacion_sexual, trata, otro | Multi-etiqueta |
| `etapa` | contacto, oferta, tarea, enganche, amenaza, no_aplica | Solo si hay señal de reclutamiento |
| `es_reclutamiento` | sí, probable, no | Inferido, aunque la palabra no aparezca |
| `medio` | presencial, juego_en_linea, tiktok, instagram, whatsapp, telegram, otro_digital, indeterminado | |
| `lugar` | id de celda (ver §8) o `en_linea` o `indeterminado` | Nunca coordenadas |
| `franja` | matutino, vespertino, noche, fin_de_semana, indeterminado | |
| `actor` | extraño, adulto_conocido, companero, maestro, grupo_nombrado, pareja, indeterminado | |
| `dirigido_a` | chavas, chavos, ambos, indeterminado | A quién va dirigida la oferta o la agresión, según lo que cuenta de otras personas. Nunca se infiere de quien escribe |
| `actor_nombre` | texto o null | Se guarda, **nunca sale al tablero** |
| `oferta` | `{tipo, monto, prueba_de_confianza}` o null | tipo: llevar_paquete, avisar, grabar, vender, chamba_indefinida, regalos, relacion, modelaje, fiestas, fotos, otro |
| `gravedad` | verde, amarillo, rojo | Interno. Ante duda, hacia arriba |
| `riesgo_inmediato` | bool | Dispara el bloque fijo y el aviso a CONALEP |
| `seriedad` | serio, probable_broma, prueba, incoherente | Nunca se muestra al estudiante |
| `fila_radar` | dinero_chamba, molestan_amenazan, broncas, maestro, otras | Una sola |
| `confianza` | `{campo: 0–1}` | Por campo |
| `resumen` | dos líneas en lenguaje llano | Para el aviso a CONALEP y auditoría |

La taxonomía vive en `config/taxonomia.json` y la define la embajada (ofrecieron aportar la tipología de violencias). No se edita en el código.

Modelo: Haiku para volumen; si la confianza en `gravedad` o `es_reclutamiento` es menor a 0.7, se reprocesa con Sonnet.

### Capa 3: Léxico vivo

Los estudiantes escriben "jale", "punto", "el de la moto", "los del video", no "reclutamiento" ni "halcón". El sistema:

- Mantiene `config/lexico.json`: término → significado → categoría.
- Detecta términos no reconocidos que se repiten (3+ veces en 30 días) y los propone en una cola.
- Una vez al mes, alguien de la embajada aprueba o descarta desde el tablero. Es la única intervención humana y es fuera de línea.

### Capa 4: Inferencia

Sobre las fichas y los embeddings, con nivel de confianza en cada resultado:

- **Parecidos**: embedding por mensaje (pgvector); "N personas más contaron algo parecido" = mensajes serios del mismo plantel en los últimos 30 días con similitud por encima de un umbral. Es lo que ve el estudiante.
- **Mismo hecho vs. hecho distinto**: mensajes muy similares, misma celda, misma franja, ventana de 72 h → un hecho con varios testigos. Un hecho con 3+ testigos independientes es una señal fuerte.
- **Reclutamiento sin la palabra**: oferta + tarea de prueba, o oferta + insistencia, o regalos + secreto → `es_reclutamiento: probable` aunque nadie lo diga.
- **Actor recurrente**: el mismo descriptor de actor ("el de la moto") en varios mensajes en semanas distintas → actor persistente en la celda.
- **Escalamiento**: en una celda, el peso de las etapas se mueve de contacto/oferta hacia tarea/amenaza entre periodos.
- **Secuencia en celda**: sin ligar personas (imposible por anonimato), se ligan etapas en la misma celda en el tiempo, que es la forma del proceso.

### Capa 5: Patrones y alertas

Reglas automáticas que producen una **ficha de patrón**:

| Regla | Condición |
|---|---|
| Concentración | 8+ mensajes serios en la misma celda en 7 días |
| Coincidencia | 3+ testigos independientes de una misma cita (lugar + franja + fecha) |
| Escalamiento | Proporción de tarea+amenaza sobre contacto+oferta crece 2× entre periodos en una celda |
| Medio nuevo | Una plataforma o término aparece por primera vez y se repite 3+ veces |
| Oferta replicada | Misma oferta (tipo + monto ± 20 %) en más de un plantel |
| Actor persistente | Mismo descriptor de actor en 5+ mensajes en 3+ semanas |

**Ficha de patrón** (lo único que sale del sistema hacia afuera; idéntica para embajada y CONALEP):

```
Zona (celda gruesa) · Periodo · Reportes independientes (tras filtro y deduplicación)
Medio · Tipo de oferta y tarea · Monto típico · Franja · Etapa predominante
Señal de escalamiento · Confianza (reportes, coincidentes, descartados)
```

Sin texto libre, sin nombres. Si hay grupo nombrado: "grupo identificado por los reportantes", sin el nombre.

---

## 6. Tablero de la embajada

Uso semanal, 2–3 personas, con alertas por correo cuando se dispara una regla. Seis vistas:

1. **Resumen**: mensajes por semana, por fila del radar, por gravedad, % filtrado, tendencia vs. cuatro semanas previas. Número principal: intentos de reclutamiento reportados en el mes.
2. **Mapa físico**: celdas gruesas con 5+ registros, filtros de periodo y etapa. Al pasar: conteo, medio predominante, oferta, franja. Sin puntos individuales.
3. **Canales digitales**: por plataforma y tipo de contenido (oferta, corridos, retos, "padrino"), evolución mensual.
4. **Modo de operar**: el embudo contacto → oferta → tarea → enganche → amenaza por zona; tipo de oferta y monto; qué se pide como prueba; estacionalidad.
5. **Alertas de patrón**: lista de fichas generadas, con estado (nueva / revisada).
6. **Respuesta institucional**: por plantel, rojos avisados y tiempo hasta el aviso. (Solo lo que el sistema sabe; no hay seguimiento de casos.)

Además: cola del léxico (aprobar/descartar) y registro de accesos (quién vio qué vista, cuándo), que se entrega a CONALEP.

Lo que el tablero **no tiene por diseño**: texto libre, mensajes individuales, exportación por renglón, celdas < 5, horas exactas, nombres de actores.

---

## 7. Aviso a CONALEP

Cuando una ficha sale `gravedad: rojo`, se envía un mensaje al teléfono o correo del cargo designado en el plantel con: el `resumen` de dos líneas, la celda, la franja y la ruta legal fija (dirección, Subdirección, Ministerio Público, Procuraduría de Protección, 911). Nada más. Para el demo, un correo o webhook; para el piloto, Twilio.

Supuesto que se declara en la cotización: CONALEP designa una persona por plantel que recibe estos avisos. Sin eso, el aviso no tiene destino.

---

## 8. Modelo de datos

```sql
-- Celdas gruesas del plantel, definidas a mano en config/celdas.geojson
celdas (id, plantel_id, nombre, tipo, geom)
-- tipo: adentro | entrada | parada | colonia | en_linea

-- Mensaje limpio. NUNCA: ip, user_agent, timestamp exacto, texto original.
mensajes (
  id uuid, plantel_id, celda_id null,
  fecha date, franja text,
  texto_limpio text, captura_url null,
  embedding vector(1024),
  creado_en_lote date                  -- fecha de lote, no timestamp
)

fichas (
  mensaje_id, quien_habla, hechos text[], etapa, es_reclutamiento,
  medio, actor, actor_nombre, oferta jsonb, gravedad, riesgo_inmediato bool,
  seriedad, fila_radar, confianza jsonb, resumen text, modelo text, version_taxonomia text
)

hechos_agrupados (id, plantel_id, celda_id, fecha_inicio, fecha_fin, n_testigos, ficha_representativa)

patrones (id, regla, plantel_id, celda_id null, periodo, ficha jsonb, estado, creado_en date)

lexico_propuestas (termino, n_apariciones, primera_vez date, estado)

accesos (usuario, vista, fecha, franja)   -- registro para CONALEP
```

Reglas de retención: texto limpio se conserva 12 meses y se borra; fichas y agregados se conservan. Capturas: 90 días.

---

## 9. Reglas técnicas de anonimato

- Sin cuenta, sin teléfono, sin correo, sin cookies, sin analítica, sin permisos del navegador.
- La capa de entrada (Cloudflare o equivalente) descarta la IP antes de la aplicación; logs de acceso desactivados en producción.
- Fecha y franja, nunca hora exacta. Los mensajes no rojos se liberan a la base en **lotes con retraso aleatorio de 2 a 12 horas**, para romper la correlación entre "cuándo se escribió" y "quién estaba dónde". Los rojos entran de inmediato.
- Capturas: el navegador elimina metadatos antes de subir.
- El texto original no se persiste. La limpieza ocurre en memoria.
- Lugar: elegido por el usuario entre celdas gruesas. Jamás GPS.
- Agregados: mínimo 5 registros por celda y por fila antes de mostrar.
- Datos en servidor controlado por StartupLab, cifrados en reposo. Cada acceso al tablero queda registrado.

---

## 10. Stack

- **TypeScript** en todo el repo.
- **Next.js (App Router)** para la página del estudiante, el tablero y las rutas de API. Despliegue en Vercel (desactivar logs de IP en producción o poner Cloudflare enfrente).
- **Supabase**: Postgres + pgvector + Auth (tablero) + Storage (capturas).
- **Anthropic API**: extracción con salida estructurada (tool use / JSON schema). Haiku por defecto, Sonnet para baja confianza. Embeddings: Voyage (o el modelo pequeño de OpenAI).
- **MapLibre** con teselas de OpenStreetMap; celdas desde GeoJSON. **Recharts** para gráficas.
- **PWA** con `next-pwa` o equivalente.
- Avisos: correo/webhook en demo; Twilio en piloto.

---

## 11. Estructura del repo

```
/app
  /(estudiante)/page.tsx       radar + chat
  /(estudiante)/salir/page.tsx página neutra de salida rápida
  /(tablero)/...               embajada, con login Supabase
  /api/mensaje/route.ts        recibe → limpia → extrae → embeddings → guarda (o encola)
  /api/radar/route.ts          agregados con mínimo de 5
  /api/patrones/route.ts       corre reglas (cron)
/lib
  /ia/limpiar.ts
  /ia/extraer.ts               texto → ficha validada contra esquema
  /ia/repreguntar.ts           decide qué falta y formula la repregunta
  /ia/parecidos.ts             embeddings, similitud, dedup
  /ia/lexico.ts                detección de términos nuevos
  /patrones/reglas.ts
  /patrones/ficha.ts
  /anonimato/lotes.ts          liberación con retraso aleatorio
  /anonimato/capturas.ts       limpieza de metadatos en cliente
/config
  taxonomia.json
  lexico.json
  celdas.geojson
  textos.json                  todos los textos fijos del chat (incluido el bloque rojo)
/scripts
  generar-datos.ts             mensajes sintéticos
  auditar.ts                   muestra mensual de 100 para revisión manual
/supabase
  migrations/
CLAUDE.md
```

### CLAUDE.md del repo (contenido mínimo)

```
- Nunca guardar IP, user agent, cookies ni identificadores de dispositivo.
- Hora se guarda como fecha + franja. Nunca timestamp exacto en tablas de mensajes.
- El texto original no se persiste; solo la versión limpia.
- Ninguna consulta agregada devuelve celdas o filas con menos de 5 registros.
- El tablero nunca expone texto libre ni actor_nombre.
- Ante duda en gravedad, el modelo clasifica hacia arriba.
- Taxonomía, léxico, celdas y textos fijos viven en /config y no se editan en código.
- El chat no da consejos, no pide nombres, no promete acción. Los únicos textos hacia el estudiante son los de /config/textos.json más las repreguntas de campos faltantes.
- Todo en español de México.
```

---

## 12. Orden de construcción

**Fase 1: pipeline sin interfaz (semana 1)**
Migraciones, esquema de la ficha, prompt de limpieza, prompt de extracción, embeddings, "parecidos". Se prueba desde terminal con 20 mensajes escritos a mano. Criterio de listo: la ficha sale correcta y estable en los 20; un rojo evidente sale rojo; una broma evidente sale broma.

**Fase 2: datos sintéticos (semana 1–2)**
`generar-datos.ts`: pide al modelo 300 mensajes como los escribiría un estudiante de CONALEP de la ZMVM. Distribución objetivo: 45 % testigo de algo raro, 25 % afectado directo, 10 % ya involucrado, 20 % bromas/pruebas/incoherentes. Al menos 30 con señal de reclutamiento en distintas etapas, 8 rojos, 3 con riesgo inmediato. Repartidos en 6 celdas, 8 semanas, con dos celdas donde el embudo escala y un actor recurrente. Con jerga real ("jale", "lana", "el de la moto", "los del video", "punto"). Criterio de listo: al correr el pipeline sobre los 300, el radar tiene todas las filas con número y se dispara al menos una alerta de cada regla.

**Fase 3: página del estudiante (semana 2)**
Radar, chat con repreguntas, cierre con parecidos, salida rápida, limpieza de capturas. Criterio de listo: un mensaje de prueba recorre todo el flujo en menos de 30 segundos en un celular.

**Fase 4: tablero (semana 3)**
Seis vistas, cola del léxico, registro de accesos, alertas por correo. Criterio de listo: con los datos sintéticos, el mapa muestra celdas, el embudo muestra escalamiento en las dos celdas diseñadas para eso, y aparece la ficha de patrón del actor recurrente.

**Fase 5: demo (antes del 9 de noviembre)**
Guion de 10 minutos: una estudiante escanea, cuenta, recibe "6 personas más"; el radar se actualiza; en el tablero aparece la celda; se muestra una ficha de patrón. Todo con datos sintéticos, declarado así.

---

## 13. Fuera de alcance de este prototipo

- Sistema de seguimiento o gestión de casos para CONALEP.
- Chat conversacional abierto o con consejos.
- Canal por WhatsApp (el número identifica; se evalúa después como canal secundario con aviso explícito).
- App nativa.
- Operadores humanos.
- Contenido educativo o de sensibilización dentro del producto.

---

## 14. Supuestos y pendientes que definen la cotización

1. CONALEP designa una persona por plantel que recibe avisos rojos.
2. La embajada entrega la taxonomía de violencias (base de `taxonomia.json`) y valida el léxico mensualmente.
3. La embajada ve patrones y agregados; nunca mensajes. Esto se declara por escrito.
4. StartupLab administra el servidor durante el piloto; se define después quién lo hereda.
5. Nombre, aspecto y textos del producto los definen los estudiantes de las delegaciones del evento; lo que hay en `textos.json` es un primer borrador.
6. Las celdas gruesas del plantel piloto se dibujan con el plantel una vez confirmado cuál es.
7. El piloto arranca con el ciclo escolar (enero/febrero de 2027). El evento (semana del 19 de octubre o del 9 de noviembre de 2026) es un lanzamiento con demo, no un arranque.

---

## Anexo A. `config/taxonomia.json` (borrador v0.2)

```json
{
  "_nota": "v0.2, borrador de StartupLab sobre la v0.1 de la especificación. Agrega vías de reclutamiento y violencia que afectan más a chavas (relación o 'novio', fotos, 'trabajo de modelo', trata) y el campo dirigido_a. La embajada valida.",
  "version": "0.2",
  "quien_habla": [
    "afectado",
    "testigo",
    "involucrado",
    "indeterminado"
  ],
  "hechos": [
    "oferta",
    "contacto",
    "tarea_encargada",
    "amenaza",
    "aislamiento_observado",
    "violencia",
    "conducta_maestro",
    "bronca",
    "acoso",
    "enganche_afectivo",
    "fotos_intimas",
    "explotacion_sexual",
    "trata",
    "otro"
  ],
  "etapa": [
    "contacto",
    "oferta",
    "tarea",
    "enganche",
    "amenaza",
    "no_aplica"
  ],
  "es_reclutamiento": [
    "si",
    "probable",
    "no"
  ],
  "medio": [
    "presencial",
    "juego_en_linea",
    "tiktok",
    "instagram",
    "whatsapp",
    "telegram",
    "otro_digital",
    "indeterminado"
  ],
  "franja": [
    "matutino",
    "vespertino",
    "noche",
    "fin_de_semana",
    "indeterminado"
  ],
  "actor": [
    "extrano",
    "adulto_conocido",
    "companero",
    "maestro",
    "grupo_nombrado",
    "pareja",
    "indeterminado"
  ],
  "dirigido_a": [
    "chavas",
    "chavos",
    "ambos",
    "indeterminado"
  ],
  "_dirigido_a": "A quién va dirigida la oferta o la agresión, según lo que cuenta sobre otras personas. Nunca se infiere de quien escribe.",
  "oferta_tipo": [
    "llevar_paquete",
    "avisar",
    "grabar",
    "vender",
    "chamba_indefinida",
    "regalos",
    "relacion",
    "modelaje",
    "fiestas",
    "fotos",
    "otro"
  ],
  "gravedad": [
    "verde",
    "amarillo",
    "rojo"
  ],
  "seriedad": [
    "serio",
    "probable_broma",
    "prueba",
    "incoherente"
  ],
  "fila_radar": [
    "dinero_chamba",
    "molestan_amenazan",
    "broncas",
    "maestro",
    "otras"
  ],
  "criterios_gravedad": {
    "rojo": "oferta ya aceptada, tarea ya realizada, amenaza directa, cita concreta en tiempo y lugar, traslado o retención, ausencia abrupta con indicios, adulto del plantel dando dinero o regalos en privado a una o un estudiante, trata o traslado para trabajar lejos, explotación sexual, amenaza de difundir fotos íntimas",
    "amarillo": "oferta concreta no aceptada, contacto reiterado, aislamiento con secretismo, dinero u objetos sin explicación, invitación a conocer a un grupo, exposición sostenida a contenido de idealización, relación con un adulto mucho mayor que regala cosas y pide secreto, pedido de fotos, invitaciones a fiestas con adultos del grupo",
    "verde": "vulnerabilidad sin señal de contacto, información de patrón sin persona en riesgo, cambio de grupo social sin control"
  },
  "regla": "Ante duda entre dos niveles, asignar el superior."
}
```

## Anexo B. `config/textos.json` (borrador)

```json
{
  "_nota": "Primer borrador. Los textos finales los escriben los estudiantes. Todo lo que ve el estudiante sale de aquí, salvo las repreguntas. Sin masculino genérico: se escribe para chavas y chavos por igual (compas, personas, alguien).",
  "bienvenida": "¿Qué viste, qué te pasó o qué te preocupa? Cuéntalo como quieras. Nadie sabrá que fuiste tú.",
  "radar_titulo": "Esta semana en tu plantel",
  "radar_titulo_mes": "Este mes en tu plantel",
  "radar_conteo": "{n} compas contaron algo aquí.",
  "radar_nota": "Si algo tiene menos de 5, sale como —. Así nadie queda expuesto.",
  "periodo_semana": "Esta semana",
  "periodo_mes": "Este mes",
  "filas": {
    "dinero_chamba": "Alguien ofreciendo dinero o \"chamba\"",
    "molestan_amenazan": "Alguien que acosa, molesta o amenaza",
    "broncas": "Broncas entre compas",
    "maestro": "Algo raro con un maestro o maestra",
    "otras": "Otras cosas"
  },
  "boton_contar": "Contar algo",
  "boton_ver_radar": "Ver el radar",
  "boton_contar_otra": "Contar otra cosa",
  "input_placeholder": "Escribe aquí…",
  "limpieza_aviso": "Quitamos datos que te identifican. Así queda tu mensaje.",
  "captura_limpia": "Captura lista. Le quitamos la ubicación y los datos del cel.",
  "cierre_parecidos": "Recibido. {n} personas más contaron algo parecido cerca de tu plantel este mes.",
  "cierre_primero": "Recibido. Nadie había contado algo así aquí. Si alguien más lo cuenta, lo vas a ver en el radar.",
  "cierre_no_suma": "Recibido. Por ahora no se suma a nada; esto es lo que han contado cerca de ti.",
  "rojo_inmediato": "Si estás en peligro ahora, llama al 911. Si puedes, métete a la escuela o a un lugar con gente. No vayas a ningún lado sin compañía. Para contar algo sin dar tu nombre: [línea anónima, por confirmar].",
  "rojo_autolesion": "Si estás pensando en hacerte daño, habla ahora con alguien. Emergencias: 911. Línea de apoyo: [por confirmar con especialistas].",
  "salida_rapida": "Salir"
}
```

## Anexo C. Prompt de extracción (esqueleto)

```
Eres un sistema de etiquetado. Recibes un mensaje escrito por un estudiante de
bachillerato técnico en la Zona Metropolitana del Valle de México, ya limpio de
datos que identifiquen a quien escribe. Devuelve únicamente un JSON válido
conforme al esquema adjunto.

Reglas:
- Etiqueta lo que el texto dice o permite inferir con razón; marca la confianza
  de cada campo entre 0 y 1.
- "es_reclutamiento" puede ser "probable" aunque la palabra no aparezca, cuando
  hay oferta de dinero o "chamba" sin detalles, tarea de prueba, insistencia,
  regalos con secreto, invitación a conocer a un grupo, o pago por avisar,
  grabar o llevar algo.
- Ante duda entre dos niveles de gravedad, asigna el superior.
- "riesgo_inmediato" es true solo con cita concreta en tiempo y lugar, amenaza
  directa, traslado o retención en curso.
- Marca "seriedad" como prueba o broma solo con señales claras (texto vacío de
  contenido, "prueba", "hola", repetición idéntica, incoherencia total). Un
  mensaje mal escrito o confuso pero con contenido es "serio".
- Escribe "resumen" en dos líneas, lenguaje llano, sin interpretaciones.
- Usa el glosario adjunto para jerga. Si encuentras un término desconocido que
  parece jerga relevante, inclúyelo en "terminos_nuevos".

Glosario: {lexico}
Esquema: {taxonomia}
Mensaje: {texto_limpio}
```
