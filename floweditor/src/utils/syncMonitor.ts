export interface SyncEvent {
  id: string;
  type: 'sync_start' | 'sync_success' | 'sync_error' | 'sync_timeout';
  component: string;
  operation: string;
  timestamp: number;
  duration?: number;
  error?: string;
  data?: any;
}

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncDuration: number;
  lastSyncTime?: number;
  errorRate: number;
}

class SyncMonitor {
  private events: SyncEvent[] = [];
  private maxEvents = 1000;
  private metrics: SyncMetrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncDuration: 0,
    errorRate: 0,
  };

  private startTimes: Map<string, number> = new Map();

  // Start monitoring a sync operation
  startSync(component: string, operation: string, data?: any): string {
    const id = this.generateId();
    const startTime = Date.now();
    
    this.startTimes.set(id, startTime);
    
    const event: SyncEvent = {
      id,
      type: 'sync_start',
      component,
      operation,
      timestamp: startTime,
      data,
    };
    
    this.addEvent(event);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SyncMonitor] ${component}.${operation} started (${id})`, data);
    }
    
    return id;
  }

  // Record successful sync completion
  endSync(id: string, data?: any): void {
    const startTime = this.startTimes.get(id);
    if (!startTime) {
      console.warn(`[SyncMonitor] No start time found for sync ${id}`);
      return;
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    this.startTimes.delete(id);
    
    const event: SyncEvent = {
      id,
      type: 'sync_success',
      component: this.getComponentFromId(id),
      operation: this.getOperationFromId(id),
      timestamp: endTime,
      duration,
      data,
    };
    
    this.addEvent(event);
    this.updateMetrics(event);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SyncMonitor] Sync completed successfully (${id}) in ${duration}ms`, data);
    }
  }

  // Record sync failure
  failSync(id: string, error: string, data?: any): void {
    const startTime = this.startTimes.get(id);
    const endTime = Date.now();
    const duration = startTime ? endTime - startTime : undefined;
    
    this.startTimes.delete(id);
    
    const event: SyncEvent = {
      id,
      type: 'sync_error',
      component: this.getComponentFromId(id),
      operation: this.getOperationFromId(id),
      timestamp: endTime,
      duration,
      error,
      data,
    };
    
    this.addEvent(event);
    this.updateMetrics(event);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[SyncMonitor] Sync failed (${id}) in ${duration}ms:`, error, data);
    }
  }

  // Record sync timeout
  timeoutSync(id: string, timeoutMs: number): void {
    const startTime = this.startTimes.get(id);
    const endTime = Date.now();
    const duration = startTime ? endTime - startTime : undefined;
    
    this.startTimes.delete(id);
    
    const event: SyncEvent = {
      id,
      type: 'sync_timeout',
      component: this.getComponentFromId(id),
      operation: this.getOperationFromId(id),
      timestamp: endTime,
      duration,
      error: `Sync timed out after ${timeoutMs}ms`,
    };
    
    this.addEvent(event);
    this.updateMetrics(event);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SyncMonitor] Sync timed out (${id}) after ${timeoutMs}ms`);
    }
  }

  // Get recent sync events
  getRecentEvents(limit = 100, component?: string): SyncEvent[] {
    let events = [...this.events];
    
    if (component) {
      events = events.filter(event => event.component === component);
    }
    
    return events.slice(-limit);
  }

  // Get sync metrics
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  // Get sync events by type
  getEventsByType(type: SyncEvent['type'], limit = 100): SyncEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit);
  }

  // Get sync events by component
  getEventsByComponent(component: string, limit = 100): SyncEvent[] {
    return this.events
      .filter(event => event.component === component)
      .slice(-limit);
  }

  // Clear all events and metrics
  clear(): void {
    this.events = [];
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncDuration: 0,
      errorRate: 0,
    };
    this.startTimes.clear();
  }

  // Export sync data for analysis
  exportData(): { events: SyncEvent[]; metrics: SyncMetrics } {
    return {
      events: [...this.events],
      metrics: { ...this.metrics },
    };
  }

  // Monitor postMessage communication
  monitorPostMessage(origin: string, type: string, data?: any): string {
    return this.startSync('postMessage', `${origin}.${type}`, data);
  }

  private addEvent(event: SyncEvent): void {
    this.events.push(event);
    
    // Keep only recent events to prevent memory leaks
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  private updateMetrics(event: SyncEvent): void {
    this.metrics.totalSyncs++;
    
    if (event.type === 'sync_success') {
      this.metrics.successfulSyncs++;
      this.metrics.lastSyncTime = event.timestamp;
      
      // Update average duration
      if (event.duration) {
        const totalDuration = this.metrics.averageSyncDuration * (this.metrics.successfulSyncs - 1) + event.duration;
        this.metrics.averageSyncDuration = totalDuration / this.metrics.successfulSyncs;
      }
    } else if (event.type === 'sync_error' || event.type === 'sync_timeout') {
      this.metrics.failedSyncs++;
    }
    
    // Update error rate
    this.metrics.errorRate = this.metrics.failedSyncs / this.metrics.totalSyncs;
  }

  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `sync_${timestamp}_${random}`;
  }

  private getComponentFromId(id: string): string {
    // Extract component from event data or return default
    const event = this.events.find(e => e.id === id);
    return event?.component || 'unknown';
  }

  private getOperationFromId(id: string): string {
    // Extract operation from event data or return default
    const event = this.events.find(e => e.id === id);
    return event?.operation || 'unknown';
  }
}

// Create singleton instance
export const syncMonitor = new SyncMonitor();

// Export helper functions for easy usage
export const startSync = (component: string, operation: string, data?: any): string => {
  return syncMonitor.startSync(component, operation, data);
};

export const endSync = (id: string, data?: any): void => {
  syncMonitor.endSync(id, data);
};

export const failSync = (id: string, error: string, data?: any): void => {
  syncMonitor.failSync(id, error, data);
};

export const timeoutSync = (id: string, timeoutMs: number): void => {
  syncMonitor.timeoutSync(id, timeoutMs);
};

export const getSyncMetrics = (): SyncMetrics => {
  return syncMonitor.getMetrics();
};

export const getRecentSyncEvents = (limit = 100, component?: string): SyncEvent[] => {
  return syncMonitor.getRecentEvents(limit, component);
};

export const monitorPostMessage = (origin: string, type: string, data?: any): string => {
  return syncMonitor.monitorPostMessage(origin, type, data);
};

export default syncMonitor;