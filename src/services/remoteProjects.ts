import { api, ApiError } from './api';
import {
  forgetRemoteProject,
  forgetRemoteProjectDocuments,
  getRemoteProject,
  rememberRemoteProject,
} from './remoteSession';
import type { Workspace } from '../types';

const pending = new Map<string, Promise<string>>();

async function resolveRemoteProject(workspace: Workspace): Promise<string> {
  const mapped = getRemoteProject(workspace.id);
  if (mapped) {
    try {
      await api.projects.get(mapped);
      return mapped;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      forgetRemoteProject(workspace.id);
    }
  }

  const created = await api.projects.create({
    name: workspace.name,
    description: workspace.description,
  });
  rememberRemoteProject(workspace.id, created.id);
  return created.id;
}

/**
 * Maps browser-local projects to their temporary backend counterparts. The
 * mapping is bound to the active backend session and stored only in
 * sessionStorage, so it disappears when the browser session ends.
 */
export function ensureRemoteProject(workspace: Workspace): Promise<string> {
  const inFlight = pending.get(workspace.id);
  if (inFlight) return inFlight;

  const task = resolveRemoteProject(workspace).finally(() => {
    pending.delete(workspace.id);
  });
  pending.set(workspace.id, task);
  return task;
}

export async function deleteRemoteProject(localId: string): Promise<void> {
  const remoteId = getRemoteProject(localId);
  if (!remoteId) return;

  try {
    await api.projects.remove(remoteId);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      forgetRemoteProject(localId);
      forgetRemoteProjectDocuments(remoteId);
      throw error;
    }
  }
  forgetRemoteProject(localId);
  forgetRemoteProjectDocuments(remoteId);
}
