import { useKnowledge } from '../../store/KnowledgeContext';

export function GraphLegend() {
  const { clusters } = useKnowledge();

  return (
    <div className="kg-legend">
      <div className="kg-legend__group">
        <span className="eyebrow">Topics</span>
        <ul className="kg-legend__items">
          {clusters.map((cluster) => (
            <li key={cluster.id}>
              <span className="dot" style={{ color: cluster.color }} />
              {cluster.short}
            </li>
          ))}
        </ul>
      </div>
      <p className="kg-legend__hint">
        Select a line to read how two ideas connect. Dashed lines are suggestions.
      </p>
    </div>
  );
}
