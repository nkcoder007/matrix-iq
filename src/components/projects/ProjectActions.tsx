import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKnowledge } from '../../store/KnowledgeContext';
import { Icon } from '../icons';
import { Dialog } from '../ui/Dialog';

export function ProjectActions() {
  const { workspace, workspaces, updateWorkspace, deleteWorkspace } = useKnowledge();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'edit' | 'delete' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const openEdit = () => {
    setName(workspace.name);
    setDescription(workspace.description);
    setMode('edit');
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    updateWorkspace(workspace.id, { name, description });
    setMode(null);
  };

  const confirmDelete = async () => {
    setBusy(true);
    const deleted = await deleteWorkspace(workspace.id);
    setBusy(false);
    if (deleted) {
      setMode(null);
      navigate('/');
    }
  };

  return (
    <>
      <div className="data-actions">
        <button type="button" className="btn btn--secondary btn--sm" onClick={openEdit}>
          Rename project
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm btn--danger"
          onClick={() => setMode('delete')}
          disabled={workspaces.length <= 1}
          title={workspaces.length <= 1 ? 'Keep at least one project' : undefined}
        >
          Delete project
        </button>
      </div>
      {workspaces.length <= 1 ? (
        <p className="field__hint">Keep at least one project so new sources always have a home.</p>
      ) : null}

      <Dialog
        open={mode === 'edit'}
        onClose={() => setMode(null)}
        eyebrow="Project"
        title="Edit project"
        description="Names and descriptions update everywhere in this workspace."
        initialFocusRef={nameRef}
      >
        <form className="modal__form" onSubmit={submitEdit}>
          <div className="field">
            <label className="field__label" htmlFor="project-edit-name">
              Project name
            </label>
            <input
              ref={nameRef}
              id="project-edit-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="project-edit-description">
              Description
            </label>
            <input
              id="project-edit-description"
              className="input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setMode(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={!name.trim()}>
              Save changes
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={mode === 'delete'}
        onClose={() => setMode(null)}
        eyebrow="Delete project"
        title={`Delete “${workspace.name}”?`}
        description="Every source, idea, connection and insight that belongs to this project will be removed from this browser."
        className="modal__dialog--danger"
      >
        <div className="modal__note">
          <Icon name="alert" size={15} />
          <span>This cannot be undone. Your saved theme preference is not affected.</span>
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
            {busy ? 'Deleting…' : 'Delete project'}
          </button>
        </div>
      </Dialog>
    </>
  );
}
