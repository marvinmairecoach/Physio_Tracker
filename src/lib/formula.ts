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

export interface FormulaResult {
  value: number | null
  /** Aliases that could not be resolved at all (not in inputs or builtins) */
  unknownAliases: string[]
  /** Variables that were found but had no value (null) */
  missingInputs: string[]
}

/**
 * Safely evaluate a formula by substituting {aliases} with values from the context.
 * Returns a FormulaResult with detailed diagnostic information.
 */
export async function evaluateFormula(
  formula: string,
  inputs: FormulaInput[],
  ctx: FormulaContext
): Promise<FormulaResult> {
  const result: FormulaResult = { value: null, unknownAliases: [], missingInputs: [] }
  if (!formula || !formula.trim()) return result

  let expression = formula

  // Collect all aliases that appear in the formula
  const allAliases = new Set<string>()
  const aliasPattern = /\{([^}]+)\}/g
  let match: RegExpExecArray | null
  while ((match = aliasPattern.exec(formula)) !== null) {
    allAliases.add(match[1].trim())
  }

  const knownAliases = new Set<string>()

  // 1. Resolve test type aliases
  for (const input of inputs) {
    knownAliases.add(input.alias)
    const val = await ctx.getTestValue(input.testTypeId)
    if (val === null || val === undefined || Number.isNaN(Number(val))) {
      result.missingInputs.push(input.alias)
    }
    const placeholder = `{${input.alias}}`
    expression = expression.split(placeholder).join(val !== null && val !== undefined ? `(${Number(val)})` : "")
  }

  // 2. Resolve built-in athlete variables
  const builtins: Record<string, number | null | undefined> = {
    age: ctx.athlete.age,
    poids: ctx.athlete.poids,
    taille: ctx.athlete.taille,
    genre: ctx.athlete.genre,
  }
  for (const [key, val] of Object.entries(builtins)) {
    knownAliases.add(key)
    const placeholder = `{${key}}`
    if (expression.includes(placeholder)) {
      if (val === null || val === undefined || Number.isNaN(Number(val))) {
        result.missingInputs.push(key)
      }
      expression = expression.split(placeholder).join(val !== null && val !== undefined ? `(${Number(val)})` : "")
    }
  }

  // 3. Find unknown aliases (in formula but not in inputs or builtins)
  Array.from(allAliases).forEach((alias) => {
    if (!knownAliases.has(alias)) {
      result.unknownAliases.push(alias)
    }
  })

  // If any inputs are missing, return early
  if (result.missingInputs.length > 0) return result
  if (result.unknownAliases.length > 0) return result

  // 4. Check for any remaining unresolved braces
  if (/\{|}/.test(expression)) return result

  // 5. Only allow safe characters
  if (!/^[0-9+\-*/().,\s]+$/.test(expression)) return result

  // 6. Normalize commas as decimal separators
  expression = expression.replace(/,/g, ".")

  // 7. Reject division by zero / empty expression
  if (!expression.trim()) return result
  if (/\/\s*0(\.0+)?([^0-9]|$)/.test(expression)) return result

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${expression});`)
    const computed = fn()
    if (typeof computed !== "number" || Number.isNaN(computed) || !Number.isFinite(computed)) {
      return result
    }
    result.value = computed
    return result
  } catch {
    return result
  }
}

/**
 * Round a calculated value to a sensible precision (2 decimals by default).
 */
export function roundTo(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}