import { useEffect, useState } from 'react';
import ErrorMessage from '../components/ErrorMessage';
import Spinner from '../components/Spinner';

const GITHUB_USERNAME = 'ShafinNigamana';
const GITHUB_REPOSITORIES_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos`;

function Projects() {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  const fetchRepositories = async (signal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(GITHUB_REPOSITORIES_URL, { signal });

      if (!response.ok) {
        throw new Error('Unable to load repositories.');
      }

      const repositoryData = await response.json();
      setRepositories(repositoryData.slice(0, 5));
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError('Unable to load repositories.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchRepositories(controller.signal);

    return () => controller.abort();
  }, []);

  return (
    <main className="page-content container">
      <section className="card">
        <h1>Projects</h1>
        <p className="section-intro">A selection of academic and personal work.</p>

        <div className="search-bar">
          <input
            className="search-input"
            type="search"
            placeholder="Search projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search projects"
          />
        </div>

        {loading && <Spinner />}
        {error && <ErrorMessage onRetry={() => fetchRepositories()} />}

        {!loading && !error && (
          (() => {
            const filtered = repositories.filter((r) =>
              r.name.toLowerCase().includes(query.trim().toLowerCase()) ||
              (r.description || '').toLowerCase().includes(query.trim().toLowerCase())
            );

            return (
              <div>
                {filtered.length === 0 ? (
                  <p>No projects match your search.</p>
                ) : (
                  <div className="projects-grid">
                    {filtered.map((repository) => (
                      <article className="project-card" key={repository.id}>
                        <div className="project-card-header">
                          <h2>{repository.name}</h2>
                        </div>
                        <p>{repository.description || 'No description available.'}</p>
                        <div className="project-tech-badges">
                          <span className="tech-chip">{repository.language || 'No primary language'}</span>
                          <span className="tech-chip">⭐ {repository.stargazers_count}</span>
                        </div>
                        <div className="project-card-footer">
                          <a className="btn project-details-button" href={repository.html_url} target="_blank" rel="noreferrer">
                            Open on GitHub
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </section>
    </main>
  );
}

export default Projects;
