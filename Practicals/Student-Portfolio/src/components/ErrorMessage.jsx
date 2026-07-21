function ErrorMessage({ onRetry }) {
  return (
    <div className="error-message" role="alert">
      <p>Unable to load projects.</p>
      <p>Please try again.</p>
      <button type="button" className="btn" onClick={onRetry}>Retry</button>
    </div>
  );
}

export default ErrorMessage;
