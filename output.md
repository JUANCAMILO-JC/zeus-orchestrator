# Stack Operativo MVP — Productora/Agencia Audiovisual Colombia

## 1. Análisis

Lo que está en juego no es "qué herramientas usar" sino **evitar tres errores que matan productoras pequeñas en su primer año**:

1. **Caos de archivos**: 4K y RAWs sin un sistema de naming + storage tiered destruyen márgenes (tiempo perdido buscando, re-renders, clientes esperando).
2. **Subestimar el costo real de "gratis"**: Notion gratis + Drive gratis + WhatsApp parece $0/mes, pero a los 4 meses están pagando con horas de fricción que valen más que un Frame.io.
3. **Sobre-arquitectura prematura**: implementar HubSpot, Airtable complejo y Zapier desde el día 1 con 2 personas es suicidio operativo. No hay capacidad de mantener el sistema mientras se vende y se produce.

El stack debe optimizar para **velocidad de entrega al cliente y bajo overhead cognitivo**, no para "tener todo cubierto".

Contexto Colombia relevante: pagos en USD complican algunas SaaS (impuesto país + TRM), y el ancho de banda residencial promedio dificulta workflows 100% cloud para video pesado. Esto debe influir las decisiones.
---

## 2. Recomendación — Stack por capa

### Capa 1: Hub central de operación (CRM + PM + Docs)
**Notion Plus** (~$10/usuario/mes × 2 = $20/mes)

- Una sola fuente de verdad: clientes, proyectos, propuestas, SOPs, base de conocimiento.
- Plantillas: pipeline comercial (Kanban), cada proyecto como base con fases (briefing → preprod → prod → post → entrega), base de freelancers con tarifas/skills/disponibilidad.
- **No usar Notion para tareas operativas diarias del equipo** (es lento para eso). Tareas cortas viven en checklists dentro de la página de cada proyecto.

**Por qué no Monday/ClickUp/Asana**: con 2 fundadores, el costo de mantener un PM tool dedicado supera el beneficio. Notion cubre 80% por 1/3 del precio y duplica como wiki + portfolio interno + propuestas.

**Por qué no Airtable**: superior técnicamente, pero el tier pago se vuelve caro rápido y la curva de adopción para no-técnicos es mayor.

### Capa 2: Comunicación
**Slack Free** ($0) + **Google Workspace Business Starter** ($7/usuario/mes × 2 = $14/mes)

- Slack solo para equipo interno + freelancers recurrentes (canal por proyecto). El tier free con límite de 90 días de historial está bien si la documentación importante vive en Notion (que es donde debe vivir).
- Google Workspace por dominio profesional (`@productora.com`), Meet, Calendar, y porque Drive será parte del stack de archivos.
- **WhatsApp Business** para clientes (Colombia → no negociable culturalmente). Pero con regla estricta: decisiones se confirman por email/Notion. WhatsApp no es registro.

### Capa 3: Archivos audiovisuales (la decisión más crítica)
**Arquitectura tiered** — esto separa a una productora amateur de una profesional:

- **Working storage (activos en producción)**: NAS local Synology de 2 bahías + 2× HDD 8TB en RAID 1 (~$600 USD inversión one-time, no recurrente). Edición se hace contra storage local o NAS por LAN. **Cloud-only para edición 4K en Colombia es inviable con internet residencial.**
- **Transferencia con clientes/freelancers**: **MASV** (pay-as-you-go, ~$0.25/GB) para entregables grandes. No tiene fee mensual. Más profesional que WeTransfer y maneja archivos >2GB sin fricción. Presupuestar ~$15-30/mes según volumen.
- **Review/aprobación de cortes**: **Frame.io Free** (2 proyectos, 2GB) el primer trimestre; migrar a **Frame.io Pro** ($15/mes) cuando el volumen lo justifique. Esto es no-negociable: revisar cortes por WhatsApp o Drive es señal de amateurismo y multiplica rondas de revisión.
- **Backup frío + entregables finales archivados**: **Backblaze B2** (~$6/TB/mes). Solo masters finales y proyectos cerrados. ~$10-20/mes inicialmente.
- **Drive (Google Workspace)**: documentos, referencias, cosas livianas. NO masters de video.

**Naming convention obligatoria desde día 1** (definir en Notion como SOP):
`YYYY-MM_CLIENTE_PROYECTO_TIPO_v##.ext`

### Capa 4: Presentación al cliente
- **Propuestas y presentaciones**: **Pitch** (free hasta 3 usuarios) o Google Slides. Pitch tiene mejor output visual; Slides tiene mejor colaboración con clientes. Para una agencia creativa, **Pitch gana**.
- **Portfolio web**: **Framer** (~$15/mes plan Mini) o **Cargo** (~$13/mes). Framer si quieren control total y CMS; Cargo si priorizan estética editorial sobre flexibilidad. **Evitar WordPress** — overhead de mantenimiento.
- **Firma de contratos**: **Documenso** (open-source, free self-hosted, o ~$30/mes cloud). Si presupuesto aprieta: **PDF firmado escaneado** funciona legalmente en Colombia, pero es fricción.
- **Facturación electrónica Colombia**: **Siigo** o **Alegra** (~$15-25/mes). **Esto es regulatorio, no opcional** — DIAN exige facturación electrónica.

### Capa 5: IA y automatización
**Tier 1 — esencial desde mes 1:**
- **ChatGPT Plus** ($20/mes) o **Claude Pro** ($20/mes) — uno solo, no ambos. Para guiones, briefs, propuestas, treatments, copy. **Recomiendo Claude Pro para escritura larga (treatments, guiones); ChatGPT Plus si priorizan generación de imagen integrada.**
- **Whisper (vía MacWhisper $60 one-time, o API ~$0.006/min)** — transcripción de reuniones con clientes, entrevistas en documentales, dictado de ideas. Multiplica velocidad de pre-producción.

**Tier 2 — agregar cuando el flujo lo pida (mes 3+):**
- **Runway** o **Kling** (~$15-35/mes según uso) — generación/edición de video con IA, rotoscopia automática, inpainting. Empezar con créditos pay-as-you-go.
- **ElevenLabs** ($5-22/mes) — voiceovers temporales para animatics y referencias.
- **Adobe Firefly** (incluido si ya tienen Creative Cloud) — generación de imágenes para storyboards y moodboards.

**Tier 3 — automatización (mes 6+):**
- **n8n self-hosted** (gratis, en un VPS de $5/mes) o **Make** (free tier, $9/mes Core). **Preferir n8n sobre Zapier** por costo y porque permite workflows con LLMs sin pagar por operación.

### Capa 6: Edición y post (asumiendo que ya existe)
Si aún no está definido: **DaVinci Resolve Studio** ($295 one-time por licencia, perpetuo) supera a una suscripción Premiere ($55/mes) en un año. Para una productora con presupuesto limitado y enfoque en calidad de imagen, es la decisión correcta.

---

## Arquitectura de conexión

```
                    ┌─────────────────────────┐
                    │   NOTION (Hub central)   │
                    │ CRM · Proyectos · SOPs  │
                    │  Propuestas · Portfolio │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────────┐    ┌─────────────────┐
│ Google W.    │      │  Slack + WhatsApp│    │  Pitch/Framer   │
│ Mail·Drive·  │      │  Comunicación    │    │  Cliente-facing │
│ Meet·Cal     │      │  interna/externa │    │  Propuestas/Web │
└──────────────┘      └──────────────────┘    └─────────────────┘
                                │
                                ▼
              ┌─────────────────────────────────┐
              │   FLUJO DE ARCHIVOS (tiered)    │
              │                                  │
              │  NAS local ──► MASV ──► Cliente │
              │     │                            │
              │     ├──► Frame.io (review)      │
              │     │                            │
              │     └──► Backblaze B2 (archivo) │
              └─────────────────────────────────┘
                                │
                                ▼
              ┌─────────────────────────────────┐
              │  CAPA IA (Claude/GPT, Whisper,  │
              │  Runway, ElevenLabs)            │
              │  Conectada vía n8n en mes 6+    │
              └─────────────────────────────────┘
```

**Integraciones clave a configurar:**
- Notion ↔ Google Calendar (vía Notion Calendar, gratis)
- Slack ↔ Notion (notificaciones de cambios en proyectos)
- Frame.io ↔ Slack (notificaciones de comentarios de cliente)
- Mes 6+: n8n orquesta: nuevo proyecto en Notion → crea carpeta en Drive + canal Slack + entrada en Frame.io.

---

## Presupuesto por fase

### **Mes 1 — Fundación (~$70-90/mes recurrente + ~$700 one-time)**
- Google Workspace × 2: $14
- Notion Plus × 2: $20
- Claude Pro o ChatGPT Plus: $20
- Alegra/Siigo: $15
- Dominio + hosting Framer: $15
- MASV pay-as-you-go: ~$10-20 según uso
- **One-time**: NAS Synology + 2 HDD ($600) + MacWhisper ($60) + DaVinci Studio ($295 si aplica)

**Foco del mes 1**: dominio profesional, factura electrónica funcionando, Notion con plantillas de proyecto/cliente/propuesta, NAS configurado, naming convention escrita y respetada, una propuesta-tipo en Pitch, portfolio mínimo en Framer (incluso con 3 piezas).

### **Mes 3 — Profesionalización (~$110-130/mes)**
Agregar:
- Frame.io Pro: $15
- Backblaze B2: ~$10-15
- Slack tier pago si historial de 90 días duele: $7.25/usuario (probablemente innecesario aún)
- Runway/Kling créditos: ~$15-25 según demanda

**Foco del mes 3**: review de cortes 100% en Frame.io, archivo frío sistematizado, primer workflow IA en producción (ej: transcripción de entrevistas → primer corte de guión asistido por Claude).

### **Mes 6 — Escala y automatización (~$140-160/mes)**
Agregar:
- VPS para n8n: $5-6 (Hetzner/DigitalOcean)
- ElevenLabs: $5-22
- Posible upgrade de Notion a Business si crece equipo

**Foco del mes 6**

═══ HERMES OUTPUT ═══
# La Reina Films — Análisis Estratégico de Lanzamiento

## TL;DR

Con dos fundadores, red de freelancers y presupuesto limitado, **no son una agencia: son una boutique de producción creativa**. El error letal sería posicionarse como "agencia full-service" compitiendo contra Sancho BBDO, MullenLowe SSP3 o productoras establecidas (Rebolución, Dynamo, 1844). Su modelo viable es **boutique creativa especializada con estructura asset-light, facturando por proyecto contra clientes directos medianos y agencias grandes que necesitan capacidad creativa/productiva tercerizada**. Constituyan SAS bajo Régimen Simple. Los primeros clientes salen de la red personal en 60-90 días o no salen.

---

## 1. Modelo de negocio recomendado

### Opciones evaluadas

| Modelo | Viabilidad | Por qué |
|---|---|---|
| Agencia full-service | ❌ | Requiere planners, cuentas, medios, digital. 2 personas no cubren. Compiten contra estructuras 50x más grandes. |
| Productora de contenido propio (IP) | ❌ corto plazo | Quema caja 18-36 meses sin ingresos. Suicidio con presupuesto limitado. |
| **Boutique de producción creativa (servicios B2B)** | ✅ | Aprovecha su skill real: ejecutar piezas. Asset-light. Cashflow rápido. |
| Nicho vertical (ej: salud, gastronomía, moda) | ✅ como capa | Excelente diferenciación, pero como overlay sobre el modelo de servicios. |
| Híbrido servicios + IP | ✅ año 2+ | Sólo cuando los servicios financien la apuesta de IP. |

### Recomendación: **Boutique de producción creativa con vertical de especialización**

**Estructura operativa:**
- **Core fijo (2):** Director Creativo + Productor. Cero empleados de planta el primer año.
- **Red on-demand:** DPs, editores, motion, sonido, post — contratados por proyecto.
- **Sin oficina física los primeros 12 meses.** Coworking por horas o casa. Ahorra $3-6M COP/mes.

**Servicios a ofrecer (en este orden de prioridad):**
1. Piezas publicitarias para marcas (TVC, digital, redes) — margen 25-40%
2. Branded content / contenido de marca largo (docu-series corporativas, casos)
3. Producción ejecutiva para agencias grandes (ellos ganan la cuenta, La Reina ejecuta)
4. Video corporativo premium (lanzamientos, eventos filmados con narrativa)

**Unit economics realistas (proyecto promedio):**
- Ticket típico boutique en Colombia: **$15M – $80M COP** por proyecto
- Costos directos (freelancers + producción): 55-65%
- Margen bruto objetivo: **35-40%**
- Punto de equilibrio mensual estimado (sin oficina, gastos mínimos): **$8-12M COP de margen** → 2-3 proyectos pequeños o 1 mediano al mes
- Meta año 1: **$300-450M COP facturados**, 4-6 proyectos por trimestre

---

## 2. Pricing y posicionamiento

### Dónde NO competir
- **No contra freelancers sueltos:** ellos cobran $2-8M por pieza. Pierden plata y dignidad.
- **No contra productoras grandes** (Rebolución, Sons, Lulo Films) en licitaciones de marcas top: tienen estructura, pauta, relaciones. Los aplastan.

### Dónde SÍ competir
**Tier medio del mercado:** marcas medianas colombianas, fintechs en crecimiento, retailers regionales, sector salud, gastronomía premium, real estate de lujo, e-commerce con presupuesto creativo. Clientes que necesitan calidad de gran productora pero no pueden o no quieren pagar $200M+ por una pieza.

### Posicionamiento sugerido
**"Calidad de productora grande con flexibilidad y atención de boutique."**

No vendan "barato". Vendan **acceso directo al director creativo, ciclos cortos, decisiones rápidas, sin capas de cuentas que diluyen el mensaje**. Eso es lo que las marcas medianas odian de las agencias grandes.
### Estrategia de tarifas
- **Tarifario interno por rol/día** (DC: $1.5-2.5M/día, Productor: $1-1.8M/día) + markup estándar 20-25% sobre freelancers + 15-20% de overhead.
- **Cotizar siempre por proyecto cerrado**, no por hora. Los clientes colombianos odian hora-hombre.
- **Anticipo del 50% firma de contrato, 30% en preproducción, 20% entrega.** Innegociable. Esto los salva del DSO de 60-90 días que mata productoras.
- **No descuentos por volumen sin retainer firmado.**

### Posibles verticales a explorar (escojan 1-2)
- **Salud y bienestar** (clínicas premium, EPS privadas, farma) — alta demanda, pocos especialistas
- **Gastronomía y hospitality** — visualmente atractivo, builds portfolio rápido
- **Real estate de alto valor** — proyectos grandes, presupuestos sanos
- **Educación superior privada** — recurrencia anual, ciclos predecibles

---

## 3. Go-to-market: primeros 3-5 clientes en 90 días

### Semana 1-2: Inventario y armas
- Lista cerrada de **50 contactos calientes** entre los dos: directores de marketing, productoras donde han trabajado, exjefes, agencias amigas.
- Reel de 90 segundos con lo mejor que hayan hecho (incluso si fue para empleadores anteriores, con permiso).
- Deck de credenciales de **6-8 láminas** (no 30): quiénes son, qué hacen, cómo trabajan, casos, contacto.- Web one-pager en Webflow o similar ($500K total). No inviertan más.
- Correo corporativo, NIT registrado, cuenta bancaria empresarial.

### Semana 3-8: Activación de red
- **Café 1-a-1 con los 50 contactos.** No "presentación de servicios": conversación. *"Estamos arrancando, queremos contarte qué hacemos por si surge algo."* Meta: 30 reuniones efectivas.
- **De esos 30, identificar 8-10 con necesidad real en los próximos 6 meses.**
- **Pedir 2 referidos a cada uno.** Esto multiplica el pipeline.
- **Aproximación específica a 5-8 agencias medianas/grandes** ofreciéndose como **production house tercerizada**. Esto es oro: las agencias siempre necesitan ejecutar y prefieren un equipo confiable a buscar productoras nuevas cada vez.

### Semana 9-12: Cierre
- Apuntar a **2 proyectos pequeños "demostrativos"** ($10-20M) aunque el margen sea apretado. Sirven de portafolio y testimonio.
- **1 proyecto mediano** ($30-60M) con cliente directo de la red.
- **1 acuerdo de colaboración recurrente** con 1 agencia (no exclusivo).

### Reglas de oro
- **No envíen propuestas frías por LinkedIn.** Pierden el tiempo.
- **No participen en licitaciones públicas el primer año.** Burocracia, plazos de pago de 90+ días, requisitos imposibles.
- **Documenten cada proyecto** desde el día uno: BTS, fotos, métricas de resultado del cliente. Es munición para el siguiente.

---

## 4. Estructura legal y financiera mínima

### Sociedad
**SAS (Sociedad por Acciones Simplificada).** Estándar colombiano para emprendimientos. Constitución en Cámara de Comercio: $400-800K COP dependiendo del capital. Definir:
- **Pacto de socios desde el día uno.** Roles, % accionario (sugerencia: 50/50 si aportan equivalente, o 55/45 con cláusulas claras), vesting de 4 años con cliff de 1 año, mecanismo de salida, cláusula de no competencia, decisiones que requieren unanimidad. **Esto los salva de pelearse en el año 2.**
- Capital social: simbólico está bien ($1-5M), no inmovilicen plata.

### Régimen tributario
**Régimen Simple de Tributación (RST).** Para servicios audiovisuales/publicitarios:
- Tarifa consolidada baja (3.4% – 8.3% según ingresos), incluye renta + ICA.
- Declaración anual + anticipos bimestrales.
- Sin retención en la fuente para quienes les paguen (ventaja competitiva al cotizar).
- Tope: ingresos hasta ~$4.500M COP/año (UVT). Sobrado para los primeros 2-3 años.
- **Ojo:** Si un cliente grande exige factura con retención, evaluar costos. Algunos prefieren proveedor en régimen ordinario.

### Facturación
- **Facturación electrónica DIAN obligatoria.** Usar Siigo, Alegra o Bsale ($50-150K/mes).
- Numeración autorizada DIAN antes de emitir.
- Política de cobro escrita: anticipo, hitos, mora del 1.5% mensual.

### Contratos con freelancers
- **Contrato de prestación de servicios** por proyecto. Nunca verbal.
- Cláusulas críticas: cesión de derechos patrimoniales de autor (música, imagen, edición — sin esto no pueden entregarle al cliente), confidencialidad, plazo, forma de pago, no contratación directa por parte del cliente final.
- **Freelancers deben facturar o expedir cuenta de cobro con RUT.** Si no, ustedes asumen aportes (riesgo UGPP).
- Verificar **aportes a seguridad social del 40% del ingreso** del contratista (responsabilidad del contratante verificar). Pidan planilla PILA antes de pagar.

### Financiero operativo
- Cuenta bancaria empresarial (Bancolombia, Davivienda — abrir con NIT).
- Contador externo desde el mes 1: $400-700K/mes. **No improvisen contabilidad.**
- Software contable conectado con facturación.
- **Reserva de caja mínima:** 3 meses de costos fijos antes de tomar el primer proyecto grande. Si no la tienen, conseguirla antes de lanzar.
- Separación estricta caja personal / caja empresa. Sueldos mensuales fijos para los socios (aunque sean modestos: $3-5M c/u el primer semestre).

---

## 5. Riesgos críticos y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Cliente no paga o paga a 90+ días** | Alta | Letal | Anticipo 50% innegociable. Cláusula de mora. No empezar producción sin pago. Lista negra interna. |
| **Conflicto entre socios por roles/plata** | Alta | Letal | Pacto de socios firmado antes del primer cliente. Roles documentados. Reuniones mensuales de junta. |
| **Dependencia de 1 cliente >40% facturación** | Alta año 1 | Alto | Política: ningún cliente >35% del ingreso anual desde año 2. Diversificar activamente. |
| **Confundir actividad con resultado** | Muy alta | Alto | KP

═══ FINAL SYNTHESIS ═══
# SÍNTESIS ESTRATÉGICA — La Reina Films

## [PUNTOS DE CONVERGENCIA]

Ambos arquitectos, desde ángulos opuestos, llegan a las mismas tres convicciones fundamentales:

**1. Asset-light es la única arquitectura viable.**
HERMES lo dice en términos de modelo de negocio (cero empleados, red on-demand, sin oficina). ATLAS lo dice en términos de stack (evitar sobre-arquitectura, Notion como hub único en lugar de 5 herramientas). **Coinciden en que la disciplina de mantenerse pequeños y eficientes es la ventaja competitiva, no una limitación.**

**2. La profesionalización en lo invisible es lo que separa amateurs de boutiques.**
HERMES exige pacto de socios, contratos con cesión de derechos, anticipo del 50%, contador externo. ATLAS exige naming convention desde día 1, Frame.io para revisiones, facturación electrónica DIAN, NAS local con RAID. **Ambos ven que el cliente medio no juzga por el reel — juzga por cómo se siente trabajar con ustedes**: cotización clara, archivos que llegan rápido, revisiones organizadas, contratos firmados, facturas que cumplen.

**3. La velocidad de cashflow es existencial.**
HERMES: anticipo 50/30/20, reserva de 3 meses, no licitaciones públicas. ATLAS: stack que minimiza fricción operativa, automatización solo cuando ya hay flujo real. **Los dos diseñan para que el dinero entre rápido y la operación no se atore.**

**4. Prioridad de los primeros 90 días: validar antes de invertir.**
Ninguno propone construir antes de vender. HERMES quiere 50 cafés y 3-5 clientes. ATLAS quiere stack mínimo viable mes 1, agregar capas solo cuando el flujo lo pida. **Convergen en una filosofía pull, no push.**

---

## [TENSIONES DETECTADAS]

### Tensión 1: El presupuesto inicial real
ATLAS propone **~$700 USD one-time + $70-90/mes** en mes 1 (NAS, DaVinci, MacWhisper, Notion, Workspace, Claude, etc.). En pesos: ~$2.8M COP de inversión + ~$350K/mes recurrentes en herramientas.

HERMES propone **reserva de 3 meses de costos fijos** antes de empezar, contador a $400-700K/mes, sueldos modestos de $3-5M por socio, web por $500K, constitución por $400-800K. En total: **fácilmente $30-50M COP de capital de arranque**.

**Conflicto**: ATLAS optimiza el stack pero asume que el negocio ya está financiado. HERMES dimensiona el negocio pero no detalla cuánto del capital se va en herramientas. Si los fundadores tienen $10M COP de presupuesto, las dos recomendaciones juntas son inviables tal cual.

### Tensión 2: ¿Cuándo invertir en NAS y storage profesional?
ATLAS lo pone como inversión de mes 1 ($600 USD). HERMES diría: "no inviertan en infraestructura antes de tener cliente que la pague". El NAS es un activo fijo en un modelo asset-light.

**Conflicto real**: ¿es el NAS una herramienta de producción que evita pérdidas (ATLAS tiene razón) o un capex prematuro (HERMES tendría razón)?

### Tensión 3: WhatsApp con clientes
ATLAS: "no negociable culturalmente, pero las decisiones se confirman por email/Notion". HERMES no lo menciona explícitamente pero su lógica de "anticipo innegociable, contratos firmados, no empezar sin pago" implica formalidad alta desde el primer contacto.

**Conflicto**: WhatsApp facilita cierre comercial en Colombia, pero crea ambigüedad legal y operativa. ¿Dónde trazar la línea?

### Tensión 4: Vertical de especialización vs. flexibilidad de portafolio
HERMES recomienda elegir 1-2 verticales (salud, gastronomía, real estate, educación). ATLAS no opina sobre esto pero su stack está diseñado para flexibilidad total — sirve igual para cualquier vertical.

**Conflicto**: si especializan en un vertical, el stack puede simplificarse aún más (templates específicos, freelancers recurrentes del vertical, propuestas estandarizadas). Si mantienen flexibilidad, el stack debe seguir siendo genérico. **No hay que decidirlo el día 1, pero la decisión afecta cómo se construye el Notion.**

---

## [RESOLUCIÓN DE TENSIONES]

### Resolución 1: Capital de arranque por capas, no monolítico
El presupuesto debe pensarse en **tres capas con triggers de activación**:

- **Capa 0 — Innegociable (necesario antes del primer cliente):** SAS constituida, RUT, facturación electrónica activa (Alegra ~$60K/mes), cuenta bancaria empresarial, pacto de socios firmado, contador externo, web one-pager, Notion Plus, Google Workspace, Claude/ChatGPT Pro. **Costo: ~$3-4M COP one-time + $500-700K/mes.**
- **Capa 1 — Activar con primer cliente confirmado:** MASV pay-as-you-go, Frame.io (free → Pro cuando dolor lo justifique), DaVinci Studio si aplica.
- **Capa 2 — Activar con flujo recurrente (3+ proyectos completados):** NAS Synology, Backblaze B2, automatizaciones n8n, herramientas IA Tier 2.

**El NAS no es mes 1. Es mes 3-4 cuando ya hay archivos reales de clientes que justifiquen la inversión.** Mientras tanto: discos externos de 4TB ($400K c/u) + Drive como buffer. No es elegante, pero es financieramente sano.

### Resolución 2: WhatsApp como canal comercial, no operativo
Regla clara y escrita en el SOP:
- **WhatsApp Business**: primer contacto, agendar reuniones, updates informales, "ya llegó el material", saludos de fin de año.
- **Email + Notion + contrato firmado**: cualquier cosa con implicación de plata, alcance, fechas o entregables.
- Fórmula a usar con clientes: *"Genial, te confirmo por correo para que quede formal."* Esto educa al cliente sin fricción.

### Resolución 3: Vertical sin cerrar puertas
Estrategia recomendada: **arrancar oportunista (mes 1-6), declarar vertical después (mes 6+).**

Los primeros 5-8 proyectos sirven para descubrir dónde tienen ventaja real (red, química con cliente, márgenes mejores, casos replicables). Esa data, no la intuición, define el vertical. Mientras tanto: el deck dice "boutique creativa con foco en marcas que valoran calidad y agilidad", no "expertos en salud".

### Resolución 4: Métrica que reconcilia ambos arquitectos
**Margen bruto por proyecto + horas de fundador por peso facturado.** Si el stack de ATLAS hace que los fundadores ahorren 10 horas semanales, eso son ~$2-3M COP/mes en capacidad recuperada que pueden vender. El stack se paga solo si reduce horas de fricción. Si no, sobra. Esta métrica resuelve futuras decisiones de "¿agregamos esta herramienta?" objetivamente.

---

## [DECISIÓN INTEGRADA]

**La Reina Films debe lanzarse como boutique de producción creativa SAS con un modelo de tres anillos sincronizados:**

### Anillo 1 — Comercial (lo que vende)
Posicionamiento: *"Calidad de productora grande con flexibilidad y atención de boutique."* Acceso directo al director creativo, ciclos cortos, decisiones rápidas. Tickets de $15-80M COP. Mix objetivo año 1: 60% clientes directos medianos, 30% production house para agencias, 10% experimentación.

### Anillo 2 — Operacional (cómo entrega)
Stack mínimo viable mes 1 (Notion + Google Workspace + Claude + Alegra + WhatsApp Business + web one-pager). Stack profesional mes 3-4 cuando los proyectos lo justifiquen (NAS, Frame.io Pro, MASV consolidado, Backblaze). Naming convention y SOPs escritos desde el día 1, aunque sean simples. **El sistema crece con la facturación, nunca antes.**

### Anillo 3 — Estructural (lo que protege)
Pacto de socios firmado antes del primer cliente (vesting 4 años, cliff 1 año, 50/50 o 55/45 con justificación documentada). Régimen Simple de Tributación. Anticipo 50/30/20 innegociable. Contador externo desde mes 1. Reserva de caja de 3 meses antes de tomar el primer proyecto grande. Contratos con cesión de derechos patrimoniales para todos los freelancers, sin excepción.

### El principio rector
**Vender como grandes, operar como pequeños, protegerse como adultos.**

Toda decisión que tomen en el próximo año debe responder: ¿esto me hace verme más profesional ante el cliente, sin agregar overhead que no puedo sostener, y sin exponerme legalmente?

### Lo que NO van a hacer (igual de importante)
- No abrir oficina física los primeros 12 meses.
- No contratar empleados de planta.
- No participar en licitaciones públicas año 1.
- No competir contra freelancers en precio.
- No invertir en IP/contenido propio antes de tener servicios rentables.
- No comprar el NAS, DaVinci ni hardware antes del cliente 3.
- No enviar propuestas frías por LinkedIn.
- No empezar producción sin anticipo pagado.

---

## [PRÓXIMOS PASOS]

### 1. Semana 1-2: Fundación legal + capa 0 del stack (la única inversión obligatoria)
Constituir SAS con pacto de socios firmado (no avanzar sin esto), RUT, facturación electrónica activa, cuenta bancaria, contador externo contratado, dominio + Google Workspace + Notion configurados con plantillas mínimas (CRM de 50 contactos, plantilla de proyecto, plantilla de propuesta), web one-pager publicada, reel de 90 segundos editado.
**Inversión: ~$3-4M COP. Tiempo: 10-14 días.**

### 2. Semana 3-12: Validación comercial (50 cafés → 3-5 clientes)
Activar la lista de 50 contactos calientes con conversaciones 1-a-1, no presentaciones. Meta: 30 reuniones efectivas, 8-10 oportunidades reales, 3-5 proyectos cerrados (mix de 2 demostrativos + 1 mediano + 1 acuerdo recurrente con agencia). Documentar cada proyecto desde el primer día. **Aquí se define si el negocio existe o no.**

### 3. Mes 4-6: Profesionalización operativa basada en evidencia
Con 3+ proyectos completados, activar capa 2 del stack (NAS, Frame.io Pro, Backblaze, primeras automatizaciones), declarar vertical de especialización con base en data real, definir tarifario interno definitivo, evaluar si el flujo justifica primera contratación on-demand recur
