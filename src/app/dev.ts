// Dev-only feature switch (DEV_ONLY): true only in dev builds and tests; production builds never show dev tools.
export function isDevEnabled(): boolean {
  return import.meta.env.DEV === true
}
