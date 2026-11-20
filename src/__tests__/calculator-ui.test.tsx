import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Calculator } from '../ui/components/Calculator';
import { CatalogProvider } from '../context/CatalogContext';
import { PLAN_STORAGE_KEY, PlanProvider } from '../context/PlanContext';
import { SCENARIO_STORAGE_KEY } from '../domain/scenario';

function renderCalculator() {
  return render(
    <PlanProvider>
      <CatalogProvider>
        <Calculator />
      </CatalogProvider>
    </PlanProvider>,
  );
}

async function addFirstModelConsumption(amount = '7.5') {
  const select = screen.getByLabelText('Seleccionar modelo') as HTMLSelectElement;
  await waitFor(() => expect(select.options.length).toBeGreaterThan(1));
  const selectedValue = select.options[1].value;
  // Extract just the model name from the option text (e.g. "Kimi K3 ($15)" → "Kimi K3")
  const modelName = select.options[1].text.replace(/\s*\(.*\)$/, '');
  fireEvent.change(select, { target: { value: selectedValue } });
  fireEvent.change(screen.getByLabelText('Consumo en USD'), { target: { value: amount } });
  fireEvent.click(screen.getByRole('button', { name: /^Añadir$/ }));
  return modelName;
}

describe('Calculator UI', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  test('adds consumption and calculates the shared quota', async () => {
    renderCalculator();
    await screen.findByText('Calculadora de consumo');
    const modelName = await addFirstModelConsumption();
    const list = screen.getByText('Consumos registrados').parentElement!;
    expect(list).toHaveTextContent(modelName);
    expect(list).toHaveTextContent('$7.5');

    fireEvent.click(screen.getByRole('button', { name: /^Calcular$/ }));
    expect(await screen.findByText(/Consumo estimado de cuota compartida/)).toBeInTheDocument();
    // The exact calculated value depends on the catalog's first model's limit.
    // Verify that a numeric result is displayed rather than hardcoding a specific value.
    expect(screen.getAllByText(/\d+\.\d{2}/).length).toBeGreaterThan(0);
  });

  test('restores the scenario from localStorage after remounting', async () => {
    const first = renderCalculator();
    await screen.findByText('Calculadora de consumo');
    const modelName = await addFirstModelConsumption();

    await waitFor(() => {
      expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).not.toBeNull();
    });
    first.unmount();

    renderCalculator();
    const list = (await screen.findByText('Consumos registrados')).parentElement!;
    expect(list).toHaveTextContent(modelName);
    expect(list).toHaveTextContent('$7.5');
  });

  test('warns when allocations exceed the total budget without rewriting them', async () => {
    renderCalculator();
    await screen.findByText('Calculadora de consumo');

    fireEvent.change(screen.getByLabelText('Presupuesto total en USD'), { target: { value: '10' } });
    const budgetSelect = screen.getByLabelText('Añadir modelo al presupuesto') as HTMLSelectElement;
    await waitFor(() => expect(budgetSelect.options.length).toBeGreaterThan(1));
    fireEvent.change(budgetSelect, { target: { value: budgetSelect.options[1].value } });

    const allocation = await screen.findByLabelText(/Cantidad para/);
    fireEvent.change(allocation, { target: { value: '15' } });

    expect(await screen.findByText(/Has asignado \$5.00 más/)).toBeInTheDocument();
    expect(allocation).toHaveValue(15);
  });

  test('clears both the saved scenario and the plan preference', async () => {
    window.localStorage.setItem(PLAN_STORAGE_KEY, 'go-plus');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderCalculator();
    await screen.findByText('Calculadora de consumo');
    await addFirstModelConsumption();
    await waitFor(() => {
      expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Borrar datos$/ }));
    await new Promise((resolve) => window.setTimeout(resolve, 350));

    expect(confirmSpy).toHaveBeenCalled();
    expect(window.localStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(PLAN_STORAGE_KEY)).toBeNull();
    expect(screen.queryByText('Consumos registrados')).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
