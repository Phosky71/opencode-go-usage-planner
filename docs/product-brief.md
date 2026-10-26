# Product brief

## Nombre provisional
OpenCode Go Usage Planner.

El nombre es provisional y puede cambiar tras comprobar colisiones de marca y disponibilidad de repositorio/dominio.

## Problema
Las cuotas de OpenCode Go pueden resultar difíciles de interpretar cuando los modelos tienen distintos límites de referencia y contribuyen de forma diferente a una asignación compartida. La persona usuaria necesita estimar el impacto de sus elecciones de modelo, comparar el porcentaje calculado con el porcentaje observado en la consola y planificar el uso restante.

## Usuarios
- Personas que usan OpenCode Go y alternan modelos con diferentes límites de referencia.
- Usuarios que quieren planificar sesiones de programación asistida por agentes.
- Personas que desean registrar consumo histórico sin entregar sus datos a un servicio externo.

## Propuesta de valor
Una calculadora transparente, independiente y local-first que explica de dónde sale cada cifra, permite simular escenarios y evita presentar estimaciones como si fueran datos oficiales.

## MVP
1. Catálogo editable de modelos con nombre, proveedor, precio/tarifa publicada si está disponible, límite de referencia aplicable, moneda/unidad, URL de fuente, fecha verificada, estado de confianza y notas.
2. Calculadora por modelo y total para cada ventana soportada por las fuentes oficiales.
3. Introducción manual de consumo por modelo y porcentaje mostrado por la consola.
4. Comparación entre estimación y porcentaje observado, con diferencia absoluta y advertencia de que puede haber diferencias de redondeo, periodo, caché, tokens o metodología.
5. Simulador de escenarios: asignar consumos previstos a modelos y calcular el impacto estimado.
6. Historial local opcional, editable, con importación/exportación JSON y CSV.
7. Interfaz responsive, accesible, en español inicialmente y preparada para internacionalización.
8. Página de metodología, fuentes, limitaciones y no afiliación.
9. Tests automáticos para fórmulas, redondeos, validación de datos e importación/exportación.

## Fuera de alcance del MVP
- Inicio de sesión, cuentas o base de datos de usuarios en servidor.
- Conectar con cuentas privadas de OpenCode o extraer datos de sesión/cookies.
- Envío automático de datos personales o telemetría.
- Prometer previsiones exactas de disponibilidad futura.
- Recomendaciones de calidad de modelo basadas en afirmaciones no contrastadas.
- Hacer llamadas de IA para efectuar cálculos matemáticos.

## Criterios de producto
- Una persona puede utilizar la calculadora sin registrarse y sin introducir claves.
- Cada dato de catálogo puede rastrearse hasta su fuente o aparece claramente como dato manual/no verificado.
- La app distingue cálculo matemático de observación real de consola.
- Las operaciones se explican en lenguaje comprensible.
- Los datos de usuario permanecen en el dispositivo salvo que la persona los exporte.

## Requisito prioritario: scraping y actualización real
La app debe incluir un sistema real para obtener los datos actuales de fuentes web públicas autorizadas. La importación manual es solo una alternativa de respaldo, no un sustituto de esta función.

El sistema debe incluir:
- Actualización bajo demanda desde la interfaz.
- Adaptadores/parsers por fuente.
- Validación de esquema y reglas de plausibilidad.
- Vista previa/diff de cambios antes de aceptarlos.
- Historial de cambios y procedencia por campo.
- Última comprobación, resultado y errores.
- Último catálogo válido conservado si una extracción falla.
- Tests de parsers con fixtures y detección de cambios de estructura.
- Actualización programada opcional a través de un mecanismo compatible con el despliegue.
