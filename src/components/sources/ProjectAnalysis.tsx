import { useKnowledge } from '../../store/KnowledgeContext';
import { backendConfig } from '../../services/api';
import { Icon } from '../icons';
import { Badge } from '../ui/Badge';

export function ProjectAnalysis() {
  const {
    documents,
    analysisStatus,
    analysisError,
    analysisBusy,
    startAnalysis,
  } = useKnowledge();

  if (!backendConfig.configured || documents.length === 0) return null;
  const remoteDocuments = documents.filter((document) => Boolean(document.remoteProjectId));
  if (remoteDocuments.length === 0) return null;

  const status = analysisStatus?.status ?? 'idle';
  const running = status === 'running' || analysisBusy;
  const count = analysisStatus?.documentCount ?? remoteDocuments.length;
  const conceptCount = analysisStatus?.conceptCount ?? 0;
  const connectionCount = analysisStatus?.connectionCount ?? 0;

  const summary =
    status === 'complete'
      ? `${conceptCount} ${conceptCount === 1 ? 'idea' : 'ideas'} and ${connectionCount} ${connectionCount === 1 ? 'connection' : 'connections'} found across ${count} ${count === 1 ? 'source' : 'sources'}.`
      : status === 'running'
        ? `Reading ${count} ${count === 1 ? 'source' : 'sources'} together. This can take a moment.`
        : status === 'stale'
          ? 'Sources changed since the last analysis. Run it again to refresh the project graph.'
          : status === 'failed'
            ? 'The last analysis did not finish. Your sources are unchanged.'
            : 'Analyze every source in this project together to find concepts and evidence-backed connections.';

  return (
    <section className="analysis-card card" aria-labelledby="analysis-title">
      <div className="analysis-card__head">
        <div className="analysis-card__title-wrap">
          <span className="analysis-card__icon">
            <Icon name="sparkles" size={17} />
          </span>
          <div>
            <h2 className="analysis-card__title" id="analysis-title">
              Cross-document analysis
            </h2>
            <p className="analysis-card__sub">{summary}</p>
          </div>
        </div>
        <Badge
          tone={
            status === 'complete'
              ? 'mint'
              : status === 'failed'
                ? 'rose'
                : status === 'running'
                  ? 'blue'
                  : status === 'stale'
                    ? 'amber'
                    : 'neutral'
          }
          dot={status === 'running'}
        >
          {status === 'complete'
            ? 'Analysed'
            : status === 'running'
              ? 'Running'
              : status === 'failed'
                ? 'Failed'
                : status === 'stale'
                  ? 'Needs refresh'
                  : 'Ready'}
        </Badge>
      </div>

      <div className="analysis-card__foot">
        <p className="analysis-card__note">
          Every idea and connection keeps its source excerpts. Direct evidence, reasonable inference
          and speculative connections are labelled separately.
        </p>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => void startAnalysis()}
          disabled={running}
        >
          <span className="btn__icon">
            <Icon name="sparkles" size={14} />
          </span>
          {analysisBusy
            ? 'Starting…'
            : status === 'complete' || status === 'stale' || status === 'failed'
              ? 'Re-analyze project'
              : 'Analyze project'}
        </button>
      </div>

      {analysisError ? (
        <p className="analysis-card__error" role="alert">
          <Icon name="alert" size={13} />
          {analysisError}
        </p>
      ) : null}
    </section>
  );
}
