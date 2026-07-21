function Spinner() {
  return (
    <div className="spinner-container" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>Loading projects...</span>
    </div>
  );
}

export default Spinner;
