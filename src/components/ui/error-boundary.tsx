import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "./button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-warm-100 p-6">
          <div className="max-w-md w-full bg-white border border-warm-300 rounded-lg p-6 shadow-card text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-charcoal mb-2">
              Terjadi Kesalahan Aplikasi
            </h2>
            <p className="text-sm text-charcoal-muted mb-4 leading-relaxed">
              {this.state.error?.message || "Aplikasi mengalami kendala yang tidak terduga. Silakan muat ulang halaman."}
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={this.handleReset} variant="default" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
