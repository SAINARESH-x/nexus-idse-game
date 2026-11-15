// Test setup: jest-dom matchers and jsdom shims for canvas.
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

// Node 25+ ships an experimental global Web Storage that, without --localstorage-file,
// shadows jsdom's localStorage with an unusable object. Install an in-memory Storage
// only when the existing one does not work, so Node 22 keeps using jsdom's own.
class MemoryStorage implements Storage {
  private items = new Map<string, string>()
  get length(): number {
    return this.items.size
  }
  clear(): void {
    this.items.clear()
  }
  getItem(key: string): string | null {
    return this.items.has(key) ? (this.items.get(key) as string) : null
  }
  key(index: number): string | null {
    return Array.from(this.items.keys())[index] ?? null
  }
  removeItem(key: string): void {
    this.items.delete(key)
  }
  setItem(key: string, value: string): void {
    this.items.set(key, String(value))
  }
}

const storageWorks = (name: 'localStorage' | 'sessionStorage'): boolean => {
  try {
    const storage = (globalThis as unknown as Record<string, Storage | undefined>)[name]
    if (!storage) return false
    storage.setItem('__nexus_probe__', '1')
    storage.removeItem('__nexus_probe__')
    return true
  } catch {
    return false
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (!storageWorks(name)) {
    const storage = new MemoryStorage()
    Object.defineProperty(globalThis, name, { value: storage, configurable: true, writable: true })
    if (typeof window !== 'undefined' && window !== globalThis) {
      Object.defineProperty(window, name, { value: storage, configurable: true, writable: true })
    }
  }
}
