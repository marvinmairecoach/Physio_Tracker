/**
 * Safe formula evaluator for calculated test types.
 *
 * The formula uses aliases in braces that reference:
 *   - Other test types (by alias defined in formulaInputs)
 *   - Built-in athlete variables: {age}, {poids}, {taille}, {genre}
 *
 * Examples:
 *   "{distance} / {temps} * 3.6"              → speed from distance + time
 *   "({poids} * {reps}) / 100"                 → relative load
 *   "{vift} * 3.5"                             → VO2max from VMA
 */

export interface FormulaInput {
  testTypeId: string
  alias: string
}

export interface FormulaContext {
  getTestValue: (testTypeId: string) => Promise<number | null>
  athlete: {
    age?: number | null
    poids?: number | null
    taille?: number | null
    genre?: number | null
  }
}

export interface FormulaResult {
  value: number | null
  /** Aliases in the formula that have no matching input or builtin */
  unknownAliases: string[]
  /** Variables that were found but had no value */
  missingInputs: string[]
  /** Human-readable error explanation */
  errorMessage: string | null
}

// Whitelist of safe Math functions that are accessible in formulas
const SAFE_MATH_FUNCTIONS = [
  "Math.sqrt",
  "Math.pow",
  "Math.abs",
  "Math.round",
  "Math.floor",
  "Math.ceil",
  "Math.min",
  "Math.max",
  "Math.log",
  "Math.log10",
  "Math.log2",
  "Math.exp",
  "Math.sin",
  "Math.cos",
  "Math.tan",
  "Math.asin",
  "Math.acos",
  "Math.atan",
  "Math.PI",
  "Math.E",
]

export function evaluateFormula(
  formula: string,
  inputs: FormulaInput[],
  ctx: FormulaContext
): Promise<FormulaResult> {
  return _evaluateFormula(formula, inputs, ctx)
}

async function _evaluateFormula(
  formula: string,
  inputs: FormulaInput[],
  ctx: FormulaContext
): Promise<FormulaResult> {
  const result: FormulaResult = { value: null, unknownAliases: [], missingInputs: [], errorMessage: null }
  if (!formula || !formula.trim()) {
    result.errorMessage = "La formule est vide."
    return result
  }

  // Step 0: Normalize the formula (replace smart quotes, em-dashes, etc.)
  let expression = formula
    .replace(/[\u2018\u2019\u201A]/g, "'")     // smart single quotes →
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // smart double quotes →
    .replace(/[\u2013\u2014]/g, "-")            // en-dash / em-dash → -
    .replace(/[\u00A0\u2000-\u2009]/g, " ")     // non-breaking spaces → space
    .replace(/×/g, "*")                          // multiplication sign → *
    .replace(/÷/g, "/")                          // division sign → /
    .trim()

  // Collect all {alias} placeholders found in the formula
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
    const placeholder = `{${input.alias}}`
    if (expression.includes(placeholder)) {
      if (val === null || val === undefined) {
        result.missingInputs.push(input.alias)
        expression = expression.split(placeholder).join("0")
      } else {
        expression = expression.split(placeholder).join(`(${Number(val)})`)
      }
    }
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
      if (val === null || val === undefined) {
        result.missingInputs.push(key)
        expression = expression.split(placeholder).join("0")
      } else {
        expression = expression.split(placeholder).join(`(${Number(val)})`)
      }
    }
  }

  // 3. Find unknown aliases
  Array.from(allAliases).forEach((alias) => {
    if (!knownAliases.has(alias)) {
      result.unknownAliases.push(alias)
    }
  })

  if (result.unknownAliases.length > 0) {
    result.errorMessage = `Alias inconnus dans la formule : ${result.unknownAliases.join(", ")}. Vérifiez l'orthographe ou ajoutez-les comme types de test source.`
    return result
  }
  if (result.missingInputs.length > 0) {
    result.errorMessage = `Données manquantes : ${result.missingInputs.join(", ")}.`
    return result
  }

  // 4. Check for remaining unresolved braces
  if (/\{|}/.test(expression)) {
    result.errorMessage = `Des accolades non résolues subsistent dans la formule. Vérifiez qu'il n'y a pas de fautes de frappe.`
    return result
  }

  // 5. Normalize decimals
  expression = expression.replace(/,/g, ".")

  // 6. Build a safe function string: replace Math.xxx calls with direct references
  //    This lets us whitelist allowed Math.* calls
  let safeExpression = expression
  for (const fn of SAFE_MATH_FUNCTIONS) {
    const mathName = fn.replace("Math.", "")
    if (expression.includes(fn)) {
      // Already using the Math. prefix — allowed
    }
    // Also allow bare function names (e.g. "sqrt(9)" instead of "Math.sqrt(9)")
    // but replace them with Math. version for whitelist checking
    if (!expression.includes("Math.")) {
      const bareFn = mathName.toLowerCase()
      // Only replace if it looks like a function call, not a variable name
      const barePattern = new RegExp(`\\b${bareFn}\\s*\\(`, "gi")
      safeExpression = safeExpression.replace(barePattern, `Math.${mathName}(`)
    }
  }

  // 7. Only allow safe characters + Math. prefix
  //    Allow: digits, operators, parentheses, Math., spaces
  const safeChars = /^[0-9+\-*/().,\s]+$/;
  const hasMathCalls = /Math\.[a-zA-Z]+\(/.test(safeExpression);

  if (hasMathCalls) {
    // Check that ALL non-safe chars are only valid Math. calls
    const cleaned = safeExpression.replace(/Math\.[a-zA-Z]+/g, "").replace(/\(/g, "").replace(/\)/g, "")
    if (!safeChars.test(cleaned)) {
      result.errorMessage = "La formule contient des caractères ou fonctions non autorisés."
      return result
    }
  } else if (!safeChars.test(safeExpression)) {
    result.errorMessage = "La formule contient des caractères non autorisés."
    return result
  }

  // 8. Reject division by zero
  if (/\/\s*0(\.0+)?([^0-9]|$)/.test(safeExpression)) {
    result.errorMessage = "La formule tente une division par zéro."
    return result
  }

  // 9. Evaluate using new Function (safe because we've sanitized)
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${safeExpression});`)
    const computed = fn()
    if (typeof computed !== "number" || Number.isNaN(computed)) {
      result.errorMessage = `L'évaluation de la formule a produit un résultat non numérique (${typeof computed}).`
      return result
    }
    if (!Number.isFinite(computed)) {
      result.errorMessage = "Le résultat de la formule est infini (probablement une division par zéro)."
      return result
    }
    result.value = computed
    return result
  } catch (err) {
    result.errorMessage = `Erreur de syntaxe dans la formule : ${err instanceof Error ? err.message : "expression invalide"}`
    return result
  }
}