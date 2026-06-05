import React from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, source: 'render' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentDidCatch(error, errorInfo) {
    // Keep this log for production diagnostics pipelines.
    console.error('Unhandled UI error:', error, errorInfo);
    // Future: Send to Sentry/LogRocket here
  }

  handleGlobalError = (event) => {
    this.setState({
      hasError: true,
      error: event.error || new Error(event.message || 'Unexpected application error'),
      source: 'global',
    });
  };

  handleUnhandledRejection = (event) => {
    this.setState({
      hasError: true,
      error: event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'Unhandled async error')),
      source: 'async',
    });
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, source: 'render' });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, source: 'render' });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7faf8] px-6 py-12">
          <div className="max-w-lg w-full text-center space-y-7 rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-700 font-black mb-2">DurgaShakti Foils</p>
              <h2 className="text-2xl font-black text-slate-950 mb-2">We hit an unexpected issue</h2>
              <p className="text-sm text-slate-500 font-medium leading-6">
                The page could not continue safely. Please retry, or return home and continue from a fresh screen.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-black text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer">Error Details</summary>
                <pre className="mt-2 text-xs text-destructive bg-destructive/5 p-3 rounded-md overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
