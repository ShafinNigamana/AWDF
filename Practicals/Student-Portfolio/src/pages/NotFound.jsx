import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <main className="page-content container">
      <section className="card not-found">
        <h1>404</h1>
        <p>Page Not Found</p>
        <Link to="/" className="btn">Back to Home</Link>
      </section>
    </main>
  );
}

export default NotFound;
