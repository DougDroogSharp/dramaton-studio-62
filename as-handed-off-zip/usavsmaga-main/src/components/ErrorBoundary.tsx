import React, { Component, ErrorInfo, ReactNode } from 'react';
import { DramatonLogo } from './DramatonLogo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    // Clear IndexedDB and reload
    indexedDB.deleteDatabase('keyval-store');
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-diesel-black p-8">
          <div className="max-w-lg w-full text-center">
            <DramatonLogo className="w-16 h-16 mx-auto text-diesel-rust mb-6" />
            <h1 className="text-2xl font-bold text-diesel-paper mb-4">
              Something went wrong
            </h1>
            <p className="text-diesel-steel mb-6">
              The application encountered an unexpected error. This may be due to corrupted save data or a temporary issue.
            </p>
            
            {this.state.error && (
              <div className="bg-diesel-dark border border-diesel-rust p-4 mb-6 text-left overflow-auto max-h-40">
                <p className="text-diesel-rust text-xs font-mono break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleClearAndReload}
                className="w-full py-3 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust font-bold uppercase hover:bg-diesel-rust/30 transition-colors"
              >
                Clear Data & Reload
              </button>
            </div>
            
            <p className="text-diesel-steel/50 text-xs mt-6">
              If the problem persists after clearing data, please report this issue.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
