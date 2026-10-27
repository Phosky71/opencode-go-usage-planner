# Arquitectura inicial

> **Nota (2026-10-27):** este documento describe la propuesta inicial. La implementación final
> usa React 18 + Vite 5 + TypeScript, no Next.js. Consulta `docs/project-state.md` y
> `README.md` para el estado actual.

## Principios
- **Local-first:** el cálculo y los datos personales se procesan en el navegador.
- **Determinista:** una misma entrada validada produce siempre el mismo resultado.
- **Transparente:** toda cifra externa tiene procedencia, fecha y nivel de confianza.
- **Resiliente:** la aplicación sigue funcionando aunque falle la actualización del catálogo.
- **Ligera:** evitar backend, autenticación y dependencias innecesarias en el MVP.
- **Accesible:** navegación por teclado, etiquetas, contraste, estados claros y diseño responsive.

## Stack propuesto
El agente debe verificar el entorno y las versiones actuales antes de decidir. Preferencia inicial:
- Next.js App Router + React + TypeScript.
- Tailwind CSS si encaja con el entorno existente.
- Vitest (o runner equivalente ya presente) para lógica pura.
- Validación de esquemas con Zod solo si aporta valor real.
- Persistencia local con IndexedDB o almacenamiento local versionado; elegir según volumen y complejidad.
- Catálogo de referencia versionado en JSON dentro del repositorio.
- Despliegue estático si las funciones necesarias lo permiten, compatible con Cloudflare Pages cuando sea viable.

No introduzcas una base de datos remota en el MVP.

## Capas
1. **Domain:** tipos, validación, fórmulas, normalización de unidades, escenarios y comparaciones. Sin dependencia de UI ni red.
2. **Catalog:** datos versionados, procedencia, parser/validador y mecanismo manual de actualización.
3. **Persistence:** almacenamiento local, versionado de esquema, exportación/importación.
4. **Application:** casos de uso para calcular, simular, comparar y registrar snapshots.
5. **UI:** dashboard, catálogo, calculadora, simulador, historial y metodología.
6. **Data refresh tooling:** script manual o CI opcional que descarga únicamente fuentes públicas permitidas, compara cambios y falla de forma segura ante formatos inesperados.

## Actualización del catálogo
- Investigar primero si existe endpoint, feed, fichero JSON o tabla oficial mantenida.
- Si solo existe documentación HTML, extraer únicamente los campos necesarios y validar la estructura.
- No actualizar automáticamente el catálogo de producción si el parser detecta cambios inesperados.
- Mostrar fecha de última verificación y estado de fuente.
- Si una fuente falla, conservar el último catálogo válido y mostrar advertencia.
- Un workflow de CI puede abrir una propuesta de cambio, pero no publicar cambios no revisados automáticamente en la primera versión.

## Privacidad y seguridad
- No enviar los registros locales a Operia Systems ni a terceros.
- No pedir API keys.
- No almacenar datos sensibles.
- Validar y limitar tamaño de importaciones.
- Tratar el catálogo y los archivos importados como datos no confiables.
- Protegerse frente a XSS al importar texto/CSV/JSON; no renderizar HTML importado.
- No incorporar secretos en el bundle.
- Añadir política de privacidad concisa que describa el comportamiento real.

## Despliegue
- Repositorio público en GitHub cuando el usuario lo autorice.
- Dominio público en Operia Systems después de revisión manual.
- La aplicación debe funcionar en modo estático si es viable; no debe depender de un servicio de pago para cálculos.
- No ejecutar publicación ni despliegue sin permiso explícito.

## Subsistema de scraping y actualización
El scraping es una función central del producto. No debe resolverse únicamente con un botón que importe un fichero ni con una lista estática.

### Diseño
- `SourceRegistry`: lista versionada de fuentes autorizadas con URL, tipo de contenido, campos esperados, frecuencia razonable y método de extracción.
- `SourceAdapter`: un adaptador por fuente; usar API/JSON oficial cuando esté disponible y parser HTML específico cuando sea necesario.
- `Fetcher`: responsable de timeout, tamaño máximo, frecuencia y errores de red. No debe aceptar destinos arbitrarios introducidos por usuarios en el MVP; evitar SSRF.
- `Parser`: convierte la respuesta en candidatos tipados sin modificar el catálogo.
- `Validator`: valida esquema, unidades, moneda, fechas, rangos y campos obligatorios.
- `Diff`: compara los candidatos con el catálogo vigente y produce cambios explicables.
- `Review/Apply`: permite revisar y aceptar cambios. Mantener el catálogo válido anterior si el proceso falla.
- `Audit log`: guarda fuente, fecha, resultado, versión y campos cambiados.

### Ejecución
Si el producto se despliega como sitio estático, la extracción no puede depender de CORS del navegador. El agente debe elegir un mecanismo real y viable:
1. Preferir una GitHub Action programada que genere una propuesta de actualización o artefacto revisable; o
2. Usar una función serverless de alcance limitado solo si es necesaria y compatible con las condiciones de las fuentes.

No implementar un proxy abierto ni permitir que el usuario introduzca URLs arbitrarias que el servidor vaya a descargar. No exponer endpoints privados ni secretos. Si no hay una forma de extracción permitida para una fuente, documentarlo y mantenerla fuera del scraping automático.

### Frecuencia y fallos
- No consultar más a menudo de lo necesario.
- Aplicar timeouts y límites de tamaño.
- Reintentos limitados solo ante errores transitorios.
- No borrar un dato si una consulta devuelve un error o un resultado vacío inesperado.
- Si el parser detecta un cambio de estructura, fallar de forma segura y mostrar la necesidad de revisión.
