import { Link } from 'react-router-dom';
import { BrandMark } from '../components/icons';

export function NotFound() {
  return (
    <div className="notfound">
      <span className="notfound__mark">
        <BrandMark size={30} />
      </span>
      <p className="eyebrow">404 · Unmapped</p>
      <h1>This page is not in any project.</h1>
      <p className="notfound__text">
        The link you followed does not exist. Everything in MatrixIQ lives inside a project.
      </p>
      <div className="notfound__actions">
        <Link to="/" className="btn btn--primary">
          Back to your projects
        </Link>
      </div>
    </div>
  );
}
