import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { Calculator } from '../ui/components/Calculator';
import { CatalogProvider } from '../context/CatalogContext';
import { Model } from '../domain/models';

// Mock a simple catalog for the test environment
const mockCatalog: Model[] = [
  {
    id: 'glm-5.3',
    displayName: 'GLM 5.3',
    provider: 'OpenCode',
    monthlyLimitUsd: 15,
    priceInputUsd: 1.4,
    priceOutputUsd: 4.4,
    sourceUrl: 'https://example.com',
    checkedAt: new Date().toISOString(),
    sourceType: 'official_verified',
    confidence: 'high',
  },
];

jest.mock('../catalog/catalog', () => ({
  loadCatalog: () => mockCatalog,
  saveCatalog: jest.fn(),
}));

describe('Calculator UI integration', () => {
  test('adds entry and calculates total correctly', async () => {
    render(
      <CatalogProvider>
        <Calculator />
      </CatalogProvider>,
    );
    // Wait for the catalog to load
    await waitFor(() => screen.getByText('Calculadora de consumo'));

    // Select model
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'glm-5.3' } });
    // Input consumption
    fireEvent.change(screen.getByPlaceholderText('Consumo USD'), { target: { value: '7.5' } });
    // Click add
    fireEvent.click(screen.getByText('Añadir'));

    // Verify entry appears
    expect(screen.getByText('GLM 5.3: $7.5')).toBeInTheDocument();

    // Set observed percent
    fireEvent.change(screen.getByLabelText('Porcentaje observado (desde consola):'), {
      target: { value: '50' },
    });

    // Click calculate
    fireEvent.click(screen.getByText('Calcular'));

    // Verify result
    await waitFor(() => screen.getByText(/Total estimado:/));
    expect(screen.getByText('Total estimado: 50.00 %')).toBeInTheDocument();
    expect(screen.getByText('Diferencia (puntos %): 0.00')).toBeInTheDocument();
  });
});
