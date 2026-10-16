/**
 * Root route + router context, isolated in a leaf module. Both `router.tsx`
 * (which assembles the tree) and each feature route (which sets
 * `getParentRoute: () => rootRoute`) import from here — so neither imports the
 * other, and there is no import cycle (fallow's dead-code pass gates this).
 */
import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router"

export interface RouterContext {
  readonly queryClient: QueryClient
}

function Layout() {
  return (
    <>
      <nav>
        <Link to="/">Health</Link> | <Link to="/convert">Unit converter</Link>
      </nav>
      <Outlet />
    </>
  )
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Layout,
})
