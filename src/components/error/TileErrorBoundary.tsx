import { Component, type ErrorInfo, type ReactNode } from 'react';

// A boundary for one widget. A tile that throws while rendering (a bad
// value from a function, an unexpected null) must degrade to a small
// "couldn't load" box, never unmount the whole page through the
// page-level boundary. 2026-09-06: added around the wallet tiles after a
// reported blank screen tied to get-wallet-balance.

interface Props {
  /** Short name shown in the fallback, e.g. "wallet balance". */
  name: string;
  children: ReactNode;
  /** Compact fallback for inline chips. */
  inline?: boolean;
}
interface State { error: Error | null }

export class TileErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[TileErrorBoundary] ${this.props.name} failed to render`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.inline) {
      return (
        <span className="text-xs text-muted-foreground" data-testid="tile-error" title={this.state.error.message}>
          {this.props.name} unavailable
        </span>
      );
    }
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm" data-testid="tile-error">
        <p className="font-medium">This {this.props.name} couldn't load.</p>
        <p className="text-xs text-muted-foreground mt-1">The rest of the page is unaffected. Refresh to try again.</p>
        <button type="button" className="mt-2 text-xs underline" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    );
  }
}
