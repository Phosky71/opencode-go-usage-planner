# OpenCode Go Usage Planner

Aplicación web open source para calcular, comparar y simular el consumo de las cuotas compartidas de OpenCode Go.

## Características

- **Catálogo de 72 modelos** (36 Go + 36 Go Plus) con límites y precios oficiales
- **Calculadora de consumo** con fórmula `P_i = 100 × consumo / límite_mensual`
- **Selector de plan** (OpenCode Go / Go Plus) con filtrado automático
- **Simulador de escenarios** con gastos hipotéticos
- **Comparador de modelos** ordenable por límite, precio y contribución por dólar
- **Planificador de presupuesto** con distribución editable
- **Modelos ilimitados** tratados correctamente (no convertidos a cero)
- **Identidad visual Operia Systems** (dark theme, cyan/emerald)
- **Cálculos deterministas** sin llamadas a IA
- **Actualización automática** vía GitHub Actions (CLI/CI, no desde el navegador)
- **Persistencia local versionada** de escenarios y preferencias
- **Importación/exportación JSON** validada con Zod
- **74 tests automatizados**

## Integración en Operia Systems

El build se sirve en `https://operiasystems.com/proyectos/opencode-go-usage-planner/app/` como aplicación estática independiente. `vite.config.ts` usa `base: './'` para que los assets funcionen bajo esa subruta. La cabecera incluye un enlace de vuelta a `/proyectos/`.

La actualización del catálogo sigue siendo una operación de desarrollo/CI (`scripts/update-catalog.ts` o GitHub Actions); no se ejecuta desde el navegador. La aplicación no tiene backend, cuentas ni claves API.

## Procedencia y verificación del catálogo

El catálogo se extrae de documentación pública de OpenCode. Los registros se marcan como:

- `sourceType: "official_document"`: la fuente es documentación oficial;
- `verification: "auto_extracted"`: el dato fue extraído automáticamente y **no** passó por revisión manual;
- `limitStatus: "known" | "unlimited" | "unknown"`: distingue un límite numérico, un límite ilimitado y un dato no interpretable.

La interfaz muestra estos estados de forma explícita. Un valor desconocido no se convierte en cero ni se presenta como gratuito. La verificación manual de los 72 registros sigue pendiente.

## Persistencia, importación y exportación

El escenario se guarda automáticamente en `localStorage` bajo la clave `operia.planner.scenario.v1`. Se conservan:

- plan seleccionado;
- consumos registrados;
- porcentaje observado;
- hipótesis;
- presupuesto y asignaciones.

El formato de exportación es JSON, versión 1, con límite de 256 KB y máximo de 200 elementos por lista. Se valida con Zod. La importación exige confirmación si ya hay datos y rechaza modelos que no existan en el catálogo. El botón “Borrar datos” elimina el escenario y el plan guardado; no se envía nada a un servidor.

## Estado y limitaciones

- La persistencia es local al navegador; no se sincroniza entre dispositivos.
- El planificador de presupuesto avisa del exceso, pero no recorta ni redistribuye asignaciones.
- El catálogo requiere revisión manual; el workflow de GitHub Actions no se ha probado en remoto.
- El bundle actual ronda los 263 KB sin comprimir / 70 KB gzip.

## Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Tests
npm run test

# Typecheck
npm run typecheck

# Build de producción
npm run build

# Actualizar catálogo
npx tsx scripts/update-catalog.ts
```

## Estructura

```
src/
├── catalog/          # Scraping, validación y persistencia del catálogo
├── context/          # React Context (catálogo, plan)
├── domain/           # Tipos, validación y cálculos puros
├── ui/               # Componentes React
└── __tests__/        # Tests unitarios e integración
```

## Licencia

MIT — Operia Systems contributors

## No afiliación

Esta aplicación es independiente y no está avalada por OpenCode. Los datos se obtienen de fuentes públicas autorizadas.
