import { Logger } from '@daorsagro/utils';
import { IoTDevice, IoTService } from './iot.service';

/**
 * Device management service for IoT devices
 */
export class DeviceManager {
  private logger: Logger;
  private iotService: IoTService;
  private deviceRegistry: Map<string, IoTDevice> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.logger = new Logger('device-manager');
    this.iotService = new IoTService();
  }

  /**
   * Start device monitoring
   */
  start(): void {
    this.logger.info('Starting device manager');
    
    // Check device health every 5 minutes
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop device monitoring
   */
  stop(): void {
    this.logger.info('Stopping device manager');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Register device in local registry
   */
  registerDevice(device: IoTDevice): void {
    this.deviceRegistry.set(device.deviceId, device);
    this.logger.info('Device registered in manager', { deviceId: device.deviceId });
  }

  /**
   * Unregister device from local registry
   */
  unregisterDevice(deviceId: string): void {
    this.deviceRegistry.delete(deviceId);
    this.logger.info('Device unregistered from manager', { deviceId });
  }

  /**
   * Get device from registry
   */
  getDevice(deviceId: string): IoTDevice | undefined {
    return this.deviceRegistry.get(deviceId);
  }

  /**
   * Get all registered devices
   */
  getAllDevices(): IoTDevice[] {
    return Array.from(this.deviceRegistry.values());
  }

  /**
   * Update device last seen timestamp
   */
  updateDeviceLastSeen(deviceId: string): void {
    const device = this.deviceRegistry.get(deviceId);
    if (device) {
      device.lastSeen = new Date();
      device.status = 'online';
    }
  }

  /**
   * Check if device is online (last seen within threshold)
   */
  isDeviceOnline(deviceId: string, thresholdMinutes: number = 10): boolean {
    const device = this.deviceRegistry.get(deviceId);
    if (!device) return false;

    const thresholdMs = thresholdMinutes * 60 * 1000;
    const lastSeenMs = device.lastSeen.getTime();
    const nowMs = Date.now();

    return (nowMs - lastSeenMs) < thresholdMs;
  }

  /**
   * Get device statistics
   */
  getDeviceStats(): any {
    const devices = this.getAllDevices();
    const total = devices.length;
    const online = devices.filter(d => this.isDeviceOnline(d.deviceId)).length;
    const offline = total - online;

    const byType = devices.reduce((acc, device) => {
      acc[device.type] = (acc[device.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = devices.reduce((acc, device) => {
      const status = this.isDeviceOnline(device.deviceId) ? 'online' : 'offline';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      online,
      offline,
      byType,
      byStatus,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Perform health checks on all devices
   */
  private async performHealthChecks(): Promise<void> {
    try {
      const devices = this.getAllDevices();
      
      for (const device of devices) {
        const isOnline = this.isDeviceOnline(device.deviceId);
        const newStatus = isOnline ? 'online' : 'offline';
        
        if (device.status !== newStatus) {
          this.logger.info('Device status changed', {
            deviceId: device.deviceId,
            oldStatus: device.status,
            newStatus
          });
          
          // Update status in database
          await this.iotService.updateDeviceStatus(device.deviceId, newStatus);
          
          // Update local registry
          device.status = newStatus;
        }
      }
      
    } catch (error) {
      this.logger.error('Error during health checks', error);
    }
  }

  /**
   * Get devices that haven't been seen for a while
   */
  getStaleDevices(thresholdHours: number = 24): IoTDevice[] {
    const thresholdMs = thresholdHours * 60 * 60 * 1000;
    const nowMs = Date.now();
    
    return this.getAllDevices().filter(device => {
      const lastSeenMs = device.lastSeen.getTime();
      return (nowMs - lastSeenMs) > thresholdMs;
    });
  }

  /**
   * Get devices by farm
   */
  getDevicesByFarm(farmId: string): IoTDevice[] {
    return this.getAllDevices().filter(device => device.farmId === farmId);
  }

  /**
   * Get devices by type
   */
  getDevicesByType(type: 'sensor' | 'actuator' | 'gateway'): IoTDevice[] {
    return this.getAllDevices().filter(device => device.type === type);
  }
}
", "original_text": null}]