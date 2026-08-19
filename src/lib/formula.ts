/**
 * Safe formula evaluator for calculated test types.
 *
 * The formula uses aliases in braces that reference:
 *   - Other test types (by alias defined in formulaInputs)
 *   - Built-in athlete variables: {age}, {poids}, {taille}
 *
 * Examples:
 *   "{distance} / {temps} * 3.6"  → speed from distance + time
 *   "{gauche} + {droite}"         → total from two unilateral tests
 *   "({poids} * {reps}) / 100"    → relative load
 */

export interface FormulaInput {
  testTypeId: string
  alias: string
}

export interface FormulaContext {
  /** Resolve a test type alias to its latest numeric value for the athlete */
  getTestValue: (testTypeId: string) => Promise<number | null>
  /** Built-in athlete data */
  athlete: {
    age?: number | null
    poids?: number | null
    taille?: number | null
    genre?: number | null
  }
}

/**
 * Safely evaluate a formula by substituting {aliases} with values from the context.
 * Returns null if any required input is missing or the expression is invalid.
 */
export async function evaluateFormula(
  formula: string,
  inputs: FormulaInput[],
  ctx: FormulaContext
): Promise<number | null> {
  if (!formula || !formula.trim()) return null

  let expression = formula

  // 1. Resolve test type aliases
  for (const input of inputs) {
    const val = await ctx.getTestValue(input.testTypeId)
    if (val === null || val === undefined || Number.isNaN(Number(val))) {
      return null // missing input data
    }
    const placeholder = `{${input.alias}}`
    expression = expression.split(placeholder).join(`(${Number(val)})`)
  }

  // 2. Resolve built-in athlete variables
  const builtins: Record<string, number | null | undefined> = {
    age: ctx.athlete.age,
    poids: ctx.athlete.poids,
    taille: ctx.athlete.taille,
    genre: ctx.athlete.genre,
  }
  for (const [key, val] of Object.entries(builtins)) {
    const placeholder = `{${key}}`
    if (expression.includes(placeholder)) {
      if (val === null || val === undefined || Number.isNaN(Number(val))) {
        return null
      }
      expression = expression.split(placeholder).join(`(${Number(val)})`)
    }
  }

  // 3. Check for any remaining unresolved braces
  if (/\{|}/.test(expression)) return null

  // 4. Only allow safe characters
  if (!/^[0-9+\-*/().,\s]+$/.test(expression)) return null

  // 5. Normalize commas as decimal separators
  expression = expression.replace(/,/g, ".")

  // 6. Reject division by zero / empty expression
  if (!expression.trim()) return null
  if (/\/\s*0(\.0+)?([^0-9]|$)/.test(expression)) return null

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${expression});`)
    const result = fn()
    if (typeof result !== "number" || Number.isNaN(result) || !Number.isFinite(result)) {
      return null
    }
    return result
  } catch {
    return null
  }
}

/**
 * Round a calculated value to a sensible precision (2 decimals by default).
 */
export function roundTo(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}