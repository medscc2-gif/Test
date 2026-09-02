export interface ElectronAPI {
  showNotification: (title: string, body: string) => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
