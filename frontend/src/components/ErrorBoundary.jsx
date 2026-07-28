import { Component } from 'react';
import ErrorState from './ErrorState';

// Catches render-time errors that would otherwise leave a blank screen.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorState
        message={this.state.error.message || 'Unexpected application error'}
        onRetry={() => window.location.reload()}
      />
    );
  }
}
