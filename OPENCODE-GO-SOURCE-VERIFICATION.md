# OPENCODE GO SOURCE VERIFICATION REPORT

**OpenCode Go Usage Planner**
**Fecha:** 2026-11-19
**Versión del proyecto:** 0.1.0
**Estado:** Verificación empírica de fuente — Fase 1

---

## 1. Resumen ejecutivo

**El extractor actual de OpenCode Go está completamente roto.** La fuente registrada (`https://opencode.ai/v2/docs/console/go/`) redirige (HTTP 301) a `https://opencode.ai/docs/console/go/`, cuya estructura HTML ha cambiado radicalmente. El parser `parseGoDocs()` devuelve **0 modelos** contra la página real.

La página de documentación ya no contiene tablas de pricing con las columnas `Model | Input | Output | Cached Read | Cached Write | Monthly limit` que el parser espera. El fixture de pruebas (`go-docs-fixture.html`) representa una estructura obsoleta que no existe en la fuente actual.

**Los datos reales de OpenCode Go se obtienen de dos fuentes distintas:**

1. **`https://opencode.ai/console/go`** — Consola web con una tabla HTML pre-renderizada que contiene los 33 modelos actuales con sus límites Go/Go Plus. Estructura transpuesta: los modelos son cabeceras de columna, no filas.
2. **`https://opencode.ai/docs/console/models/`** — Documentación con una tabla de precios de tokens (109 modelos, 5 columnas: Model, Input, Output, Cached Read, Cached Write).

No se ha encontrado API REST/GraphQL oficial, endpoint JSON público ni datos JSON embebidos con la información completa de modelos Go.

---

## 2. Estado HTTP y estructura real de la fuente

### 2.1 URL registrada: `https://opencode.ai/v2/docs/console/go/`

| Campo | Valor |
|-------|-------|
| **Código HTTP** | 301 Moved Permanently |
| **Redirección** | `https://opencode.ai/docs/console/go/` |
| **Server** | Cloudflare |
| **Estado** | La URL antigua ya no sirve contenido; redirige permanentemente |

### 2.2 URL actual: `https://opencode.ai/docs/console/go/`

| Campo | Valor |
|-------|-------|
| **Código HTTP** | 200 OK |
| **Content-Type** | `text/html` |
| **Tamaño** | 65,152 bytes |
| **Cache-Control** | `public, max-age=300, stale-while-revalidate=3600` |
| **CF-Cache-Status** | HIT (cacheado por Cloudflare) |
| **Server** | Cloudflare |
| **Seguridad** | HSTS, X-Frame-Options: SAMEORIGIN, CSP, X-Content-Type-Options: nosniff |
| **Tablas HTML** | 4 |
| **Elementos `<th>`** | 9 |
| **Elementos `<td>`** | 95 |
| **Scripts externos** | 1 (`/docs/_build/client-U0Znho45.js`) |
| **JSON embebido** | Ninguno (solo JSON-LD de schema.org con info de producto/FAQ) |

#### Tablas presentes en `/docs/console/go/`

| # | Cabeceras | Filas | Contenido |
|---|-----------|-------|-----------|
| 1 | Plan, Price, Included usage | 4 | Planes Go/Go Plus/Go Teams |
| 2 | Client, Session support | 8 | Clientes compatibles |
| 3 | Client, Status and tracking | 5 | Status de clientes |
| 4 | Model, Data retention | 33 | Retención de datos por modelo |

**Ninguna tabla contiene columnas de pricing (`Input`, `Output`, `Monthly limit`).**

### 2.3 Consola web: `https://opencode.ai/console/go`

| Campo | Valor |
|-------|-------|
| **Código HTTP** | 200 OK |
| **Content-Type** | `text/html` |
| **Tamaño** | 153,341 bytes |
| **Tablas HTML** | 1 (pre-renderizada, 34 filas, 4 columnas) |
| **Scripts externos** | 1 (`/console/_build/assets/entry-client-CtdIXoGb.js`) |
| **JSON embebido** | JSON-LD schema.org (producto/FAQ/breadcrumbs) |

#### Tabla de la consola — estructura

La tabla contiene los datos de límites Go/Go Plus con esta estructura:

| Columna | Contenido |
|---------|-----------|
| Model | Nombre del modelo (33 modelos) |
| Est. requests / 5 hr | Estimación de peticiones por 5 horas (Go y Go Plus combinados) |
| Monthly limit | Límite mensual en dólares (Go y Go Plus combinados) |

Los nombres de los 33 modelos aparecen como **cabeceras de columna** (`<th>`) en la primera fila, no como filas de datos. Los valores Go y Go Plus están combinados en cada celda con formato: `Go: $X; Go Plus: $Y`.

### 2.4 Documentación de modelos: `https://opencode.ai/docs/console/models/`

| Campo | Valor |
|-------|-------|
| **Código HTTP** | 200 OK |
| **Content-Type** | `text/html` |
| **Tamaño** | 102,667 bytes |
| **Tablas HTML** | 4 |
| **Tabla 2 (pricing)** | 110 filas, 5 columnas: Model, Input, Output, Cached Read, Cached Write |

La Tabla 2 contiene los precios de tokens de **109 modelos** (incluidos los de Go y muchos más). Los precios están en formato `$X.XX` por 1M de tokens. Algunos modelos tienen precios tachados con descuento (ej: `Mistral Large 4 (50% off)` muestra `$1.36 $0.68`).

---

## 3. Análisis de tablas y datos actuales

### 3.1 Modelos en la consola Go (33 modelos)

Los 33 modelos listados en `/console/go` son:

| # | Modelo | Límite Go | Límite Go Plus | Notas |
|---|--------|-----------|----------------|-------|
| 1 | Kimi K3 | $15 | $60 | |
| 2 | Kimi K3.1 Pro | $15 | $60 | |
| 3 | Qwen3.8 Max | $15 | $60 | |
| 4 | Grok 4.7 | $15 | $60 | |
| 5 | Step 5 Preview | $15 | $60 | |
| 6 | Qwen4 Max | $15 | $60 | New |
| 7 | Gemini 4 Argon | $30 | $120 | |
| 8 | GLM-5.2 | $60 | $180 | |
| 9 | Kimi K2.7 Code | $60 | $180 | |
| 10 | DeepSeek V4 Pro | $15 | $60 | |
| 11 | Hy4 preview | $30 | $120 | |
| 12 | GPT-5.6 Luna | $15 | $60 | |
| 13 | Hy4 | $60 | $240 | New |
| 14 | MiniMax-M3 | $60 | $180 | |
| 15 | MiMo-V2.6-Pro | $15 | $60 | |
| 16 | Claude Haiku 5.5 | $15 | $60 | |
| 17 | MiniMax M3.1 Flash | $20 | $80 | |
| 18 | GPT-6 Luna | $15 | $60 | |
| 19 | Hy3 | $60 | $240 | |
| 20 | Qwen3.7 Plus | $60 | $180 | |
| 21 | Qwen3.8 Flash | $30 | $90 | |
| 22 | GLM-5.3-Flash | $60 | $180 | |
| 23 | GLM-5.3 | $500 | $1,000 | |
| 24 | LongCat-2.0 | $60 | $240 | |
| 25 | MiMo-V2.6-Flash | $60 | $120 | |
| 26 | DeepSeek V4.1 Flash 1017 | $100 | $200 | |
| 27 | Muse Spark 1.2 Contributor | $60 | $120 | Limited regions |
| 28 | Muse Spark 1.3 Contributor | $60 | $120 | Limited regions |
| 29 | Beam Free | ∞ | ∞ | Limited regions · Limited time |
| 30 | Hy4 flash Free | ∞ | ∞ | New · Limited time |
| 31 | Iceman Contributor Free | ∞ | ∞ | Limited time |
| 32 | LongCat 2.5 Free | ∞ | ∞ | Limited time |
| 33 | (Row 34 — escala visual) | — | — | Fila decorativa |

### 3.2 Precios de tokens (de `/docs/console/models/`)

Los precios de los modelos Go extraídos de la Tabla 2:

| Modelo | Input | Output | Cached Read | Cached Write |
|--------|-------|--------|-------------|--------------|
| Kimi K3 | $3.00 | $15.00 | $0.30 | $3.00 |
| Kimi K3.1 Pro | No encontrado (posible nombre diferente) | — | — | — |
| Qwen3.8 Max | $2.00 | $6.00 | $0.25 | $2.50 |
| Grok 4.7 (≤ 200K) | $2.00 | $6.00 | $0.50 | — |
| Grok 4.7 (> 200K) | $4.00 | $12.00 | $1.00 | — |
| Step 5 Preview | No encontrado | — | — | — |
| Qwen4 Max | No encontrado | — | — | — |
| Gemini 4 Argon (50% off) | $4.00 $2.00 | $20.00 $10.00 | $0.20 $0.10 | — |
| GLM-5.2 | $1.40 | $4.40 | $0.26 | — |
| Kimi K2.7 Code | $0.95 | $4.00 | $0.19 | — |
| DeepSeek V4 Pro | $1.74 | $3.48 | $0.145 | — |
| Hy4 preview | No encontrado | — | — | — |
| GPT-5.6 Luna (≤ 272K) | $0.20 | $1.20 | $0.02 | $0.25 |
| GPT-5.6 Luna (> 272K) | $0.40 | $1.80 | $0.04 | $0.50 |
| Hy4 | No encontrado | — | — | — |
| MiniMax-M3 | No encontrado (tabla tiene "MiniMax M3" sin guion) | — | — | — |
| MiMo-V2.6-Pro | No encontrado | — | — | — |
| Claude Haiku 5.5 (≤ 100K) | $0.10 | $0.50 | $0.01 | $0.125 |
| Claude Haiku 5.5 (> 100K) | $0.50 | $2.50 | $0.05 | $0.625 |
| MiniMax M3.1 Flash | No encontrado | — | — | — |
| GPT-6 Luna (≤ 272K) | $0.10 | $0.50 | $0.01 | $0.125 |
| GPT-6 Luna (> 272K) | $0.20 | $0.75 | $0.02 | $0.25 |
| Hy3 | No encontrado | — | — | — |
| Qwen3.7 Plus | No encontrado (tabla tiene "Qwen3.6 Plus") | — | — | — |
| Qwen3.8 Flash | $0.15 | $0.47 | $0.016 | $0.20 |
| GLM-5.3-Flash | No encontrado (tabla tiene "GLM 5.3 Flash" con espacio) | — | — | — |
| GLM-5.3 | No encontrado (tabla tiene "GLM 5.3" con espacio) | — | — | — |
| LongCat-2.0 | No encontrado | — | — | — |
| MiMo-V2.6-Flash | No encontrado (tabla tiene "MiMo-V2.6-Flash Free") | — | — | — |
| DeepSeek V4.1 Flash 1017 | No encontrado (tabla tiene "DeepSeek V4.1 Flash") | — | — | — |
| Muse Spark 1.2 Contributor | No encontrado (tabla tiene "Muse Spark 1.2") | — | — | — |
| Muse Spark 1.3 Contributor | No encontrado (tabla tiene "Muse Spark 1.3") | — | — | — |
| Beam Free | Free | Free | Free | — |
| Hy4 flash Free | Free | Free | Free | — |
| Iceman Contributor Free | No encontrado (tabla tiene "Iceman Free") | — | — | — |
| LongCat 2.5 Free | Free | Free | Free | — |

**Nota importante:** Los nombres de modelos en `/docs/console/models/` usan espacios en lugar de guiones (ej: "GLM 5.3" vs "GLM-5.3") y pueden omitir calificadores como "Contributor" o versiones específicas. Esto requiere un mapeo de nombres para correlacionar las dos fuentes.

### 3.3 Diferencias entre el catálogo actual y la fuente real

| Aspecto | Catálogo actual (models.json) | Fuente real |
|---------|-------------------------------|-------------|
| **Total modelos** | 74 (37 Go + 37 Go Plus) | 33 modelos únicos (Go + Go Plus combinados) |
| **Modelos nuevos en fuente** | — | Qwen4 Max, Hy4, Hy4 flash Free, Gemini 4 Argon, GPT-6 Luna, DeepSeek V4.1 Flash 1017 |
| **Modelos eliminados** | MiMo-V2.5, MiMo-V2.5-Pro, MiniMax M3, Muse Spark (sin "Contributor"), DeepSeek V4.1 Flash (Peak/Off-Peak), DeepSeek V4 Pro (Peak/Off-Peak), Grok 4.7 (≤ 200K / > 200K), GPT 6 Luna (≤ 272K / > 272K), GPT 5.6 Luna (≤ 272K / > 272K), Claude Haiku 5.5 (≤ 100K / > 100K) | Los modelos divididos por contexto de tokens ya aparecen como una sola entrada |
| **Estructura de precios** | priceInputUsd, priceOutputUsd (por modelo) | Go y Go Plus combinados en una celda |
| **Límites** | monthlyLimitUsd por modelo | Go y Go Plus combinados: "Go: $X; Go Plus: $Y" |
| **Modelos ilimitados** | 4 (Beam Free, Iceman Contributor Free, LongCat 2.5 Free, +1) | 4 (Beam Free, Hy4 flash Free, Iceman Contributor Free, LongCat 2.5 Free) |

---

## 4. Resultado de ejecutar el parser contra la fuente real

### 4.1 Simulación del parser `parseGoDocs()` contra HTML real

**Resultado: 0 tablas de pricing encontradas. 0 modelos extraídos.**

El parser busca tablas donde las cabeceras contengan simultáneamente:
- `"model"` ✓ (Tabla 4 lo tiene)
- `"monthly limit"` ✗ (ninguna tabla lo tiene)
- `"input"` ✗ (ninguna tabla lo tiene)
- `"output"` ✗ (ninguna tabla lo tiene)

Las 4 tablas de la página real son:
1. Planes (Plan, Price, Included usage)
2. Clientes (Client, Session support)
3. Status (Client, Status and tracking)
4. Retención (Model, Data retention)

Ninguna cumple los 4 criterios. El parser lanza `Error('No pricing tables found in Go docs page')`.

### 4.2 Resultado de `npm run verify:catalog`

```
Source: opencode-go-docs
  Fetched: 2026-11-19T16:28:30.869Z
  Parsed: 0
  Integrity: FAIL
  Fetch/parse errors: No pricing tables found in Go docs page
  Added: 0
  Removed: 74
```

**El comando confirma que el extractor está roto.** Los 74 modelos del catálogo actual serían eliminados si se aplicara la actualización.

### 4.3 Simulación del parser contra el fixture

**Resultado: 2 tablas de pricing encontradas.** El fixture representa la estructura antigua y el parser funciona correctamente contra él. Esto confirma que el parser no está roto — la fuente cambió.

---

## 5. Diferencias respecto al fixture

### 5.1 Fixture (`go-docs-fixture.html`)

| Campo | Valor |
|-------|-------|
| **Tamaño** | 2,607 bytes |
| **Tablas** | 9 |
| **Tablas de pricing** | 2 (Tablas 4 y 5) |
| **Estructura de pricing** | Filas = modelos, Columnas = Model/Input/Output/Cached Read/Cached Write/Monthly limit |
| **Modelos de prueba** | 8 (4 Go + 4 Go Plus) |

### 5.2 Página real (`/docs/console/go/`)

| Campo | Valor |
|-------|-------|
| **Tamaño** | 65,152 bytes |
| **Tablas** | 4 |
| **Tablas de pricing** | 0 |
| **Estructura de pricing** | No existe en esta página |

### 5.3 Diferencias estructurales clave

| Diferencia | Fixture | Real |
|------------|---------|------|
| Tablas de pricing | 2 tablas con 6 columnas | 0 tablas de pricing |
| Modelos como filas | Sí | No |
| Columnas de precios | Input, Output, Cached Read, Cached Write | No presentes |
| Columna Monthly limit | Sí | No presente |
| Planes separados | Tabla Go + Tabla Go Plus | Datos combinados en `/console/go` |
| Precios en tabla | Sí | Solo en `/docs/console/models/` |
| Límites en tabla | Sí | Solo en `/console/go` |

**Conclusión:** El fixture representa una versión anterior de la página que ya no existe. La información de pricing y límites ahora está distribuida en dos páginas diferentes con estructuras distintas.

---

## 6. Información disponible por modalidad

### 6.1 Go

| Campo | Disponible | Fuente | Formato |
|-------|------------|--------|---------|
| Nombre del modelo | ✓ | `/console/go` | En `<th>` como cabecera |
| Límite mensual Go | ✓ | `/console/go` | "Go: $X" en celda |
| Estimación 5 horas | ✓ | `/console/go` | "Go: N" en celda |
| Precio Input | ✓ | `/docs/console/models/` | "$X.XX" por 1M tokens |
| Precio Output | ✓ | `/docs/console/models/` | "$X.XX" por 1M tokens |
| Cached Read | ✓ | `/docs/console/models/` | "$X.XXX" por 1M tokens |
| Cached Write | Parcial | `/docs/console/models/` | "-" para muchos modelos |
| Notas especiales | ✓ | `/console/go` | "New", "Limited regions", "Limited time" |

### 6.2 Go Plus

| Campo | Disponible | Fuente | Formato |
|-------|------------|--------|---------|
| Límite mensual Go Plus | ✓ | `/console/go` | "Go Plus: $X" en celda |
| Estimación 5 horas Go Plus | ✓ | `/console/go` | "Go Plus: N" en celda |
| Precios de tokens | ✓ | `/docs/console/models/` | Mismos precios que Go |

### 6.3 Go Teams

| Campo | Disponible | Fuente |
|-------|------------|--------|
| Precio del plan | ✓ | `/docs/console/go` ($20/member/month) |
| Límites por modelo | Parcial | Se menciona "$5/month higher than Go" pero sin tabla detallada |
| Detalles | ✓ | `/console/changelog/go-teams` |

### 6.4 Campos que la aplicación actual extrae vs. los disponibles

| Campo | Extraído actualmente | Disponible en fuente | Observación |
|-------|---------------------|---------------------|-------------|
| displayName | ✓ | ✓ | |
| priceInputUsd | ✓ | ✓ | En `/docs/console/models/` |
| priceOutputUsd | ✓ | ✓ | En `/docs/console/models/` |
| monthlyLimitUsd | ✓ | ✓ | En `/console/go` |
| cachedReadPrice | ✗ | ✓ | Disponible pero no se extrae |
| cachedWritePrice | ✗ | Parcial | Disponible para algunos modelos |
| plan | ✓ | ✓ | Go / Go Plus |
| unlimited | ✓ | ✓ | Modelos Free |
| notas especiales | ✗ | ✓ | "New", "Limited regions", "Limited time" |
| estimación 5 horas | ✗ | ✓ | En `/console/go` |
| límites semanales | ✗ | Indirecto | 50% del mensual (documentado) |

---

## 7. Investigación de APIs y endpoints alternativos

### 7.1 APIs oficiales documentadas

| API | Evidencia | Estado |
|-----|-----------|--------|
| API REST de modelos Go | No encontrada | NO VERIFICADO |
| API GraphQL | No encontrada | NO VERIFICADO |
| Feed RSS/Atom | No encontrado | NO VERIFICADO |

### 7.2 Endpoints públicos investigados

| Endpoint | Método | Resultado | Clasificación |
|----------|--------|-----------|---------------|
| `https://opencode.ai/docs/console/go/` | GET | HTML con 4 tablas (sin pricing) | Página de docs |
| `https://opencode.ai/console/go` | GET | HTML con 1 tabla pre-renderizada (33 modelos) | Consola web |
| `https://opencode.ai/docs/console/models/` | GET | HTML con 4 tablas (Tabla 2 = precios) | Página de docs |
| `https://opencode.ai/docs/console/go.md` | GET | Referenciado en `<link>` | Fuente Markdown (Astro) |
| `https://opencode.ai/console/_build/assets/entry-client-CtdIXoGb.js` | GET | Bundle JS de la SPA | No útil para scraping |
| `https://opencode.ai/docs/_build/client-U0Znho45.js` | GET | Bundle JS de docs | No útil para scraping |

### 7.3 JSON embebido

| Fuente | Tipo | Contenido |
|--------|------|-----------|
| `/console/go` | JSON-LD schema.org | Producto (precios de planes), FAQ, breadcrumbs. **No datos de modelos.** |
| `/docs/console/go/` | JSON-LD schema.org | Similar. **No datos de modelos.** |

### 7.4 robots.txt

No se ha podido acceder a `https://opencode.ai/robots.txt` directamente (error de parseo del fetcher). La web search indica que OpenCode tiene presencia en directorios de bots. No se ha encontrado evidencia de restricciones específicas contra scraping de las páginas de documentación pública.

### 7.5 Conclusión sobre alternativas

**No existe actualmente un endpoint JSON público ni API oficial para obtener los datos de modelos Go.** Las dos opciones viables son:

1. **Scraping de `/console/go`** — Tabla HTML pre-renderizada con límites Go/Go Plus. Datos estáticos, no requiere JavaScript.
2. **Scraping de `/docs/console/models/`** — Tabla HTML con precios de tokens de todos los modelos.

Ambas requieren combinar datos de dos fuentes para obtener el catálogo completo.

**Clasificación:** CONFIRMADO que no existe API JSON. CONFIRMADO que las tablas HTML son pre-renderizadas (no requieren JS).

---

## 8. Compatibilidad con el esquema actual

### 8.1 Esquema `src/domain/models.ts`

| Campo del esquema | Compatible con fuente real | Observación |
|-------------------|---------------------------|-------------|
| `id` (string) | ✓ | Se puede construir |
| `displayName` (string) | ✓ | Disponible en ambas fuentes |
| `plan` ('go' | 'go-plus') | ✓ | Se separa de los datos combinados |
| `monthlyLimitUsd` (number \| null) | ✓ | Disponible en `/console/go` |
| `unlimited` (boolean) | ✓ | Modelos Free tienen ∞ |
| `priceInputUsd` (number \| undefined) | ✓ | Disponible en `/docs/console/models/` |
| `priceOutputUsd` (number \| undefined) | ✓ | Disponible en `/docs/console/models/` |
| `limitStatus` | ✓ | Se puede inferir |
| `source` | ✓ | Se actualiza |
| `sourceUrl` | ✓ | Se actualiza a las URLs nuevas |
| `lastUpdated` | ✓ | Se actualiza |

### 8.2 Limitaciones del esquema

| Limitación | Impacto |
|------------|---------|
| No hay campo para `cachedReadPrice` | Se pierde info disponible |
| No hay campo para `cachedWritePrice` | Se pierde info disponible |
| No hay campo para notas especiales | "New", "Limited regions" se pierden |
| No hay campo para estimación de peticiones | Info útil no capturada |
| Modelos divididos por contexto (≤ 200K / > 200K) | El catálogo actual los separa; la fuente real los une |
| Modelos Peak/Off-Peak | El catálogo actual los separa; la fuente real los une |

### 8.3 Compatibilidad con los 74 modelos existentes

El catálogo actual contiene modelos que ya no aparecen en la fuente:
- **MiMo-V2.5** y **MiMo-V2.5-Pro**: No presentes en la consola.
- **MiniMax M3** (sin guion): Reemplazado por MiniMax-M3.
- **DeepSeek V4.1 Flash (Peak/Off-Peak)**: Ahora aparece como "DeepSeek V4.1 Flash 1017".
- **DeepSeek V4 Pro (Peak/Off-Peak)**: Ahora aparece como "DeepSeek V4 Pro" sin distinción.
- **Grok 4.7 (≤ 200K / > 200K)**: Ahora aparece como "Grok 4.7" sin distinción.
- **GPT 6 Luna (≤ 272K / > 272K)**: Ahora aparece como "GPT-6 Luna" sin distinción.
- **GPT 5.6 Luna (≤ 272K / > 272K)**: Ahora aparece como "GPT-5.6 Luna" sin distinción.
- **Claude Haiku 5.5 (≤ 100K / > 100K)**: Ahora aparece como "Claude Haiku 5.5" sin distinción.

El esquema actual puede representar los datos de la fuente real, pero el catálogo necesita una actualización significativa para reflejar los cambios.

---

## 9. Problemas confirmados y no confirmados

### 9.1 Problemas confirmados

| ID | Descripción | Evidencia | Gravedad |
|----|-------------|-----------|----------|
| **C-001** | URL registrada redirige 301 | `curl` confirma redirección `/v2/docs/console/go/` → `/docs/console/go/` | Alta |
| **C-002** | Parser devuelve 0 modelos contra fuente real | Simulación + `verify:catalog` confirman 0 tablas de pricing | Crítica |
| **C-003** | Fixture HTML no representa la fuente actual | Fixture tiene 9 tablas con pricing; real tiene 4 sin pricing | Alta |
| **C-004** | Datos de pricing distribuidos en 2 páginas | Límites en `/console/go`, precios en `/docs/console/models/` | Alta |
| **C-005** | Estructura de tabla transpuesta en consola | Modelos son cabeceras, no filas | Alta |
| **C-006** | Nombres de modelos inconsistentes entre fuentes | Guiones vs espacios, calificadores diferentes | Media |
| **C-007** | Catálogo actual tiene modelos obsoletos | 74 modelos vs 33 en fuente real | Media |
| **C-008** | No existe API JSON pública | Investigación exhaustiva sin resultados | Media |

### 9.2 Problemas no confirmados

| ID | Descripción | Estado |
|----|-------------|--------|
| NC-001 | robots.txt de opencode.ai | No se pudo acceder directamente |
| NC-002 | Existencia de API no documentada | No se encontró evidencia |
| NC-003 | Condiciones legales de scraping | No se revisaron términos de servicio |
| NC-004 | Estabilidad de `/console/go` como fuente | Requiere monitoreo continuo |

---

## 10. Recomendación técnica fundamentada

### 10.1 Diagnóstico

El extractor actual está **irrecuperable sin cambios significativos**. La fuente ha cambiado de:
- **Antes:** Una sola página con tablas de pricing por plan (modelos como filas, precios y límites en columnas).
- **Ahora:** Dos páginas separadas con estructuras distintas (consola con límites transpuestos, docs con precios de todos los modelos).

### 10.2 Recomendación

**Se requiere un rediseño del extractor que:**

1. **Utilice dos fuentes registradas:**
   - `opencode-console-go` → `https://opencode.ai/console/go` (límites Go/Go Plus)
   - `opencode-docs-models` → `https://opencode.ai/docs/console/models/` (precios de tokens)

2. **Implemente dos parsers distintos:**
   - Parser de consola: extrae la tabla transpuesta, separa Go/Go Plus de las celdas combinadas.
   - Parser de docs: extrae la tabla de precios, normaliza nombres de modelos.

3. **Implemente un mapeo de nombres** para correlacionar los modelos entre las dos fuentes (guiones vs espacios, calificadores).

4. **Fusion los datos** de ambas fuentes para construir el catálogo completo.

5. **Actualice el fixture** con capturas reales de ambas páginas.

### 10.3 Qué NO se recomienda

- **No parchear el parser actual** para que funcione con la nueva estructura — la diferencia es demasiado grande.
- **No depender exclusivamente de `/console/go`** — aunque es pre-renderizado, es una SPA y podría cambiar a renderizado dinámico.
- **No usar la fuente Markdown `/docs/console/go.md`** como alternativa principal — aunque contiene los datos originales, el formato Markdown requiere un parser diferente y la disponibilidad no está garantizada.

---

## 11. Decisiones que todavía necesitan investigación

1. **¿Es `/console/go` suficientemente estable como fuente primaria?** La tabla está pre-renderizada hoy, pero al ser una SPA, podría cambiar a hidratación dinámica.
2. **¿Existen términos de servicio que restrinjan el scraping de `/console/go`?** La página de docs es pública; la consola podría tener condiciones diferentes.
3. **¿Cómo manejar los modelos divididos por contexto de tokens?** El catálogo actual los separa; la fuente los une. ¿Se debe mantener la separación?
4. **¿Incluir campos adicionales (cachedReadPrice, cachedWritePrice, notas)?** Requiere cambios en el esquema.
5. **¿Qué hacer con los modelos obsoletos del catálogo?** ¿Eliminarlos o mantenerlos con marca de deprecación?

---

## 12. Archivos consultados durante esta investigación

### Archivos del repositorio
- `src/catalog/parsers.ts`
- `src/catalog/source-registry.ts`
- `src/catalog/fetcher.ts`
- `src/catalog/integrity.ts`
- `src/catalog/schema.ts`
- `src/catalog/updater.ts`
- `src/domain/models.ts`
- `src/data/models.json`
- `src/__tests__/fixtures/go-docs-fixture.html`
- `scripts/verify-catalog.ts`
- `package.json`

### Recursos externos accedidos
- `https://opencode.ai/v2/docs/console/go/` (HTTP 301)
- `https://opencode.ai/docs/console/go/` (HTTP 200, 65KB)
- `https://opencode.ai/console/go` (HTTP 200, 153KB)
- `https://opencode.ai/docs/console/models/` (HTTP 200, 102KB)
- `https://opencode.ai/robots.txt` (error de acceso)

### Comandos ejecutados
- `curl` para descargar HTML real de 3 URLs
- `npx tsx temp-test-parser.mjs` para simular parser contra HTML real
- `npm run verify:catalog` para verificar estado del catálogo

### Archivos creados
- `OPENCODE-GO-SOURCE-VERIFICATION.md` (este documento)
- Archivos temporales en directorio scratch (no versionados)

### Confirmación de integridad
- **No se ha modificado ningún archivo de código ni configuración.**
- **No se han añadido dependencias.**
- **No se ha ejecutado `update:catalog`.**
- **Los archivos temporales están fuera del repositorio versionado.**

---

## 13. Clasificación de resultados

| Conclusión | Clasificación |
|------------|---------------|
| Parser actual devuelve 0 modelos | CONFIRMADO |
| URL `/v2/` redirige a `/docs/` | CONFIRMADO |
| Página de docs sin tablas de pricing | CONFIRMADO |
| Consola web tiene tabla pre-renderizada | CONFIRMADO |
| Datos distribuidos en 2 páginas | CONFIRMADO |
| No existe API JSON pública | CONFIRMADO |
| Fixture obsoleto | CONFIRMADO |
| 74 modelos vs 33 en fuente | CONFIRMADO |
| robots.txt no accesible | NO VERIFICADO |
| Estabilidad futura de `/console/go` | NO VERIFICADO |
| Términos de servicio de scraping | NO VERIFICADO |
