# Agent Note: Unit converter

Status: implemented

## Problem

small-tools collects small single-purpose web tools in one app. Its first tool has to be simple
enough to test the whole factory flow (slice, gates, smoke, PR, CI, merge) end to end, and still
be useful: people convert units often and want a link they can share.

## Decision

The `convert` slice converts between units of length, mass, temperature and volume.

- `GET /api/convert?value=&from=&to=` answers `{ value, from, to, result }`, the shared
  `ConversionResult` contract in `shared/src/convert.ts`. `GET /api/convert/units` answers the
  `UnitCatalog`: every unit grouped by category, in the order of the `UNITS` table.
- The core (`convert.core.ts`) converts through each category's base unit (metre, kilogram,
  kelvin, litre) with `base = value * factor + offset`. Only temperature has an offset. US
  customary units (gallon, fluid ounce) are the US definitions.
- Failures are values with registered tags, each a 400: `InvalidValue` (empty, not a number, or
  not finite), `UnknownUnit` (including `Object.prototype` keys such as `constructor`), and
  `IncompatibleUnits` (two units of different categories).
- The slice does no I/O, so it has no `convert.io.ts` and no layer in the runtime. Its routes take
  `RouteRuntime<never>`.
- The `/convert` page keeps the form in the URL (`?value=&from=&to=`), so a conversion is a link.
  Missing fields default to 1 km to mi. The "to" list only offers units of the "from" unit's
  category. A rejected conversion shows a reason on the page instead of an error screen.

## Alternatives considered

**Convert in the browser only.** No request per conversion, but the factory's point here is to
exercise the server slice, the shared contract and the smoke test. The core is pure and could
also run client-side later.

**A conversion library.** It would cover more units, but 20 units fit in one table, and the table
makes each factor visible in review.

**Keep the generated `convert.io.ts` stub.** `axioms slice` always generates one. A stub port with
no real I/O would be dead weight in the runtime, so it was removed.

## Consequences

- Adding a unit is one line in `UNITS`. The round-trip property test covers it with no new test.
- Floating-point results are returned unrounded. The page shows 10 significant digits.
- The rule that `<feature>.io.ts` exists for every slice does not hold here. That is a factory
  finding: `axioms slice` could skip the stub for a slice with no I/O.

## Verification

- `bun test apps/server/src/features/convert`: 15 pass. The core tests failed before
  `convert.core.ts` existed. Property tests check that converting there and back returns the
  input, and that `parseConvertQuery` never throws on any strings.
- `bun run smoke`: 6 pass against `wrangler dev`, including `100 c` to `f` = 212 and a 400
  `IncompatibleUnits` for kg to m.
- `bun run check`: all gates passed.
