import { Link, NavLink } from 'react-router-dom';
import { BrandMark } from '../icons';

/** Public-site chrome. Home and About stay one click away on both pages. */
export function SiteHeader() {
  return (
    <header className="home__bar">
      <Link to="/" className="home__brand" aria-label="MatrixIQ home">
        <span className="home__brandmark">
          <BrandMark size={24} />
        </span>
        <span>MatrixIQ</span>
      </Link>

      <nav className="site-nav" aria-label="Main navigation">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}
        >
          Home
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}
        >
          About
        </NavLink>
      </nav>
    </header>
  );
}
