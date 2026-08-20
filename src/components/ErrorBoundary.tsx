import React from 'react';

// A crash in the theater used to paint a black screen and say nothing,
// which is the worst possible failure: the player cannot tell a bug
// from an empty scene, and the developer gets "it went black".
//
// This catches the throw and prints what happened, on screen, where
// somebody can read it out loud over the phone.

interface Props {
  children: React.ReactNode;
  /** Where this boundary sits, e.g. "Theater". */
  where?: string;
}

interface State {
  error: Error | null;
  info: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep the full trace in the console for anyone who opens devtools.
    console.error(`[${this.props.where ?? 'app'}] crashed:`, error, info);
    this.setState({ info: info.componentStack ?? null });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-diesel-black text-diesel-paper p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-diesel-rust text-xl font-bold uppercase tracking-widest">
            {this.props.where ?? 'Something'} stopped
          </h1>
          <p className="text-diesel-steel text-sm mt-2">
            The show hit an error instead of drawing. This is a bug, not
            something you did.
          </p>

          <pre className="mt-5 p-3 bg-diesel-panel border border-diesel-border text-diesel-paper text-xs whitespace-pre-wrap overflow-x-auto">
            {error.name}: {error.message}
          </pre>

          {error.stack && (
            <details className="mt-3">
              <summary className="text-diesel-steel text-xs cursor-pointer">
                Where it happened
              </summary>
              <pre className="mt-2 p-3 bg-diesel-panel border border-diesel-border text-diesel-steel text-[11px] whitespace-pre-wrap overflow-x-auto">
                {error.stack}
              </pre>
            </details>
          )}

          {info && (
            <details className="mt-3">
              <summary className="text-diesel-steel text-xs cursor-pointer">
                Which components
              </summary>
              <pre className="mt-2 p-3 bg-diesel-panel border border-diesel-border text-diesel-steel text-[11px] whitespace-pre-wrap overflow-x-auto">
                {info}
              </pre>
            </details>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => this.setState({ error: null, info: null })}
              className="px-5 py-2.5 border-2 border-diesel-gold text-diesel-gold uppercase text-sm font-bold hover:bg-diesel-gold/10"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 border-2 border-diesel-steel text-diesel-steel uppercase text-sm hover:bg-diesel-steel/10"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
