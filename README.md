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
- **Actualización automática** vía GitHub Actions
- **58 tests automatizados**

## Integración en Operia Systems

El build se sirve en `https://operiasystems.com/proyectos/opencode-go-usage-planner/app/` como aplicación estática independiente. `vite.config.ts` usa `base: './'` para que los assets funcionen bajo esa subruta. La cabecera incluye un enlace de vuelta a `/proyectos/`.

La actualización del catálogo sigue siendo una operación de desarrollo/CI (`scripts/update-catalog.ts` o GitHub Actions); no se ejecuta desde el navegador. La aplicación no tiene backend, cuentas ni claves API.

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