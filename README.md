# ZEUS Orchestrator

Orquestador en NestJS del Consejo de Arquitectos AI. ZEUS coordina a ATLAS
(arquitectura técnica), HERMES (estrategia de negocio) y APOLO (publicidad
y marketing) para producir respuestas integradas a partir de un brief.

Tiene tres modos:

- **Pipeline** (`POST /orchestrate`) — flujo fijo de 3 fases:
  decomposición → arquitectos en paralelo → síntesis.
- **Agéntico one-shot** (`POST /orchestrate/agentic`) — ZEUS corre en un
  loop de tool-use donde él decide a quién consultar, puede re-consultar
  a un arquitecto para resolver tensiones y puede usar búsqueda web para
  fundamentar la síntesis con datos reales.
- **Sesiones multi-turno** (`POST /sessions`) — igual que el modo
  agéntico, pero la conversación se retoma: el usuario puede hacer
  preguntas de seguimiento o plantear escenarios alternativos, y ZEUS ve
  todo el historial y decide en cada turno si necesita volver a
  consultar a un arquitecto (ej. si cambia el presupuesto) o si puede
  responder con lo ya discutido.

## Arquitectura (modo pipeline)

```
POST /orchestrate
  │
  ▼
┌─────────────────────────────────┐
│  FASE 1 — DECOMPOSICIÓN         │
│  ZEUS analiza el brief          │
│  y genera consultas específicas │
└─────────────────────────────────┘
              │
              ▼
┌─────────────────┴─────────────────────┐
│   FASE 2 — PARALELO                    │
│   ATLAS   ◄──┬──►  HERMES  ◄──► APOLO  │
│   (técnico)  │   (negocio)  (marketing)│
└──────────────┴────────────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  FASE 3 — SÍNTESIS              │
│  ZEUS integra las perspectivas  │
│  detecta tensiones, decide      │
└─────────────────────────────────┘
              │
              ▼
        Respuesta final
```

## Setup

Requiere **Node.js >= 18** (el SDK de Anthropic usa `fetch` global).

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env y pon tu ANTHROPIC_API_KEY

# 3. Correr en modo dev
npm run start:dev
```

El servidor arranca en `http://localhost:3000`.

### Auth

Si defines `ZEUS_API_KEY` en el `.env`, todos los endpoints (salvo
`/orchestrate/health`) exigen esa key en cada request, vía header
`x-api-key: <key>` o `Authorization: Bearer <key>`. Sin la variable, el
server queda abierto (solo aceptable en local; lo advierte en el log al
arrancar). **Definirla es requisito antes de exponer el server fuera de
localhost** — cada request consume tu API key de Anthropic.

```bash
# generar una key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# usarla con curl
curl -H "x-api-key: <key>" http://localhost:3000/sessions

# el CLI la lee de la variable de entorno ZEUS_API_KEY
```

## Uso

### Web UI de chat

Con el server corriendo, abre `http://localhost:3000` en el navegador.
Es una página estática servida por el propio Nest (carpeta `public/`,
sin dependencias ni build de frontend) sobre los endpoints de sesiones:

- Editor de brief cómodo, con botón **Plantilla** que precarga la
  estructura que los arquitectos necesitan (contexto, objetivo,
  presupuesto, mercado, restricciones). Ctrl+Enter envía.
- Streaming en vivo del loop agéntico: ves a quién consulta ZEUS
  (ATLAS/HERMES/APOLO), búsquedas web y el comentario de cada iteración.
- Síntesis renderizada como markdown (títulos, tablas, listas) con chips
  de qué consultas se hicieron y cuánto tardó cada una.
- Barra lateral con las sesiones guardadas: clic para retomar cualquier
  conversación y seguir preguntando.
- Si el server exige auth, el botón 🔑 guarda tu `ZEUS_API_KEY` en
  localStorage y se envía en cada request.
- Recuperación de turnos: si el stream SSE se corta (red, refresh, caída
  del proceso), la UI verifica contra la API si el turno alcanzó a
  persistirse y lo muestra en vez de declarar el fallo; solo reporta
  error si el turno realmente se perdió.

### CLI de chat (terminal)

Con el server corriendo (`npm run start:dev`), en otra terminal:

```bash
npm run zeus
```

Abre un chat interactivo contra los endpoints de sesiones multi-turno:
escribes el brief (Enter dos veces envía), ves en vivo a quién consulta
ZEUS (ATLAS/HERMES/APOLO, búsquedas web) y recibes la síntesis formateada.
La conversación continúa en la misma sesión, persistida en `data/sessions/`.

Comandos dentro del chat: `/sesiones`, `/cargar <id>`, `/nueva`, `/id`,
`/ayuda`, `/salir`. Flags útiles:

```bash
node zeus.js --list                        # lista sesiones y sale
node zeus.js --resume <id>                 # retoma una sesión
node zeus.js --brief "..."                 # one-shot: un turno y sale
ZEUS_URL=http://otro-host:3000 node zeus.js  # server remoto
```

### Health check

```bash
curl http://localhost:3000/orchestrate/health
```

### Enviar un brief

```bash
curl -X POST http://localhost:3000/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "brief": "Una agencia colombiana en etapa 0..."
  }'
```

Si el mismo brief (normalizado) ya fue orquestado en esta sesión del
servidor, la respuesta sale del caché en memoria con `"fromCache": true`.
Si un arquitecto falla, el flujo continúa sin él y el error queda
registrado en el campo `errors` de la respuesta.

### Streaming (SSE)

`POST /orchestrate/stream` devuelve Server-Sent Events: un evento
`phase` por cada fase (`start`/`complete`/`skipped`/`error`) y un
evento `result` final con el resultado completo.

```bash
curl -N -X POST http://localhost:3000/orchestrate/stream \
  -H "Content-Type: application/json" \
  -d '{"brief": "..."}'
```

### Modo agéntico

```bash
curl -X POST http://localhost:3000/orchestrate/agentic \
  -H "Content-Type: application/json" \
  -d '{"brief": "..."}'

# o con streaming de las acciones del agente:
curl -N -X POST http://localhost:3000/orchestrate/agentic/stream \
  -H "Content-Type: application/json" \
  -d '{"brief": "..."}'
```

En este modo ZEUS dirige el loop con cuatro herramientas:

- `consult_atlas` / `consult_hermes` / `consult_apolo` — los arquitectos como tools; ZEUS
  redacta queries autocontenidas y puede re-consultar si detecta
  tensiones entre las perspectivas.
- `web_search` — búsqueda web server-side de Anthropic para fundamentar
  la síntesis con datos actuales (precios de competidores, costos, etc.).

El stream emite eventos `agent` (`iteration`, `commentary`, `tool_call`,
`tool_result`, `tool_error`, `web_search`) y un `result` final que
incluye el log de consultas (`consultations`), iteraciones y tokens.

Notas del modo agéntico:

- Requiere un modelo con soporte de `web_search_20260209` y adaptive
  thinking (Opus 4.6+, Sonnet 4.6+; el default `claude-opus-4-8` y
  `claude-sonnet-4-6` funcionan).
- Cuesta y tarda más que el pipeline (el loop corre 2+ iteraciones,
  ~2-4 min y ~40K tokens de input en un brief típico), a cambio de
  consultas dinámicas y síntesis fundamentada en datos.
- No usa caché (cada corrida puede investigar distinto); sí persiste
  en `data/orchestrations/` con `"mode": "agentic"`.

### Sesiones multi-turno

```bash
# Turno 1: crea la sesión y corre el loop agéntico completo
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{"brief": "..."}'
# → { "id": "<session-id>", "turns": [...], ... }

# Turno 2+: sigue la conversación
curl -X POST http://localhost:3000/sessions/<session-id>/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "¿y si el presupuesto fuera $500?"}'

# Versiones con streaming: /sessions/stream y /sessions/:id/messages/stream

curl http://localhost:3000/sessions               # lista sesiones
curl http://localhost:3000/sessions/<session-id>   # sesión completa (historial + turnos)
```

Cada turno reutiliza el mismo loop agéntico (`consult_atlas`,
`consult_hermes`, `consult_apolo`, `web_search`): ZEUS ve todo el historial previo y
decide si la pregunta de seguimiento requiere volver a consultar a un
arquitecto (por ejemplo, si el usuario cambia el presupuesto o el
alcance) o si puede responder directamente con lo ya discutido. La
primera respuesta usa el formato completo de síntesis; los turnos
siguientes son más directos salvo que el usuario pida una síntesis
nueva.

Cada sesión se persiste en `data/sessions/<id>.json` con el historial
completo (formato API, para continuar la conversación) y un log legible
de turnos. En conversaciones largas el servidor compacta automáticamente
lo más antiguo del historial (context management server-side) antes de
acercarse al límite de contexto del modelo.

### Auditoría de orquestaciones

Cada orquestación se persiste como JSON en `data/orchestrations/`.

```bash
curl http://localhost:3000/orchestrate/runs        # lista (id, fecha, brief)
curl http://localhost:3000/orchestrate/runs/<id>   # resultado completo
```

### Tests y lint

```bash
npm test      # unit tests (Jest)
npm run lint  # ESLint
```

### Test rápido end-to-end

Con el server corriendo en otra terminal:

```bash
node test-brief.js
```

## Estructura del proyecto

```
public/                        # Web UI de chat (estática, sin build)
├── index.html
├── styles.css
└── app.js                     # SSE + render markdown + sesiones
src/
├── agents/                    # Los arquitectos del consejo
│   ├── apolo.prompt.ts        # System prompt de APOLO
│   ├── apolo.service.ts       # Servicio que invoca a APOLO
│   ├── atlas.prompt.ts        # System prompt de ATLAS
│   ├── atlas.service.ts       # Servicio que invoca a ATLAS
│   ├── hermes.prompt.ts       # System prompt de HERMES
│   ├── hermes.service.ts      # Servicio que invoca a HERMES
│   ├── zeus.prompt.ts         # System prompts de ZEUS (decomp + synth)
│   ├── zeus.service.ts        # Servicio que invoca a ZEUS
│   └── agents.module.ts
├── anthropic/                 # Cliente de la API de Anthropic
│   ├── anthropic.service.ts
│   └── anthropic.module.ts
├── auth/                      # Auth por API key (guard global)
│   ├── api-key.guard.ts       # Exige ZEUS_API_KEY (x-api-key o Bearer)
│   └── public.decorator.ts    # @Public() exime un endpoint (health)
├── orchestrator/              # El director de orquesta
│   ├── brief.dto.ts                  # Validación del payload (brief)
│   ├── message.dto.ts                # Validación del payload (mensaje de sesión)
│   ├── orchestrator.controller.ts    # Endpoints /orchestrate (pipeline + agéntico)
│   ├── orchestrator.service.ts       # Lógica del pipeline de 3 fases
│   ├── agentic-orchestrator.service.ts  # Loop agéntico (tool-use); runTurn() es el core reutilizable
│   ├── orchestration-store.service.ts   # Persistencia de orquestaciones one-shot
│   ├── sessions.controller.ts        # Endpoints /sessions (multi-turno)
│   ├── sessions.service.ts           # Encadena runTurn() sobre el historial de la sesión
│   ├── session-store.service.ts      # Persistencia de sesiones
│   └── orchestrator.module.ts
├── app.module.ts
└── main.ts
```

## Cómo agregar un nuevo arquitecto

Cuando quieras añadir, por ejemplo, **HEFESTO** (arquitecto de datos):

1. Crear `src/agents/hefesto.prompt.ts` con su system prompt.
2. Crear `src/agents/hefesto.service.ts` siguiendo el patrón de `atlas.service.ts`.
3. Registrarlo en `src/agents/agents.module.ts` (providers + exports).
4. Inyectarlo en `OrchestratorService`.
5. Actualizar el system prompt de ZEUS (`zeus.prompt.ts`) para incluirlo
   en el "Consejo disponible" y agregarlo a la estructura JSON de salida
   del modo Decomposición.
6. Actualizar `OrchestratorService.orchestrate()` para incluirlo en el
   `Promise.all` de la fase 2 y pasarlo al método de síntesis.

## Costo estimado por brief

Con el modelo por defecto, un brief completo cuesta aproximadamente
USD 0.10 - 0.15. La fase de síntesis es la más costosa porque recibe
todos los outputs anteriores como input.

## Próximos pasos

- [x] Persistencia: cada orquestación se guarda en `data/orchestrations/`
- [x] Streaming: eventos de fase vía SSE (`POST /orchestrate/stream`)
- [x] Caché: mismo brief dos veces → resultado en memoria sin re-ejecutar
- [x] Modo agéntico: ZEUS dirige un loop de tool-use en vez de un
      pipeline fijo, con ATLAS/HERMES como tools y web_search
- [x] Conferencia entre arquitectos: en modo agéntico, ZEUS puede
      re-consultar a un arquitecto exponiéndole la objeción del otro
- [x] Sesiones multi-turno: conversación persistida con el consejo
      (`POST /sessions`), ZEUS decide por turno si re-consultar
- [x] APOLO (publicidad y marketing): tercer arquitecto del consejo,
      integrado en el pipeline y como tool del modo agéntico
- [x] Compactación de contexto en sesiones largas: el servidor resume
      automáticamente lo más antiguo del historial (context management
      server-side) antes de llegar al límite de contexto
- [x] CLI de chat (`npm run zeus`): la interfaz diaria para trabajar con
      el consejo — sesiones multi-turno, eventos del loop en vivo,
      `--resume`/`--list`/`--brief` para scripting
- [x] Auth básica: guard global de API key (`ZEUS_API_KEY`, header
      `x-api-key` o Bearer) con health check público — requisito previo
      a cualquier despliegue fuera de localhost
- [ ] Contenerización y deploy: Dockerfile (node alpine, volumen para
      `data/`) + VPS o Railway/Fly.io, solo cuando haga falta acceso
      remoto
- [ ] Más arquitectos: HEFESTO (datos), TEMIS (legal), ARTEMIS (producto)
      — el modo agéntico los soporta como tool adicional sin tocar el loop
- [ ] Streaming de tokens: hoy el SSE emite por acción/fase; el siguiente
      nivel es streamear los tokens del modelo dentro de cada turno
- [x] Web UI de chat: página estática servida por Nest en `/` — editor
      de brief con plantilla, streaming en vivo del loop y sesiones
      retomables desde el navegador
- [ ] Refinador de brief: paso opcional que revisa el brief antes de
      enviarlo a ZEUS, señala vacíos (presupuesto, plazo, mercado) y
      propone una versión mejorada con aprobación del usuario
