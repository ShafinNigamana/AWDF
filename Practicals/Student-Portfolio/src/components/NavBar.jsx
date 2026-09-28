import { NavLink } from 'react-router-dom';

function NavBar({ isAuthenticated, onLogout }) {
  const navItems = [
    { to: '/', label: 'Home', end: true },
    { to: '/projects', label: 'Tasks' },
    { to: '/contact', label: 'Contact' },
    ...(!isAuthenticated ? [{ to: '/login', label: 'Login' }] : []),
  ];

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <div className="container nav-inner">
        <div className="brand">Shafin Nigamana</div>

        <ul className="nav-links">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        {isAuthenticated && <button className="nav-link nav-button" type="button" onClick={onLogout}>Logout</button>}
      </div>
    </nav>
  );
}

export default NavBar;
