/**
 * Spatial Scene — Three.js scene management for 3D/VR
 *
 * @module spatial/scene
 * @layer L4B
 */

import { Scene, PerspectiveCamera, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import type { WebGLRenderer } from 'three';

export interface SpatialScene {
  getRenderer(): WebGLRenderer | null;
  getScene(): Scene;
  getCamera(): PerspectiveCamera;
  addEntity(id: string, position: { x: number; y: number; z: number }): void;
  removeEntity(id: string): void;
  updateEntityPosition(id: string, position: { x: number; y: number; z: number }): void;
  getEntityMesh(id: string): Mesh | undefined;
  getAllEntityIds(): string[];
  dispose(): void;
}

export function createSpatialScene(): SpatialScene {
  const scene = new Scene();
  const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.set(0, 1.6, 3);
  const entities = new Map<string, Mesh>();

  return {
    getRenderer() {
      return null; // Renderer created lazily when DOM available
    },

    getScene() {
      return scene;
    },

    getCamera() {
      return camera;
    },

    addEntity(id: string, position: { x: number; y: number; z: number }) {
      if (entities.has(id)) return;
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new MeshBasicMaterial({ color: 0x808080 });
      const mesh = new Mesh(geometry, material);
      mesh.position.set(position.x, position.y, position.z);
      mesh.userData.entityId = id;
      scene.add(mesh);
      entities.set(id, mesh);
    },

    removeEntity(id: string) {
      const mesh = entities.get(id);
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as MeshBasicMaterial).dispose();
        entities.delete(id);
      }
    },

    updateEntityPosition(id: string, position: { x: number; y: number; z: number }) {
      const mesh = entities.get(id);
      if (mesh) {
        mesh.position.set(position.x, position.y, position.z);
      }
    },

    getEntityMesh(id: string) {
      return entities.get(id);
    },

    getAllEntityIds() {
      return Array.from(entities.keys());
    },

    dispose() {
      for (const [id, mesh] of entities) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as MeshBasicMaterial).dispose();
      }
      entities.clear();
    },
  };
}
