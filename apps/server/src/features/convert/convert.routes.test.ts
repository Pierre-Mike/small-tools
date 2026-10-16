import { describe, expect, it } from "bun:test"
import { decodeApiErrorBody, decodeConversionResult, decodeUnitCatalog } from "@app/shared"
import { Layer, ManagedRuntime } from "effect"
import { buildConvertApp } from "./convert.routes"

const app = buildConvertApp(ManagedRuntime.make(Layer.empty))

describe("GET /convert", () => {
  it("returns a conversion that decodes against the shared contract", async () => {
    const res = await app.request("/?value=1&from=km&to=m")
    expect(res.status).toBe(200)
    expect(decodeConversionResult(await res.json())).toEqual({
      value: 1,
      from: "km",
      to: "m",
      result: 1000,
    })
  })

  it("maps each core failure to the shared 400 envelope", async () => {
    const cases = [
      ["/?value=abc&from=m&to=cm", "InvalidValue"],
      ["/?value=1&from=parsec&to=m", "UnknownUnit"],
      ["/?value=1&from=kg&to=m", "IncompatibleUnits"],
    ] as const
    for (const [path, tag] of cases) {
      const res = await app.request(path)
      expect(res.status).toBe(400)
      expect(decodeApiErrorBody(await res.json()).error._tag).toBe(tag)
    }
  })
})

describe("GET /convert/units", () => {
  it("returns the unit catalog", async () => {
    const res = await app.request("/units")
    expect(res.status).toBe(200)
    const catalog = decodeUnitCatalog(await res.json())
    expect(catalog.map((group) => group.category)).toEqual([
      "length",
      "mass",
      "temperature",
      "volume",
    ])
  })
})
