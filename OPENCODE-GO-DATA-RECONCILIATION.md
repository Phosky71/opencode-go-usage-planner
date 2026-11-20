# OPENCODE GO DATA RECONCILIATION REPORT

**OpenCode Go Usage Planner**
**Fecha:** 2026-11-19
**Versión del proyecto:** 0.1.0
**Estado:** Auditoría de datos y correspondencia de modelos — Fase 2

---

## 1. Resumen ejecutivo

Se ha completado una auditoría exhaustiva de los datos de OpenCode Go contrastando tres fuentes:

1. **Fuente de límites:** `https://opencode.ai/console/go` — 32 modelos reales + 1 fila decorativa, 4 columnas.
2. **Fuente de precios:** `https://opencode.ai/docs/console/models/` — 109 modelos, 5 columnas de precios.
3. **Catálogo actual:** `src/data/models.json` — 74 registros (37 Go + 37 Go Plus).

**Hallazgos críticos:**

- La tabla de límites tiene **32 modelos reales**, no 33 como se reportó inicialmente. La "fila 33" es una fila decorativa con texto "1001K10K100K" que sirve como escala visual.
- La tabla de límites tiene **4 columnas reales**, no 3: Model, Relative request allowances, Est. requests / 5 hr, Monthly limit.
- Los datos Go y Go Plus están **combinados en cada celda** con estructura HTML semántica (`data-plan="go"` / `data-plan="go-plus"`).
- **10 de los 32 modelos** de la fuente de límites no tienen correspondencia exacta en la fuente de precios. Requieren normalización de nombres.
- **14 de los 37 modelos Go** del catálogo actual ya no existen en la fuente real (modelos obsoletos MiMo-V2.5, variantes Peak/Off-Peak, modelos divididos por contexto de tokens).
- Go Teams **no tiene tabla propia** de límites ni precios. Comparte los mismos límites que Go ($5/mes más alto según documentación).
- Los precios tachados usan `<del>` HTML: 6 modelos con descuento del 50% (Gemini y Mistral).

---

## 2. Verificación de discrepancias

### 2.1 Tabla de límites (`/console/go`)

| Campo | Valor confirmado |
|-------|-----------------|
| **Tablas HTML** | 1 |
| **Filas totales** | 34 (1 cabecera + 32 datos + 1 decorativa) |
| **Modelos reales** | 32 |
| **Columnas** | 4: Model, Relative request allowances, Est. requests / 5 hr, Monthly limit |
| **Fila decorativa** | Row 34: "1001K 10K 100K" (escala visual de barras, sin data-model) |
| **Estructura de celdas** | Cada celda de datos contiene valores Go y Go Plus separados por `data-plan` |
| **Identificador único** | Cada fila tiene `data-model="slug-unico"` |
| **Valores ilimitados** | Símbolo ∞ (infinito) en modelos Free |

### 2.2 Estructura HTML detallada de una fila típica

```html
<tr data-model="kimi-k3" data-layer="model-row">
  <th scope="row">
    <span class="console-go-models-model-name" data-layer="model-name">Kimi K3</span>
  </th>
  <td aria-hidden="true">
    <!-- Barras visuales (columna 2 - Relative request allowances) -->
    <div data-plan="go" data-layer="bar-track">...</div>
    <div data-plan="go-plus" data-layer="bar-track">...</div>
  </td>
  <td data-allowance-type="requests">
    <div data-layer="requests" aria-hidden="true">
      <span data-plan="go" data-layer="allowance">
        <span data-layer="current-value">98</span>
      </span>
      <span data-plan="go-plus" data-layer="allowance">
        <span data-layer="current-value">392</span>
      </span>
    </div>
    <span class="sr-only">Go: 98; Go Plus: 392</span>
  </td>
  <td data-allowance-type="usage">
    <div data-layer="usage" aria-hidden="true">
      <span data-plan="go" data-layer="allowance">
        <span data-layer="current-value">$15</span>
      </span>
      <span data-plan="go-plus" data-layer="allowance">
        <span data-layer="current-value">$60</span>
      </span>
    </div>
    <span class="sr-only">Go: $15; Go Plus: $60</span>
  </td>
</tr>
```

**Importante:** Los atributos `data-*` proporcionan una estructura semántica robusta que no depende del texto visible ni del orden de columnas.

### 2.3 Tabla de precios (`/docs/console/models/`, Tabla 2)

| Campo | Valor confirmado |
|-------|-----------------|
| **Filas totales** | 110 (1 cabecera + 109 datos) |
| **Modelos** | 109 |
| **Columnas** | 5: Model, Input, Output, Cached Read, Cached Write |
| **Precios tachados** | 6 modelos con `<del>` (50% off) |
| **Modelos Free** | 11 modelos con "Free" en todas las columnas |
| **Cached Write** | "-" para la mayoría de modelos; solo algunos lo tienen |
| **Unidades** | $ por 1M de tokens (implícito, no explícito en la tabla) |

---

## 3. Inventario exacto de modelos actuales (fuente de límites)

| # | data-model | displayName | Est. req Go | Est. req Go Plus | Límite Go | Límite Go Plus | Notas |
|---|-----------|-------------|-------------|-----------------|-----------|----------------|-------|
| 1 | kimi-k3 | Kimi K3 | 98 | 392 | $15 | $60 | |
| 2 | kimi-k3.1-pro | Kimi K3.1 Pro | 147 | 588 | $15 | $60 | |
| 3 | qwen3.8-max | Qwen3.8 Max | 162 | 647 | $15 | $60 | |
| 4 | grok-4.7 | Grok 4.7 | 169 | 676 | $15 | $60 | |
| 5 | step-5-preview | Step 5 Preview | 426 | 1,700 | $15 | $60 | |
| 6 | qwen4-max | Qwen4 Max | 463 | 1,850 | $15 | $60 | New |
| 7 | gemini-4-argon | Gemini 4 Argon | 566 | 2,260 | $30 | $120 | |
| 8 | glm-5.2 | GLM-5.2 | 792 | 2,370 | $60 | $180 | |
| 9 | kimi-k2.7-code | Kimi K2.7 Code | 994 | 2,980 | $60 | $180 | |
| 10 | deepseek-v4-pro | DeepSeek V4 Pro | 1,040 | 4,180 | $15 | $60 | |
| 11 | hy4-preview | Hy4 preview | 1,350 | 5,410 | $30 | $120 | |
| 12 | gpt-5.6-luna | GPT-5.6 Luna | 2,050 | 8,200 | $15 | $60 | |
| 13 | hy4 | Hy4 | 2,710 | 10,800 | $60 | $240 | New |
| 14 | minimax-m3 | MiniMax-M3 | 3,210 | 9,620 | $60 | $180 | |
| 15 | mimo-v2.6-pro | MiMo-V2.6-Pro | 3,260 | 13,000 | $15 | $60 | |
| 16 | claude-haiku-5-5 | Claude Haiku 5.5 | 3,850 | 15,400 | $15 | $60 | |
| 17 | minimax-m3.1-flash | MiniMax M3.1 Flash | 3,880 | 15,500 | $20 | $80 | |
| 18 | gpt-6-luna | GPT-6 Luna | 4,230 | 16,900 | $15 | $60 | |
| 19 | hy3 | Hy3 | 4,300 | 17,200 | $60 | $240 | |
| 20 | qwen3.7-plus | Qwen3.7 Plus | 4,310 | 12,900 | $60 | $180 | |
| 21 | qwen3.8-flash | Qwen3.8 Flash | 5,400 | 16,200 | $30 | $90 | |
| 22 | glm-5.3-flash | GLM-5.3-Flash | 6,320 | 18,900 | $60 | $180 | |
| 23 | glm-5.3 | GLM-5.3 | 6,600 | 13,200 | $500 | $1,000 | |
| 24 | longcat-2.0 | LongCat-2.0 | 11,400 | 45,700 | $60 | $240 | |
| 25 | mimo-v2.6-flash | MiMo-V2.6-Flash | 30,100 | 60,200 | $60 | $120 | |
| 26 | deepseek-v4.1-flash | DeepSeek V4.1 Flash 1017 | 43,300 | 86,700 | $100 | $200 | |
| 27 | muse-spark-1.2-contributor | Muse Spark 1.2 Contributor | 45,300 | 90,600 | $60 | $120 | Limited regions |
| 28 | muse-spark-1.3-contributor | Muse Spark 1.3 Contributor | 45,300 | 90,600 | $60 | $120 | Limited regions |
| 29 | beam-free | Beam Free | ∞ | ∞ | ∞ | ∞ | Limited regions · Limited time |
| 30 | hy4-flash-free | Hy4 flash Free | ∞ | ∞ | ∞ | ∞ | New · Limited time |
| 31 | iceman-contributor-free | Iceman Contributor Free | ∞ | ∞ | ∞ | ∞ | Limited time |
| 32 | longcat-2.5-free | LongCat 2.5 Free | ∞ | ∞ | ∞ | ∞ | Limited time |

---

## 4. Matriz de correspondencia entre fuentes

### 4.1 Modelos de límites → Modelos de precios

| # | data-model (límites) | displayName (límites) | Nombre en tabla de precios | Coincidencia | Evidencia |
|---|---------------------|----------------------|---------------------------|--------------|-----------|
| 1 | kimi-k3 | Kimi K3 | Kimi K3 | ✓ Exacta | Nombre idéntico |
| 2 | kimi-k3.1-pro | Kimi K3.1 Pro | — | ✗ No encontrado | No existe en tabla de precios |
| 3 | qwen3.8-max | Qwen3.8 Max | Qwen3.8 Max | ✓ Exacta | Nombre idéntico |
| 4 | grok-4.7 | Grok 4.7 | Grok 4.7 (≤ 200K tokens) / Grok 4.7 (> 200K tokens) | ⚠ Dividido | Dos entradas por contexto de tokens |
| 5 | step-5-preview | Step 5 Preview | — | ✗ No encontrado | No existe en tabla de precios |
| 6 | qwen4-max | Qwen4 Max | — | ✗ No encontrado | Modelo nuevo, aún sin precio publicado |
| 7 | gemini-4-argon | Gemini 4 Argon | Gemini 4 Argon (50% off) | ⚠ Con sufijo | Mismo modelo, con nota de descuento |
| 8 | glm-5.2 | GLM-5.2 | GLM 5.2 | ⚠ Guiones vs espacios | "GLM-5.2" → "GLM 5.2" |
| 9 | kimi-k2.7-code | Kimi K2.7 Code | Kimi K2.7 Code | ✓ Exacta | Nombre idéntico |
| 10 | deepseek-v4-pro | DeepSeek V4 Pro | DeepSeek V4 Pro | ✓ Exacta | Nombre idéntico |
| 11 | hy4-preview | Hy4 preview | — | ✗ No encontrado | No existe en tabla de precios |
| 12 | gpt-5.6-luna | GPT-5.6 Luna | GPT 5.6 Luna (≤ 272K tokens) / GPT 5.6 Luna (> 272K tokens) | ⚠ Dividido + guiones | "GPT-5.6 Luna" → "GPT 5.6 Luna", dos entradas |
| 13 | hy4 | Hy4 | — | ✗ No encontrado | Modelo nuevo, aún sin precio publicado |
| 14 | minimax-m3 | MiniMax-M3 | MiniMax M3 | ⚠ Guiones | "MiniMax-M3" → "MiniMax M3" |
| 15 | mimo-v2.6-pro | MiMo-V2.6-Pro | — | ✗ No encontrado | No existe en tabla de precios |
| 16 | claude-haiku-5-5 | Claude Haiku 5.5 | Claude Haiku 5.5 (≤ 100K tokens) / Claude Haiku 5.5 (> 100K tokens) | ⚠ Dividido | Dos entradas por contexto de tokens |
| 17 | minimax-m3.1-flash | MiniMax M3.1 Flash | — | ✗ No encontrado | No existe en tabla de precios |
| 18 | gpt-6-luna | GPT-6 Luna | GPT 6 Luna (≤ 272K tokens) / GPT 6 Luna (> 272K tokens) | ⚠ Dividido + guiones | "GPT-6 Luna" → "GPT 6 Luna", dos entradas |
| 19 | hy3 | Hy3 | — | ✗ No encontrado | No existe en tabla de precios |
| 20 | qwen3.7-plus | Qwen3.7 Plus | Qwen3.6 Plus | ⚠ Versión diferente | "Qwen3.7 Plus" vs "Qwen3.6 Plus" — posible error en fuente o versión |
| 21 | qwen3.8-flash | Qwen3.8 Flash | Qwen3.8 Flash | ✓ Exacta | Nombre idéntico |
| 22 | glm-5.3-flash | GLM-5.3-Flash | GLM 5.3 Flash | ⚠ Guiones vs espacios | "GLM-5.3-Flash" → "GLM 5.3 Flash" |
| 23 | glm-5.3 | GLM-5.3 | GLM 5.3 | ⚠ Guiones vs espacios | "GLM-5.3" → "GLM 5.3" |
| 24 | longcat-2.0 | LongCat-2.0 | — | ✗ No encontrado | No existe en tabla de precios |
| 25 | mimo-v2.6-flash | MiMo-V2.6-Flash | MiMo-V2.6-Flash Free | ⚠ Con sufijo | Mismo modelo, con "Free" añadido |
| 26 | deepseek-v4.1-flash | DeepSeek V4.1 Flash 1017 | DeepSeek V4.1 Flash | ⚠ Versión diferente | "DeepSeek V4.1 Flash 1017" vs "DeepSeek V4.1 Flash" |
| 27 | muse-spark-1.2-contributor | Muse Spark 1.2 Contributor | Muse Spark 1.2 | ⚠ Con sufijo | "Muse Spark 1.2 Contributor" vs "Muse Spark 1.2" |
| 28 | muse-spark-1.3-contributor | Muse Spark 1.3 Contributor | Muse Spark 1.3 | ⚠ Con sufijo | "Muse Spark 1.3 Contributor" vs "Muse Spark 1.3" |
| 29 | beam-free | Beam Free | Beam Free | ✓ Exacta | Nombre idéntico |
| 30 | hy4-flash-free | Hy4 flash Free | Hy4 flash Free | ✓ Exacta | Nombre idéntico |
| 31 | iceman-contributor-free | Iceman Contributor Free | Iceman Free | ⚠ Con sufijo | "Iceman Contributor Free" vs "Iceman Free" |
| 32 | longcat-2.5-free | LongCat 2.5 Free | LongCat 2.5 Free | ✓ Exacta | Nombre idéntico |

### 4.2 Resumen de correspondencias

| Tipo | Cantidad | Modelos |
|------|----------|---------|
| ✓ Coincidencia exacta | 8 | Kimi K3, Qwen3.8 Max, Kimi K2.7 Code, DeepSeek V4 Pro, Qwen3.8 Flash, Beam Free, Hy4 flash Free, LongCat 2.5 Free |
| ⚠ Normalización necesaria | 14 | Grok 4.7, Gemini 4 Argon, GLM-5.2, GPT-5.6 Luna, MiniMax-M3, Claude Haiku 5.5, GPT-6 Luna, Qwen3.7 Plus, GLM-5.3-Flash, GLM-5.3, MiMo-V2.6-Flash, DeepSeek V4.1 Flash 1017, Muse Spark 1.2/1.3 Contributor, Iceman Contributor Free |
| ✗ No encontrado en precios | 10 | Kimi K3.1 Pro, Step 5 Preview, Qwen4 Max, Hy4 preview, Hy4, MiMo-V2.6-Pro, MiniMax M3.1 Flash, Hy3, LongCat-2.0 |

### 4.3 Patrones de normalización necesarios

| Patrón | Ejemplo | Regla |
|--------|---------|-------|
| Guiones → espacios | `GLM-5.3` → `GLM 5.3` | Reemplazar `-` por espacio en nombres GLM |
| Guiones → espacios (GPT) | `GPT-6 Luna` → `GPT 6 Luna` | Reemplazar `-` por espacio en nombres GPT |
| Guiones → espacios (MiniMax) | `MiniMax-M3` → `MiniMax M3` | Reemplazar `-` por espacio en nombres MiniMax |
| Sufijo "(50% off)" | `Gemini 4 Argon` → `Gemini 4 Argon (50% off)` | Ignorar sufijo de descuento |
| Sufijo "Free" | `MiMo-V2.6-Flash` → `MiMo-V2.6-Flash Free` | Ignorar sufijo "Free" |
| Sufijo "Contributor" | `Muse Spark 1.2 Contributor` → `Muse Spark 1.2` | Ignorar sufijo "Contributor" |
| Sufijo "Contributor" (Iceman) | `Iceman Contributor Free` → `Iceman Free` | Ignorar "Contributor" en nombre |
| Versión con fecha | `DeepSeek V4.1 Flash 1017` → `DeepSeek V4.1 Flash` | Ignorar sufijo numérico de fecha |
| División por contexto | `Grok 4.7` → `Grok 4.7 (≤ 200K tokens)` + `Grok 4.7 (> 200K tokens)` | Unificar variantes de contexto |
| Versión diferente | `Qwen3.7 Plus` → `Qwen3.6 Plus` | Pendiente de verificación |

---

## 5. Análisis de precios

### 5.1 Estructura de precios en la fuente

Los precios se expresan en **dólares por 1M de tokens**. La unidad no aparece explícitamente en la tabla, pero es consistente con la documentación de OpenCode.

### 5.2 Precios tachados (descuentos)

| Modelo en tabla | Input (original → vigente) | Output (original → vigente) | Cached Read (original → vigente) |
|----------------|--------------------------|---------------------------|--------------------------------|
| Mistral Large 4 (50% off) | $1.36 → $0.68 | $4.18 → $2.09 | $0.14 → $0.07 |
| Gemini 4 Carbon (50% off) | $4.00 → $2.00 | $20.00 → $10.00 | $0.20 → $0.10 |
| Gemini 4 Argon (50% off) | $4.00 → $2.00 | $20.00 → $10.00 | $0.20 → $0.10 |
| Gemini 3.8 Flash (50% off) | $1.50 → $0.75 | $7.50 → $3.75 | $0.15 → $0.075 |
| Gemini 3.7 Flash (50% off) | $1.50 → $0.75 | $7.50 → $3.75 | $0.15 → $0.075 |
| Gemini 3.6 Flash (50% off) | $1.50 → $0.75 | $7.50 → $3.75 | $0.15 → $0.075 |

**Estructura HTML:** `<del>$4.00</del> $2.00` — el precio tachado va primero, el vigente después.

**Nota:** Ningún modelo con descuento es exclusivo de Go. Solo Gemini 4 Argon aparece en ambas fuentes.

### 5.3 Modelos con precios divididos por contexto de tokens

| Modelo | Variante | Input | Output | Cached Read | Cached Write |
|--------|----------|-------|--------|-------------|--------------|
| Grok 4.7 | ≤ 200K tokens | $2.00 | $6.00 | $0.50 | - |
| Grok 4.7 | > 200K tokens | $4.00 | $12.00 | $1.00 | - |
| GPT-5.6 Luna | ≤ 272K tokens | $0.20 | $1.20 | $0.02 | $0.25 |
| GPT-5.6 Luna | > 272K tokens | $0.40 | $1.80 | $0.04 | $0.50 |
| GPT-6 Luna | ≤ 272K tokens | $0.10 | $0.50 | $0.01 | $0.125 |
| GPT-6 Luna | > 272K tokens | $0.20 | $0.75 | $0.02 | $0.25 |
| Claude Haiku 5.5 | ≤ 100K tokens | $0.10 | $0.50 | $0.01 | $0.125 |
| Claude Haiku 5.5 | > 100K tokens | $0.50 | $2.50 | $0.05 | $0.625 |

**Problema:** La fuente de límites presenta estos modelos como una sola entrada, pero la fuente de precios los divide en dos. El catálogo actual también los dividía, pero con umbrales diferentes (256K para Qwen3.7 Plus vs 100K para Claude Haiku 5.5).

### 5.4 Cached Write

Solo 12 de los 109 modelos tienen `cachedWritePrice` definido:

| Modelo | Cached Write |
|--------|-------------|
| Kimi K3 | $3.00 |
| Qwen3.8 Max | $2.50 |
| GPT 6 Luna Decision (≤ 272K) | $0.125 |
| GPT 6 Luna Decision (> 272K) | $0.25 |
| Claude Fable 5.2 | $10.00 |
| Claude Fable 5.1 | $12.50 |
| Claude Fable 5 | $12.50 |
| Claude Opus 5.5 | $5.00 |
| Claude Opus 5 | $6.25 |
| Claude Opus 4.x (varios) | $5.00-$6.25 |
| Claude Sonnet 5.5 | $2.50 |
| Claude Sonnet 5 | $2.50 |
| Claude Sonnet 4.6 | $3.75 |
| Claude Sonnet 4.5 (≤ 200K) | $3.75 |
| Claude Sonnet 4.5 (> 200K) | $7.50 |
| Claude Haiku 5.5 (≤ 100K) | $0.125 |
| Claude Haiku 5.5 (> 100K) | $0.625 |
| GPT 6.2 Astra (≤ 272K) | $10.00 |
| GPT 6.2 Astra (> 272K) | $20.00 |
| GPT 6.2 Sol (≤ 272K) | $2.50 |
| GPT 6.2 Sol (> 272K) | $5.00 |
| GPT 6 Astra (≤ 272K) | $12.50 |
| GPT 6 Astra (> 272K) | $25.00 |
| GPT 6 Sol (≤ 272K) | $2.50 |
| GPT 6 Sol (> 272K) | $5.00 |
| GPT 6.1 Sol (≤ 272K) | $2.50 |
| GPT 6.1 Sol (> 272K) | $5.00 |
| GPT 6 Luna (≤ 272K) | $0.125 |
| GPT 6 Luna (> 272K) | $0.25 |
| GPT 5.6 Sol (≤ 272K) | $5.00 |
| GPT 5.6 Sol (> 272K) | $10.00 |
| GPT 5.6 Terra (≤ 272K) | $2.50 |
| GPT 5.6 Terra (> 272K) | $5.00 |
| GPT 5.6 Luna (≤ 272K) | $0.25 |
| GPT 5.6 Luna (> 272K) | $0.50 |

**De los 32 modelos Go, solo 4 tienen cachedWritePrice:** Kimi K3, Qwen3.8 Max, GPT-5.6 Luna y GPT-6 Luna (en sus variantes).

### 5.5 Modelos sin precio en la fuente de precios

Los 10 modelos que no se encuentran en la tabla de precios son:

| data-model | displayName | Posible causa |
|-----------|-------------|---------------|
| kimi-k3.1-pro | Kimi K3.1 Pro | Modelo muy nuevo, precio no publicado |
| step-5-preview | Step 5 Preview | Modelo en preview, precio no publicado |
| qwen4-max | Qwen4 Max | Modelo nuevo, precio no publicado |
| hy4-preview | Hy4 preview | Modelo en preview, precio no publicado |
| hy4 | Hy4 | Modelo nuevo, precio no publicado |
| mimo-v2.6-pro | MiMo-V2.6-Pro | Posiblemente eliminado de tabla de precios |
| minimax-m3.1-flash | MiniMax M3.1 Flash | Modelo nuevo, precio no publicado |
| hy3 | Hy3 | Posiblemente eliminado de tabla de precios |
| longcat-2.0 | LongCat-2.0 | Posiblemente eliminado de tabla de precios |
| deepseek-v4.1-flash | DeepSeek V4.1 Flash 1017 | Versión con fecha, tabla tiene "DeepSeek V4.1 Flash" |

**Nota:** DeepSeek V4.1 Flash 1017 SÍ tiene correspondencia en la tabla de precios como "DeepSeek V4.1 Flash" ($0.30/$1.20). La discrepancia es solo el sufijo "1017" (fecha de versión).

---

## 6. Análisis de límites y estimaciones

### 6.1 Límites mensuales por plan

| Límite Go | Modelos con este límite | Límite Go Plus | Modelos con este límite |
|-----------|------------------------|----------------|------------------------|
| $15 | 16 modelos | $60 | 18 modelos |
| $20 | 1 (MiniMax M3.1 Flash) | $80 | 1 (MiniMax M3.1 Flash) |
| $30 | 3 (Gemini 4 Argon, Hy4 preview, Qwen3.8 Flash) | $90-$120 | 4 modelos |
| $60 | 10 modelos | $180 | 7 modelos |
| $100 | 1 (DeepSeek V4.1 Flash 1017) | $200 | 1 (DeepSeek V4.1 Flash 1017) |
| $500 | 1 (GLM-5.3) | $1,000 | 1 (GLM-5.3) |
| ∞ | 4 (modelos Free) | ∞ | 4 (modelos Free) |

### 6.2 Estimación de peticiones por 5 horas

La columna "Est. requests / 5 hr" presenta valores separados para Go y Go Plus. Estos valores son **estimaciones**, no límites contractuales. Se calculan a partir del límite mensual y el precio del modelo.

**Fórmula implícita:** La estimación parece ser `límite_5h / precio_input_por_token` donde el límite_5h se deriva del límite mensual.

### 6.3 Modelos Free (ilimitados)

| data-model | displayName | Restricciones |
|-----------|-------------|---------------|
| beam-free | Beam Free | Limited regions · Limited time |
| hy4-flash-free | Hy4 flash Free | New · Limited time |
| iceman-contributor-free | Iceman Contributor Free | Limited time |
| longcat-2.5-free | LongCat 2.5 Free | Limited time |

**Nota:** Los modelos Free tienen `∞` tanto en estimación de peticiones como en límite mensual.

### 6.4 Notas y restricciones

| Tipo de nota | Modelos afectados | Significado |
|-------------|------------------|-------------|
| "New" | Qwen4 Max, Hy4, Hy4 flash Free | Modelo recientemente añadido |
| "Limited regions" | Muse Spark 1.2/1.3 Contributor, Beam Free | No disponible en todas las regiones |
| "Limited time" | Beam Free, Hy4 flash Free, Iceman Contributor Free, LongCat 2.5 Free | Oferta temporal, puede desaparecer |

---

## 7. Análisis de modelos antiguos (models.json vs fuentes actuales)

### 7.1 Clasificación de los 74 registros actuales

#### 7.1.1 Modelos que siguen existiendo (18 modelos Go = 36 registros)

| displayName (catálogo) | Estado en fuente | Observación |
|----------------------|-----------------|-------------|
| GLM-5.3-Flash | ✓ Presente | Límite Go: $60 (catálogo: $60) ✓ |
| GLM-5.3 | ✓ Presente | **Límite Go: $500 (catálogo: $15) ✗ DISCREPANCIA** |
| GLM-5.2 | ✓ Presente | |
| Kimi K3.1 Pro | ✓ Presente | |
| Kimi K3 | ✓ Presente | |
| Kimi K2.7 Code | ✓ Presente | |
| LongCat-2.0 | ✓ Presente | |
| Step 5 Preview | ✓ Presente | |
| Beam Free | ✓ Presente | |
| MiMo-V2.6-Flash | ✓ Presente | |
| MiMo-V2.6-Pro | ✓ Presente | |
| MiniMax M3.1 Flash | ✓ Presente | |
| MiniMax M3 | ✓ Presente | |
| Muse Spark 1.3 Contributor | ✓ Presente | |
| Muse Spark 1.2 Contributor | ✓ Presente | |
| Qwen3.8 Max | ✓ Presente | |
| Qwen3.8 Flash | ✓ Presente | |
| DeepSeek V4 Pro | ✓ Presente | |
| Hy4 preview | ✓ Presente | |
| Hy3 | ✓ Presente | |
| Grok 4.7 | ✓ Presente | |
| GPT 6 Luna | ✓ Presente | |
| GPT 5.6 Luna | ✓ Presente | |
| Claude Haiku 5.5 | ✓ Presente | |
| Gemini 4 Argon | ✓ Presente | |
| Iceman Contributor Free | ✓ Presente | |

#### 7.1.2 Modelos eliminados de la fuente (14 registros Go = 28 registros totales)

| displayName (catálogo) | Estado | Causa probable |
|----------------------|--------|----------------|
| Qwen3.7 Plus (≤ 256K tokens) | ⚠ Fusionado | La fuente muestra "Qwen3.7 Plus" como una sola entrada |
| Qwen3.7 Plus (> 256K tokens) | ⚠ Fusionado | La fuente muestra "Qwen3.7 Plus" como una sola entrada |
| DeepSeek V4.1 Flash (Off-Peak) | ✗ Eliminado | La fuente muestra "DeepSeek V4.1 Flash 1017" sin variantes Peak/Off-Peak |
| DeepSeek V4.1 Flash (Peak) | ✗ Eliminado | La fuente muestra "DeepSeek V4.1 Flash 1017" sin variantes Peak/Off-Peak |
| MiMo-V2.5 | ✗ Eliminado | Versión anterior, reemplazada por MiMo-V2.6 |
| MiMo-V2.5-Pro | ✗ Eliminado | Versión anterior, reemplazada por MiMo-V2.6-Pro |

**Nota:** Los modelos divididos por contexto de tokens (Grok 4.7, GPT 6 Luna, GPT 5.6 Luna, Claude Haiku 5.5) aparecen como una sola entrada en la fuente de límites pero divididos en la fuente de precios. El catálogo actual los dividía correctamente.

### 7.2 Discrepancias de precios confirmadas

| Modelo | Catálogo (Go) | Fuente de precios | Diferencia |
|--------|--------------|-------------------|------------|
| GLM-5.3 | Input: $1.4, Output: $4.4, Límite: $15 | Input: $1.4, Output: $4.4, Límite: $500 | **Límite cambiado de $15 a $500** |
| Kimi K3.1 Pro | Input: $2, Output: $10 | No encontrado en precios | Precio no disponible |
| DeepSeek V4 Pro (Peak) | Input: $1.32, Output: $3.96 | Input: $1.74, Output: $3.48 | **Precios diferentes** (posible cambio) |
| Hy4 preview | Input: $0.834, Output: $2.501 | No encontrado | Precio no disponible |
| Hy3 | Input: $0.14, Output: $0.58 | No encontrado | Precio no disponible |
| MiniMax M3 | Input: $0.3, Output: $1.2 | Input: $0.30, Output: $1.20 | ✓ Coincide |
| Muse Spark 1.2 Contributor | Input: $0.1, Output: $0.2 | Input: $1.25, Output: $4.25 | **Precios muy diferentes** |
| Muse Spark 1.3 Contributor | Input: $0.1, Output: $0.2 | Input: $1.25, Output: $4.25 | **Precios muy diferentes** |
| LongCat-2.0 | Input: $0.3, Output: $1.2 | No encontrado | Precio no disponible |
| MiMo-V2.6-Pro | Input: $0.435, Output: $0.87 | No encontrado | Precio no disponible |
| MiniMax M3.1 Flash | Input: $0.15, Output: $0.6 | No encontrado | Precio no disponible |

### 7.3 Información histórica que se perdería

Si se sustituye directamente el catálogo actual por los datos de la fuente:

1. **MiMo-V2.5 y MiMo-V2.5-Pro:** Modelos eliminados. Se perdería el historial de precios y límites.
2. **Variantes Peak/Off-Peak de DeepSeek:** El catálogo actual distinguía entre Peak y Off-Peak con precios y límites diferentes. La fuente actual presenta un modelo unificado.
3. **Variantes por contexto de tokens:** El catálogo actual tenía umbrales de 256K para Qwen3.7 Plus. La fuente de precios usa 100K para Claude Haiku 5.5 y 200K para Grok 4.7.
4. **Precios de Muse Spark Contributor:** El catálogo tiene $0.1/$0.2 mientras la fuente tiene $1.25/$4.25. Esto sugiere que el catálogo tenía precios de Contributor (más baratos) y la fuente tiene precios estándar.

---

## 8. Evaluación de Go Teams

### 8.1 Información disponible

| Campo | Disponible | Fuente |
|-------|------------|--------|
| Precio del plan | ✓ | $20/member/month (mínimo 2 miembros = $40/mes) |
| Modelos incluidos | ✓ | Mismo catálogo que Go |
| Límites por modelo | ⚠ Indirecto | "$5/month higher than Go" según documentación |
| Tabla detallada | ✗ | No existe tabla de límites por modelo |
| Fecha de lanzamiento | ✓ | October 28, 2026 |
| Mínimo de miembros | ✓ | 2 miembros (desde Nov 12, 2026) |

### 8.2 Características de Go Teams

- Cada miembro tiene sus propios límites rolling (5-hour, weekly, monthly).
- Los límites son individuales, no compartidos.
- Extra Usage con budgets: cuando se alcanza el límite, las peticiones usan el crédito del workspace.
- Central privacy y region controls.
- SSO support.

### 8.3 Recomendación

**No incorporar Go Teams como plan independiente en el catálogo.** Los datos de límites por modelo no están disponibles de forma estructurada. La relación "$5/month higher than Go" es una regla de cálculo, no una tabla de datos. Si se necesita soporte para Go Teams, se puede calcular derivando los límites de Go y añadiendo $5.

---

## 9. Propuesta de contrato de datos

### 9.1 Campos propuestos para un modelo del catálogo

#### Campos obligatorios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `string` | Identificador único derivado de `data-model` de la fuente |
| `displayName` | `string` | Nombre visible del modelo |
| `provider` | `string` | "OpenCode" |
| `plan` | `string` | "Go" \| "Go Plus" \| "Go Teams" |
| `sourceUrl` | `string` | URL de la fuente de datos |
| `checkedAt` | `string` | ISO timestamp de última verificación |
| `sourceType` | `SourceType` | Tipo de fuente |
| `confidence` | `string` | "high" \| "medium" \| "low" |

#### Campos de precios (opcionales, con procedencia)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `priceInputUsd` | `number \| null` | Precio input por 1M tokens |
| `priceOutputUsd` | `number \| null` | Precio output por 1M tokens |
| `priceInputOriginalUsd` | `number \| null` | Precio input original (antes de descuento) |
| `priceOutputOriginalUsd` | `number \| null` | Precio output original (antes de descuento) |
| `cachedReadPrice` | `number \| null` | Precio cached read por 1M tokens |
| `cachedWritePrice` | `number \| null` | Precio cached write por 1M tokens |
| `priceSourceUrl` | `string \| null` | URL específica de la fuente de precios |
| `priceCheckedAt` | `string \| null` | Timestamp de verificación de precios |

#### Campos de límites (opcionales, con procedencia)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `monthlyLimitUsd` | `number \| null` | Límite mensual en USD |
| `limitStatus` | `LimitStatus` | "known" \| "unlimited" \| "unknown" |
| `estRequests5h` | `number \| null` | Estimación de peticiones por 5 horas |
| `limitSourceUrl` | `string \| null` | URL específica de la fuente de límites |
| `limitCheckedAt` | `string \| null` | Timestamp de verificación de límites |

#### Campos de metadatos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `notes` | `string[]` | Array de notas: ["New", "Limited regions", "Limited time"] |
| `active` | `boolean` | Si el modelo está activo en la fuente |
| `verification` | `VerificationStatus` | Estado de verificación |

### 9.2 Procedencia independiente

Los campos de precios y límites deben tener `sourceUrl` y `checkedAt` independientes porque provienen de dos fuentes distintas:

- **Precios:** `https://opencode.ai/docs/console/models/`
- **Límites:** `https://opencode.ai/console/go`

### 9.3 Valores desconocidos vs cero vs gratuitos vs ilimitados

| Concepto | Representación |
|----------|---------------|
| Precio desconocido | `priceInputUsd: null` |
| Precio gratuito | `priceInputUsd: 0` |
| Límite ilimitado | `monthlyLimitUsd: null` + `limitStatus: "unlimited"` |
| Límite desconocido | `monthlyLimitUsd: null` + `limitStatus: "unknown"` |
| Límite conocido | `monthlyLimitUsd: 15` + `limitStatus: "known"` |

---

## 10. Arquitectura conceptual recomendada

### 10.1 Componentes

```
┌─────────────────────────────────────────────────────┐
│                 Catalog Updater                      │
│  (src/catalog/updater.ts)                           │
└────────────┬──────────────────────┬─────────────────┘
             │                      │
     ┌───────▼────────┐    ┌───────▼────────────┐
     │ Limits Adapter  │    │ Prices Adapter     │
     │ /console/go     │    │ /docs/console/     │
     │                 │    │ models/            │
     │ Parser:         │    │ Parser:            │
     │ parseGoLimits() │    │ parseModelsTable() │
     └───────┬─────────┘    └───────┬────────────┘
             │                      │
             │    ┌─────────────────▼────────┐
             │    │  Name Normalizer         │
             │    │  (mapeo de nombres)      │
             │    └─────────────────┬────────┘
             │                      │
             │    ┌─────────────────▼────────┐
             │    │  Data Merger             │
             │    │  (combina límites+precios)│
             │    └─────────────────┬────────┘
             │                      │
             │    ┌─────────────────▼────────┐
             │    │  Integrity Validator     │
             │    │  (validación de datos)    │
             │    └─────────────────┬────────┘
             │                      │
             ▼                      ▼
     ┌─────────────────────────────────────┐
     │         Catalog Output               │
     │         (models.json)                │
     └─────────────────────────────────────┘
```

### 10.2 Adaptador de límites (`parseGoLimits`)

- **Fuente:** `https://opencode.ai/console/go`
- **Método:** Parsear tabla HTML usando atributos `data-*`
- **Estrategia:** 
  1. Localizar `<table>` único.
  2. Iterar `<tr>` con `data-model`.
  3. Extraer `data-model` como ID.
  4. Extraer nombre de `.console-go-models-model-name`.
  5. Extraer valores de `.sr-only` o de `data-plan="go"` / `data-plan="go-plus"`.
  6. Detectar badges: `.console-go-models-new`, `.console-go-models-note`.
- **Robustez:** Los atributos `data-*` son estables y no dependen del texto visible ni del orden de columnas.

### 10.3 Adaptador de precios (`parseModelsTable`)

- **Fuente:** `https://opencode.ai/docs/console/models/`
- **Método:** Parsear Tabla 2 HTML
- **Estrategia:**
  1. Localizar tabla con cabeceras `Model`, `Input`, `Output`, `Cached Read`, `Cached Write`.
  2. Iterar filas de datos.
  3. Extraer nombre del modelo de la primera celda.
  4. Extraer precios de cada celda, manejando `<del>` para precios tachados.
  5. Detectar "Free" y "-" como valores especiales.
- **Robustez:** Detección por cabeceras, no por índice. Manejo de `<del>` para descuentos.

### 10.4 Normalizador de nombres

- **Propósito:** Mapear nombres entre las dos fuentes.
- **Estrategia:**
  1. Reglas de normalización: guiones → espacios, ignorar sufijos conocidos.
  2. Registro de correspondencias manuales para casos no normalizables.
  3. Detección de modelos sin correspondencia.
- **Registro de correspondencias:**
  ```typescript
  const NAME_MAPPINGS: Record<string, string> = {
    'GLM-5.3': 'GLM 5.3',
    'GLM-5.3-Flash': 'GLM 5.3 Flash',
    'GPT-6 Luna': 'GPT 6 Luna',
    // ... etc
  };
  ```

### 10.5 Fusionador de datos

- **Propósito:** Combinar límites y precios en un modelo unificado.
- **Estrategia:**
  1. Para cada modelo de límites, buscar correspondencia en precios.
  2. Si hay coincidencia exacta → fusionar directamente.
  3. Si hay normalización → aplicar regla y fusionar.
  4. Si hay división por contexto → crear dos registros o usar el precio del contexto más común.
  5. Si no hay correspondencia → marcar precios como `null` y registrar advertencia.
- **Salida:** Array de modelos con procedencia independiente para precios y límites.

### 10.6 Validador de integridad

- **Verificaciones:**
  1. Cada modelo tiene `id` único.
  2. Los precios no son negativos.
  3. Los límites son coherentes con el plan.
  4. Los modelos Free tienen `limitStatus: "unlimited"`.
  5. No hay modelos sin correspondencia no reportados.
  6. Las fechas de verificación son recientes.

### 10.7 Protección frente a actualizaciones parciales

- Si la fuente de límites falla pero la de precios funciona → no sobrescribir el catálogo.
- Si la fuente de precios falla pero la de límites funciona → actualizar solo límites, mantener precios existentes.
- Si ambas fallan → mantener el último catálogo válido sin cambios.
- Siempre guardar un diff antes de aplicar cambios.

---

## 11. Correspondencias pendientes de verificar

| Modelo | Problema | Acción necesaria |
|--------|----------|-----------------|
| Qwen3.7 Plus | Catálogo: "Qwen3.7 Plus", precios: "Qwen3.6 Plus" | Verificar si es error tipográfico en la fuente o versión diferente |
| DeepSeek V4.1 Flash 1017 | Sufijo "1017" no está en tabla de precios | Confirmar que "1017" es fecha de versión y no variante diferente |
| Muse Spark Contributor | Precios muy diferentes ($0.1/$0.2 vs $1.25/$4.25) | Verificar si "Contributor" tiene precios diferentes a los estándar |
| MiMo-V2.6-Pro | No encontrado en tabla de precios | Verificar si ha sido eliminado o renombrado |
| Hy3 | No encontrado en tabla de precios | Verificar si ha sido eliminado o renombrado |
| LongCat-2.0 | No encontrado en tabla de precios | Verificar si ha sido eliminado o renombrado |
| Kimi K3.1 Pro | No encontrado en tabla de precios | Modelo nuevo, esperar publicación de precios |
| Step 5 Preview | No encontrado en tabla de precios | Modelo en preview, esperar publicación de precios |
| Qwen4 Max | No encontrado en tabla de precios | Modelo nuevo, esperar publicación de precios |
| Hy4 | No encontrado en tabla de precios | Modelo nuevo, esperar publicación de precios |
| Hy4 preview | No encontrado en tabla de precios | Modelo en preview, esperar publicación de precios |
| MiniMax M3.1 Flash | No encontrado en tabla de precios | Modelo nuevo, esperar publicación de precios |

---

## 12. Decisiones que requieren aprobación

### 12.1 Qué hacer con los modelos sin precio

**Opción A:** Incluirlos con `priceInputUsd: null` y `confidence: "low"`.
**Opción B:** Excluirlos del catálogo hasta que tengan precio publicado.
**Recomendación:** Opción A — mantenerlos con precios `null` para que el usuario sepa que existen, pero marcar claramente que faltan datos.

### 12.2 Qué hacer con los modelos divididos por contexto de tokens

**Opción A:** Unificar en un solo registro con los precios del contexto más común (≤ X tokens).
**Opción B:** Mantener dos registros separados como el catálogo actual.
**Opción C:** Crear un solo registro con ambos conjuntos de precios.
**Recomendación:** Opción B — mantener dos registros separados para precisión en los cálculos de costo. La fuente de límites los presenta unificados, pero la fuente de precios los divide. El catálogo debe reflejar la realidad de los precios.

### 12.3 Qué hacer con los modelos obsoletos

**Opción A:** Eliminarlos del catálogo.
**Opción B:** Marcarlos como `active: false` y mantenerlos.
**Recomendación:** Opción B — mantener los modelos obsoletos marcados como inactivos para preservar el historial y permitir que los usuarios con datos antiguos sigan viendo referencias coherentes.

### 12.4 Cómo manejar Go Teams

**Opción A:** No incluirlo en el catálogo.
**Opción B:** Derivar los límites de Go añadiendo $5.
**Recomendación:** Opción A por ahora — sin tabla de datos estructurada, no hay suficiente evidencia para incluir Go Teams como plan independiente.

### 12.5 Cómo manejar los precios tachados

**Opción A:** Guardar solo el precio vigente.
**Opción B:** Guardar ambos precios (original y vigente).
**Recomendación:** Opción B — guardar ambos precios para transparencia y permitir al usuario entender el descuento.

---

## 13. Conclusiones técnicas

1. **La estructura HTML de `/console/go` es robusta.** Los atributos `data-*` proporcionan una API semántica estable que no depende del texto visible ni del orden de columnas. Esto es mucho mejor que el scraping basado en selectores CSS frágiles.

2. **Las dos fuentes son complementarias y necesarias.** Ninguna fuente por sí sola proporciona todos los datos. La fusión es obligatoria.

3. **El mapeo de nombres es el mayor desafío.** 14 de 32 modelos requieren normalización. Un registro de correspondencias manuales es necesario para los casos no normalizables.

4. **10 de 32 modelos no tienen precio publicado.** Esto es esperado para modelos nuevos y en preview, pero requiere manejo explícito en el parser.

5. **Los modelos divididos por contexto de tokens** requieren una decisión de diseño: unificar o mantener separados. La fuente de precios los divide; la fuente de límites los unifica.

6. **Go Teams no es viable como fuente independiente.** Sin tabla de datos estructurada, no se puede extraer información fiable por modelo.

7. **El esquema actual (`src/domain/models.ts`) es suficiente** con las adiciones propuestas: `priceSourceUrl`, `priceCheckedAt`, `limitSourceUrl`, `limitCheckedAt`, `estRequests5h`, `notes` como array, `priceInputOriginalUsd` y `priceOutputOriginalUsd` para descuentos.

8. **Los precios de Muse Spark Contributor** en el catálogo ($0.1/$0.2) difieren significativamente de los de la fuente ($1.25/$4.25). Esto sugiere que el catálogo tenía precios de Contributor (más baratos) y la fuente tiene precios estándar. Hay que investigar si la tabla de precios distingue entre Contributor y estándar.

---

## Apéndice A: Archivos consultados

| Archivo | Propósito |
|---------|-----------|
| `src/data/models.json` | Catálogo actual (74 modelos) |
| `src/domain/models.ts` | Esquema de datos |
| `src/catalog/source-registry.ts` | Registro de fuentes |
| `src/catalog/parsers.ts` | Parsers actuales |
| `src/catalog/integrity.ts` | Validación de integridad |
| `src/catalog/schema.ts` | Esquema de validación |
| `src/__tests__/fixtures/go-docs-fixture.html` | Fixture de pruebas |

## Apéndice B: Fuentes HTTP consultadas

| URL | Código | Tamaño | Propósito |
|-----|--------|--------|-----------|
| `https://opencode.ai/console/go` | 200 | 153,341 bytes | Límites y estimaciones |
| `https://opencode.ai/docs/console/models/` | 200 | 102,667 bytes | Precios de tokens |
| `https://opencode.ai/console/changelog/go-teams` | 200 | 35,333 bytes | Info Go Teams |

## Apéndice C: Confirmación de integridad

- **No se ha modificado ningún archivo de código ni configuración.**
- **No se han añadido dependencias.**
- **No se ha ejecutado `update:catalog` ni ningún script que modifique el catálogo.**
- **La única modificación es la creación de `OPENCODE-GO-DATA-RECONCILIATION.md`.**
