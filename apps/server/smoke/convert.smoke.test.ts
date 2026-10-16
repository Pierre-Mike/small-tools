/** Runs only under `bun run smoke`, against a real `wrangler dev`. */
import { describe, expect, it } from "bun:test"
import { decodeApiErrorBody, decodeConversionResult, decodeUnitCatalog } from "@app/shared"

const BASE = process.env.SMOKE_URL

describe.skipIf(BASE === undefined)("smoke: /api/convert", () => {
  it("converts a value", async () => {
    const res = await fetch(`${BASE}/api/convert?value=100&from=c&to=f`)
    expect(res.status).toBe(200)
    expect(decodeConversionResult(await res.json()).result).toBeCloseTo(212)
  })

  it("lists the units", async () => {
    const res = await fetch(`${BASE}/api/convert/units`)
    expect(res.status).toBe(200)
    expect(decodeUnitCatalog(await res.json()).length).toBeGreaterThan(0)
  })

  it("returns the shared 400 envelope for incompatible units", async () => {
    const res = await fetch(`${BASE}/api/convert?value=1&from=kg&to=m`)
    expect(res.status).toBe(400)
    expect(decodeApiErrorBody(await res.json()).error._tag).toBe("IncompatibleUnits")
  })
})
