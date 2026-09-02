import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  showNotification: (title: string, body: string) => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
  isElectron: boolean;
}

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', { title, body }),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isElectron: true,
} satisfies ElectronAPI);
