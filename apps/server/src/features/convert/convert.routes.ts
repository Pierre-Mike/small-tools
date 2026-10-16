/**
 * Hono shell for the `convert` slice. The converter does no I/O, so a route parses the query with
 * the pure core and answers; a core failure becomes the shared 400 envelope.
 */
import { Effect } from "effect"
import { Hono } from "hono"
import { type RouteRuntime, respond } from "../../platform/http"
import { convert, listUnits, parseConvertQuery } from "./convert.core"

export const buildConvertApp = (runtime: RouteRuntime<never>) =>
  new Hono()
    .get("/", (c) =>
      respond({
        c,
        runtime,
        program: Effect.gen(function* () {
          const query = yield* Effect.fromResult(
            parseConvertQuery({
              value: c.req.query("value"),
              from: c.req.query("from"),
              to: c.req.query("to"),
            }),
          )
          return convert(query)
        }),
      }),
    )
    .get("/units", (c) => respond({ c, runtime, program: Effect.succeed(listUnits()) }))
