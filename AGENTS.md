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

## 🛑 REGLA ABSOLUTA DE SEGURIDAD PRE-COMMIT
Queda terminantemente prohibido ejecutar `git commit` o `git push` sin haber ejecutado previamente `operia-code-gate` (que orquesta `operia-test-destroyer` y `operia-diff-auditor`) sobre los cambios actuales. Si detectas la intención de commitear, intercepta la acción, ejecuta el gate, muestra el semáforo y espera confirmación explícita.

## 💰 PROTOCOLO DE AHORRO DE TOKENS (MODELOS DE PAGO / CUOTAS LIMITADAS)
Si estás ejecutando sobre un modelo comercial de pago, endpoint tarifado por tokens o el usuario solicita optimización de consumo, activa y cumple estrictamente las directivas de `operia-token-saver`: cero relleno conversacional, lecturas de código quirúrgicas mediante rangos de líneas o búsquedas dirigidas (PowerShell `Select-String` / Git Bash `grep`, prohibido volcar archivos >150 líneas) y modificaciones atómicas vía diff.

## 💻 GUÍA DE COMANDOS COMPATIBLES (POWERSHELL 5.1 / 7 Y GIT BASH)
Al inspeccionar archivos o filtrar salidas en Windows, utiliza siempre comandos compatibles según la shell activa:
- Búsqueda en archivo: `Select-String -Path .\archivo -Pattern "texto"` (PowerShell) o `grep -n "texto" archivo` (Git Bash).
- Filtrar logs por tubería: `git status | Select-String "modified"` (PowerShell) o `git status | grep "modified"` (Git Bash).
- Primeras N líneas: `Get-Content .\archivo -TotalCount N` o `| Select-Object -First N` (PowerShell) / `head -n N archivo` (Git Bash).
- Últimas N líneas: `Get-Content .\archivo -Tail N` o `| Select-Object -Last N` (PowerShell) / `tail -n N archivo` (Git Bash).
- Comprobar existencia: `Test-Path .\ruta\archivo` (PowerShell) / `test -f ruta/archivo` (Git Bash).

## 🧱 ESTÁNDAR OBLIGATORIO DE GRADLE

**Versión corporativa fijada: Gradle 9.9.1.**

1. Todo proyecto que utilice Gradle DEBE utilizar Gradle 9.9.1 mediante Gradle Wrapper (`gradlew` / `gradlew.bat`).
2. Todo proyecto nuevo cuya arquitectura seleccione Gradle DEBE inicializarse directamente con Gradle 9.9.1.
3. Al ejecutar esta skill en un repositorio existente que utilice Gradle, se DEBE detectar la versión actual, comprobar compatibilidad y migrar el Wrapper a Gradle 9.9.1.
4. Si el proyecto no utiliza Gradle y su arquitectura tampoco lo requiere, NO se debe añadir Gradle, crear un Wrapper ni instalarlo globalmente.
5. No se permiten versiones alternativas, nightly, snapshot, milestone ni release candidate de Gradle.
6. Los agentes NO pueden cambiar, actualizar o degradar la versión fijada por iniciativa propia.
7. Antes de migrar, verificar compatibilidad con Java, Android Gradle Plugin (AGP), Kotlin Gradle Plugin (KGP), frameworks y plugins de terceros.
8. Si existe una incompatibilidad, investigar primero la actualización del componente incompatible. Si no puede resolverse con seguridad, detener la migración y solicitar autorización explícita. Está prohibido introducir silenciosamente otra versión de Gradle.
9. Utilizar siempre el Wrapper del repositorio; no depender de una instalación global de Gradle.
10. Mantener sincronizados los Wrapper de todos los subproyectos e builds incluidos que formen parte del mismo sistema, siempre que sean compatibles.
11. Esta skill no debe borrar cachés ni distribuciones globales de Gradle. Esa limpieza requiere una operación de mantenimiento independiente y autorización explícita.
12. La versión estándar solo puede cambiar mediante autorización expresa del usuario.

**Nota:** Gradle 9.9.1 es la versión estándar fijada por Operia; no debe describirse como una versión LTS oficial de Gradle.
