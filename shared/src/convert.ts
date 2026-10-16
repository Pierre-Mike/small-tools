/**
 * The `convert` contract: a conversion result and the catalog of units the converter knows. The
 * web client decodes both with these schemas, so a server change without a contract change fails
 * at the boundary.
 */
import { Schema as S } from "effect"

export const ConversionResult = S.Struct({
  value: S.Number,
  from: S.String,
  to: S.String,
  result: S.Number,
})

export type ConversionResult = S.Schema.Type<typeof ConversionResult>

export const UnitCatalog = S.Array(
  S.Struct({
    category: S.String,
    units: S.Array(S.Struct({ id: S.String, label: S.String })),
  }),
)

export type UnitCatalog = S.Schema.Type<typeof UnitCatalog>

export const decodeConversionResult = S.decodeUnknownSync(ConversionResult, {
  onExcessProperty: "error",
})

export const decodeUnitCatalog = S.decodeUnknownSync(UnitCatalog, { onExcessProperty: "error" })
