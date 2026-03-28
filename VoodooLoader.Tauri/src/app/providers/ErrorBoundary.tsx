import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI crash captured by ErrorBoundary", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ padding: 24, color: "#f0f4ff", background: "#0d1118", minHeight: "100vh" }}>
          <h1>Voodoo Loader</h1>
          <p>Unexpected UI error happened. Please restart the app.</p>
        </main>
      );
    }

    return this.props.children;
  }
}
