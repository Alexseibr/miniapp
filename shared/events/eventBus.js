import { EventEmitter } from 'events';

/**
 * EventBus - централизованная шина событий для связи между модулями
 * 
 * Поддерживаемые события:
 * - AD_CREATED: { adId, userId, categoryId, location }
 * - AD_UPDATED: { adId, userId, changes }
 * - AD_DELETED: { adId, userId }
 * - AD_PUBLISHED: { adId, userId }
 * - USER_REGISTERED: { userId, telegramId }
 * - DEVICE_REGISTERED: { userId, deviceId, platform }
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Увеличиваем лимит слушателей
    
    // Логирование ошибок в обработчиках событий
    this.on('error', (error) => {
      console.error('[EventBus] Error in event handler:', error);
    });
  }

  /**
   * Безопасный emit с обработкой ошибок
   */
  safeEmit(event, payload) {
    try {
      console.log(`[EventBus] Emitting event: ${event}`, JSON.stringify(payload).substring(0, 200));
      this.emit(event, payload);
    } catch (error) {
      console.error(`[EventBus] Error emitting ${event}:`, error);
    }
  }

  /**
   * Подписка на событие с обработкой ошибок
   */
  safeOn(event, handler) {
    this.on(event, async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error handling ${event}:`, error);
      }
    });
  }
}

// Singleton instance
const eventBus = new EventBus();

// Event constants
export const Events = {
  AD_CREATED: 'AD_CREATED',
  AD_UPDATED: 'AD_UPDATED',
  AD_DELETED: 'AD_DELETED',
  AD_PUBLISHED: 'AD_PUBLISHED',
  AD_STATUS_CHANGED: 'AD_STATUS_CHANGED',
  AD_PRICE_CHANGED: 'AD_PRICE_CHANGED',
  USER_REGISTERED: 'USER_REGISTERED',
  DEVICE_REGISTERED: 'DEVICE_REGISTERED',
  DEVICE_GEO_UPDATED: 'DEVICE_GEO_UPDATED',
  PUSH_FAILED: 'PUSH_FAILED',
};

export default eventBus;
