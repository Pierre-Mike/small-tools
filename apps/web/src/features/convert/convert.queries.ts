/**
 * The `convert` queries, each defined once and shared by the route loader and the component. A
 * rejected conversion is data, not a thrown error, so the page can show why it failed.
 */
import { decodeApiErrorBody, decodeConversionResult, decodeUnitCatalog } from "@app/shared"
import { queryOptions } from "@tanstack/react-query"
import { api } from "../../lib/api"

export interface ConvertSearch {
  readonly value: string
  readonly from: string
  readonly to: string
}

export const unitsQuery = queryOptions({
  queryKey: ["convert", "units"],
  queryFn: async () => {
    const res = await api.convert.units.$get()
    if (!res.ok) throw new Error(`units request failed: ${res.status}`)
    return decodeUnitCatalog(await res.json())
  },
  staleTime: Number.POSITIVE_INFINITY,
})

export const conversionQuery = (search: ConvertSearch) =>
  queryOptions({
    queryKey: ["convert", search.value, search.from, search.to],
    queryFn: async () => {
      const res = await api.convert.$get({ query: { ...search } })
      if (res.status === 400) {
        return { ok: false as const, reason: decodeApiErrorBody(await res.json()).error._tag }
      }
      if (!res.ok) throw new Error(`convert request failed: ${res.status}`)
      return { ok: true as const, conversion: decodeConversionResult(await res.json()) }
    },
  })
