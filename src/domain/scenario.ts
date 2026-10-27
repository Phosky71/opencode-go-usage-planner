import { z } from 'zod';

export const SCENARIO_VERSION = 1;
export const SCENARIO_STORAGE_KEY = 'operia.planner.scenario.v1';
export const MAX_SCENARIO_BYTES = 256 * 1024;
export const MAX_SCENARIO_ITEMS = 200;

const numericText = z
  .string()
  .max(16)
  .regex(/^\d*(?:[.,]\d*)?$/, 'Debe ser un número positivo');

const positiveNumber = z
  .number()
  .nonnegative()
  .refine(Number.isFinite, 'Debe ser un número finito');

const entrySchema = z.object({
  modelId: z.string().min(1).max(200),
  consumptionUsd: positiveNumber,
}).strict();

const hypothesisSchema = z.object({
  modelId: z.string().min(1).max(200),
  amountUsd: positiveNumber,
}).strict();

export const ScenarioSchema = z.object({
  version: z.literal(SCENARIO_VERSION),
  exportedAt: z.string().datetime().optional(),
  plan: z.enum(['go', 'go-plus']),
  entries: z.array(entrySchema).max(MAX_SCENARIO_ITEMS),
  observedPercent: numericText,
  hypotheses: z.array(hypothesisSchema).max(MAX_SCENARIO_ITEMS),
  budgetUsd: numericText,
  budgetAllocations: z
    .record(z.string(), positiveNumber)
    .refine(
      (value) => Object.keys(value).length <= MAX_SCENARIO_ITEMS,
      `No puede haber más de ${MAX_SCENARIO_ITEMS} asignaciones`,
    ),
}).strict();

export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenarioHypothesis = z.infer<typeof hypothesisSchema>;

export function createEmptyScenario(plan: Scenario['plan'] = 'go'): Scenario {
  return {
    version: SCENARIO_VERSION,
    plan,
    entries: [],
    observedPercent: '',
    hypotheses: [],
    budgetUsd: '',
    budgetAllocations: {},
  };
}

export function parseScenario(input: unknown): Scenario | null {
  const result = ScenarioSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function parseScenarioJson(raw: string): Scenario | null {
  try {
    return parseScenario(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function unknownScenarioModelIds(scenario: Scenario, availableIds: ReadonlySet<string>): string[] {
  const used = new Set<string>();
  for (const entry of scenario.entries) used.add(entry.modelId);
  for (const hypothesis of scenario.hypotheses) used.add(hypothesis.modelId);
  for (const modelId of Object.keys(scenario.budgetAllocations)) used.add(modelId);
  return [...used].filter((modelId) => !availableIds.has(modelId));
}

export function serializeScenario(scenario: Scenario): string {
  return JSON.stringify({
    ...scenario,
    exportedAt: new Date().toISOString(),
  }, null, 2);
}
