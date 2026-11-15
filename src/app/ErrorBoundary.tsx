// ErrorBoundary: themed crash screen with a route back to the hub.
import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { NeonButton } from '../ui/NeonButton'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Changing this key (e.g. the route path) clears a previous fault. */
  resetKey?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: '' })
    }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, message: error instanceof Error ? error.message : 'Unknown fault' }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Allowed console use: the boundary is the only place that reports faults.
    console.error('NEXUS fault boundary:', error, info.componentStack)
  }

  private returnToHub = () => {
    window.location.hash = '#/hub'
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-xl rounded border border-red/50 bg-panel p-8 shadow-[0_0_40px_rgba(255,77,109,0.2)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-red">System fault</p>
          <h1 className="mt-2 font-display text-3xl uppercase tracking-widest text-text">Connection severed</h1>
          <p className="mt-4 text-sm text-muted">
            NEXUS hit an unexpected error. Your saved data is untouched. The fault was logged to the console.
          </p>
          {this.state.message && (
            <p className="mt-3 rounded border border-border bg-panel2 p-3 font-mono text-xs text-red">
              {this.state.message}
            </p>
          )}
          <div className="mt-6">
            <NeonButton onClick={this.returnToHub}>Return to hub</NeonButton>
          </div>
        </div>
      </main>
    )
  }
}
