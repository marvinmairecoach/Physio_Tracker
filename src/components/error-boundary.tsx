"use client"

import { Component, type ReactNode, type ErrorInfo } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    // Log to console for developer debugging
    console.error("=== ErrorBoundary caught ===")
    console.error("Error:", error.message)
    console.error("Stack:", error.stack)
    console.error("Component stack:", errorInfo.componentStack)
    // Also try to send to server
    try {
      fetch("/physio-data/api/debug/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: typeof window !== "undefined" ? window.location.href : "",
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {}) // silent
    } catch {}
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-red-700 mb-2">
              ⚠️ Erreur inattendue
            </h2>
            <div className="space-y-2">
              <p className="text-sm text-red-600 font-mono bg-red-100 rounded p-2 overflow-auto max-h-20">
                {this.state.error.message}
              </p>
              <details className="text-xs text-red-500">
                <summary className="cursor-pointer font-medium">
                  Détails techniques
                </summary>
                <pre className="mt-2 bg-red-100 rounded p-3 overflow-auto max-h-60 whitespace-pre-wrap">
                  {this.state.error.stack}
                  {"\n\n--- Component Stack ---\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { this.setState({ error: null, errorInfo: null }); window.location.reload() }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Recharger la page
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
              >
                Retour
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}