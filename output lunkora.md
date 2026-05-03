═══ ATLAS OUTPUT ═══
# ATLAS — Arquitectura Documental Google Drive para LUNKORA

---

## 1. ANÁLISIS — Qué está realmente en juego

Antes de la estructura: tienes tres tensiones técnicas reales que una arquitectura de carpetas debe resolver sin fricción operativa.

**Tensión 1: Aislamiento vs. acceso colaborativo**
Freelancers que no deben ver otros clientes, pero trabajan en Drive compartido. Google Drive gratuito no tiene "grupos" ni permisos granulares por carpeta heredados de forma confiable. Cada carpeta de cliente necesita ser una unidad de permisos independiente, no una subcarpeta de una jerarquía que hereda acceso del padre.

**Tensión 2: 15 GB con video entrante**
Video destruye presupuestos de almacenamiento. Un proyecto de 3 videos 4K puede consumir 8-10 GB. Con la cuenta gratuita, el video no puede vivir en Drive de forma permanente. Necesitas política de paso temporal, no almacenamiento.

**Tensión 3: Drive como punto de entrega al cliente**
Los clientes no deben navegar tu estructura interna. Necesitan una URL limpia que llegue directo a sus entregables sin ver nada más. Esto dicta que las carpetas de entrega sean unidades aisladas, no vistas filtradas de una carpeta mayor.

**Restricción crítica que cambia el diseño:**
Google Drive gratuito comparte los 15 GB entre Drive + Gmail + Photos. Con 2 socios en cuentas separadas, si cada uno tiene 15 GB propios, puedes usar las dos cuentas como almacenamiento distribuido con propietarios diferentes. Esto es arquitecturalmente relevante.

---

## 2. RECOMENDACIÓN — La decisión que tomaría

### Principio rector de toda la arquitectura:
> **Una carpeta de cliente = una unidad de permisos = una URL de entrega**
> Nunca se comparte acceso por herencia de carpeta padre. Nunca.

---

## A. ÁRBOL DE CARPETAS COMPLETO

### Diseño del árbol raíz

La estructura tiene **dos zonas físicamente separadas** en Drive:

```
[CUENTA SOCIO A] — Propietaria de operación interna
[CUENTA SOCIO B] — Propietaria de clientes (compartida con Socio A como Editor)
```

Esto no es obligatorio desde el día 1, pero sí el diseño hacia el que escalar. En etapa inicial, todo puede vivir en una cuenta.

---

### ZONA 1: OPERACIÓN INTERNA LUNKORA

```
📁 LUNKORA — OPERACIÓN INTERNA
│
├── 📁 01 — EMPRESA
│   ├── 📁 01.1 — Documentos Legales
│   │   ├── 📄 Registro mercantil
│   │   ├── 📄 RUT LUNKORA
│   │   ├── 📄 Acuerdo de socios v1.0
│   │   └── 📄 Poderes y autorizaciones
│   │
│   ├── 📁 01.2 — Finanzas y Contabilidad
│   │   ├── 📁 2024
│   │   │   ├── 📁 Q1 — Ene-Feb-Mar
│   │   │   ├── 📁 Q2 — Abr-May-Jun
│   │   │   ├── 📁 Q3 — Jul-Ago-Sep
│   │   │   └── 📁 Q4 — Oct-Nov-Dic
│   │   ├── 📁 2025
│   │   │   └── [misma estructura]
│   │   └── 📁 Contratos con Proveedores
│   │       ├── 📄 Contrato — Make.com — 2024
│   │       └── 📄 Contrato — Canva Pro — 2024
│   │
│   ├── 📁 01.3 — Marca LUNKORA
│   │   ├── 📁 Logos (todos los formatos)
│   │   ├── 📁 Paleta y tipografía
│   │   ├── 📁 Plantillas de documentos
│   │   │   ├── 📄 PLANTILLA — Propuesta comercial
│   │   │   ├── 📄 PLANTILLA — Contrato de servicios
│   │   │   ├── 📄 PLANTILLA — Brief de proyecto
│   │   │   └── 📄 PLANTILLA — Informe de entrega
│   │   └── 📁 Presentaciones corporativas
│   │
│   └── 📁 01.4 — Seguros y Cumplimiento
│       ├── 📄 Póliza de responsabilidad civil
│       └── 📄 Tratamiento de datos personales (Habeas Data)
│
├── 📁 02 — COMERCIAL
│   ├── 📁 02.1 — Propuestas Enviadas
│   │   ├── 📁 2024 — Aprobadas
│   │   ├── 📁 2024 — Rechazadas
│   │   └── 📁 2025 — En curso
│   │
│   ├── 📁 02.2 — Contratos Firmados
│   │   └── [una subcarpeta por cliente: VER ZONA 2]
│   │       ⚠️ NOTA: El contrato firmado vive en ZONA 2, 
│   │           aquí solo el índice de referencia en Notion
│   │
│   └── 📁 02.3 — Casos de Estudio y Portfolio
│       ├── 📁 En construcción
│       └── 📁 Publicados
│
├── 📁 03 — OPERACIONES Y SOPs
│   ├── 📁 03.1 — SOPs en PDF (versión oficial)
│   │   ├── 📄 SOP — Onboarding de cliente nuevo
│   │   ├── 📄 SOP — Ciclo de revisión y aprobación
│   │   ├── 📄 SOP — Offboarding y archivo de proyecto
│   │   ├── 📄 SOP — Gestión de freelancers
│   │   └── 📄 SOP — Política de almacenamiento Drive
│   │
│   ├── 📁 03.2 — Formatos y Checklists
│   │   ├── 📄 CHECKLIST — Inicio de proyecto
│   │   ├── 📄 CHECKLIST — Entrega de proyecto
│   │   └── 📄 FORMATO — Acta de reunión
│   │
│   └── 📁 03.3 — Recursos para Freelancers
│       ├── 📄 Guía de bienvenida LUNKORA (freelancer)
│       ├── 📄 Convenciones de nomenclatura de archivos
│       └── 📄 Qué sube a Drive y qué no
│
├── 📁 04 — TECNOLOGÍA E INFRAESTRUCTURA
│   ├── 📁 04.1 — Credenciales y Accesos
│   │   └── ⚠️ VACÍO — Usar Bitwarden/1Password, no Drive
│   │
│   ├── 📁 04.2 — Documentación Técnica
│   │   ├── 📄 Mapa de integraciones Make.com
│   │   ├── 📄 Arquitectura de sistemas LUNKORA
│   │   └── 📄 Inventario de herramientas y licencias
│   │
│   └── 📁 04.3 — Respaldos Críticos
│       └── [exports puntuales de Notion, configs de Make]
│
└── 📁 05 — ARCHIVO HISTÓRICO
    ├── 📁 Clientes Finalizados 2024
    ├── 📁 Proyectos Cancelados 2024
    └── 📁 Versiones Anteriores de Plantillas
```

---

### ZONA 2: CLIENTES — PRODUCCIÓN Y ENTREGA

**Principio de diseño:** Esta zona es modular. Cada cliente es una unidad autónoma. Se pueden agregar 25 clientes sin reorganizar nada.

```
📁 LUNKORA — CLIENTES
│
├── 📁 _PLANTILLA-NUEVO-CLIENTE [NO TOCAR — SOLO DUPLICAR]
│   └── [estructura completa de cliente, ver abajo]
│
├── 📁 CLT-001 — NombreEmpresa — Vertical
│   └── [estructura completa, ver abajo]
│
├── 📁 CLT-002 — NombreEmpresa — Vertical
├── 📁 CLT-003 — NombreEmpresa — Vertical
│   ...
└── 📁 CLT-025 — NombreEmpresa — Vertical
```

**Nomenclatura de carpeta raíz de cliente:**
```
CLT-[NNN] — [NombreComercial] — [Vertical]

Ejemplos reales:
CLT-001 — Treble Analytics — B2B SaaS
CLT-002 — Casa Vitae — D2C
CLT-003 — EduSkill — EdTech
CLT-004 — Agency Partner US — White Label
```

---

### ESTRUCTURA INTERNA DE CADA CLIENTE

```
📁 CLT-001 — Treble Analytics — B2B SaaS
│
├── 📁 00 — ADMIN CLIENTE
│   ├── 📄 Contrato firmado — Treble Analytics — 2025-01
│   ├── 📄 Brief inicial — Treble Analytics — 2025-01
│   ├── 📄 Acta de kickoff — 2025-01-15
│   └── 📄 Acuerdo de confidencialidad (si aplica)
│
├── 📁 01 — ASSETS RECIBIDOS DEL CLIENTE
│   ├── 📁 Marca (logos, guía de marca)
│   ├── 📁 Fotos y videos del cliente
│   ├── 📁 Textos y copy del cliente
│   └── 📁 Referencias y moodboards
│
├── 📁 02 — PRODUCCIÓN
│   ├── 📁 PROYECTO-001 — [NombreProyecto]
│   │   ├── 📁 00 — BRIEF
│   │   ├── 📁 01 — BORRADOR
│   │   ├── 📁 02 — REVISION
│   │   ├── 📁 03 — APROBADO
│   │   └── 📁 04 — ARCHIVADO
│   │
│   └── 📁 PROYECTO-002 — [NombreProyecto]
│       └── [misma estructura]
│
├── 📁 03 — ENTREGABLES AL CLIENTE
│   │   ⚠️ ESTA ES LA CARPETA QUE SE COMPARTE CON EL CLIENTE
│   │   Solo contiene archivos APROBADOS y listos
│   │   Nomenclatura limpia, sin indicadores internos
│   │
│   ├── 📁 2025-01 — Lanzamiento de marca
│   ├── 📁 2025-02 — Campaña redes sociales
│   └── 📁 2025-03 — [siguiente entrega]
│
└── 📁 04 — COMUNICACIONES Y SEGUIMIENTO
    ├── 📄 Bitácora de aprobaciones — Treble Analytics
    ├── 📄 Log de cambios solicitados
    └── 📄 Acta de cierre de proyecto (al finalizar)
```

---

## B. SISTEMA DE NOMENCLATURA ESTANDARIZADA

### Fórmula base universal:

```
[TIPO] — [Cliente/Proyecto] — [Descripción] — [Fecha] — [Estado] — [Versión]
```

**Solo los campos que aplican. No forzar todos en cada archivo.**

---

### Tabla de tipos de archivo:

| Prefijo | Tipo de documento | Ejemplo |
|---|---|---|
| `CONT` | Contrato | `CONT — Treble Analytics — Servicios Diseño — 2025-01` |
| `PROP` | Propuesta comercial | `PROP — Casa Vitae — Identidad Visual — 2025-02-10` |
| `BRIEF` | Brief de proyecto | `BRIEF — EduSkill — Campaña Lanzamiento — 2025-03` |
| `ENT` | Entregable final | `ENT — Treble Analytics — Logo Principal — 2025-02` |
| `ACTA` | Acta de reunión/decisión | `ACTA — Kickoff — Casa Vitae — 2025-02-15` |
| `SOP` | Procedimiento operativo | `SOP — Onboarding Cliente Nuevo — v2.1` |
| `PLANT` | Plantilla reutilizable | `PLANT — Propuesta Comercial — v1.0` |
| `INF` | Informe o reporte | `INF — Resultados Campaña — EduSkill — 2025-Q1` |
| `REF` | Archivo de referencia | `REF — Moodboard — Casa Vitae — 2025-01` |
| `FACT` | Factura (copia en Drive) | `FACT — Treble Analytics — 2025-02-001` |

---

### Convenciones de fecha:

```
Año-Mes:        2025-02          → para documentos mensuales
Año-Mes-Día:    2025-02-15       → para actas, contratos, hitos puntuales
Año-Q:          2025-Q1          → para informes trimestrales
```

**Regla:** Siempre AAAA-MM-DD, nunca DD/MM/AAAA. Los archivos se ordenan cronológicamente solos.

---

### Convenciones de versión:

```
v1.0    → Primera versión para revisión interna
v1.1    → Cambios menores sobre v1.0 (correcciones, ajustes)
v2.0    → Segunda ronda de revisión (cambios significativos del cliente)
v2.1    → Ajustes sobre v2.0
FINAL   → Versión aprobada por el cliente. No hay v-FINAL-2.
FINAL-ENTREGADO → Versión que se puso en carpeta del cliente (registro)
```

**Regla de oro:** Si el cliente pide cambios después de FINAL, el archivo se renombra FINAL-v2 y se documenta en la bitácora. No existe "final_FINAL_este_si".

---

### Convenciones de estado (para nombres en carpeta REVISION):

```
[nombre-archivo] — EN-REVISION      → enviado al cliente, esperando feedback
[nombre-archivo] — CON-CAMBIOS      → devuelto con comentarios
[nombre-archivo] — APROBADO         → listo para mover a carpeta APROBADO
```

---

### Ejemplos de nombres reales completos:

```
CONT — Treble Analytics — Servicios Branding — 2025-01-20 — FIRMADO.pdf
PROP — Casa Vitae — Estrategia Contenido 3 meses — 2025-02-10 — v1.0.pdf
ENT — EduSkill — Kit Redes Sociales Marzo — 2025-03-01

═══ HERMES OUTPUT ═══
# HERMES para LUNKORA — Arquitectura Documental como Activo Comercial

---

## TL;DR

Tu carpeta de Drive gratuito es un touchpoint de marca que la mayoría de agencias desperdicia. Para MiPymes colombianas, **la percepción de orden es una señal proxy de confianza profesional** — compensa la falta de oficina física, trayectoria larga o marca reconocida. El trigger de 5 clientes para migrar a Workspace es razonable pero incompleto: hay dos eventos anteriores que deberían disparar la migración antes, independientemente del volumen. Postergar tiene riesgos comerciales reales, no hipotéticos.

---

## 1. Modelo de Carpeta Cliente — Lo que Eleva vs. Lo que Degrada

### El principio rector

El cliente MiPyme colombiano no evalúa tu carpeta como un PM evalúa un repo. La evalúa como evalúa la recepción de un consultorio: **¿esto se ve organizado o esto se ve como el escritorio de alguien que trabaja desde la cama?** La señal entra en 3 segundos, antes de abrir un solo archivo.

---

### Estructura recomendada — Lo que el cliente VE

```
📁 LUNKORA × [NOMBRE EMPRESA CLIENTE]
│
├── 📁 01 — Entregables Activos
│   ├── 📁 [MES AÑO] — Marzo 2025
│   │   ├── Contenidos_Redes_Mar2025_v1.pdf
│   │   ├── Reporte_Resultados_Feb2025.pdf
│   │   └── Brief_Aprobado_Mar2025.pdf
│   └── 📁 [MES AÑO] — Febrero 2025
│
├── 📁 02 — Recursos de Marca (Activos del Cliente)
│   ├── Logos/
│   ├── Paleta_Tipografía.pdf
│   └── Fotos_Producto/
│
├── 📁 03 — Contrato y Acuerdos
│   └── Propuesta_Comercial_Firmada.pdf
│
└── 📄 INICIO AQUÍ — Guía Rápida LUNKORA × [Cliente].pdf
```

---

### Elementos que ELEVAN la percepción

**Naming consistente y fechado**
- Formato: `Tipo_Descripción_MesAño_v#.ext`
- Ejemplo: `Reporte_Resultados_Feb2025_v2.pdf`
- Por qué importa: cuando el dueño de la MiPyme reenvía el link por WhatsApp a su socio o contador, el nombre del archivo *es* tu tarjeta de presentación en ese momento

**El archivo "INICIO AQUÍ"**
Este es el elemento más subvalorado. Un PDF de 1-2 páginas que incluye:
- Qué hay en esta carpeta y cómo navegar
- Nombre y WhatsApp de su punto de contacto en LUNKORA
- Ciclo de entrega: cuándo llegan nuevos archivos cada mes
- Versión y fecha de última actualización

Impacto real: reduce preguntas de soporte, elimina el "¿esto está actualizado?" por WhatsApp, y proyecta una agencia que tiene procesos.

**Carpeta del mes siempre presente y nombrada**
Nunca dejes la carpeta raíz vacía o con archivos sueltos. El cliente que entra el día 5 del mes debe ver que *ya hay movimiento* aunque los entregables finales lleguen el día 15.

**PDFs, no Docs editables por defecto**
Entrega en PDF. El cliente que abre un Google Doc y puede editar accidentalmente entra en pánico. El PDF comunica *versión final, esto es oficial*.

---

### Elementos que DEGRADAN la percepción

| Lo que haces | Lo que el cliente percibe |
|---|---|
| Carpeta sin nombre del cliente visible | "¿Esto es mío o de otro?" |
| Archivos con nombres como `Final_FINAL_v3_real.pptx` | Caos interno que se filtró |
| Mezcla de borradores y entregables finales | No saben qué revisar |
| Carpeta raíz con 40 archivos sueltos | Igual a escritorio desordenado |
| Link que pide "solicitar acceso" | Fricción → WhatsApp a las 10pm |
| Archivos en formatos editables sin aviso | Inseguridad, accidente en puerta |
| Sin fecha en el nombre del archivo | "¿Esto es de este mes o del año pasado?" |

**El problema del "solicitar acceso" es letal en contexto colombiano.** El cliente reenvía el link a su community manager, al contador, o al dueño en otra ciudad. Ninguno tiene cuenta Google corporativa. La fricción convierte un entregable en un ticket de soporte no planificado. Configura todas las carpetas de entregables como **"Cualquier persona con el link puede ver"** desde el inicio.

---

### Lo que NO necesitas hacer ahora

No construyas una intranet de cliente, portal de proyectos ni nada con subdominios. Eso es ingeniería de soluciones para problemas de escala que no tienes. Una carpeta Drive bien nombrada supera en experiencia percibida a un portal mal mantenido.
---

## 2. Trigger de Migración a Google Workspace — Diagnóstico

### Tu trigger actual (5 clientes) es necesario pero tardío en dos escenarios

El criterio de volumen (5 clientes) mide capacidad operativa. Pero hay triggers de **riesgo comercial** que lo preceden:

---

### Trigger 1 — Primer cliente US o EU (antes de firmar, no después)

Este es el trigger más crítico y el más ignorado.

Un cliente de agencia en Estados Unidos o Europa que recibe un link de Drive desde `tusocie@gmail.com` tiene una reacción automática de procurement: **esto no pasa el filtro de vendor onboarding de ninguna empresa mediana en esos mercados.**

No es percepción, es proceso: muchas agencias americanas tienen políticas explícitas de no compartir activos de cliente con cuentas personales de Gmail. El dominio corporativo (`nombre@lunkora.com`) no es una ventaja competitiva en ese mercado — es el piso mínimo de entrada.

**Si el pipeline white-label o US/EU se activa, migra antes de la primera reunión de cierre, no después.**

---

### Trigger 2 — Primer freelancer o colaborador externo con acceso a carpetas de cliente

Drive gratuito no tiene controles de administrador reales. No puedes:
- Revocar acceso masivo cuando un freelancer termina su contrato
- Ver qué archivos compartió externamente
- Auditar quién descargó qué

Cuando un freelancer con acceso a la carpeta de tu cliente MiPyme termina mal la relación, no tienes forma de limpiar su acceso de manera centralizada. Tienes que hacerlo archivo por archivo, carpeta por carpeta, desde la cuenta que lo compartió originalmente.

**Esto no es hipotético — es el escenario más común de fuga de información en agencias pequeñas.**

---

### El trigger de 5 clientes sigue siendo válido, pero por razones de almacenamiento

15 GB se agota más rápido de lo que parece cuando manejas:
- Videos de redes sociales (archivos fuente)
- Fotos de producto en alta resolución
- Versiones múltiples de piezas gráficas

Con 4-5 clientes activos en retainer de contenido, puedes llegar al límite en 3-4 meses si no tienes política de archivado. El límite de almacenamiento tiene un riesgo concreto: **cuando Drive se llena, deja de sincronizar sin aviso claro** — pierdes entregables, no el cliente.

---

### Matriz de triggers — Cuándo migrar

| Evento | ¿Migrar? | Razón |
|---|---|---|
| Primer cliente US/EU en pipeline activo | **Sí, antes de cerrar** | Credibilidad de vendor, filtro de procurement |
| Primer freelancer con acceso a carpetas | **Sí, en ese mes** | Control de acceso, riesgo de fuga |
| 5+ clientes activos en retainer | **Sí** | Almacenamiento, operación |
| 15 GB al 70% de uso | **Sí, antes de llegar al 100%** | Continuidad operativa |
| Solo clientes MiPyme Colombia, sin freelancers | **Puede esperar** | El riesgo es bajo, optimiza el flujo primero |

---

### Beneficios de Workspace con impacto real en ventas — Cuáles importan y cuáles no

**Impacto real:**

**Dominio corporativo en email** (`@lunkora.com`)
- En Colombia MiPyme: señal de seriedad moderada, no determinante. El cliente te contacta por WhatsApp de todas formas.
- En US/EU white-label: **determinante**. Es el filtro de entrada.
- En propuestas comerciales PDF: el pie de firma con dominio corporativo cierra la brecha de credibilidad frente a agencias establecidas.

**Controles de Admin Console**
- Revocar acceso centralizado cuando termina un colaborador: **operacionalmente crítico desde el primer freelancer**
- Ver archivos compartidos externamente: protección ante fuga de información de cliente
- Esto no vende directamente, pero **evita la crisis que destruye clientes**

**Almacenamiento compartido (30 GB por usuario en Starter)**
- Starter da 30 GB *por usuario*, no pooled. Con 2 usuarios = 60 GB efectivos.
- Suficiente para 12-18 meses con buena higiene de archivos.

**Lo que NO tiene impacto real en tu etapa:**
- Google Meet con grabación: tienes alternativas gratuitas
- Google Chat: tus clientes usan WhatsApp, punto
- Vault (retención de datos): irrelevante hasta que tengas obligaciones contractuales de retención

---

### Costo real de la migración

- Business Starter: USD 6/usuario/mes
- 2 socios = **USD 12/mes = ~COP 48,000/mes** a tasa actual
- Menos de lo que cuesta una suscripción de Canva Pro
- **No es una decisión financiera. Es una decisión de riesgo.**

El costo de postergar no es USD 12/mes ahorrado. Es perder un cliente US/EU en la etapa de onboarding por parecer una operación informal, o perder el control de información de un cliente cuando un freelancer se va mal.

---

## Riesgos Críticos — Los que matan, no los hipotéticos

**Riesgo 1 — Pérdida de cliente white-label por señal de informalidad**
El cliente de agencia en US que llega por referido y ve `@gmail.com` en la propuesta tiene una objeción silenciosa que raramente verbaliza. Simplemente no responde el follow-up. No sabrás por qué perdiste ese deal.

**Riesgo 2 — Incidente de información con freelancer**
Sin Admin Console, cuando terminas la relación con un colaborador externo, él retiene acceso a todo lo que le compartiste directamente. En un mercado pequeño como el digital colombiano, ese freelancer puede trabajar mañana con tu competencia o con el mismo cliente.

**Riesgo 3 — Drive lleno en momento crítico**
Si Drive se satura durante la semana de entrega de un mes de retainer, los archivos no sincronizan, los entregables no llegan, y el cliente percibe incumplimiento. El "se llenó el Drive" no es una excusa que preserva la confianza.

**Riesgo 4 — Link que pide acceso en el momento equivocado**
El cliente reenvía el link de su carpeta a su jefe o socio a las 8pm. Ese stakeholder no puede abrirlo. Al día siguiente el cliente te escribe frustrado. Pequeño en aislamiento, acumulativo en retención.

---

## Próximos Pasos — Secuencia accionable

**Esta semana (costo: cero)**
1. Estandariza la estructura de carpeta con el template descrito arriba
2. Crea un archivo "INICIO AQUÍ" plantilla en Canva o Google Docs con tu branding
3. Audita todos los links existentes: configura permisos en "Cualquier persona con el link puede ver" para carpetas de entregables
4. Define la convención de naming y escríbela en un doc interno — un solo estándar para los dos socios

**Antes del primer colaborador externo o primer cliente US/EU (lo que llegue primero)**
5. Migra a Workspace Business Starter — USD 12/mes, dos usuarios
6. Configura el dominio corporativo en email y firma de documentos
7. Migra carpetas de clientes a Drive corporativo y revoca accesos anteriores

**Con 5 clientes activos en retainer**
8. Evalúa si necesitas un tercer usuario de Workspace o si el almacenamiento requiere upgrade
9. Implementa política de archivado trimestral (mueve entregables viejos a carpeta "Histórico" para liberar espacio activo)10. Considera si el volumen justifica una capa de gestión de proyectos (Notion, ClickUp) — pero solo si el Drive está generando fricción operativa real, no como aspiración

---

*Una última cosa: la carpeta de Drive bien estructurada es tu primer entregable antes del primer entregable. El cliente que abre su carpeta el día 1 y ve orden, nombres claros y un archivo que le explica cómo funciona todo — ese cliente ya está siendo retenido antes de que entregues una sola pieza de contenido.*

═══ FINAL SYNTHESIS ═══
# ZEUS — Síntesis Estratégica: Arquitectura Documental LUNKORA

---

## [PUNTOS DE CONVERGENCIA]

ATLAS y HERMES llegan al mismo lugar desde ángulos distintos, y eso es señal de solidez en los principios:

**1. Aislamiento total como unidad de diseño**
Ambos concluyen que una carpeta de cliente debe ser una unidad hermética e independiente. ATLAS lo formula como principio técnico de permisos ("nunca herencia del padre"). HERMES lo formula como principio de experiencia ("¿esto es mío o de otro?"). La conclusión es idéntica: la carpeta raíz de un cliente nunca se comparte, solo su subcarpeta de entregables.

**2. El naming es operativo y comercial simultáneamente**
ATLAS propone un sistema de prefijos tipados y fechado AAAA-MM-DD. HERMES señala que cuando el cliente reenvía el link por WhatsApp a su contador, el nombre del archivo *es* tu tarjeta de presentación. No se contradicen — se refuerzan. Un sistema de nombres bien diseñado cumple los dos objetivos sin esfuerzo adicional.

**3. Los 15 GB son un límite con fecha de vencimiento, no una restricción permanente**
Ambos ven el plan gratuito como etapa de arranque, no como destino. La diferencia está en los disparadores de migración, que sí generan tensión (ver abajo).

**4. Fricción = pérdida de confianza, especialmente en contexto colombiano**
Los links que piden acceso, los archivos con nombres caóticos, las carpetas sin estructura: HERMES los cataloga como riesgo de retención. ATLAS los resuelve con diseño de permisos. Hay acuerdo total en que el caos documental no es estético — es comercialmente dañino.

**5. La estructura debe ser autoexplicativa para terceros**
ATLAS diseña el árbol para que un freelancer nuevo lo entienda sin capacitación. HERMES propone el archivo "INICIO AQUÍ" para que el cliente navegue sin soporte. Misma lógica, aplicada a audiencias distintas.

---

## [TENSIONES DETECTADAS]

### Tensión 1 — Complejidad de estructura interna vs. adopción real con dos personas

**ATLAS** propone una arquitectura profunda con 5 niveles, numeración jerárquica (01.1, 01.2), prefijos por tipo de documento, y estados de versión explícitos en el nombre del archivo. Es rigurosa y escalable.

**HERMES** no cuestiona esto explícitamente, pero su énfasis es opuesto: la estructura más valiosa es la que el cliente VE, y el riesgo operativo es el caos que se filtra. Implícitamente, una arquitectura muy elaborada con dos personas puede colapsar antes de que lleguen los freelancers porque la fricción de mantenerla es alta.

**La tensión real:** Una arquitectura que requiere disciplina constante para mantenerse limpia puede ser más costosa que una arquitectura más simple que se mantiene sola. Con dos socios y presión operativa desde el mes 1, los sistemas complejos se abandonan en semanas.

---

### Tensión 2 — El trigger de migración a Workspace

**ATLAS** no fija un trigger explícito. Menciona la distribución de cuentas entre dos socios como estrategia de almacenamiento y deja la migración como decisión futura.

**HERMES** es mucho más agresivo: propone tres triggers anteriores al de 5 clientes — primer cliente US/EU, primer freelancer con acceso, y 70% de uso de almacenamiento. El argumento es que el criterio de volumen mide capacidad, pero los criterios de riesgo comercial (credibilidad de vendor) y riesgo operativo (control de acceso) pueden aparecer antes.

**La tensión real:** Migrar a Workspace a USD 12/mes desde el mes 1 es técnicamente trivial en costo, pero implica una decisión de priorización en una etapa donde cada gasto se siente grande. Si el trigger correcto es "antes del primer cliente US/EU", y ese cliente está en el pipeline de mes 2, la pregunta no es cuándo sino si tienes claridad del criterio antes de que el evento ocurra.

---

### Tensión 3 — Dónde vive el video

**ATLAS** reconoce explícitamente que el video no puede vivir en Drive de forma permanente en plan gratuito, pero no resuelve el problema: señala la necesidad de "política de paso temporal" sin definirla completamente. La estructura propuesta no incluye la capa de almacenamiento externo.

**HERMES** toca el riesgo de Drive lleno como evento crítico durante entrega, pero tampoco define la solución. Ambos identifican el problema; ninguno lo resuelve del todo.

**La tensión real:** Esta es una brecha compartida. El video es el elefante en el cuarto que los dos arquitectos reconocen pero no resuelven. Si LUNKORA ofrece producción audiovisual, esto no es un riesgo futuro — es un problema de mes 3 o 4, posiblemente antes.

---

### Tensión 4 — La visión del cliente como usuario del Drive

**ATLAS** diseña la carpeta cliente principalmente desde adentro hacia afuera: la estructura interna (ADMIN, ASSETS, PRODUCCIÓN, ENTREGABLES) tiene lógica operacional, y la carpeta de entrega es la salida de ese proceso.

**HERMES** diseña desde afuera hacia adentro: parte del cliente que abre el link sin contexto, y propone una carpeta de entrega que incluye un archivo de orientación, naming orientado a reenvío por WhatsApp, y PDFs en lugar de Docs editables.

**La tensión real:** No son incompatibles, pero requieren decisión sobre qué convención de nombres se usa en la carpeta de entregables — ¿la del sistema interno (prefijos tipo ENT, CONT, BRIEF) o la del sistema orientado al cliente (Tipo_Descripción_MesAño)? Si se usan las dos en el mismo Drive, hay inconsistencia. Si se usa solo una, hay compromiso.

---

## [RESOLUCIÓN DE TENSIONES]

### Resolución 1 — Estructura en dos velocidades: esqueleto simple, detalle modular

El error a evitar es construir toda la arquitectura de ATLAS el día 1 y abandonarla en el mes 2. La solución es distinguir entre la estructura permanente (que se define ahora y no cambia) y el detalle operativo (que se añade cuando la operación lo requiere).

**Regla práctica:** Si una carpeta tiene contenido hoy o en los próximos 30 días, créala. Si no, no existe aún.

Esto significa que la Zona 1 (Operación Interna) arranca con 3 carpetas reales, no 5 con 20 subcarpetas vacías:

```
LUNKORA — OPERACIÓN INTERNA
├── 01 — EMPRESA (legal, marca, finanzas)
├── 02 — COMERCIAL (propuestas, contratos)
└── 03 — RECURSOS INTERNOS (SOPs, plantillas, guía freelancers)
```

Las subdivisiones (04 — Tecnología, 05 — Archivo Histórico) se crean cuando hay contenido para ellas. La estructura de ATLAS es el destino correcto; el error es crearla vacía desde el día 1, porque una carpeta vacía que nadie mantiene es peor que no tenerla.

La Zona 2 (Clientes) se implementa completa desde el inicio, porque es el núcleo operativo y necesita consistencia desde el primer cliente.

---

### Resolución 2 — Trigger de migración: adoptar el criterio de HERMES, con un ajuste

HERMES tiene razón en los criterios. Los tres triggers pre-5-clientes son legítimos. Pero la acción correcta no es "migrar cuando cualquiera ocurra" — es tener claridad hoy del criterio, para que cuando el evento ocurra, la decisión ya esté tomada y no requiera deliberación.

**Matriz de decisión adoptada:**

| Evento | Acción |
|---|---|
| Primer contacto serio con cliente US/EU (no lead frío, sino conversación activa) | Migrar antes de enviar propuesta formal |
| Primer freelancer que necesita acceso a carpeta de cliente | Migrar ese mes |
| Drive al 60% de uso (no 70% — margen de seguridad operativo) | Migrar ese mes |
| 5 clientes activos en retainer | Migrar si no lo hiciste antes |
| Solo clientes MiPyme Colombia, sin freelancers, Drive bajo 50% | Mantener plan gratuito |

El ajuste al criterio de HERMES: mover el umbral de almacenamiento de 70% a 60%, porque entre que decides migrar, completas el pago, configuras el dominio y migras las carpetas, puedes llegar al 80% y tener un incidente.

---

### Resolución 3 — El video: definir la política ahora, no cuando el problema explota

Esta es la brecha que ningún arquitecto resolvió y que ZEUS debe cerrar.

**Política de almacenamiento de video para LUNKORA:**

**Regla 1 — Drive no es el repositorio de video. Es el punto de entrega.**
Los archivos fuente de video (footage crudo, proyectos de edición, exports en alta resolución) NO viven en Drive. Drive solo recibe el export final aprobado para entrega al cliente.

**Regla 2 — Para archivos de producción (footage, proyecto de edición):**
- Fase activa del proyecto: disco duro externo físico del editor (socio o freelancer)
- Al cierre del proyecto: Google Photos (videos comprimidos para referencia) o YouTube no listado (para revisión del cliente sin consumir Drive)
- Archivos fuente: un disco duro externo dedicado a archivo, etiquetado por cliente y año

**Regla 3 — Para entrega al cliente:**
- Si el video final pesa menos de 1 GB: vive en carpeta Drive del cliente, carpeta Entregables
- Si el video final pesa más de 1 GB: YouTube no listado o Vimeo (plan gratuito) + enlace en carpeta Drive del cliente con un archivo PDF que dice "Entregable: [Nombre del Video] — Ver en link adjunto"

**Regla 4 — Trigger de upgrade de almacenamiento:**
Cuando llegues a 3 proyectos de video activos simultáneamente, el costo de Workspace (USD 12/mes) es significativamente menor que el costo de gestionar el caos de almacenamiento distribuido.

---

### Resolución 4 — Naming en dos niveles: interno y de entrega

La solución a la tensión entre el sistema de ATLAS (prefijos operativos) y el sistema de HERMES (orientado a reenvío por cliente) es usar los dos en sus dominios correctos, sin mezclarlos:

**Zona interna (carpetas que nunca ve el cliente):** Sistema de ATLAS con prefijos tipados.
```
CONT — Treble Analytics — Servicios Branding — 2025-01-20 — FIRMADO.pdf
BRIEF — EduSkill — Campaña Lanzamiento — 2025-03.pdf
```

**Zona de entrega (carpeta 03 — ENTREGABLES AL CLIENTE):** Sistema de HERMES orientado a lectura humana sin jerga interna.
```
Treble_Analytics — Logo_Principal — Feb2025.pdf
Treble_Analytics — Reporte_Resultados — Q1_2025.pdf
```

**La regla que unifica ambos sistemas:**
Cuando un archivo sale de la carpeta de producción interna hacia la carpeta de entregables, se renombra. Es un paso explícito en el flujo de vida del asset. No es redundancia — es la línea entre lo que opera LUNKORA y lo que percibe el cliente.

---

## [DECISIÓN INTEGRADA]

### La arquitectura completa de LUNKORA en Drive

---

### Principios rectores (no negociables)

1. **Una carpeta de cliente = una unidad de permisos.** Nunca herencia de carpeta padre.
2. **La carpeta de Entregables es la única que ve el cliente.** Todo lo demás es invisible para él.
3. **Drive no almacena video fuente.** Solo entregables finales bajo 1 GB. El resto va por enlace externo.
4. **Dos sistemas de naming, dos zonas.** Prefijos operativos internamente; naming limpio en entregables.
5. **La estructura se crea cuando tiene contenido.** Las carpetas vacías son deuda operativa, no arquitectura.

---

### Árbol completo — Lo que se implementa el día 1

```
📁 LUNKORA DRIVE [raíz]
│
├── 📁 OPERACIÓN INTERNA — LUNKORA
│   │   [Visible solo para socios — NUNCA compartir este nivel]
│   │
│   ├── 📁 01 — EMPRESA
│   │   ├── 📁 Legal
│   │   │   ├── Registro mercantil.pdf
│   │   │   ├── RUT LUNKORA.pdf
│   │   │   └── Acuerdo de socios — 2025-01 — FIRMADO.pdf
│   │   ├── 📁 Finanzas
│   │   │   └── 📁 2025
│   │   │       ├── 📁 Q1 — Ene-Feb-Mar
│   │   │       └── 📁 Q2 — Abr-May-Jun
│   │   └── 📁 Marca LUNKORA
│   │       ├── 📁 Logos (todos los formatos)
│   │       ├── 📁 Paleta y tipografía
│   │       └── 📁 Plantillas de documentos
│   │           ├── PLANT — Propuesta Comercial — v1.0.pdf
│   │           ├── PLANT — Contrato de Servicios — v1.0.pdf
│   │           └── PLANT — Informe de Entrega — v1.0.pdf
│   │
│   ├── 📁 02 — COMERCIAL
│   │   ├── 📁 Propuestas
│   │   │   ├── 📁 2025 — Aprobadas
│   │   │   ├── 📁 2025 — En curso
│   │   │   └── 📁 2025 — Rechazadas
│   │   └── 📁 Portfolio y Casos de Estudio
│   │       ├── 📁 En construcción
│   │       └── 📁 Publicados
│   │
│   └── 📁 03 — RECURSOS INTERNOS
│       ├── 📁 SOPs (versión PDF oficial)
│       │   ├── SOP — Onboarding Cliente Nuevo — v1.0.pdf
│       │   ├── SOP — Ciclo de Revisión y Aprobación — v1.0.pdf
│       │   ├── SOP — Política de Almacenamiento Drive — v1.0.pdf
│       │   └── SOP — Offboarding y Archivo de Proyecto — v1.0.pdf
│       └── 📁 Recursos para Freelancers
│           ├── Guía de Bienvenida — Freelancer LUNKORA.pdf
│           └── Convenciones de Nomenclatura — LUNKORA.pdf
│
└── 📁 CLIENTES — LUNKORA
    │
    ├── 📁 _PLANTILLA-NUEVO-CLIENTE [NO MODIFICAR — SOLO DUPLICAR]
    │   ├── 📁 00