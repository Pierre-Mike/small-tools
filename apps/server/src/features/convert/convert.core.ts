/**
 * Functional core for the `convert` slice. Pure: plain data in, plain data out, failures are
 * values (Result).
 *
 * Every unit converts through its category's base unit (metre, kilogram, kelvin, litre):
 * base = value * factor + offset. Only temperature needs an offset.
 */
import type { ConversionResult, UnitCatalog } from "@app/shared"
import { Result } from "effect"

export type Category = "length" | "mass" | "temperature" | "volume"

export interface Unit {
  readonly label: string
  readonly category: Category
  readonly factor: number
  readonly offset: number
}

const unit = (input: { label: string; category: Category; factor: number; offset?: number }) => ({
  ...input,
  offset: input.offset ?? 0,
})

export const UNITS: Readonly<Record<string, Unit>> = {
  m: unit({ label: "metre", category: "length", factor: 1 }),
  km: unit({ label: "kilometre", category: "length", factor: 1000 }),
  cm: unit({ label: "centimetre", category: "length", factor: 0.01 }),
  mm: unit({ label: "millimetre", category: "length", factor: 0.001 }),
  mi: unit({ label: "mile", category: "length", factor: 1609.344 }),
  yd: unit({ label: "yard", category: "length", factor: 0.9144 }),
  ft: unit({ label: "foot", category: "length", factor: 0.3048 }),
  in: unit({ label: "inch", category: "length", factor: 0.0254 }),
  kg: unit({ label: "kilogram", category: "mass", factor: 1 }),
  g: unit({ label: "gram", category: "mass", factor: 0.001 }),
  mg: unit({ label: "milligram", category: "mass", factor: 0.000001 }),
  lb: unit({ label: "pound", category: "mass", factor: 0.45359237 }),
  oz: unit({ label: "ounce", category: "mass", factor: 0.028349523125 }),
  k: unit({ label: "kelvin", category: "temperature", factor: 1 }),
  c: unit({ label: "degree Celsius", category: "temperature", factor: 1, offset: 273.15 }),
  f: unit({
    label: "degree Fahrenheit",
    category: "temperature",
    factor: 5 / 9,
    offset: (459.67 * 5) / 9,
  }),
  l: unit({ label: "litre", category: "volume", factor: 1 }),
  ml: unit({ label: "millilitre", category: "volume", factor: 0.001 }),
  gal: unit({ label: "US gallon", category: "volume", factor: 3.785411784 }),
  floz: unit({ label: "US fluid ounce", category: "volume", factor: 0.0295735295625 }),
}

/** The raw query string values, before any parsing. */
export interface ConvertQuery {
  readonly value?: string | undefined
  readonly from?: string | undefined
  readonly to?: string | undefined
}

export interface ParsedQuery {
  readonly value: number
  readonly from: string
  readonly to: string
  readonly fromUnit: Unit
  readonly toUnit: Unit
}

export interface InvalidValue {
  readonly _tag: "InvalidValue"
  readonly received: string
}

export interface UnknownUnit {
  readonly _tag: "UnknownUnit"
  readonly received: string
}

export interface IncompatibleUnits {
  readonly _tag: "IncompatibleUnits"
  readonly from: string
  readonly to: string
}

export type ConvertError = InvalidValue | UnknownUnit | IncompatibleUnits

// hasOwn, so "constructor" or "toString" is not a unit.
const lookup = (id: string): Unit | undefined => (Object.hasOwn(UNITS, id) ? UNITS[id] : undefined)

/** Check the query: a finite number and two known units of the same category. */
export const parseConvertQuery = (
  query: ConvertQuery,
): Result.Result<ParsedQuery, ConvertError> => {
  const rawValue = query.value ?? ""
  const value = Number(rawValue.trim())
  if (rawValue.trim() === "" || !Number.isFinite(value)) {
    return Result.fail({ _tag: "InvalidValue", received: rawValue })
  }
  const from = query.from ?? ""
  const to = query.to ?? ""
  const fromUnit = lookup(from)
  if (fromUnit === undefined) return Result.fail({ _tag: "UnknownUnit", received: from })
  const toUnit = lookup(to)
  if (toUnit === undefined) return Result.fail({ _tag: "UnknownUnit", received: to })
  if (fromUnit.category !== toUnit.category) {
    return Result.fail({ _tag: "IncompatibleUnits", from, to })
  }
  return Result.succeed({ value, from, to, fromUnit, toUnit })
}

/** Convert a parsed query. Total: parseConvertQuery already resolved both units. */
export const convert = (query: ParsedQuery): ConversionResult => {
  const base = query.value * query.fromUnit.factor + query.fromUnit.offset
  return {
    value: query.value,
    from: query.from,
    to: query.to,
    result: (base - query.toUnit.offset) / query.toUnit.factor,
  }
}

/** Every unit, grouped by category in the order of UNITS, for the web form. */
export const listUnits = (): UnitCatalog => {
  const categories = [...new Set(Object.values(UNITS).map((u) => u.category))]
  return categories.map((category) => ({
    category,
    units: Object.entries(UNITS)
      .filter(([, u]) => u.category === category)
      .map(([id, u]) => ({ id, label: u.label })),
  }))
}
