# Gobierno y calidad de datos

## Estados de procedencia
- `official_verified`: confirmado en una fuente oficial accesible, con URL y fecha.
- `support_confirmed`: confirmado en una respuesta de soporte facilitada por el usuario; indicar que no equivale necesariamente a documentación pública.
- `user_entered`: introducido por la persona usuaria.
- `estimated`: calculado a partir de datos incompletos o supuestos explícitos.
- `unknown`: no se ha podido verificar.

No mezclar el estado de procedencia con la calidad del modelo ni con su popularidad.

## Campos recomendados
- `id`, `displayName`, `provider`
- tarifas: componentes, unidad, moneda, periodo y fecha de vigencia cuando existan
- límite de referencia por ventana y unidad
- `sourceUrl`, `checkedAt`, `sourceType`, `confidence`, `notes`
- `catalogVersion`, `lastChangedAt`
- estado activo/retirado solo si existe evidencia.

Usa tipos estrictos y validación. No todas las fuentes tendrán todos los campos; permite datos incompletos de forma explícita.

## Fuentes
Prioridad:
1. Documentación oficial de OpenCode/OpenCode Go.
2. APIs o ficheros oficiales documentados.
3. Respuesta de soporte que aporte el usuario, etiquetada como tal.
4. Otras fuentes públicas únicamente como contexto secundario, sin presentarlas como política oficial.

No utilizar capturas de terceros, posts de Reddit ni conversaciones antiguas como fuente definitiva de límites actuales.

## Cambios
- Registrar en el changelog qué dato ha cambiado, fuente y fecha.
- Mantener snapshots/versiones de catálogo para que los cálculos históricos sean interpretables.
- Si una fuente cambia de estructura, fallar de forma segura y solicitar revisión.
- Evitar borrar un modelo o límite solo porque una consulta puntual haya fallado.
- Mostrar “última comprobación” y un aviso si los datos están desactualizados.

## Transparencia pública
Añadir una página de fuentes y metodología. La aplicación es independiente, no oficial y no está avalada por OpenCode salvo que exista una autorización pública expresa.

## Procedencia específica de scraping
Cada ejecución de extracción debe registrar:
- Fuente identificada y URL consultada.
- Fecha/hora UTC de consulta.
- Método de extracción (API/JSON/HTML).
- Estado HTTP y resultado de validación, sin almacenar cabeceras o cookies sensibles.
- Versión del parser y del catálogo.
- Campos candidatos extraídos y cambios respecto al catálogo anterior.
- Evidencia mínima que permita verificar el campo, respetando derechos y condiciones de la fuente.
- Motivo de rechazo de cualquier campo inválido.

Un campo extraído no equivale automáticamente a un campo verificado. `official_verified` requiere que la fuente sea realmente oficial, el campo se haya interpretado correctamente y la validación haya pasado. Los valores ambiguos deben quedar pendientes de revisión.
