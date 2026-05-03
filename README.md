# ZEUS Orchestrator

Orquestador en NestJS del Consejo de Arquitectos AI. ZEUS coordina a ATLAS
(arquitectura técnica) y HERMES (estrategia de negocio) para producir
respuestas integradas a partir de un brief.

## Arquitectura

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
┌──────────────┴──────────────┐
│   FASE 2 — PARALELO          │
│   ATLAS  ◄──┐    ┌──► HERMES │
│   (técnico) │    │ (negocio) │
└─────────────┴────┴──────────┘
              │
              ▼
┌─────────────────────────────────┐
│  FASE 3 — SÍNTESIS              │
│  ZEUS integra ambas perspectivas│
│  detecta tensiones, decide      │
└─────────────────────────────────┘
              │
              ▼
        Respuesta final
```

## Setup

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

## Uso

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

### Test rápido

Con el server corriendo en otra terminal:

```bash
node test-brief.js
```

## Estructura del proyecto

```
src/
├── agents/                    # Los arquitectos del consejo
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
├── orchestrator/              # El director de orquesta
│   ├── brief.dto.ts           # Validación del payload
│   ├── orchestrator.controller.ts  # Endpoint HTTP
│   ├── orchestrator.service.ts     # Lógica de las 3 fases
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

- [ ] Persistencia: guardar cada orquestación en BD para auditar
- [ ] Streaming: devolver outputs incrementales vía SSE
- [ ] Caché: si el mismo brief llega dos veces, no re-ejecutar
- [ ] Más arquitectos: HEFESTO (datos), TEMIS (legal), APOLO (producto)
- [ ] Conferencia entre arquitectos: que ATLAS pueda ver el output de
      HERMES y refinar su respuesta antes de la síntesis final
