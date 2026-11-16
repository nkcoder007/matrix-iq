import { useKnowledge } from '../../store/KnowledgeContext';
import { backendConfig } from '../../services/api';
import { Icon } from '../icons';
import { Badge } from '../ui/Badge';

/**
 * Surfaces the remote analysis state outside the Sources screen. Without this,
 * a failed or still-running analysis looked exactly like an empty project on
 * the graph and insights pages.
 */
export function AnalysisNotice() {
  const {
    documents,
    concepts,
    analysisStatus,
    analysisError,
    analysisBusy,
    startAnalysis,
    refreshAnalysis,
  } = useKnowledge();

  if (!backendConfig.configured) return null;
  const remoteDocuments = documents.filter((document) => Boolean(document.remoteProjectId));
  if (remoteDocuments.length === 0) return null;

  const status = analysisStatus?.status ?? 'idle';
  if (status === 'complete' && !analysisError && concepts.length > 0) return null;

  const running = status === 'running' || analysisBusy;
  const count = analysisStatus?.documentCount ?? remoteDocuments.length;
  const sources = `${count} ${count === 1 ? 'source' : 'sources'}`;

  const content =
    status === 'running'
      ? {
          tone: 'blue' as const,
          badge: 'Running',
          title: 'Analysis is running',
          text: `Reading ${sources} together. Results appear here automatically when it finishes.`,
          action: null,
        }
      : status === 'failed'
        ? {
            tone: 'rose' as const,
            badge: 'Failed',
            title: 'Analysis did not finish',
            text:
              analysisError ??
              'The last analysis failed. Your sources are unchanged; try again.',
            action: { label: 'Try again', run: startAnalysis },
          }
        : status === 'stale'
          ? {
              tone: 'amber' as const,
              badge: 'Needs refresh',
              title: 'The sources changed since the last analysis',
              text: 'Re-analyze the project to include the new or updated sources.',
              action: { label: 'Re-analyze project', run: startAnalysis },
            }
          : status === 'complete'
            ? {
                tone: 'rose' as const,
                badge: 'Results unavailable',
                title: 'The analysis finished, but its results could not be loaded',
                text:
                  analysisError ??
                  'The analysis completed, but no ideas are available in this project. Reload the results or run the analysis again.',
                action: { label: 'Reload results', run: refreshAnalysis },
              }
            : analysisError
              ? {
                  tone: 'amber' as const,
                  badge: 'Status unavailable',
                  title: 'The analysis status could not be checked',
                  text: analysisError,
                  action: { label: 'Check again', run: refreshAnalysis },
                }
              : {
                  tone: 'neutral' as const,
                  badge: 'Ready',
                  title: 'Sources are ready to analyse',
                  text: 'Run cross-document analysis to generate the project graph and insights.',
                  action: { label: 'Analyze project', run: startAnalysis },
                };

  return (
    <section className="analysis-card card" aria-live="polite">
      <div className="analysis-card__head">
        <div className="analysis-card__title-wrap">
          <span className="analysis-card__icon">
            <Icon name="sparkles" size={17} />
          </span>
          <div>
            <h2 className="analysis-card__title">{content.title}</h2>
            <p className="analysis-card__sub">{content.text}</p>
          </div>
        </div>
        <Badge tone={content.tone} dot={status === 'running'}>
          {content.badge}
        </Badge>
      </div>
      {content.action ? (
        <div className="analysis-card__foot">
          <p className="analysis-card__note">
            Analysis is session-scoped and never runs on local sample sources.
          </p>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => void content.action?.run()}
            disabled={running}
          >
            <span className="btn__icon">
              <Icon name="sparkles" size={14} />
            </span>
            {analysisBusy ? 'Starting…' : content.action.label}
          </button>
        </div>
      ) : null}
    </section>
  );
}
