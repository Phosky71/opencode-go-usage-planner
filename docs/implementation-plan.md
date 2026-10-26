# Plan de implementación

## Fase 0 — Inspección y verificación
- Inspeccionar el repositorio y el entorno.
- Leer todos los documentos del starter kit.
- Investigar documentación oficial actual, condiciones de uso y disponibilidad de datos estructurados.
- Confirmar qué ventanas, límites, tarifas y modelos pueden verificarse.
- Proponer un resumen de arquitectura final y riesgos.
- No inventar el catálogo para poder avanzar.

## Fase 1 — Esqueleto y dominio
- Inicializar o adaptar el proyecto según el entorno real.
- Definir tipos y validación del catálogo.
- Implementar funciones puras de cálculo y escenarios.
- Añadir tests unitarios de fórmulas, unidades, errores y redondeo.
- Configurar lint, typecheck y build.

## Fase 2 — MVP funcional
- Dashboard con ventanas verificadas.
- Catálogo y detalle de procedencia por modelo.
- Calculadora de consumo por modelo.
- Campo para porcentaje observado en la consola.
- Comparador calculado/observado.
- Simulador de escenarios.
- Importación/exportación de datos locales.
- Persistencia local con manejo de errores.

## Fase 3 — Calidad y accesibilidad
- Responsive y teclado.
- Estados vacíos, datos incompletos y fallos de fuente.
- Pruebas de integración para importación/exportación.
- Revisión de privacidad, accesibilidad y seguridad.
- Revisar dependencias y peso del bundle.

## Fase 4 — Datos y documentación
- Implementar extractor solo si la fuente lo permite y se puede probar.
- Mantener catálogo válido si falla la extracción.
- Añadir workflow opcional para detectar cambios y proponer revisión.
- Documentar metodología, límites y no afiliación.
- README con capturas solo si se generan de la app real.

## Fase 5 — Preparación de publicación
- Ejecutar tests, lint, typecheck, build y auditorías disponibles.
- Verificar que no hay secretos, datos personales o rutas locales.
- Preparar licencia MIT y changelog.
- Preparar guía de despliegue para Cloudflare Pages/Operia Systems.
- Dejar el proyecto listo para revisión humana.
- No crear el remoto, publicar ni desplegar sin autorización.

## Definición de terminado
- Build y verificaciones reales pasan.
- Las fórmulas tienen cobertura de tests razonable.
- Ningún dato no verificado aparece como oficial.
- No hay llamadas de red necesarias para la calculadora.
- No hay telemetría ni envío de datos de usuario.
- README y documentación reflejan el código real.
- Se enumeran explícitamente limitaciones y tareas manuales pendientes.

## Fase 2B — Scraping funcional (prioridad alta)
- Identificar y documentar fuentes oficiales públicas concretas.
- Comprobar si existe una API/feed/JSON antes de recurrir a HTML.
- Implementar adaptadores por fuente y extracción real con límites de seguridad.
- Añadir botón de actualización y estado de cada fuente.
- Añadir validación, diff revisable, historial y conservación del último catálogo válido.
- Crear fixtures y tests para HTML/JSON reales anonimizados o representativos y para fallos de estructura.
- Implementar actualización programada opcional que produzca una propuesta revisable.
- Documentar las fuentes que no se pueden automatizar y por qué.

Esta fase es obligatoria para el MVP: la aplicación no se considera completa si solo contiene un catálogo estático o solo permite editarlo manualmente.
