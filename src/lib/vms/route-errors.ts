/**
 * Route Handler guard: any error a handler throws becomes the structured
 * `{ ok: false, error: { kind: "server", message } }` envelope with status 500,
 * instead of escaping to Next's default bodiless 500.
 *
 * Every exported HTTP method in `src/app/api/vms/**\/route.ts` is wrapped with
 * this; `src/test/production-integrity.test.ts` enforces it.
 */
export function withServerErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: {
            kind: "server",
            message:
              error instanceof Error ? error.message : "Internal server error.",
          },
        },
        { status: 500 },
      );
    }
  };
}
