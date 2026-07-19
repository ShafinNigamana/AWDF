const projects = [
  {
    name: 'TaskSphere',
    description: 'Collaborative project management dashboard for tracking tasks and workflows.',
    technology: 'React, Firebase, Tailwind CSS',
    type: 'Academic Project',
    status: 'Completed',
  },
  {
    name: 'UniEvents',
    description: 'University event management platform with scheduling and registration capabilities.',
    technology: 'MongoDB, Express, React, Node.js',
    type: 'Academic Project',
    status: 'Completed',
  },
  {
    name: 'Argus',
    description: 'Cybersecurity monitoring tool designed to detect network intrusions and monitor traffic logs.',
    technology: 'Python, Flask, Socket.io, Wireshark',
    type: 'Academic Project',
    status: 'Completed',
  },
];

function Projects() {
  return (
    <main className="page-content container">
      <section className="card">
        <h1>Projects</h1>
        <p className="section-intro">A selection of academic and personal work.</p>

        <div className="projects-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.name}>
              <div className="project-card-header">
                <h2>{project.name}</h2>
              </div>
              <p>{project.description}</p>
              
              <div className="project-tech-badges">
                {project.technology.split(',').map((tech) => (
                  <span key={tech.trim()} className="tech-chip">{tech.trim()}</span>
                ))}
              </div>
              
              <div className="project-card-footer">
                <span className="project-tag type-tag">{project.type}</span>
                <span className="project-tag status-tag">{project.status}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Projects;
