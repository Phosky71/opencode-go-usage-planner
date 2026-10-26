# Prompt maestro para OpenCode

Actúa como arquitecto senior de software, ingeniero full-stack, especialista en calidad de datos y responsable de pruebas. Tu tarea es construir **OpenCode Go Usage Planner**, una aplicación web open source para calcular, comparar y simular el consumo de las cuotas de OpenCode Go.

## Contexto de ejecución
El usuario tiene OpenCode configurado con un proveedor llamado Free LLM API que agrega APIs/modelos gratuitos. Puedes usar los modelos y herramientas disponibles en el entorno de OpenCode para desarrollar, pero:
- No asumas que todos los modelos admiten herramientas, contexto suficiente o ejecución fiable.
- No dependas de Free LLM API dentro de la aplicación final.
- El producto debe calcular localmente, de forma determinista y sin llamadas a IA.
- No solicites claves ni secretos para el MVP.

## Orden obligatorio
1. Lee `AGENTS.md`, `README.md` y todos los documentos de `docs/`.
2. Inspecciona el directorio y el entorno actual. Conserva cualquier trabajo existente.
3. Investiga las fuentes oficiales actuales de OpenCode Go y verifica la metodología de cuotas antes de crear el catálogo. Registra URLs y fecha de consulta.
4. Resume brevemente los hallazgos, la política verificada y cualquier incertidumbre. Si una regla no puede verificarse públicamente, márcala como tal y usa el documento de soporte aportado por el usuario solo como fuente `support_confirmed`.
5. Presenta un plan por fases, pero continúa inmediatamente con tareas reversibles y de bajo riesgo; no te detengas esperando aprobación para cada archivo.
6. Implementa el MVP completo, con pruebas, documentación y preparación para despliegue.
7. Ejecuta realmente las pruebas y verificaciones disponibles; corrige los errores.
8. Entrega un informe final preciso con archivos importantes, decisiones, comandos ejecutados, resultados, limitaciones y tareas manuales.

## Requisitos funcionales
- Catálogo de modelos y límites con procedencia, fecha de verificación y nivel de confianza.
- Calculadora de consumo por modelo y total para cada ventana confirmada por fuentes actuales.
- Entrada manual de consumo por modelo y porcentaje observado en la consola de OpenCode Go.
- Comparación del valor estimado frente al observado, expresada también en puntos porcentuales.
- Simulador para comparar combinaciones de modelos y escenarios de uso.
- Historial local opcional.
- Importación/exportación JSON y CSV, con validación robusta y límites de tamaño.
- UI responsive, accesible, clara y profesional, con identidad visual coherente con una herramienta técnica de Operia Systems.
- Página de metodología, fuentes, limitaciones y aviso de que no es una aplicación oficial.
- Catálogo versionado, historial de cambios y estado de datos obsoletos.
- Tests unitarios y de integración para fórmulas, validación, parser y exportación/importación.

## Requisitos de calidad
- Usa TypeScript en modo estricto y funciones puras para el dominio.
- Mantén separación entre dominio, catálogo, persistencia, casos de uso y UI.
- Evita dependencias que no aporten valor claro.
- No añadas backend, login, telemetría o analítica invasiva al MVP.
- No envíes al servidor datos que el usuario introduzca; persistencia local.
- No inventes precios, modelos, ventanas ni límites.
- No confundas el límite de referencia de un modelo con saldo monetario disponible.
- Diferencia datos oficiales verificados, confirmados por soporte, manuales, estimados y desconocidos.
- No hagas scraping agresivo ni uses endpoints privados. Si no hay fuente estable, crea importación/edición manual y documenta la limitación.
- Si el catálogo oficial no puede actualizarse automáticamente de forma segura, no fuerces el scraping: deja una ruta manual y una herramienta de validación.
- Los cálculos deben seguir funcionando si la fuente externa no está disponible.
- No publiques nada en GitHub ni despliegues nada sin autorización explícita.

## Fórmula y verificación
Lee `docs/quota-model.md`. Verifica la metodología con la documentación vigente. No des por hecho que una fórmula basada en una respuesta de soporte aplica indefinidamente o a todas las ventanas. Si la fórmula es `100 * consumo_equivalente / límite_referencia`, implementa la suma de contribuciones únicamente para los casos en que la fuente confirme esa regla. Conserva unidad, moneda, periodo y desglose de tarifas; rechaza combinaciones incompatibles.

## Criterios de aceptación
- Un usuario puede abrir la app y hacer cálculos sin cuenta, API key o conexión a un proveedor de IA.
- Cada número del catálogo puede rastrearse hasta una fuente o se etiqueta como manual/no verificado.
- Los tests cubren casos normales, límites, entradas inválidas, datos faltantes y redondeo.
- La importación corrupta no sobrescribe el historial actual.
- El build, lint, typecheck y tests se ejecutan y sus resultados se reportan con honestidad.
- README, documentación y licencia están listos para revisión.
- No hay secretos, rutas absolutas del equipo del usuario ni datos personales en el repositorio.

## Libertad técnica
Puedes elegir estructura de carpetas, componentes y librerías adecuadas tras inspeccionar el entorno, pero documenta las decisiones importantes. Si el directorio está vacío, inicializa el proyecto con un stack ligero y compatible con despliegue estático cuando sea viable. Si ya existe una app, audítala y adapta el trabajo sin sobrescribir funcionalidades útiles.

Empieza ahora.

## Requisito obligatorio de web scraping
El web scraping de datos reales es una función prioritaria del producto. Debe existir una implementación funcional de extracción de fuentes públicas autorizadas; no basta con documentación, catálogo estático ni importación manual.

- Investiga fuentes oficiales concretas y su estructura actual. Prefiere API/JSON/feed oficial cuando exista; si no, usa parsers HTML específicos.
- Implementa adaptadores por fuente, timeouts, límites de tamaño y frecuencia, validación estricta y tests con fixtures.
- Añade «Actualizar catálogo», estado por fuente, fecha de última comprobación, registro de errores y diff de cambios.
- No apliques cambios ambiguos o inválidos. Conserva el último catálogo válido y solicita revisión cuando cambie la estructura.
- Si el despliegue es estático, usa un mecanismo real compatible, como GitHub Actions que prepare una propuesta revisable, o una función serverless limitada si es necesaria. No dependas de CORS del navegador ni crees un proxy abierto.
- No eludas CAPTCHA, autenticación, paywalls, controles anti-bot ni condiciones del proveedor. Si una fuente no puede consultarse de forma permitida, documenta el bloqueo y ofrece una alternativa manual.
- Registra URL, timestamp, método, parser, validación y cambios. Extraer un valor de una página no demuestra por sí solo que sea correcto.
- La función de scraping es un criterio obligatorio de aceptación del MVP.
