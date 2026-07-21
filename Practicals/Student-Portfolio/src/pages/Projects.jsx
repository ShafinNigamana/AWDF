import { useEffect, useState } from 'react';
import ErrorMessage from '../components/ErrorMessage';
import Spinner from '../components/Spinner';

const PROJECTS_API_URL = 'https://jsonplaceholder.typicode.com/posts';
const MINIMUM_LOADING_DURATION = 600;
const PORTFOLIO_PROJECTS = [
  {
    title: 'UniEvents',
    body: 'University management system.',
    githubUrl: 'https://github.com/ShafinNigamana/Unievents',
  },
  {
    title: 'TaskSphere',
    body: 'Team collaboration and task management system.',
    githubUrl: 'https://github.com/ShafinNigamana/TaskSphere',
  },
  {
    title: 'Argus',
    body: 'Cybersecurity monitoring system for detecting network intrusions and monitoring traffic logs.',
    githubUrl: 'https://github.com/ShafinNigamana/Argus',
  },
];

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = async (signal) => {
    const requestStartedAt = Date.now();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(PROJECTS_API_URL, { signal });

      if (!response.ok) {
        throw new Error('Unable to load projects.');
      }

      const projectData = await response.json();
      const portfolioProjects = projectData.slice(0, PORTFOLIO_PROJECTS.length).map((project, index) => ({
        ...project,
        ...PORTFOLIO_PROJECTS[index],
      }));

      setProjects(portfolioProjects);
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError('Unable to load projects.');
      }
    } finally {
      const remainingLoadingTime = MINIMUM_LOADING_DURATION - (Date.now() - requestStartedAt);

      if (remainingLoadingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingLoadingTime));
      }

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

  return (
    <main className="page-content container">
      <section className="card">
        <h1>Projects</h1>
        <p className="section-intro">A selection of academic and personal work.</p>


        {loading && <Spinner />}
        {error && <ErrorMessage onRetry={() => fetchProjects()} />}

        {!loading && !error && (
          <div className="projects-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <div className="project-card-header"><h2>{project.title}</h2></div>
                <p>{project.body}</p>
                <div className="project-card-footer">
                  <a className="btn project-details-button" href={project.githubUrl} target="_blank" rel="noreferrer">
                    Repository Link
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

      </section>
    </main>
  );
}

export default Projects;
