import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Keep this log for production diagnostics pipelines.
    console.error('Unhandled UI error', error);
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-6 text-red-700">Something went wrong. Please refresh the page.</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
