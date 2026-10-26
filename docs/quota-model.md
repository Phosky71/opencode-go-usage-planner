# Modelo matemático de cuotas

## Advertencia
Este documento define el cálculo basado en la explicación de soporte que el usuario recibió. Antes de lanzar la app, verifica que la documentación oficial vigente describe la misma metodología. Si no se puede confirmar, presenta el modelo como una metodología documentada por el usuario a partir de una respuesta de soporte, no como una garantía universal.

## Fórmula de contribución por modelo
Si la fuente aplicable define un límite de referencia `L_i` para el modelo i y el consumo facturable equivalente del modelo es `C_i`, su contribución porcentual estimada es:

`p_i = 100 * C_i / L_i`

La contribución total estimada para una ventana es:

`P = sum(p_i)`

La fórmula solo es válida si `C_i` y `L_i` usan la misma moneda, unidad y periodo de referencia y si la metodología oficial establece que el consumo se combina así.

### Ejemplo didáctico, no catálogo actual
- Modelo A: consumo equivalente de 10 unidades monetarias; límite de referencia 80 → contribución 12,5%.
- Modelo B: consumo equivalente de 2 unidades monetarias; límite de referencia 20 → contribución 10%.
- Total estimado: 22,5%.

No interpretar el límite de referencia como saldo en dinero que la suscripción entrega al usuario. El campo representa el denominador de la fórmula, según la explicación de soporte, no un crédito monetario independiente.

## Unidades y precios
- No mezclar USD con EUR ni precios por millón de tokens con consumo total sin normalizar.
- Si los precios dependen de tokens de entrada, salida, caché u otras categorías, modelar cada componente por separado únicamente si las tarifas actuales están verificadas.
- Si la app no dispone de tokens reales o de una factura de consumo por modelo, el cálculo monetario será una estimación, no una medición.
- Guardar moneda, unidad, periodo, fuente y fecha de verificación con cada tarifa.
- Usar aritmética decimal o enteros escalados cuando sea razonable para evitar errores de coma flotante en cálculos financieros; documentar el redondeo.
- Mostrar porcentajes con precisión suficiente para explicar el cálculo, sin fingir exactitud más allá de los datos de entrada.

## Ventanas
La existencia, duración, reset y regla exacta de cada ventana debe verificarse en fuentes actuales. No codificar a fuego 5 horas, semanal o mensual hasta confirmar la política vigente. Modelar las ventanas como datos configurables/versionados si el producto necesita soportar cambios.

## Comparación con la consola
Distinguir:
- `estimatedPercent`: calculado con los datos introducidos y el catálogo vigente.
- `observedPercent`: porcentaje escrito manualmente por el usuario desde la consola.
- `differencePercentagePoints = estimatedPercent - observedPercent`.

No afirmar que la diferencia demuestra un error del proveedor. Puede deberse a periodos distintos, redondeo, cambios de tarifa, categorías de tokens, caché, actualización diferida, límites modificados o una interpretación incorrecta del modelo.

## Escenarios
Un escenario debe guardar sus propias entradas y la versión del catálogo usada. Etiquetar el resultado como estimación y no como garantía de cuota disponible.

## Casos de prueba mínimos
1. Consumo cero produce 0%.
2. Consumo igual al límite produce 100%.
3. Dos contribuciones se suman correctamente.
4. Límites cero, negativos, NaN o no finitos se rechazan.
5. Una moneda/unidad incompatible se rechaza o requiere conversión explícita y trazable.
6. Datos ausentes/no verificados producen resultado incompleto, no un número inventado.
7. El redondeo de presentación no cambia el valor interno.
8. La diferencia con el porcentaje observado conserva signo y se muestra en puntos porcentuales.
9. Una importación malformada no rompe ni sobrescribe los datos actuales.
10. Los ejemplos documentados se verifican con tests automatizados.
