import type { Project, ProjectDoc } from '../types/project';

const PROJECT_PREFIX = 'project/';

export const storageService = {
  async saveProject(project: Project): Promise<void> {
    const _id = `${PROJECT_PREFIX}${project.id}`;
    const existing = (window as any).utoolsDb.get(_id) as ProjectDoc | null;
    
    const doc: ProjectDoc = {
      _id,
      data: {
        ...project,
        updatedAt: Date.now()
      }
    };

    if (existing) {
      doc._rev = existing._rev;
    }

    const res = (window as any).utoolsDb.put(doc);
    if (res.error) {
      throw new Error(res.message);
    }
  },

  async getProjects(): Promise<Project[]> {
    const docs = (window as any).utoolsDb.allDocs(PROJECT_PREFIX) as ProjectDoc[];
    return docs.map(doc => doc.data).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async deleteProject(id: string): Promise<void> {
    const _id = `${PROJECT_PREFIX}${id}`;
    (window as any).utoolsDb.remove(_id);
  },

  async getProject(id: string): Promise<Project | null> {
    const _id = `${PROJECT_PREFIX}${id}`;
    const doc = (window as any).utoolsDb.get(_id) as ProjectDoc | null;
    return doc ? doc.data : null;
  }
};
