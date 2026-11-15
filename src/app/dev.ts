// Dev-only feature switch shared by the workspace and the developer panel.
export function isDevEnabled(): boolean {
  if (import.meta.env.DEV) return true
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('nexus-dev') === '1'
  } catch {
    return false
  }
}
