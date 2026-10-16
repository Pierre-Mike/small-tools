import { describe, expect, it } from "bun:test"
import { Result } from "effect"
import * as fc from "fast-check"
import { type ConvertQuery, convert, listUnits, parseConvertQuery, UNITS } from "./convert.core"

const ok = (query: ConvertQuery) => {
  const parsed = parseConvertQuery(query)
  if (Result.isFailure(parsed)) throw new Error(`expected success, got ${parsed.failure._tag}`)
  return convert(parsed.success)
}

const failureOf = (query: ConvertQuery) => {
  const parsed = parseConvertQuery(query)
  return Result.isFailure(parsed) ? parsed.failure : undefined
}

describe("convert", () => {
  it("converts length", () => {
    expect(ok({ value: "1", from: "km", to: "m" }).result).toBeCloseTo(1000)
    expect(ok({ value: "1", from: "mi", to: "km" }).result).toBeCloseTo(1.609344)
    expect(ok({ value: "12", from: "in", to: "ft" }).result).toBeCloseTo(1)
  })

  it("converts mass", () => {
    expect(ok({ value: "1", from: "kg", to: "lb" }).result).toBeCloseTo(2.20462262)
    expect(ok({ value: "16", from: "oz", to: "lb" }).result).toBeCloseTo(1)
  })

  it("converts temperature, which has an offset", () => {
    expect(ok({ value: "100", from: "c", to: "f" }).result).toBeCloseTo(212)
    expect(ok({ value: "32", from: "f", to: "c" }).result).toBeCloseTo(0)
    expect(ok({ value: "0", from: "k", to: "c" }).result).toBeCloseTo(-273.15)
  })

  it("converts volume", () => {
    expect(ok({ value: "1", from: "gal", to: "l" }).result).toBeCloseTo(3.785411784)
  })

  it("echoes the input next to the result", () => {
    expect(ok({ value: "2.5", from: "m", to: "cm" })).toEqual({
      value: 2.5,
      from: "m",
      to: "cm",
      result: 250,
    })
  })
})

describe("parseConvertQuery", () => {
  it("rejects a value that is not a finite number", () => {
    for (const value of [undefined, "", " ", "abc", "Infinity", "1e999"]) {
      expect(failureOf({ value, from: "m", to: "cm" })).toEqual({
        _tag: "InvalidValue",
        received: value ?? "",
      })
    }
  })

  it("rejects an unknown unit", () => {
    expect(failureOf({ value: "1", from: "parsec", to: "m" })).toEqual({
      _tag: "UnknownUnit",
      received: "parsec",
    })
    expect(failureOf({ value: "1", from: "m" })).toEqual({ _tag: "UnknownUnit", received: "" })
  })

  it("does not treat Object.prototype keys as units", () => {
    expect(failureOf({ value: "1", from: "constructor", to: "m" })?._tag).toBe("UnknownUnit")
  })

  it("rejects units from different categories", () => {
    expect(failureOf({ value: "1", from: "kg", to: "m" })).toEqual({
      _tag: "IncompatibleUnits",
      from: "kg",
      to: "m",
    })
  })
})

describe("listUnits", () => {
  it("lists every unit once, grouped by category", () => {
    const listed = listUnits().flatMap((group) => group.units.map((unit) => unit.id))
    expect(listed.sort()).toEqual(Object.keys(UNITS).sort())
  })
})

describe("convert properties", () => {
  const unitIds = Object.keys(UNITS)
  const sameCategoryPair = fc
    .constantFrom(...unitIds)
    .chain((from) =>
      fc
        .constantFrom(...unitIds.filter((id) => UNITS[id]?.category === UNITS[from]?.category))
        .map((to) => ({ from, to })),
    )

  it("converting there and back returns the original value", () => {
    fc.assert(
      fc.property(
        fc.record({
          pair: sameCategoryPair,
          value: fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        }),
        ({ pair, value }) => {
          const there = ok({ value: String(value), ...pair }).result
          const back = ok({ value: String(there), from: pair.to, to: pair.from }).result
          expect(back).toBeCloseTo(value, 4)
        },
      ),
    )
  })

  it("parseConvertQuery is total: any input yields a Result, never a throw", () => {
    fc.assert(
      fc.property(
        fc.record({ value: fc.string(), from: fc.string(), to: fc.string() }),
        (query) => {
          expect(Result.isResult(parseConvertQuery(query))).toBe(true)
        },
      ),
    )
  })
})
