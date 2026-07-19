import { Link } from 'react-router-dom';

function Header({ name }) {
  return (
    <header className="portfolio-header">
      <h1>{name || 'Shafin Nigamana'}</h1>
      <h2>B.Tech Information Technology Student</h2>
      <p className="header-subtitle">React Developer • Data Analyst • Cybersecurity Learner</p>
      <Link to="/projects" className="btn hero-btn">View Projects</Link>
    </header>
  );
}

export default Header;