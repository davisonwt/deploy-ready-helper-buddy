import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  onBack: () => void;
}

interface State {
  error: Error | null;
}

// Wraps a Daily call screen (JitsiCall/JitsiRoom) so a crash inside it --
// e.g. daily-js posting to an already-torn-down iframe -- shows "Call
// error" with a way back instead of taking the whole page to black (the
// production crash this exists for: "null is not an object (evaluating
// 'u.postMessage')").
//
// Logs the full stack + component stack to console, and to the existing
// public.error_logs table (see 20250918194922_..._error_logs.sql --
// error_message/error_stack/error_name/component_stack/error_id/
// user_agent/url, RLS lets a user insert their own row) so a crash on a
// phone with no devtools attached can still be read from the SQL editor
// afterward.
export class CallErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CallErrorBoundary caught error:', error, errorInfo.componentStack);

    const errorId = `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: insertError } = await supabase.from('error_logs').insert({
          user_id: user?.id ?? null,
          error_message: error.message || 'Unknown call error',
          error_stack: error.stack ?? null,
          error_name: error.name,
          component_stack: errorInfo.componentStack ?? null,
          error_id: errorId,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          url: typeof window !== 'undefined' ? window.location.href : '',
        });
        if (insertError) console.error('CallErrorBoundary: failed to log error_logs row', insertError);
      } catch (logErr) {
        console.error('CallErrorBoundary: failed to log error_logs row', logErr);
      }
    })();
  }

  handleBack = () => {
    this.setState({ error: null });
    this.props.onBack();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <p className="text-lg font-medium text-destructive">
            Call error: {this.state.error.message || 'Something went wrong.'}
          </p>
          <Button onClick={this.handleBack} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
