import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 ErrorBoundary caught error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    // Use React Router navigation instead of window.location to prevent full page reload
    if (this.props.navigate) {
      this.props.navigate('/dashboard');
    } else {
      // Fallback to full page navigation if navigate prop not available
      window.location.href = '/dashboard';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-destructive/10 to-warning/10 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card rounded-lg shadow-xl p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold text-destructive mb-2">
                Payment Processing Error
              </h2>
              <p className="text-destructive/80 mb-6">
                There was an issue processing your bestowal. This might be due to a network issue or authentication problem. Please try refreshing the page or logging in again.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 px-4 py-2 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </button>
              </div>
              
              {this.state.error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <details className="text-left">
                    <summary className="text-sm font-medium text-destructive cursor-pointer">
                      Error Details
                    </summary>
                    <div className="mt-2 text-xs text-destructive/80">
                      <div className="font-mono bg-destructive/5 p-2 rounded border border-destructive/10">
                        {this.state.error.toString()}
                      </div>
                      {this.state.errorInfo && this.state.errorInfo.componentStack && (
                        <div className="mt-2 font-mono bg-destructive/5 p-2 rounded border border-destructive/10 text-xs">
                          {this.state.errorInfo.componentStack}
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to inject navigate function
const ErrorBoundaryWithRouter = ({ children }) => {
  const navigate = useNavigate();
  
  return (
    <ErrorBoundary navigate={navigate}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundaryWithRouter;