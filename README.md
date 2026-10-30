# Eco

Chat de escucha psicoemocional para jóvenes de 12 a 18 años en contextos de crimen organizado.
Web por QR, anónima, sin login. StartupLab MX.

## Estado

**Etapa 1 (esta rama):** guion completo, motor de rieles y pantalla del chat con texto fijo.
Sin modelo de lenguaje y sin base de datos: el resumen de la sesión se calcula en el navegador
y se puede ver agregando `?debug=1` a la URL.

| Etapa | Qué agrega | Estado |
|---|---|---|
| 1 | Guion como datos, motor, protocolo verde/amarillo/rojo, pantalla | Hecha |
| 2 | Capa conversacional (Claude API): Eco redacta y entiende texto libre sobre los rieles | Pendiente |
| 3 | Clasificador de riesgo, filtro de identificadores y codificación temática con modelo | Pendiente |
| 4 | Airtable: Sesiones, Respuestas, Alertas + tablero del equipo psicológico | Pendiente |

## Cómo está armado

```
data/guion.json        Todo lo que Eco dice y pregunta. Editable sin tocar código.
config/instancia.json  Datos de la escuela: orientador, lugar, horario, directorio de líneas.
lib/motor.ts           Recorre el guion: rutas por emoción y ámbito, pausa/salir, crisis.
lib/indices.ts         Índices 0–100, malestar global, nivel de riesgo, resumen de sesión.
lib/seguridad.ts       Palabras de alarma y filtro de identificadores (nombres, teléfonos, direcciones, placas).
components/            Pantalla del chat, ejercicios de regulación, directorio de ayuda.
scripts/               Validador del guion y simulador de conversaciones.
```

### Reglas que el motor garantiza

- El texto libre pasa primero por la detección de riesgo. Una frase de alarma interrumpe la plática
  en cualquier punto y muestra el mensaje de crisis.
- Si el joven escribe un nombre, teléfono o dirección, Eco le pide contarlo sin eso (una vez);
  después lo tacha en silencio. El texto nunca sale del navegador en esta etapa, y el resumen
  sólo registra si se escribió algo.
- El 089 no aparece en el directorio que sigue a una crisis.
- Fecha por semana, nunca por día. Código de sesión al azar, sin relación con el joven.

## Comandos

```bash
npm install
npm run dev        # http://localhost:3000  (agrega ?debug=1 para ver el resumen)
npm run validar    # revisa que el guion sea coherente
npm run simular    # recorre 3,000 conversaciones al azar buscando errores
```

## Cambiar el guion

Edita `data/guion.json` y corre `npm run validar`. Cada paso tiene un `id`, un `tipo`
(`mensaje`, `opcion`, `multiple`, `abierta`, `ejercicio`, `directorio`), su `texto` y, si aplica,
una condición `si` y `reacciones`. Las rutas por emoción y ámbito están en `ruta`.
Los cambios frente al documento original están en `docs/cambios-al-guion.md`.

## Pendientes de la instancia piloto

En `config/instancia.json`: nombre del psicólogo u orientador, lugar y horario.
Falta agregar el teléfono del DIF o de la Procuraduría de Protección de NNA del estado.
