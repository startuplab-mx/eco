# Mapa de indicadores de Eco

Qué se guarda de cada sesión, cómo se resume cada variable y dónde se va a ver. Sirve para revisar con el
equipo psicológico que el instrumento mide lo que el documento promete y para diseñar la base de Airtable
(etapa 4).

**Dónde se ve**
- **Tablero:** Interface de Airtable. Conteos, porcentajes, promedios y cruces por grupo (edad, ámbito, semana).
- **Análisis:** exportación de la base para análisis estadístico (correlaciones, alfa de Cronbach, modelos).
  Airtable no los calcula.

**Quién contesta**
- **Todos:** entrada emocional y núcleo V1–V9, salvo quien termine antes.
- **Ruta:** sólo quien recibe ese módulo según su emoción y ámbito (entre 3 y 4 módulos por sesión).

---

## 1. Datos por sesión (documento, sección 6)

| Campo del documento | Campo en Eco | Estado |
|---|---|---|
| Código aleatorio | `codigo` | Listo |
| Fecha (sólo semana) | `semana` (p. ej. 2026-W44) | Listo |
| Rango de edad · género | `edad` · `genero` | Listo |
| Con quién vive | `vive` | Listo |
| Emoción de entrada | `emociones` · `emocionEscrita` | Listo |
| Termómetro inicial y final | `termometroInicial` · `termometroFinal` · `cambioEmocional` | Listo |
| Zona corporal · ámbito | `zonaCuerpo` · `ambito` | Listo |
| Puntaje por ítem | `items` (un valor por ítem) | Listo |
| Índice por variable | `indices` (0–100) · `malestarGlobal` | Listo |
| Nivel de riesgo | `nivel` · `motivos` | Listo |
| Categorías del texto libre | — | **Etapa 3** (hoy sólo `textosEscritos`: cuántos escribió) |
| Si eligió algún recurso de ayuda | `recursos` | Listo |
| *(agregado)* Escuela · versión del guion | `escuela` · `versionGuion` | Listo |
| *(agregado)* Sesión completa · dónde se quedó | `completa` · `ultimoBloque` · `modulos` | Listo |

---

## 2. Variables

Índice 0–100 = promedio de los ítems de escala (Nunca…Casi siempre o acuerdo 1–5) de esa variable.
Mayor = más de lo que mide la variable. Las variables sin escala se reportan como porcentajes o frecuencias.

### Entrada emocional

| Variable | Ítems | Indicador | Quién | Dónde |
|---|---|---|---|---|
| V20 Reconocimiento emocional | Emoción(es), "No sé", palabras propias, Paso 5 | % por emoción · % "No sé" · % que la nombró con sus palabras · temas del Paso 5 (etapa 3) | Todos | Tablero |
| V21 Intensidad y cronicidad | Termómetro inicial y final, tiempo | Promedio inicial y final · cambio promedio · % "desde hace mucho / casi siempre" | Todos | Tablero |
| V22 Expresión somática | Zona del cuerpo | % por zona | Todos | Tablero |
| Ámbito | De dónde viene | % por ámbito · cruce con V1, V11, V12 | Todos | Tablero |

### Núcleo

| Variable | Ítems | Indicador | Quién | Dónde |
|---|---|---|---|---|
| V1 Exposición a violencia | Colonia, escuela/camino (escala) · alguien conocido (sí/no) | Índice · % que sabe de algo grave a alguien conocido | Todos | Tablero |
| V2 Miedo y ansiedad | Miedo, alerta, sueño | Índice | Todos | Tablero |
| V3 Tristeza y desesperanza | Ánimo, desesperanza | Índice · % desesperanza ≥ Seguido | Todos | Tablero |
| V4 Enojo | Enojo | Índice | Todos | Tablero |
| V5 Culpa y lealtad | Lealtad, culpa | Índice | Todos | Tablero |
| **Malestar global** | Promedio de V2–V5 | Promedio · % > 60 | Todos | Tablero |
| V6 Normalización | Violencia normal, dinero rápido | Índice · % "Bastante" o "Mucho" en cada pregunta | Todos | Tablero |
| V7 Presión | Presión (escala) · puede decir que no | Índice · % presión ≥ Seguido · % "no podría decir que no" | Todos | Tablero |
| V8 Proyecto de vida | Terminar la escuela (escala) · se imagina en 5 años | Índice · % "No" en 5 años | Todos | Tablero |
| V9 Apoyo y afrontamiento | Adulto confiable · amistades seguras · estrategias | % sin adulto confiable · % sin amistades seguras · % por estrategia (marcar consumir, pelear, encerrarme) | Todos | Tablero |

### Módulos

| Variable | Ítems | Indicador | Quién | Dónde |
|---|---|---|---|---|
| V10 Duelo | Pérdida · cuánto duele · mensaje | % con pérdida · distribución del dolor · temas (etapa 3) | Ruta (C) | Tablero |
| V11 Pertenencia escolar | Me siento parte · docente de confianza · qué cambiaría | Índice · % sin docente de confianza · % por cambio | Ruta (A) | Tablero |
| V12 Clima familiar | Cariño · tensión (invertida) · hablar en casa | Índice (mayor = mejor clima) · % "No" puede hablar | Ruta (B) | Tablero |
| V13 Autoestima | Persona valiosa · fortalezas | Índice · % "Nada" o "Un poco" · temas (etapa 3) | Ruta (D) | Tablero |
| V14 Estrés traumático | Recuerdos, evitación, sobresalto | Índice · % con 2+ síntomas ≥ Seguido · % que pidió saber cómo buscar ayuda | Ruta (E) | Tablero |
| V15 Consumo para afrontar | Frecuencia · motivo | Índice · % ≥ A veces · % por motivo | Ruta (F) | Tablero |
| V16 Narcocultura en redes | Frecuencia · cómo se siente | Índice · % "con emoción" | Ruta (G) | Tablero |
| V17 Modelos | A quién admira | % por tipo de modelo | Ruta (H) | Tablero |
| V18 Resiliencia | Salgo adelante · qué me da fuerza | Índice · temas (etapa 3) | Ruta (D) | Tablero |
| V19 Confianza institucional | A quién acudiría · barreras | % "Nadie" · % por barrera ("me pueden ubicar") | Ruta (I) | Tablero |

### Protocolo y uso

| Indicador | Dónde |
|---|---|
| % verde / amarillo / rojo por semana y por mes | Tablero |
| Motivos de amarillo (termómetro, desesperanza, malestar, presión, sin adulto) | Tablero |
| Sesiones rojas por escuela y semana | Tablero |
| Recursos de ayuda elegidos (orientación, Línea de la Vida, 911, 089, ejercicio) | Tablero |
| % de sesiones completas · dónde se quedan | Tablero |

---

## 3. Análisis sugeridos en el documento

| Análisis | Dónde |
|---|---|
| Descriptivos por variable y rango de edad | Tablero |
| Emoción de entrada × ámbito | Tablero |
| Cambio en el termómetro entre inicio y cierre | Tablero |
| % de sesiones amarillas y rojas por mes | Tablero |
| Exposición (V1) contra malestar (V2–V5) | Tablero muestra el malestar promedio por nivel de exposición; la correlación va en Análisis |
| Papel protector de adulto confiable (V9), resiliencia (V18) y proyecto de vida (V8) | Tablero muestra el malestar con y sin adulto confiable; el modelo va en Análisis |
| Consistencia interna (alfa ≥ 0.70) en el piloto | Análisis (con los puntajes por ítem) |
| Acuerdo entre codificadores del texto libre (kappa ≥ 0.70) | Etapa 3 + revisión humana |

---

## 4. Decisiones para el equipo psicológico

1. **Módulos y prevalencia.** Los módulos A–I los contesta sólo quien los recibe por su ruta. Por ejemplo,
   V14 lo contestan sobre todo quienes eligen miedo. Los porcentajes de los módulos describen a esos
   jóvenes, no a la escuela. Si se quiere estimar cuántos en la escuela tienen síntomas, algunos módulos
   tendrían que aplicarse a todos, y la sesión se alarga.
2. **Clima familiar (V12).** El índice mezclaba cariño (más es mejor) con tensión (más es peor). Ahora la
   tensión se invierte y el índice se lee como "mayor = mejor clima". Confirmar que así lo quieren o si
   prefieren ver cariño y tensión por separado.
3. **Variables sin escala.** Adulto confiable, amistades seguras, duelo, comunicación en casa y metas se
   reportan como porcentajes, no como índice. Confirmar.
4. **Mínimo 10 por celda.** Airtable no oculta solo los grupos chicos. Propuesta: el tablero muestra por
   escuela y por edad; los cruces más finos (edad × género × ámbito) sólo van en Análisis, donde se
   revisa el tamaño antes de reportar.
5. **Sesiones abandonadas.** Si el joven cierra la pestaña a la mitad, hoy no queda nada. Para medir dónde
   se quedan, en la etapa 4 propongo guardar lo avanzado al cerrar la página (sin texto, sólo números),
   marcado como incompleto.

## Dónde se guarda (etapa 4)

Base de Airtable **Eco** (`appMB7HAbDoIEVusW`), espacio de trabajo "Work".

| Tabla | Una fila por | Qué guarda |
|---|---|---|
| Escuelas | escuela | código del QR, nombre, orientador, lugar, horario |
| Sesiones | sesión verde o amarilla con consentimiento | día (sin hora), semana, datos generales, emociones, termómetro, ámbito, nivel y motivos, índices V1–V18, temas, calidad y respuestas en códigos |
| Sesiones rojas | sesión roja | sólo escuela y semana |

- Se guarda al terminar, o lo que haya si cierra la página a la mitad (misma fila, se actualiza por código).
- Sin consentimiento no se guarda nada. Si una sesión se vuelve roja, se borra lo parcial y sólo queda la fila en Sesiones rojas.
- Ningún texto escrito por el joven sale del navegador hacia Airtable.
- Variables en Vercel: `AIRTABLE_TOKEN` (llave con permiso `data.records:write` sólo sobre la base Eco) y `AIRTABLE_BASE`.
