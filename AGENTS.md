# Instrucciones del agente

## Misión
Construir una aplicación web open source, fiable y fácil de entender para modelar el consumo de las cuotas compartidas de OpenCode Go.

## Reglas no negociables
1. Investiga las fuentes oficiales actuales antes de implementar cualquier catálogo de modelos, precio o límite. La información previa del usuario sirve como hipótesis, no como fuente verificable.
2. Distingue en la interfaz y en el código: `official_verified`, `user_entered`, `estimated` y `unknown`. Incluye URL, fecha de consulta y notas para cada dato externo relevante.
3. Nunca inventes un modelo, un precio, un límite, una ventana, un endpoint o una política del proveedor.
4. No hagas scraping agresivo, no eludas controles, no uses APIs privadas ni métodos que contradigan los términos del proveedor. Respeta robots.txt y condiciones aplicables. Prefiere API/feed oficial o contenido estructurado; si no existe, usa un extractor pequeño, probado y tolerante a fallos.
5. No expongas tokens, claves, cookies, datos personales ni variables de entorno. No pidas credenciales al usuario para que la aplicación funcione.
6. El cálculo de cuotas debe ser determinista, probado y funcionar sin conexión a un modelo de IA.
7. La aplicación pública no debe enviar los datos introducidos por el usuario a un servidor. Preferir procesamiento en el cliente y persistencia local. No añadir analítica invasiva.
8. No dependas en tiempo de ejecución de Free LLM API ni de ningún proveedor de IA. El usuario puede usar su proveedor conectado en OpenCode para desarrollar; eso no debe convertirse en requisito del producto.
9. No ejecutes acciones irreversibles ni externas sin autorización: no publiques paquetes, no crees repositorios remotos, no despliegues, no envíes correos ni contactes con soporte.
10. No afirmes que la aplicación es oficial ni que soporte la avala. Añade una nota de no afiliación.
11. Evita sobreingeniería. Mantén las dependencias ajustadas y explica toda dependencia importante.
12. Nunca afirmes que una prueba, build o auditoría ha pasado si no se ha ejecutado realmente.

## Forma de trabajo
- Inspecciona primero el directorio, el sistema de archivos y las herramientas disponibles.
- Si el directorio ya contiene trabajo, consérvalo y audita antes de modificar.
- Resume hallazgos y decisiones; crea una lista de tareas verificable.
- Implementa en pasos pequeños, ejecutando pruebas y lint/typecheck/build cuando estén disponibles.
- Si un comando falla, diagnostica y corrige el problema en lugar de ocultarlo.
- Mantén `README.md`, documentación y changelog alineados con la implementación.
- Añade pruebas para los cálculos, el parser y las importaciones/exportaciones.
- Antes de finalizar, presenta estado real, comandos ejecutados, resultados, limitaciones y pasos manuales pendientes.

## Requisito prioritario: extracción web de datos reales
La aplicación debe incluir una capacidad de actualización de catálogo mediante extracción web (web scraping) de fuentes públicas autorizadas. No la sustituyas por un catálogo estático ni por una simple importación manual.

- Antes de implementar, identifica las páginas oficiales concretas que contienen los datos relevantes y comprueba las condiciones de acceso, robots.txt y términos aplicables.
- Prioriza APIs, feeds o JSON oficiales si existen; si no, implementa scraping de HTML público autorizado, con parsers específicos por fuente y tests con fixtures.
- Añade una acción visible de «Actualizar catálogo» en una zona de administración/herramientas accesible sin credenciales de proveedor. La actualización debe mostrar el resultado, la hora de consulta, las fuentes revisadas y los errores.
- La extracción debe ser segura, conservadora y respetuosa: límites de frecuencia, timeouts, user-agent identificable si procede, sin eludir autenticación, CAPTCHA, paywalls, controles anti-bot ni límites de acceso.
- Valida cada campo y rango antes de aceptar datos. Si la página cambia, un valor es ambiguo o falla la validación, no sobrescribas el último catálogo válido.
- Presenta un diff antes de aplicar cambios relevantes; permite revisar y aceptar cambios. Las actualizaciones automáticas en CI deben abrir una propuesta/reporte para revisión, no cambiar silenciosamente datos de producción.
- Guarda para cada dato la URL exacta de la fuente, fecha/hora de consulta, método, estado de validación, evidencia mínima apropiada y valor anterior cuando corresponda. No guardes contenido extenso protegido ni datos personales innecesarios.
- Implementa pruebas automatizadas para los parsers con HTML de ejemplo versionado, casos de formato inesperado, valores ausentes y errores de red.
- Si el hosting estático no permite hacer scraping desde el navegador por CORS o seguridad, no finjas que el botón funciona: diseña un mecanismo real mediante una función serverless o GitHub Actions, sujeto a las condiciones de la fuente. Mantén el cálculo principal local.
- Explica qué fuente se ha consultado, qué se ha extraído, qué se ha validado y qué no pudo confirmarse. Nunca etiquetes un dato como «oficial verificado» solo porque un parser lo haya leído.
