/**
 * Unit converter page. The form state lives in the URL (`?value=&from=&to=`), so a conversion is
 * a link you can share. Submitting navigates; the loader prefetches the units and the conversion,
 * and the component reads both with `useSuspenseQuery` on the same options.
 */
import { useSuspenseQuery } from "@tanstack/react-query"
import { createRoute, useNavigate } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"
import { rootRoute } from "../../root-route"
import { type ConvertSearch, conversionQuery, unitsQuery } from "./convert.queries"

const DEFAULT_SEARCH: ConvertSearch = { value: "1", from: "km", to: "mi" }

// The URL may omit any field, so a plain link to /convert needs no search params.
type ConvertUrlSearch = {
  readonly value?: string | undefined
  readonly from?: string | undefined
  readonly to?: string | undefined
}

const asString = (raw: unknown) =>
  typeof raw === "string" || typeof raw === "number" ? String(raw) : undefined

const withDefaults = (search: ConvertUrlSearch): ConvertSearch => ({
  value: search.value ?? DEFAULT_SEARCH.value,
  from: search.from ?? DEFAULT_SEARCH.from,
  to: search.to ?? DEFAULT_SEARCH.to,
})

const REASONS: Record<string, string> = {
  InvalidValue: "Enter a number.",
  UnknownUnit: "Pick a unit from the list.",
  IncompatibleUnits: "Both units must measure the same thing.",
}

function ConvertComponent() {
  const search = convertRoute.useLoaderDeps()
  const navigate = useNavigate({ from: "/convert" })
  const { data: catalog } = useSuspenseQuery(unitsQuery)
  const { data: answer } = useSuspenseQuery(conversionQuery(search))
  const [draft, setDraft] = useState(search)

  const categoryOf = (unitId: string) =>
    catalog.find((group) => group.units.some((u) => u.id === unitId))
  const toChoices = categoryOf(draft.from)?.units ?? []

  const changeFrom = (from: string) => {
    const choices = categoryOf(from)?.units ?? []
    const keepTo = choices.some((u) => u.id === draft.to)
    setDraft({ ...draft, from, to: keepTo ? draft.to : (choices[0]?.id ?? "") })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void navigate({ search: draft })
  }

  return (
    <main>
      <h1>Unit converter</h1>
      <form onSubmit={submit}>
        <input
          aria-label="value"
          inputMode="decimal"
          value={draft.value}
          onChange={(e) => setDraft({ ...draft, value: e.target.value })}
        />
        <select aria-label="from" value={draft.from} onChange={(e) => changeFrom(e.target.value)}>
          {catalog.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span> to </span>
        <select
          aria-label="to"
          value={draft.to}
          onChange={(e) => setDraft({ ...draft, to: e.target.value })}
        >
          {toChoices.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
        <button type="submit">Convert</button>
      </form>
      <p data-testid="convert-answer">
        {answer.ok
          ? `${answer.conversion.value} ${answer.conversion.from} = ${Number(answer.conversion.result.toPrecision(10))} ${answer.conversion.to}`
          : (REASONS[answer.reason] ?? "That conversion failed.")}
      </p>
    </main>
  )
}

export const convertRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/convert",
  validateSearch: (raw: Record<string, unknown>): ConvertUrlSearch => ({
    value: asString(raw.value),
    from: asString(raw.from),
    to: asString(raw.to),
  }),
  loaderDeps: ({ search }) => withDefaults(search),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(unitsQuery),
      context.queryClient.ensureQueryData(conversionQuery(deps)),
    ]),
  component: ConvertComponent,
})
