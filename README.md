# OpenCode Go Usage Planner — Starter Kit

Proyecto open source para entender, calcular y planificar el consumo de cuotas compartidas de OpenCode Go.

Este directorio es un **brief arquitectónico y operativo inicial**, no una implementación terminada. Está diseñado para que un agente de OpenCode inspeccione el entorno, investigue las fuentes oficiales, proponga decisiones justificadas y construya la aplicación por fases.

## Objetivos

- Explicar con transparencia cómo contribuye cada modelo al consumo de las ventanas de cuota.
- Permitir introducir manualmente consumo/precio por modelo y los porcentajes observados en la consola.
- Simular combinaciones de modelos y estimar cuánto presupuesto de cuota consumen.
- Mostrar claramente datos oficiales verificados, datos inferidos y datos introducidos por el usuario.
- Publicar el código en GitHub y poder desplegar una versión pública en Operia Systems.
- Mantener los cálculos locales y deterministas; la aplicación no debe necesitar una API de IA para calcular.

## Antes de implementar

1. Lee `AGENTS.md` y todos los documentos de `docs/`.
2. Investiga la documentación y fuentes oficiales actuales de OpenCode Go.
3. No des por válidos nombres, precios o límites copiados de conversaciones anteriores sin verificarlos.
4. Si la documentación no permite confirmar un dato, márcalo como desconocido/no verificado; no lo inventes.
5. Después, crea un plan por fases y empieza a implementar sin esperar aprobación para tareas reversibles y de bajo riesgo.
6. No publiques, despliegues, crees repositorios remotos ni envíes mensajes externos sin autorización explícita.

## Documentos

- `AGENTS.md`: instrucciones para el agente.
- `docs/product-brief.md`: problema, usuarios, alcance y fuera de alcance.
- `docs/architecture.md`: arquitectura inicial y principios técnicos.
- `docs/quota-model.md`: fórmulas, supuestos y casos de prueba.
- `docs/data-governance.md`: procedencia, frescura y confianza de los datos.
- `docs/implementation-plan.md`: fases de trabajo y definición de terminado.
- `docs/opencode-master-prompt.md`: prompt listo para iniciar el trabajo en OpenCode.
- `docs/support-feedback-draft.md`: borrador opcional para soporte, una vez publicada y verificada la aplicación.

## Licencia propuesta

MIT, salvo que el agente detecte una razón concreta y documentada para recomendar otra. No copies contenido protegido de terceros más allá de lo permitido; enlaza y atribuye las fuentes.
