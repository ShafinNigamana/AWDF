import { useEffect, useState } from 'react';
import ErrorMessage from '../components/ErrorMessage';
import Spinner from '../components/Spinner';

const PROJECTS_API_URL = 'https://jsonplaceholder.typicode.com/posts';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchProjects = async (signal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(PROJECTS_API_URL, { signal });

      if (!response.ok) {
        throw new Error('Unable to load projects.');
      }

      const projectData = await response.json();
      setProjects(projectData);
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError('Unable to load projects.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(controller.signal);

    return () => controller.abort();
  }, []);

  const filteredProjects = projects.filter((project) => {
    const searchTerm = search.toLowerCase();

    return (
      project.title.toLowerCase().includes(searchTerm) ||
      project.body.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <main className="page-content container">
      <section className="card">
        <h1>Projects</h1>
        <p className="section-intro">A selection of academic and personal work.</p>

        <div className="project-search">
          <label htmlFor="project-search">Search Projects</label>
          <input id="project-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title or description" />
        </div>

        {loading && <Spinner />}
        {error && <ErrorMessage onRetry={() => fetchProjects()} />}

        {!loading && !error && (
          <div className="projects-grid">
            {filteredProjects.map((project) => (
              <article className="project-card" key={project.id}>
                <div className="project-card-header"><h2>{project.title}</h2></div>
                <p>{project.body}</p>
                <div className="project-card-footer">
                  <button type="button" className="btn project-details-button">View Details</button>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && !error && filteredProjects.length === 0 && <p className="no-projects">No projects match your search.</p>}
      </section>
    </main>
  );
}

export default Projects;
