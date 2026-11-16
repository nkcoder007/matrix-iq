import { useState } from 'react';
import type { KnowledgeDocument } from '../../types';
import { downloadSourceFile } from '../../lib/persistence';
import { Icon } from '../icons';

export function StoredFileButton({ document }: { document: KnowledgeDocument }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'missing'>('idle');

  if (!document.fileKey) return null;

  const download = async () => {
    setStatus('loading');
    const found = await downloadSourceFile(
      document.fileKey as string,
      document.fileName ?? document.title,
    );
    setStatus(found ? 'idle' : 'missing');
  };

  return (
    <div className="stored-file">
      <button
        type="button"
        className="btn btn--sm btn--secondary"
        onClick={() => void download()}
        disabled={status === 'loading'}
      >
        <span className="btn__icon">
          <Icon name="download" size={14} />
        </span>
        {status === 'loading' ? 'Opening…' : 'Download original file'}
      </button>
      {status === 'missing' ? (
        <span className="stored-file__error">The original file is no longer available.</span>
      ) : null}
    </div>
  );
}
