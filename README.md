# eco

Canal anónimo y radar para planteles CONALEP. Los estudiantes cuentan lo que ven sin dar su nombre; el sistema les dice cuántos más contaron algo parecido y arma, con eso, un tablero de patrones de reclutamiento para la Embajada de Estados Unidos. Lo desarrolla StartupLab MX.

"eco" es un nombre de trabajo. El nombre final lo ponen los estudiantes.

La especificación completa está en [`docs/especificacion.md`](docs/especificacion.md).

## Estado: mockup sin funciones

Esta rama es un demo navegable para enseñar el flujo antes de construir el pipeline. No hay IA, base de datos ni envíos: el chat sigue un guion y todos los números son inventados.

```bash
npm install
npm run dev
```

Abre `http://localhost:3000/demo` para el guion de 10 minutos, con la vista del estudiante en un teléfono a la izquierda.

## Pantallas

| Ruta | Quién la ve | Qué muestra |
|---|---|---|
| `/` | Estudiante | Radar: cinco filas y el conteo de la semana o del mes |
| `/contar` | Estudiante | Chat de máximo dos repreguntas y cierre con cuántas personas más contaron algo parecido |
| `/salir` | Estudiante | Página neutra (apuntes de física) para la salida rápida |
| `/tablero/entrar` | Embajada | Entrada al tablero |
| `/tablero` | Embajada | Resumen |
| `/tablero/mapa` | Embajada | Mapa físico por celdas gruesas |
| `/tablero/canales` | Embajada | Canales digitales |
| `/tablero/modo` | Embajada | Modo de operar: embudo por zona, ofertas, pruebas, franjas |
| `/tablero/alertas` | Embajada | Fichas de patrón |
| `/tablero/respuesta` | Embajada | Avisos rojos al plantel |
| `/tablero/lexico` | Embajada | Cola de términos nuevos |
| `/tablero/accesos` | Embajada | Registro de accesos para CONALEP |
| `/demo` | Quien presenta | Guion del demo |

El chat reacciona a lo que se escribe: detecta qué trae el mensaje y pregunta solo lo que falta, con las reglas de [`docs/repreguntas.md`](docs/repreguntas.md). Para el demo, `/contar?e=normal|linea|chava|rojo|broma|maestro` precarga un texto de ejemplo:

- `normal`: "afuera" no alcanza para la celda; pregunta dónde y cuándo, cierra con "6 personas más contaron algo parecido".
- `linea`: venta de droga en línea. Pregunta la app; nunca dónde ni a qué hora.
- `chava`: un señor mayor recoge a una amiga, le regala cosas y le pide fotos. Pregunta cuándo.
- `rojo`: amenaza con cita concreta. No repregunta; cierra con el bloque fijo: llamar al 911 y meterse a la escuela o a un lugar con gente.
- `broma`: no se suma a nada y muestra el radar.
- `maestro`: quita "soy de su mismo grupo" antes de guardar y pregunta por qué app. Como no hay reportes parecidos, cierra con el total del plantel: "No eres la única persona que está contando lo que pasa".

`npm test` corre la batería de casos del chat. `npm run simular -- "mensaje" "respuesta"` muestra qué haría el chat con cualquier mensaje.

## Qué respeta el mockup

- En el radar y en las gráficas y tablas del tablero, ningún conteo menor a 5 aparece: sale "—" o "< 5". Las dos excepciones están en los pendientes 1 y 2.
- El tablero no tiene texto libre, mensajes, nombres ni horas exactas.
- No hay código de seguimiento: nada liga a quien escribe con lo que contó.
- Sin masculino genérico hacia quien escribe, tampoco "compas": "personas", "alguien", "estudiantes". Nunca se le dice a alguien que es la primera persona en contar algo. El chat y el tablero reconocen también las vías de enganche que afectan más a chavas: relación o "novio" mayor, regalos, fotos, "trabajo de modelo", trata.
- Todos los textos que ve el estudiante salen de `config/textos.json`, salvo las repreguntas.
- La salida rápida reemplaza la entrada del historial: "atrás" no regresa.

## Estructura

```
app/(estudiante)/     radar y chat (siempre en oscuro, sin nada institucional)
app/salir/            página neutra
app/tablero/          tablero de la embajada (claro y oscuro)
app/demo/             guion para presentar
components/           piezas de cada lado
config/               textos.json, taxonomia.json, lexico.json (borradores)
lib/mock/             datos sintéticos y guion del chat
docs/                 especificación
```

## Qué sigue

La especificación (§12) ordena la construcción en cinco fases: pipeline en terminal, datos sintéticos, página del estudiante, tablero y demo. Este mockup adelanta la forma de las fases 3 y 4 para validarla con la embajada y con los estudiantes antes de conectar nada.

## Pendientes que salieron al armar el mockup

1. **Mínimo de 5 contra reglas de 3.** Las reglas de Coincidencia y Medio nuevo se disparan con 3 reportes, y la ficha de patrón trae conteos de coincidentes y descartados que pueden ser menores a 5. Hay que decidir cómo se muestran sin romper la regla del mínimo.
2. **"N personas más" con N menor a 5.** La especificación no pone mínimo al conteo de parecidos que ve el estudiante. El escenario rojo del demo dice "3 personas más". Confirmar si se deja así.
3. **El radar no se actualiza al momento.** Los mensajes que no son rojos entran en lotes con 2 a 12 horas de retraso, así que en el demo el radar no cambia en cuanto alguien cuenta algo. El guion de la especificación dice que sí; hay que ajustar el guion o explicarlo.
4. **Línea anónima.** El bloque rojo dice "[línea anónima, por confirmar]". El 089 de denuncia anónima es el candidato obvio; falta confirmarlo con la Fiscalía.
5. **Autolesión.** La especificación no la cubre. El chat ya la separa del peligro y muestra otro bloque fijo, pero la línea de apoyo está "por confirmar" y el texto lo tienen que validar especialistas. La Línea de la Vida es la candidata.
