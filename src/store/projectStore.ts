import { defineStore } from 'pinia';
import type { Project, Material, LayoutItem } from '../types/project';
import { storageService } from '../utils/storage';
import { nanoid } from 'nanoid';

export const useProjectStore = defineStore('project', {
  state: () => ({
    projects: [] as Project[],
    currentProject: null as Project | null,
    loading: false,
    draggingItem: null as any | null, // Track currently dragged material or layout item
  }),
  actions: {
    async fetchProjects() {
      this.loading = true;
      try {
        this.projects = await storageService.getProjects();
      } finally {
        this.loading = false;
      }
    },

    async selectProject(id: string) {
      const project = await storageService.getProject(id);
      this.currentProject = project;
    },

    async createProject(name: string, description: string) {
      const newProject: Project = {
        id: nanoid(),
        name,
        description,
        materials: [],
        layout: [],
        updatedAt: Date.now(),
      };
      await storageService.saveProject(newProject);
      await this.fetchProjects();
      return newProject;
    },

    async updateProject(project: Project) {
      await storageService.saveProject(project);
      await this.fetchProjects();
      if (this.currentProject?.id === project.id) {
        this.currentProject = project;
      }
    },

    async deleteProject(id: string) {
      await storageService.deleteProject(id);
      await this.fetchProjects();
      if (this.currentProject?.id === id) {
        this.currentProject = null;
      }
    },

    addMaterial(material: Omit<Material, 'id'>) {
      if (!this.currentProject) return;
      const newMaterial = { ...material, id: nanoid() } as Material;
      this.currentProject.materials.push(newMaterial);
    },

    removeMaterial(id: string) {
      if (!this.currentProject) return;
      this.currentProject.materials = this.currentProject.materials.filter(m => m.id !== id);
      // Also remove from layout
      const removeFromLayout = (items: LayoutItem[]): LayoutItem[] => {
        return items.filter(item => item.materialId !== id).map(item => ({
          ...item,
          children: removeFromLayout(item.children)
        }));
      };
      this.currentProject.layout = removeFromLayout(this.currentProject.layout);
    }
  }
});
