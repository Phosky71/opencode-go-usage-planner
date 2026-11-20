# PROJECT TECHNICAL ASSESSMENT

**OpenCode Go Usage Planner**
**Fecha:** 2026-11-19
**Versión del proyecto:** 0.1.0
**Estado:** Auditoría técnica inicial

---

## 1. Resumen ejecutivo

El proyecto **OpenCode Go Usage Planner** es una aplicación web estática (React 18 + Vite 5 + TypeScript) que calcula, compara y simula el consumo de cuotas compartidas de OpenCode Go. El código base está bien estructurado, las pruebas pasan (80/80), el build compila sin errores y la lógica de dominio es determinista y sólida.

El sistema de extracción de datos —el componente crítico bajo investigación— se basa en **web scraping HTML de una única fuente** (`https://opencode.ai/v2/docs/console/go/`) mediante `node-html-parser`. El parser actual detecta tablas por contenido de cabeceras (no por índice hardcoded), lo que es robusto frente a reordenación de tablas. Sin embargo, **la página de OpenCode ha cambiado de estructura** y el parser puede no funcionar con la versión actual de la documentación. No se ha podido verificar externamente el estado actual de la página.

El proyecto no tiene backend, no expone credenciales, no envía datos del usuario y cumple los principios de privacidad declarados. La actualización del catálogo se realiza exclusivamente vía CLI (`npx tsx scripts/update-catalog.ts`) o GitHub Actions, no desde el navegador.

### Hallazgos principales

| Hallazgo | Gravedad | Estado |
|----------|----------|--------|
| El parser depende de estructura HTML específica de OpenCode | Alta | CONFIRMADO |
| Solo existe una fuente de datos registrada | Media | CONFIRMADO |
| GitHub Actions no se ha probado en remoto | Media | CONFIRMADO |
| Mínimo de 20 modelos por plan es rígido | Baja | CONFIRMADO |
| 33 warnings de lint sin resolver | Baja | CONFIRMADO |
| Importaciones no usadas en updater.ts | Baja | CONFIRMADO |
| Estado actual de la página de OpenCode no verificado | Alta | NO VERIFICADO |

---

## 2. Contexto y alcance de la auditoría

### Objetivo
Realizar un diagnóstico basado en evidencias del repositorio para dirigir la recuperación y evolución del sistema de extracción de información, tras la actualización de la interfaz web de OpenCode.

### Alcance
- Inspección completa del repositorio (código fuente, configuración, documentación, pruebas).
- Ejecución de verificaciones: tests, typecheck, build, lint.
- Análisis del sistema de extracción de datos y sus dependencias.
- Evaluación arquitectónica y propuesta de recuperación.

### Limitaciones
- No se ha podido acceder a la página web de OpenCode para verificar su estructura actual.
- No se han modificado archivos del proyecto (solo se ha creado este documento).
- No se han ejecutado scripts de actualización del catálogo contra la fuente real.

---

## 3. Arquitectura general del proyecto

### Stack tecnológico

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Frontend | React | 18.3.1 |
| Build | Vite | 5.4.0 |
| Lenguaje | TypeScript | 5.9.3 |
| CSS | Tailwind CSS | 4.3.3 |
| Validación | Zod | 3.25.76 |
| Parser HTML | node-html-parser | 9.0.5 |
| Tests | Vitest | 2.1.9 |
| DOM virtual | jsdom | 25.0.0 |
| Testing UI | @testing-library/react | 16.3.3 |
| Runtime scripts | tsx | 4.23.15 |
| Lint | ESLint | 9.39.5 |

### Arquitectura de despliegue
- **Sitio estático** sin backend.
- Se sirve bajo `/proyectos/opencode-go-usage-planner/app/` en operiasystems.com.
- `vite.config.ts` usa `base: './'` para compatibilidad con subpath.
- No hay servidor, API, base de datos ni autenticación.

### Organización de módulos

```
src/
├── catalog/          # Sistema de extracción y validación del catálogo
│   ├── source-registry.ts   # Registro de fuentes (1 fuente)
│   ├── fetcher.ts           # Cliente HTTP con timeout y límites
│   ├── parsers.ts           # Parsers HTML y JSON
│   ├── schema.ts            # Esquema Zod del catálogo
│   ├── catalog.ts           # Re-export + stubs para browser
│   ├── io.ts                # I/O de archivos (Node-only)
│   ├── updater.ts           # Orquestador: fetch → parse → validate
│   ├── integrity.ts         # Validación de integridad y comparación
│   └── audit.ts             # Diff de catálogos
├── domain/           # Lógica de negocio pura
│   ├── models.ts            # Tipos Model, ConsumptionEntry, Contribution
│   ├── calculations.ts      # Fórmulas de contribución
│   ├── validation.ts        # Esquemas Zod de dominio
│   ├── parser.ts            # Parser de formularios
│   └── scenario.ts          # Escenarios con persistencia
├── context/          # React Context
│   ├── CatalogContext.tsx   # Proveedor del catálogo
│   ├── PlanContext.tsx      # Selector de plan Go/Go-Plus
│   └── index.ts             # Re-export
├── ui/               # Componentes React
│   ├── App.tsx              # Componente raíz
│   └── components/
│       ├── Calculator.tsx
│       ├── ModelCatalog.tsx
│       ├── ModelComparator.tsx
│       ├── PlanSelector.tsx
│       └── ToolsPanel.tsx
│   └── hooks/
│       └── useScenarioPersistence.ts
├── data/
│   └── models.json          # Catálogo persistente (74 modelos)
└── __tests__/        # Pruebas automatizadas
    ├── fixtures/
    │   └── go-docs-fixture.html
    └── *.test.{ts,tsx}
```

### Flujo de datos

```
Fuente oficial (HTML)
    ↓
fetcher.ts (HTTP, timeout 15s, max 2MB)
    ↓
parsers.ts (node-html-parser → Model[])
    ↓
schema.ts (Zod validation)
    ↓
integrity.ts (validación estructural)
    ↓
io.ts (persistencia en models.json)
    ↓
CatalogContext.tsx (carga en React)
    ↓
UI components (display y cálculo)
```

---

## 4. Inventario de módulos y componentes

### Módulo: src/catalog/

| Archivo | Líneas | Responsabilidad | Dependencias externas |
|---------|--------|----------------|----------------------|
| source-registry.ts | 26 | Define interfaz `Source` y registro de fuentes | Ninguna |
| fetcher.ts | 70 | Cliente HTTP con timeout, maxBytes, User-Agent | `fetch` nativo |
| parsers.ts | 235 | Parsea HTML (Go docs) y JSON (API) | `node-html-parser` |
| schema.ts | 54 | Esquema Zod del catálogo | `zod` |
| catalog.ts | 15 | Re-export + stubs no-op para browser | `zod` |
| io.ts | 24 | Lectura/escritura de models.json | `fs`, `path` (Node) |
| updater.ts | 110 | Orquesta fetch→parse→validate→integrity | Todos los módulos catalog |
| integrity.ts | 249 | Valida integridad, compara catálogos | `zod` |
| audit.ts | 62 | Diff de catálogos, descripción de modelos | Ninguna |

### Módulo: src/domain/

| Archivo | Líneas | Responsabilidad | Dependencias externas |
|---------|--------|----------------|----------------------|
| models.ts | 89 | Tipos Model, ConsumptionEntry, Contribution, helpers | Ninguna |
| calculations.ts | 88 | Fórmulas: contribución, margen, diferencia | models.ts, validation.ts |
| validation.ts | 63 | Esquemas Zod de dominio | `zod` |
| parser.ts | 17 | Parser de formularios, búsqueda por ID | `zod` |
| scenario.ts | 97 | Esquema y funciones de escenarios | `zod` |

### Módulo: src/ui/

| Archivo | Responsabilidad |
|---------|----------------|
| App.tsx | Componente raíz, layout, providers |
| Calculator.tsx | Calculadora de consumo con entrada por modelo |
| ModelCatalog.tsx | Vista del catálogo filtrado por plan |
| ModelComparator.tsx | Tabla comparativa ordenable |
| PlanSelector.tsx | Selector Go / Go Plus |
| ToolsPanel.tsx | Estado del catálogo, comando CLI |
| useScenarioPersistence.ts | Hook de persistencia localStorage |

### Módulo: src/context/

| Archivo | Responsabilidad |
|---------|----------------|
| CatalogContext.tsx | Carga models.json embebido por Vite, valida con Zod |
| PlanContext.tsx | Gestiona plan seleccionado con localStorage |

### Scripts

| Archivo | Responsabilidad |
|---------|----------------|
| scripts/update-catalog.ts | CLI: fetch→parse→compare→merge→save |
| scripts/verify-catalog.ts | CLI: audit read-only sin escribir |

### CI/CD

| Archivo | Responsabilidad |
|---------|----------------|
| .github/workflows/update-catalog.yml | GitHub Actions: diario a medianoche, abre PR con cambios |

---

## 5. Arquitectura del sistema de extracción

### Diseño implementado

El sistema sigue el patrón descrito en `docs/architecture.md`:

1. **SourceRegistry** (`source-registry.ts`): Lista de fuentes con URL, tipo, campos, método y frecuencia.
2. **Fetcher** (`fetcher.ts`): Descarga HTTP con timeout (15s), límite de tamaño (2MB), User-Agent identificable.
3. **Parser** (`parsers.ts`): Convierte HTML/JSON en objetos `Model` tipados.
4. **Validator** (`schema.ts`): Valida cada modelo con Zod.
5. **Integrity** (`integrity.ts`): Verifica conteos mínimos, duplicados, semántica de límites, filas saltadas.
6. **Diff** (`audit.ts`, `integrity.ts`): Compara catálogo nuevo vs anterior, detecta cambios sospechosos.
7. **Apply** (`update-catalog.ts`): Merge y persistencia condicional.

### Separación browser/Node

- `catalog.ts` exporta stubs vacíos para el bundle del navegador.
- `io.ts` usa `fs`/`path` y solo se importa desde scripts Node.js.
- `CatalogContext.tsx` importa `models.json` directamente vía Vite (se embebe en el bundle).
- El botón de "Actualizar catálogo" en ToolsPanel solo muestra el comando CLI; no ejecuta scraping.

### Evaluación

| Aspecto | Estado | Observación |
|---------|--------|-------------|
| Independencia entre extractores | ✓ Bueno | Parser por fuente, interfaz Source |
| Contratos de datos | ✓ Bueno | Zod schema con refine |
| Validación de integridad | ✓ Bueno | Conteos, duplicados, semántica |
| Detección de cambios | ✓ Bueno | compareCatalogs con umbral 15% |
| Conservación de catálogo válido | ✓ Bueno | No sobrescribe si falla |
| Observabilidad | ✓ Adecuado | Métricas de parsing, warnings |
| Separación browser/Node | ✓ Bueno | Stubs + import condicional |
| Pruebas de parsers | ✓ Bueno | Fixtures HTML versionados |
| Fuentes registradas | ⚠ Insuficiente | Solo 1 fuente |
| Fallback si falla fuente | ⚠ Parcial | Conserva catálogo anterior |

---

## 6. Análisis individual de cada fuente

### Fuente: opencode-go-docs

| Campo | Valor |
|-------|-------|
| **ID** | `opencode-go-docs` |
| **URL** | `https://opencode.ai/v2/docs/console/go/` |
| **Tipo** | HTML |
| **Método** | `html-parser` (node-html-parser) |
| **Parser** | `parseGoDocs` / `parseGoDocsDetailed` |
| **Frecuencia** | `daily` |
| **Campos extraídos** | `displayName`, `monthlyLimitUsd`, `priceInputUsd`, `priceOutputUsd` |
| **Datos obtenidos** | 74 modelos (37 Go + 37 Go Plus) |
| **Autenticación** | Ninguna — página pública |
| **User-Agent** | `opencode-go-usage-planner/0.1 (+https://github.com/anomalyco/opencode)` |
| **Timeout** | 15 segundos |
| **Límite de tamaño** | 2 MB |

#### Mecanismo de extracción detallado

El parser `parseGoDocs()` funciona así:

1. Parsea el HTML completo con `node-html-parser`.
2. Busca todas las tablas `<table>` de la página.
3. Para cada tabla, lee las cabeceras (`<th>`/`<td>` de la primera fila).
4. Identifica las tablas de pricing por contenido de cabeceras: debe contener `"model"`, `"monthly limit"`, `"input"`, `"output"`.
5. Si hay ≥2 tablas de pricing, la segunda se marca como Go Plus.
6. Para cada fila de datos (desde la fila 2):
   - Requiere ≥6 celdas.
   - Extrae el texto de cada celda eliminando etiquetas `<del>` (precios tachados).
   - Parsea el límite mensual (`parseMonthlyLimit`) y los precios (`parsePrice`).
   - Construye el ID como `"ModelName (Go)"` o `"ModelName (Go Plus)"`.
7. Retorna array de `Model` + métricas de parsing.

#### Selectores utilizados

- **Búsqueda de tablas**: `querySelectorAll('table')` — genérico.
- **Detección de pricing tables**: Por contenido de cabeceras, no por selector CSS específico.
- **Celdas**: `querySelectorAll('th,td')` — genérico.
- **Texto sin strikethrough**: Regex `<del[^>]*>.*?<\/del>` + re-parse.

#### Estrategia de recuperación ante errores

| Escenario | Comportamiento |
|-----------|----------------|
| Sin tablas en HTML | Lanza `Error('No tables found')` |
| Sin tablas de pricing | Lanza `Error('No pricing tables found')` |
| Fila con <6 celdas | Se salta la fila, registra motivo |
| Modelo sin nombre | Se salta la fila |
| Límite no interpretable | `limitStatus: 'unknown'`, `monthlyLimitUsd: null` |
| Precio ausente (`-`, `—`, `n/a`) | `priceInputUsd: undefined` |
| HTTP no-OK | Lanza `Error('HTTP {status}')` |
| Timeout | AbortController cancela la petición |
| Respuesta >2MB | Lanza `Error('Response too large')` |

#### Validación post-extracción

1. **Zod schema** (`schema.ts`): Valida tipos, rangos, URLs, fechas ISO, enums.
2. **Integrity check** (`integrity.ts`):
   - Mínimo 20 modelos Go y 20 modelos Go Plus.
   - Sin IDs duplicados.
   - Semántica consistente de `limitStatus`/`monthlyLimitUsd`/`unlimited`.
   - Si hay filas saltadas → error (extracción parcial rechazada).
3. **Comparación** (`compareCatalogs`):
   - Detecta reducción >15% como sospechosa.
   - Detecta eliminación completa de un plan.
   - Requiere `--accept-suspicious` para forzar.

#### Tests existentes

- `parser-integrity.test.ts`: 22 tests cubren parsing, métricas, integridad, comparación.
- `integrity-comprehensive.test.ts`: 23 tests cubren casos A-G de protección contra extracción parcial.
- `catalog-provenance.test.ts`: 7 tests cubren provenance, límites desconocidos, precios ausentes.
- Fixture HTML: `go-docs-fixture.html` (48 líneas, 9 tablas, 8 modelos de prueba).

#### Limitaciones conocidas

1. **Dependencia de estructura HTML**: El parser asume que las tablas de pricing tienen cabeceras específicas en inglés (`"model"`, `"monthly limit"`, `"input"`, `"output"`). Si OpenCode cambia el idioma o la estructura de las cabeceras, el parser fallará.
2. **Requiere 6 celdas por fila**: Si la tabla cambia de número de columnas, las filas se saltarán.
3. **Solo una fuente**: No hay fuentes alternativas ni de respaldo.
4. **No se ejecuta desde el navegador**: Por CORS y seguridad, el scraping requiere Node.js (CLI o CI).
5. **Estado de la página no verificado**: No se ha confirmado si la URL actual sigue sirviendo la misma estructura HTML.

---

## 7. Análisis detallado de OpenCode Go

### Implementación actual del extractor

El extractor de OpenCode Go es el **único extractor** del sistema. Está implementado completamente en `src/catalog/parsers.ts` en las funciones `parseGoDocs()` y `parseGoDocsDetailed()`.

### Flujo completo de obtención de datos

```
1. source-registry.ts define la fuente:
   URL: https://opencode.ai/v2/docs/console/go/
   Parser: parseGoDocs

2. updater.ts itera SOURCES y para cada una:
   a. fetcher.ts descarga el HTML (fetch nativo, 15s timeout, 2MB max)
   b. parsers.ts parseGoDocsDetailed() extrae los modelos
   c. schema.ts valida cada modelo con Zod
   d. integrity.ts validateIntegrity() verifica la integridad
   e. Si pasa, los modelos se retornan

3. update-catalog.ts (CLI):
   a. Carga el catálogo existente de models.json
   b. Compara con compareCatalogs()
   c. Si es sospechoso, requiere --accept-suspicious
   d. Merge: añade nuevos, actualiza existentes
   e. Guarda con saveCatalog()

4. GitHub Actions (CI):
   a. Ejecuta update-catalog.ts diariamente
   b. Corre los tests
   c. Si hay cambios, abre un PR para revisión
```

### URLs y endpoints utilizados

| Endpoint | Propósito | Estado |
|----------|-----------|--------|
| `https://opencode.ai/v2/docs/console/go/` | Página de documentación con tablas de pricing | Única fuente, HTML |

No se utilizan APIs REST, GraphQL, feeds RSS/Atom ni endpoints JSON documentados.

### Sistema de autenticación

No requiere autenticación. La página es pública. No se usan cookies, tokens ni sesiones.

### Estructura de las respuestas

La respuesta es HTML completo. Según `docs/scrapling-analysis.md`, la página contiene 9 tablas HTML generadas por Astro (estáticas, sin JavaScript necesario para los datos). Las tablas relevantes son las de pricing con estas columnas:

| Columna | Uso en parser |
|---------|--------------|
| Model | Nombre del modelo (displayName) |
| Input | Precio de entrada (priceInputUsd) |
| Output | Precio de salida (priceOutputUsd) |
| Cached Read | No se extrae |
| Cached Write | No se extrae |
| Monthly limit | Límite mensual (monthlyLimitUsd) |

### Uso de peticiones HTTP

- `fetch()` nativo de Node.js.
- Headers: `User-Agent` identificable, `Accept: text/html,application/json`.
- AbortController con timeout de 15s.
- Decodificación UTF-8 vía `TextDecoder`.

### Uso de navegadores automatizados

No se usa Puppeteer, Playwright ni ningún navegador automatizado. El scraping es HTTP + parsing HTML estático.

### Dependencias de la interfaz web

El parser depende de:
1. Que existan tablas `<table>` en el HTML.
2. Que las cabeceras de las tablas de pricing contengan las palabras `"model"`, `"monthly limit"`, `"input"`, `"output"` (case-insensitive).
3. Que cada fila de datos tenga ≥6 celdas.
4. Que los precios estén en formato `$X.XX` o `Free`.
5. Que los límites estén en formato `$XX` o `Unlimited`.
6. Que los precios tachados usen `<del>` tags.

### Consecuencias de la actualización de la interfaz web

Según el contexto del proyecto, OpenCode ha actualizado su interfaz web. Las posibles consecuencias para el parser son:

1. **Cambios en las cabeceras de tabla**: Si `"monthly limit"` se renombra a `"limit"` o `"quota"`, la detección fallará.
2. **Cambios en el número de columnas**: Si se añaden o eliminan columnas, el requisito de ≥6 celdas puede saltar filas válidas.
3. **Cambios en el formato de precios/límites**: Si el formato cambia de `$XX` a otro patrón, `parsePrice()` y `parseMonthlyLimit()` no extraerán valores.
4. **Estructura HTML diferente**: Si las tablas se reemplazan por componentes renderizados con JavaScript, el HTML estático no contendrá los datos.
5. **URL cambiada**: Si la ruta `/v2/docs/console/go/` se modifica, el fetch fallará con HTTP 404.

**Estado de verificación:** NO VERIFICADO — no se ha podido acceder a la página actual de OpenCode para confirmar si estos cambios han ocurrido.

### Investigación de alternativas

Según la investigación del repositorio:

| Alternativa | Evidencia | Viabilidad |
|-------------|-----------|------------|
| API oficial REST/GraphQL | No se encuentra referencia en el código ni docs | NO VERIFICADO |
| Endpoint JSON utilizado por el frontend | No se encuentra referencia | NO VERIFICADO |
| Feed RSS/Atom | No se encuentra referencia | NO VERIFICADO |
| API de modelos (parseModelsApi) | Existe el parser pero no hay fuente registrada que lo use | Implementado, no configurado |
| Documentación oficial en otro formato | No se encuentra referencia | NO VERIFICADO |

**Nota:** `parseModelsApi()` existe en `parsers.ts` y puede parsear JSON con listas de modelos, pero no hay ninguna fuente en `source-registry.ts` que apunte a un endpoint JSON. Esto sugiere que se preparó la infraestructura para un endpoint JSON que no se ha configurado.

---

## 8. Problemas detectados y evidencias

### P-001: Dependencia exclusiva de scraping HTML

| Campo | Valor |
|-------|-------|
| **Descripción** | El sistema depende de una única fuente HTML. Si la estructura cambia, toda la extracción falla. |
| **Componente** | `source-registry.ts`, `parsers.ts` |
| **Archivos** | `src/catalog/source-registry.ts` (línea 14-25), `src/catalog/parsers.ts` |
| **Evidencia** | Solo 1 entrada en `SOURCES`. No hay fuentes alternativas. |
| **Consecuencia** | Si OpenCode cambia la página, el catálogo no se puede actualizar automáticamente. |
| **Gravedad** | Alta |
| **Certeza** | CONFIRMADO |

### P-002: Parser acoplado a cabeceras en inglés

| Campo | Valor |
|-------|-------|
| **Descripción** | La detección de tablas de pricing busca `"model"`, `"monthly limit"`, `"input"`, `"output"` en las cabeceras. |
| **Componente** | `parsers.ts` |
| **Archivos** | `src/catalog/parsers.ts` (líneas 40-43) |
| **Evidencia** | Código: `header.indexOf('model')`, `col.includes('monthly limit')`, `header.indexOf('input')`. |
| **Consecuencia** | Un cambio de nomenclatura en las cabeceras rompe la detección. |
| **Gravedad** | Alta |
| **Certeza** | CONFIRMADO |

### P-003: Requisito rígido de 6 celdas por fila

| Campo | Valor |
|-------|-------|
| **Descripción** | Las filas con menos de 6 celdas se saltan silenciosamente. |
| **Componente** | `parsers.ts` |
| **Archivos** | `src/catalog/parsers.ts` (línea 94) |
| **Evidencia** | `if (cells.length < 6) { skippedRows++; continue; }` |
| **Consecuencia** | Si la tabla pierde o gana columnas, se pierden modelos. |
| **Gravedad** | Media |
| **Certeza** | CONFIRMADO |

### P-004: Mínimo de 20 modelos por plan es arbitrario

| Campo | Valor |
|-------|-------|
| **Descripción** | `validateIntegrity()` rechaza catálogos con menos de 20 modelos por plan. |
| **Componente** | `integrity.ts` |
| **Archivos** | `src/catalog/integrity.ts` (líneas 46-47) |
| **Evidencia** | `const MIN_GO_MODELS = 20; const MIN_GO_PLUS_MODELS = 20;` |
| **Consecuencia** | Si OpenCode reduce legítimamente los modelos disponibles, la validación rechazará el catálogo correcto. |
| **Gravedad** | Media |
| **Certeza** | CONFIRMADO |

### P-005: GitHub Actions no probado en remoto

| Campo | Valor |
|-------|-------|
| **Descripción** | El workflow de GitHub Actions existe pero no se ha ejecutado en un repositorio remoto. |
| **Componente** | `.github/workflows/update-catalog.yml` |
| **Archivos** | `.github/workflows/update-catalog.yml` |
| **Evidencia** | `docs/project-state.md` línea 49: "Workflow not executed on GitHub (no remote repository configured)". |
| **Consecuencia** | La actualización automática diaria no está funcionando. |
| **Gravedad** | Media |
| **Certeza** | CONFIRMADO |

### P-006: Importaciones no usadas en updater.ts

| Campo | Valor |
|-------|-------|
| **Descripción** | `updater.ts` importa `Source` y `parseGoDocs` pero no los usa. |
| **Componente** | `updater.ts` |
| **Archivos** | `src/catalog/updater.ts` (líneas 2, 4) |
| **Evidencia** | Lint warnings: `'Source' is defined but never used`, `'parseGoDocs' is defined but never used`. |
| **Consecuencia** | Código muerto, posible confusión. |
| **Gravedad** | Baja |
| **Certeza** | CONFIRMADO |

### P-007: 33 warnings de lint sin resolver

| Campo | Valor |
|-------|-------|
| **Descripción** | El lint pasa pero deja 33 warnings (tipos `any`, imports no usados). |
| **Componente** | Varios archivos |
| **Archivos** | Múltiples archivos en `src/catalog/`, `src/__tests__/` |
| **Evidencia** | Ejecución de `npm run lint`: 33 warnings, 0 errores. |
| **Consecuencia** | Calidad de código subóptima, pero funcionalidad no afectada. |
| **Gravedad** | Baja |
| **Certeza** | CONFIRMADO |

### P-008: Estado actual de la página de OpenCode no verificado

| Campo | Valor |
|-------|-------|
| **Descripción** | No se ha podido acceder a `https://opencode.ai/v2/docs/console/go/` para verificar si la estructura HTML sigue siendo compatible con el parser. |
| **Componente** | Sistema de extracción completo |
| **Archivos** | Todos los archivos de `src/catalog/` |
| **Evidencia** | Limitación de la auditoría: no se realizó fetch externo. |
| **Consecuencia** | No se puede determinar si el parser funciona actualmente. |
| **Gravedad** | Alta |
| **Certeza** | NO VERIFICADO |

### P-009: parseModelsApi existe pero no está configurado

| Campo | Valor |
|-------|-------|
| **Descripción** | `parseModelsApi()` está implementado en `parsers.ts` pero no hay fuente en `source-registry.ts` que use `parserName: 'parseModelsApi'`. |
| **Componente** | `parsers.ts`, `source-registry.ts` |
| **Archivos** | `src/catalog/parsers.ts` (líneas 166-198), `src/catalog/source-registry.ts` |
| **Evidencia** | El parser existe y es testeable, pero `SOURCES` solo contiene `parseGoDocs`. |
| **Consecuencia** | Infraestructura preparada para API JSON sin usar. |
| **Gravedad** | Baja |
| **Certeza** | CONFIRMADO |

### P-010: Fixture HTML no representa la página real actual

| Campo | Valor |
|-------|-------|
| **Descripción** | El fixture `go-docs-fixture.html` es un HTML simplificado creado para pruebas. No es una captura de la página real. |
| **Componente** | `__tests__/fixtures/` |
| **Archivos** | `src/__tests__/fixtures/go-docs-fixture.html` |
| **Evidencia** | 48 líneas, 9 tablas, 4 modelos por plan. El catálogo real tiene 37 modelos por plan. |
| **Consecuencia** | Los tests pasan con el fixture pero no garantizan que el parser funcione con la página real. |
| **Gravedad** | Media |
| **Certeza** | CONFIRMADO |

---

## 9. Evaluación arquitectónica

### Elementos que conviene conservar

| Elemento | Razón |
|----------|-------|
| Separación domain/catalog/ui | Arquitectura limpia y mantenible |
| Esquema Zod con refine | Validación robusta y tipada |
| Sistema de integridad con métricas | Detecta extracciones parciales |
| compareCatalogs con umbral | Previene sobrescrituras silenciosas |
| Separación browser/Node | Correcta para sitio estático |
| Fórmula determinista sin IA | Cumple requisito no negociable |
| Provenance tracking | sourceType, verification, confidence |
| limitStatus explícito | known/unlimited/unknown bien diferenciado |
| Scripts CLI + GitHub Actions | Mecanismo real de actualización |
| Tests con fixtures versionados | Base sólida para testing de parsers |
| ToolsPanel informativo | Honesto sobre limitaciones del sitio estático |

### Elementos que necesitan modificación

| Elemento | Problema | Dirección |
|----------|----------|-----------|
| source-registry.ts | Solo 1 fuente | Investigar y añadir fuentes alternativas |
| parsers.ts cabeceras | Acoplado a inglés | Hacer detección más flexible o multi-idioma |
| parsers.ts 6 celdas | Rígido | Usar índices dinámicos basados en cabeceras |
| integrity.ts MIN_MODELS | 20 es arbitrario | Hacer configurable o más flexible |
| Fixture HTML | No representa realidad | Actualizar con captura real o mejorar cobertura |
| updater.ts | Imports no usados | Limpiar código muerto |
| GitHub Actions | No probado | Configurar y probar en remoto |

### Evaluación global

La arquitectura actual es **sólida para un MVP**. La separación de responsabilidades, la validación con Zod, el sistema de integridad y la separación browser/Node son decisiones correctas. El punto débil principal es la **dependencia de una única fuente HTML con estructura acoplada**, que es inherente al scraping pero se puede mitigar con:

1. Detección de cabeceras más flexible.
2. Fuentes alternativas (API JSON si existe).
3. Mejor instrumentación de errores.
4. Fixture más representativo.

---

## 10. Estado de las pruebas

### Infraestructura

| Componente | Herramienta | Configuración |
|------------|------------|---------------|
| Framework | Vitest 2.1.9 | `vitest.config.ts` |
| Entorno | jsdom 25.0.0 | Simulación de navegador |
| Setup | `@testing-library/jest-dom` | `src/__tests__/setup.ts` |
| Cobertura | `@vitest/coverage-v8` | Instalado, no ejecutado en esta auditoría |

### Tests existentes

| Archivo | Tests | Tipo | Componente cubierto |
|---------|-------|------|-------------------|
| calculations.test.ts | 3 | Unitario | Fórmulas de contribución |
| calculations-edge.test.ts | 9 | Unitario | Casos borde: cero, NaN, negativo, mismatch |
| parser-integrity.test.ts | 22 | Unitario + fixture | Parser HTML, integridad, comparación |
| integrity-comprehensive.test.ts | 23 | Unitario + fixture | Protección contra extracción parcial (casos A-G) |
| catalog-audit.test.ts | 4 | Unitario | Diff de catálogos |
| catalog-provenance.test.ts | 7 | Unitario + fixture | Provenance, límites desconocidos, precios ausentes |
| scenario.test.ts | 8 | Unitario | Esquema, serialización, validación de escenarios |
| calculator-ui.test.tsx | 4 | Integración UI | Calculadora, persistencia, borrado de datos |
| **Total** | **80** | | |

### Resultados de ejecución

| Verificación | Comando | Resultado | Duración |
|--------------|---------|-----------|----------|
| Tests | `npm run test` | **80/80 passed** | 4.81s |
| Typecheck | `npm run typecheck` | **0 errores** | — |
| Build | `npm run build` | **Éxito** (265KB / 70KB gzip) | 1.58s |
| Lint | `npm run lint` | **0 errores, 33 warnings** | — |

### Componentes con cobertura

- ✅ Cálculos de contribución (fórmula, casos borde)
- ✅ Parser HTML con fixture
- ✅ Validación de integridad
- ✅ Comparación de catálogos
- ✅ Diff de catálogos
- ✅ Provenance y semántica de límites
- ✅ Esquema de escenarios
- ✅ UI de calculadora (persistencia, borrado)

### Componentes sin cobertura directa

- ⚠ `fetcher.ts` — No hay tests del cliente HTTP (sin mocks de red)
- ⚠ `updater.ts` — No hay tests de integración del orquestador completo
- ⚠ `io.ts` — No hay tests de lectura/escritura de archivos
- ⚠ `useScenarioPersistence.ts` — No hay tests del hook específico
- ⚠ `ModelCatalog.tsx`, `ModelComparator.tsx`, `PlanSelector.tsx`, `ToolsPanel.tsx` — Sin tests UI dedicados
- ⚠ `parseModelsApi()` — Solo testeado indirectamente en `catalog-provenance.test.ts`

### Uso de mocks y fixtures

- **Fixture HTML**: `go-docs-fixture.html` — HTML simplificado con 9 tablas y 8 modelos.
- **Mock Source**: Objetos literales en los tests, no se conecta a red.
- **Sin mocks de fetch**: El fetcher no se prueba directamente.

---

## 11. Riesgos y limitaciones

### Riesgos técnicos

| Riesgo | Probabilidad | Impacto | Mitigación actual |
|--------|-------------|---------|-------------------|
| OpenCode cambia estructura HTML | Alta | Alta | Detección por cabeceras, integridad rechaza parciales |
| OpenCode bloquea scraping | Media | Alta | User-Agent identificable, sin eludir controles |
| CORS impide scraping desde browser | Alta | Media | Ya resuelto: scraping solo en Node.js/CI |
| GitHub Actions falla silenciosamente | Media | Media | Abre PR para revisión, no merge automático |
| Catálogo desactualizado | Media | Media | ToolsPanel muestra última actualización |
| Fixture no representa realidad | Media | Media | Tests pasan pero no garantizan funcionalidad real |

### Limitaciones conocidas

1. **No se ha verificado la página actual de OpenCode** — El estado del parser frente a la página real es desconocido.
2. **No hay API oficial documentada** — Solo scraping HTML.
3. **GitHub Actions no probado en remoto** — La automatización diaria no está activa.
4. **Verificación manual pendiente** — Los 74 registros no han sido revisados manualmente.
5. **Bundle ~265KB** — Aceptable para MVP pero incluye catálogo embebido.
6. **No hay historial de versiones del catálogo** — Solo el estado actual en models.json.

---

## 12. Estrategia de recuperación propuesta

### Fase 1: Verificación del estado actual

**Objetivo:** Determinar si el parser funciona con la página actual de OpenCode.

**Acciones:**
1. Acceder a `https://opencode.ai/v2/docs/console/go/` y capturar el HTML actual.
2. Ejecutar `npm run verify:catalog` para ver el diff contra el catálogo commitido.
3. Si falla, analizar el HTML para identificar los cambios estructurales.
4. Si la URL ya no existe, investigar la nueva URL.

**Criterio de finalización:** Se sabe con certeza si el parser funciona o no, y qué ha cambiado.

**Riesgos:** La página puede requerir JavaScript, estar detrás de paywall o bloquear scraping.

### Fase 2: Adaptación del parser

**Objetivo:** Hacer el parser funcional con la estructura actual de la página.

**Acciones:**
1. Actualizar `go-docs-fixture.html` con una captura real anonimizada.
2. Adaptar la detección de cabeceras si han cambiado.
3. Adaptar el parsing de celdas si la estructura ha cambiado.
4. Ajustar `MIN_GO_MODELS`/`MIN_GO_PLUS_MODELS` si es necesario.
5. Actualizar los tests con el nuevo fixture.

**Criterio de finalización:** Los tests pasan con el nuevo fixture y `verify:catalog` produce resultados válidos.

**Dependencias:** Fase 1 completada.

### Fase 3: Robustez del parser

**Objetivo:** Hacer el parser más resistente a cambios futuros.

**Acciones:**
1. Hacer la detección de columnas completamente dinámica por cabeceras (ya se hace parcialmente).
2. Añadir tolerancia a variaciones de nomenclatura (ej. "limit" vs "monthly limit").
3. Mejorar los mensajes de error para diagnosticar cambios estructurales.
4. Añadir tests con variantes de formato.

**Criterio de finalización:** El parser tolera variaciones razonables de estructura sin romper.

**Dependencias:** Fase 2 completada.

### Fase 4: Fuentes alternativas

**Objetivo:** Reducir la dependencia de scraping HTML único.

**Acciones:**
1. Investigar si OpenCode ofrece API REST, GraphQL o endpoint JSON.
2. Si existe, registrar la fuente en `source-registry.ts` y configurar `parseModelsApi`.
3. Si no existe, documentar la limitación explícitamente.
4. Considerar añadir fuentes secundarias (documentación de API, changelog).

**Criterio de finalización:** Se ha investigado y documentado el panorama de fuentes disponibles.

**Dependencias:** Independiente de fases 1-3.

### Fase 5: Activación de CI

**Objetivo:** Hacer funcional la actualización automática.

**Acciones:**
1. Configurar repositorio remoto si no existe.
2. Probar el workflow de GitHub Actions.
3. Verificar que los PR automáticos se generan correctamente.

**Criterio de finalización:** El workflow ejecuta exitosamente al menos una actualización.

**Dependencias:** Fase 2 o 3 completada (parser funcional).

---

## 13. Plan de trabajo por fases

| Fase | Prioridad | Estimación | Dependencias |
|------|-----------|------------|--------------|
| 1. Verificar estado actual de la página | Crítica | 1h | Ninguna |
| 2. Adaptar parser a estructura actual | Crítica | 2-4h | Fase 1 |
| 3. Mejorar robustez del parser | Alta | 2-3h | Fase 2 |
| 4. Investigar fuentes alternativas | Alta | 2-4h | Ninguna |
| 5. Activar CI | Media | 1-2h | Fase 2 |
| 6. Limpiar warnings de lint | Baja | 1h | Ninguna |
| 7. Añadir tests de fetcher con mocks | Baja | 2h | Ninguna |

---

## 14. Información pendiente de verificar

| Item | Por qué es importante | Cómo verificar |
|------|----------------------|----------------|
| Estado actual de `https://opencode.ai/v2/docs/console/go/` | Determina si el parser funciona | Acceder a la URL y comparar HTML |
| Existencia de API oficial de OpenCode | Alternativa al scraping HTML | Investigar documentación oficial |
| robots.txt de opencode.ai | Condiciones de scraping permitidas | Acceder a `https://opencode.ai/robots.txt` |
| Funcionamiento de GitHub Actions | Actualización automática | Probar en repositorio remoto |
| Estructura HTML real vs fixture | Calidad de los tests | Capturar HTML real y comparar |
| Cambios recientes en la interfaz de OpenCode | Contexto del problema | Revisar changelog o anuncios de OpenCode |
| Endpoint JSON utilizado por el frontend de OpenCode | Alternativa potencial | Inspeccionar tráfico de red del frontend |

---

## 15. Conclusiones técnicas

1. **El proyecto está bien construido.** La arquitectura, la separación de responsabilidades, la validación con Zod y el sistema de integridad son decisiones sólidas para un MVP.

2. **El sistema de extracción es funcional pero frágil.** Depende de una única fuente HTML con detección de cabeceras en inglés y requisito de 6 celdas. Es un diseño razonable para scraping, pero cualquier cambio en la página de OpenCode puede romperlo.

3. **Los tests son extensos pero no garantizan funcionalidad real.** 80 tests pasan, pero el fixture HTML es simplificado y no representa la página real. Se necesita un fixture basado en captura real.

4. **La infraestructura de CI existe pero no está activa.** El workflow de GitHub Actions está bien diseñado (abre PR, no merge automático), pero no se ha probado en remoto.

5. **No se ha podido verificar el estado actual de la fuente.** Esta es la limitación principal de la auditoría: sin acceso a la página de OpenCode, no se puede confirmar si el parser funciona o qué cambios ha sufrido la interfaz.

6. **La recuperación es factible.** El parser ya usa detección por contenido de cabeceras (no índices hardcoded), lo que es robusto frente a reordenación. La adaptación probable requiere: actualizar el fixture, ajustar patrones de cabecera si cambiaron y posiblemente adaptar el parsing de celdas.

7. **parseModelsApi es una puerta abierta.** El parser JSON existe pero no está configurado. Si OpenCode ofrece un endpoint JSON, la transición sería directa.

8. **No se han modificado archivos del proyecto.** Esta auditoría es puramente de lectura y análisis. El único archivo creado es este documento.

---

## Apéndice: Archivos consultados durante la auditoría

### Código fuente (src/)
- `src/catalog/source-registry.ts` (26 líneas)
- `src/catalog/fetcher.ts` (70 líneas)
- `src/catalog/parsers.ts` (235 líneas)
- `src/catalog/schema.ts` (54 líneas)
- `src/catalog/catalog.ts` (15 líneas)
- `src/catalog/io.ts` (24 líneas)
- `src/catalog/updater.ts` (110 líneas)
- `src/catalog/integrity.ts` (249 líneas)
- `src/catalog/audit.ts` (62 líneas)
- `src/domain/models.ts` (89 líneas)
- `src/domain/calculations.ts` (88 líneas)
- `src/domain/validation.ts` (63 líneas)
- `src/domain/parser.ts` (17 líneas)
- `src/domain/scenario.ts` (97 líneas)
- `src/context/CatalogContext.tsx` (59 líneas)
- `src/context/PlanContext.tsx` (72 líneas)
- `src/context/index.ts`
- `src/ui/App.tsx` (109 líneas)
- `src/ui/components/ToolsPanel.tsx` (93 líneas)
- `src/data/models.json` (1261 líneas, 74 modelos)

### Tests
- `src/__tests__/calculations.test.ts` (38 líneas)
- `src/__tests__/calculations-edge.test.ts` (68 líneas)
- `src/__tests__/calculator-ui.test.tsx` (101 líneas)
- `src/__tests__/catalog-audit.test.ts` (61 líneas)
- `src/__tests__/catalog-provenance.test.ts` (107 líneas)
- `src/__tests__/integrity-comprehensive.test.ts` (280 líneas)
- `src/__tests__/parser-integrity.test.ts` (189 líneas)
- `src/__tests__/scenario.test.ts` (73 líneas)
- `src/__tests__/fixtures/go-docs-fixture.html` (48 líneas)
- `src/__tests__/setup.ts` (2 líneas)

### Scripts
- `scripts/update-catalog.ts` (105 líneas)
- `scripts/verify-catalog.ts` (88 líneas)

### Configuración
- `package.json` (50 líneas)
- `vite.config.ts` (9 líneas)
- `vitest.config.ts` (12 líneas)
- `tsconfig.json` (23 líneas)
- `tsconfig.node.json`
- `eslint.config.js`
- `tailwind.config.js`
- `postcss.config.cjs`
- `.github/workflows/update-catalog.yml` (62 líneas)
- `.gitignore`
- `.eslintrc.cjs`

### Documentación
- `README.md` (96 líneas)
- `CHANGELOG.md` (58 líneas)
- `AGENTS.md` (76 líneas)
- `LICENSE`
- `docs/architecture.md` (85 líneas)
- `docs/project-state.md` (73 líneas)
- `docs/scrapling-analysis.md` (205 líneas)
- `docs/data-governance.md` (66 líneas)
- `docs/quota-model.md` (57 líneas)
- `docs/implementation-plan.md` (70 líneas)
- `docs/product-brief.md` (58 líneas)
- `docs/opencode-master-prompt.md` (77 líneas)
- `docs/support-feedback-draft.md` (20 líneas)

### Total: ~38 archivos consultados
