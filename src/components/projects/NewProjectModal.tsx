import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKnowledge } from '../../store/KnowledgeContext';
import { projectPath } from '../../lib/paths';
import { Dialog } from '../ui/Dialog';

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewProjectModal({ open, onClose }: NewProjectModalProps) {
  const { createWorkspace } = useKnowledge();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [includeSamples, setIncludeSamples] = useState(true);
  const nameRef = useRef<HTMLInputElement>(null);

  const close = () => {
    onClose();
    setName('');
    setDescription('');
    setIncludeSamples(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const id = createWorkspace({ name, description, includeSamples });
    close();
    navigate(projectPath(id));
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      eyebrow="New project"
      title="Start a separate project"
      description="Each project keeps its own sources, ideas and discoveries. Sources added here never show up in another project."
      initialFocusRef={nameRef}
    >
      <form className="modal__form" onSubmit={submit}>
        <div className="field">
          <label className="field__label" htmlFor="project-name">
            Project name
          </label>
          <input
            ref={nameRef}
            id="project-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Thesis reading"
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="project-description">
            Description <span className="dim">(optional)</span>
          </label>
          <input
            id="project-description"
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this project about?"
          />
        </div>

        <label className="modal__option">
          <input
            type="checkbox"
            checked={includeSamples}
            onChange={(event) => setIncludeSamples(event.target.checked)}
          />
          <span>
            <span className="modal__option-title">Include the three sample sources</span>
            <span className="modal__option-sub">
              Bees, computers and sourdough — useful for exploring the graph straight away.
            </span>
          </span>
        </label>

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!name.trim()}>
            Create project
          </button>
        </div>
      </form>
    </Dialog>
  );
}
