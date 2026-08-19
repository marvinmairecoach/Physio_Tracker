/**
 * Safe formula evaluator for calculated test types.
 *
 * The formula uses aliases in braces, e.g.: "{distance} / {temps} * 3.6"
 * Only digits, operators ( + - * / ^ ( ) . , ) and whitespace are allowed
 * after alias substitution — no arbitrary JavaScript.
 */

export interface FormulaInput {
  testTypeId: string
  alias: string
  unit?: string
}

/**
 * Substitute aliases with numeric values, then safely evaluate.
 * @param formula  e.g. "{distance} / {temps} * 3.6"
 * @param values   e.g. { distance: 30, temps: 4.2 }
 * @returns number, or null if the formula is invalid / incomplete.
 */
export function evaluateFormula(
  formula: string,
  values: Record<string, number>
): number | null {
  if (!formula || !formula.trim()) return null

  let expression = formula

  // Replace each {alias} with its numeric value
  const aliasPattern = /\{([^}]+)\}/g
  let match: RegExpExecArray | null
  while ((match = aliasPattern.exec(formula)) !== null) {
    const alias = match[1].trim()
    const val = values[alias]
    if (val === undefined || val === null || Number.isNaN(Number(val))) {
      return null // missing input
    }
    expression = expression.replace(match[0], `(${Number(val)})`)
  }

  // Strip any remaining braces (treat as invalid → null)
  if (/\{|\}/.test(expression)) return null

  // Only allow safe characters
  if (!/^[0-9+\-*/().,\s]+$/.test(expression)) return null

  // Normalize commas as decimal separators
  expression = expression.replace(/,/g, ".")

  // Reject division by zero / empty expression
  if (!expression.trim()) return null
  if (/\/\s*0(\.0+)?([^0-9]|$)/.test(expression)) return null

  try {
    // Safe evaluation: build a function body with only arithmetic
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
