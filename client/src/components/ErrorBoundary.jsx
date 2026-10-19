import { Component } from "react";

// Last line of defence: a crash in one page shows a friendly message instead of a blank screen.
class ErrorBoundary extends Component {
    state = { failed: false };

    static getDerivedStateFromError() { return { failed: true }; }

    componentDidCatch(error, info) {
        console.error("UI crashed:", error, info?.componentStack);
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <div className="auth-wrap">
                <div className="card card-pad auth-card center">
                    <h1>Something went wrong</h1>
                    <p className="muted mt-1 mb-2">
                        An unexpected error occurred. Reloading usually fixes it – your data is safe.
                    </p>
                    <div className="row" style={{ justifyContent: "center" }}>
                        <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
                        <a className="btn btn-secondary" href="/">Go to home</a>
                    </div>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
