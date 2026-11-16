/** Every page inside a project is scoped by its id, so links never cross projects. */
export function projectPath(workspaceId: string, page = ''): string {
  return page ? `/p/${workspaceId}/${page}` : `/p/${workspaceId}`;
}
