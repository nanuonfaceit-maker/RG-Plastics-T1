import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Tally Prime Uncaught Exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#dbe7ee] p-4 text-[#0d222f] font-sans select-none">
          <div className="w-full max-w-lg bg-white border-2 border-[#a61a1a] shadow-2xl overflow-hidden">
            <div className="bg-[#a61a1a] px-3 py-1.5 flex items-center justify-between text-white font-bold text-xs uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#fed843]" />
                <span>Tally Prime Diagnostic Recovery</span>
              </div>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="font-bold text-[#00253d] text-sm">An unexpected runtime error was caught.</p>
              <div className="bg-[#f0f5f8] p-2.5 border border-[#8caebd] font-mono text-[11px] text-[#a61a1a] break-words">
                {this.state.error?.message || 'Unknown runtime error occurred.'}
              </div>
              <p className="text-[11px] text-[#4a6777]">
                Your offline database records are safe. Click below to reload the Gateway of Tally.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-1.5 bg-[#fed843] hover:bg-[#ffe570] text-[#00253d] font-bold border border-[#c99a00] shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Reload Gateway of Tally</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
