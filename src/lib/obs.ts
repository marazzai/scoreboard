import OBSWebSocket from 'obs-websocket-js';

type ObsSettings = {
  host: string; // e.g. 'localhost'
  port: number; // e.g. 4455
  password?: string;
};

class ObsController {
  private client: OBSWebSocket | null;
  private connected = false;
  private lastSettings: ObsSettings | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelayMs = 2000;

  constructor() {
    this.client = new OBSWebSocket();
    // best-effort event wiring for auto-reconnect across obs-websocket versions
    try {
      const anyClient: any = this.client as unknown as any;
      if (anyClient && typeof anyClient.on === 'function') {
        anyClient.on('ConnectionClosed', () => this.handleDisconnect());
        anyClient.on('ConnectionError', () => this.handleDisconnect());
        anyClient.on('ConnectionOpened', () => this.handleConnected());
        anyClient.on('Identified', () => this.handleConnected());
      }
    } catch {
      // ignore event binding errors
    }
  }

  async connectOBS(settings: ObsSettings) {
    const url = `ws://${settings.host}:${settings.port}`;
    try {
      await this.client?.connect(url, settings.password);
      this.connected = true;
      this.lastSettings = settings;
      if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
      this.reconnectDelayMs = 2000; // reset backoff
      console.log('Connected to OBS at', url);
      return true;
    } catch (e: unknown) {
      const msg = (await import('./errorUtils')).errorToString(e);
      console.error('Failed to connect to OBS', msg);
      this.connected = false;
      this.lastSettings = settings;
      this.scheduleReconnect();
      return false;
    }
  }

  async disconnectOBS() {
    try {
      await this.client?.disconnect();
    } catch (e) {
      const msg = (await import('./errorUtils')).errorToString(e);
      console.warn('Error during OBS disconnect', msg);
    } finally {
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected;
  }

  async switchScene(sceneName: string) {
    if (!this.connected) throw new Error('Not connected to OBS');
    try {
      await this.client?.call('SetCurrentProgramScene', { sceneName });
      return true;
    } catch (e: unknown) {
      const msg = (await import('./errorUtils')).errorToString(e);
      console.error('Failed to switch scene', msg);
      return false;
    }
  }

  async toggleSourceVisibility(sourceName: string) {
    if (!this.connected) throw new Error('Not connected to OBS');
    try {
      // v5 approach requires scene context; since this helper lacks scene, we try current program scene
      type ObsCall = (method: string, args?: Record<string, unknown>) => Promise<any>;
      const call: ObsCall = this.client ? ((this.client.call as unknown as ObsCall).bind(this.client)) : (async () => ({})) as ObsCall;
      // Get current program scene
      const cur = await call('GetCurrentProgramScene');
      const sceneName = String(cur?.currentProgramSceneName ?? cur?.sceneName ?? cur?.name ?? '');
      if (!sceneName) throw new Error('Unable to determine current scene');
      // Find scene item id
      let sceneItemId: number | null = null;
      try {
        const idResp = await call('GetSceneItemId', { sceneName, sourceName });
        sceneItemId = Number(idResp?.sceneItemId);
      } catch {
        // fallback: scan list
        const listResp = await call('GetSceneItemList', { sceneName });
        const items: any[] = Array.isArray(listResp?.sceneItems) ? listResp.sceneItems : [];
        const it = items.find((x) => String(x?.sourceName) === sourceName);
        sceneItemId = it ? Number(it.sceneItemId) : null;
      }
      if (!sceneItemId) throw new Error('Scene item not found');
      // Toggle: read current enabled state from list
      const listResp2 = await call('GetSceneItemList', { sceneName });
      const items2: any[] = Array.isArray(listResp2?.sceneItems) ? listResp2.sceneItems : [];
      const it2 = items2.find((x) => Number(x?.sceneItemId) === sceneItemId);
      const curEnabled = Boolean(it2?.sceneItemEnabled ?? it2?.render ?? false);
      // Set using v5 method
      await call('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled: !curEnabled });
      return true;
    } catch (e: unknown) {
      const msg = (await import('./errorUtils')).errorToString(e);
      console.error('Failed to toggle source visibility', msg);
      return false;
    }
  }

  async setSourceVisibility(sceneName: string, sourceName: string, visible: boolean) {
    if (!this.connected) throw new Error('Not connected to OBS');
    try {
      // v5 requires sceneItemId + SetSceneItemEnabled
      type ObsCall = (method: string, args?: Record<string, unknown>) => Promise<any>;
      const call: ObsCall = this.client ? ((this.client.call as unknown as ObsCall).bind(this.client)) : (async () => ({})) as ObsCall;
      // Try direct id lookup
      let sceneItemId: number | null = null;
      try {
        const idResp = await call('GetSceneItemId', { sceneName, sourceName });
        sceneItemId = Number(idResp?.sceneItemId);
      } catch {
        // Fallback: list items and match by sourceName
        const listResp = await call('GetSceneItemList', { sceneName });
        const items: any[] = Array.isArray(listResp?.sceneItems) ? listResp.sceneItems : [];
        const it = items.find((x) => String(x?.sourceName) === sourceName);
        sceneItemId = it ? Number(it.sceneItemId) : null;
      }
      if (!sceneItemId) throw new Error('Scene item not found');
      try {
        await call('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled: !!visible });
      } catch (e) {
        // legacy fallback for older servers
        try {
          await call('SetSceneItemRender', { sceneName, sceneItemId, render: !!visible });
        } catch (e2) {
          throw e2;
        }
      }
      return true;
    } catch (e: unknown) {
      const msg = (await import('./errorUtils')).errorToString(e);
      console.error('Failed to set source visibility', msg);
      return false;
    }
  }

  async listScenes() {
    if (!this.connected) {
      // not connected: return empty list instead of throwing so callers can handle gracefully
      return [] as string[];
    }

    try {
  type ObsCall = (method: string, args?: Record<string, unknown>) => Promise<unknown>;
  const call: ObsCall = this.client ? ((this.client.call as unknown as ObsCall).bind(this.client)) : (async () => ({})) as ObsCall;
  const resp = await call('GetSceneList');
      // resp may contain scenes with different property names depending on obs-websocket version
      const scenesRaw = (resp && typeof resp === 'object') ? (((resp as Record<string, unknown>).scenes ?? (resp as Record<string, unknown>).sceneList) as unknown) : [];
      const names: string[] = [];
      if (Array.isArray(scenesRaw)) {
        for (const s of scenesRaw) {
          if (!s || typeof s !== 'object') continue;
          const obj = s as Record<string, unknown>;
          const n = (obj.sceneName ?? obj.name ?? obj.sceneNameText ?? obj.scene) as string | undefined;
          if (typeof n === 'string' && n.length) names.push(n);
          else names.push(String(n ?? ''));
        }
      }
      return names;
    } catch (e: unknown) {
      const msg = (await import('./errorUtils')).errorToString(e);
      console.error('Failed to list scenes', msg);
      return [] as string[];
    }
  }

  // --- internal helpers ---
  private handleDisconnect() {
    this.connected = false;
    this.scheduleReconnect();
  }

  private handleConnected() {
    this.connected = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.reconnectDelayMs = 2000;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.lastSettings) return;
    const delay = Math.min(this.reconnectDelayMs, 30000);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connectOBS(this.lastSettings as ObsSettings);
      } catch {
        // ignore
      } finally {
        // exponential backoff
        this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 30000);
        if (!this.connected) this.scheduleReconnect();
      }
    }, delay);
  }
}

const obsController = new ObsController();
export default obsController;
export { ObsController };

