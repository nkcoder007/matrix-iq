import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { KnowledgeDocument } from '../../types';
import { useKnowledge } from '../../store/KnowledgeContext';
import { projectPath } from '../../lib/paths';
import { Icon } from '../icons';
import { Dialog } from '../ui/Dialog';

export function SourceActions({ document }: { document: KnowledgeDocument }) {
  const { workspace, renameDocument, deleteDocument } = useKnowledge();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'rename' | 'delete' | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const openRename = () => {
    setTitle(document.title);
    setMode('rename');
  };

  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    renameDocument(document.id, title);
    setMode(null);
  };

  const confirmDelete = async () => {
    setBusy(true);
    const deleted = await deleteDocument(document.id);
    setBusy(false);
    if (deleted) {
      setMode(null);
      navigate(projectPath(workspace.id, 'sources'));
    }
  };

  return (
    <>
      <button type="button" className="btn btn--sm btn--ghost" onClick={openRename}>
        Rename
      </button>
      <button
        type="button"
        className="btn btn--sm btn--ghost btn--danger"
        onClick={() => setMode('delete')}
      >
        Delete
      </button>

      <Dialog
        open={mode === 'rename'}
        onClose={() => setMode(null)}
        eyebrow="Source"
        title="Rename source"
        description="The title is used across the source list, graph and insights."
        initialFocusRef={titleRef}
      >
        <form className="modal__form" onSubmit={submitRename}>
          <div className="field">
            <label className="field__label" htmlFor="source-title">
              Source title
            </label>
            <input
              ref={titleRef}
              id="source-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setMode(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
              Save title
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={mode === 'delete'}
        onClose={() => setMode(null)}
        eyebrow="Delete source"
        title={`Delete “${document.title}”?`}
        description="The source and any ideas or connections that depend on it will be removed from this project."
        className="modal__dialog--danger"
      >
        <div className="modal__note">
          <Icon name="alert" size={15} />
          <span>This cannot be undone. Other sources are not affected.</span>
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setMode(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger-solid"
            onClick={() => void confirmDelete()}
            disabled={busy}
          >
            {busy ? 'Deleting…' : 'Delete source'}
          </button>
        </div>
      </Dialog>
    </>
  );
}
