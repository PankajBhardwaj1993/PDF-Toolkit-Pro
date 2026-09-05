/**
 * Helper to manage Spreadsheet Web Worker instance cleanly in React
 */

import { WorkerMessageRequest } from '../workers/spreadsheet.worker';

export class SpreadsheetWorkerService {
  private worker: Worker | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined' && window.Worker) {
      try {
        // Vite web worker standard instantiation
        this.worker = new Worker(
          new URL('../workers/spreadsheet.worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch (err) {
        console.warn('Web Worker initialization failed, falling back:', err);
        this.worker = null;
      }
    }
  }

  public isAvailable(): boolean {
    return this.worker !== null;
  }

  public postMessage(
    request: WorkerMessageRequest,
    onProgress?: (progress: number, status: string) => void,
    transferables?: Transferable[]
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Web Worker not supported or initialized.'));
        return;
      }

      const messageHandler = (e: MessageEvent) => {
        const data = e.data;
        if (data.type === 'PROGRESS') {
          if (onProgress) {
            onProgress(data.progress, data.status);
          }
        } else if (data.type === 'ERROR') {
          this.worker?.removeEventListener('message', messageHandler);
          reject(new Error(data.message));
        } else {
          // Success response
          this.worker?.removeEventListener('message', messageHandler);
          resolve(data);
        }
      };

      this.worker.addEventListener('message', messageHandler);

      if (transferables && transferables.length > 0) {
        this.worker.postMessage(request, transferables);
      } else {
        this.worker.postMessage(request);
      }
    });
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
