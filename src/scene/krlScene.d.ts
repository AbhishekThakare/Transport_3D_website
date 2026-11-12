export interface KrlHud {
  kg: number; km: number; fade: number; p: number; ready: boolean;
  scene?: string; setup?: number; unloaded?: number; progress?: number;
}
export interface KrlScene {
  hud: KrlHud;
  paused?: boolean;
  setProgress(p: number): void;
  dispose(): void;
}
export function createKrlScene(container: HTMLElement): KrlScene;
