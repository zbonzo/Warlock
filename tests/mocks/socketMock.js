/**
 * Comprehensive Socket.IO mock for testing
 */
class MockSocket {
  constructor(id = 'mock-socket-id') {
    this.id = id;
    this.listeners = new Map();
    this.rooms = new Set();
    this.connected = false;
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    return this;
  }

  off(event, handler) {
    if (this.listeners.has(event)) {
      const handlers = this.listeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((handler) => {
        handler(...args);
      });
    }
    return this;
  }

  join(room) {
    this.rooms.add(room);
    return this;
  }

  leave(room) {
    this.rooms.delete(room);
    return this;
  }

  to(room) {
    return {
      emit: jest.fn(),
    };
  }

  connect() {
    this.connected = true;
    this.emit('connect');
    return this;
  }

  disconnect() {
    this.connected = false;
    this.emit('disconnect');
    return this;
  }

  // Test utilities
  trigger(event, ...args) {
    this.emit(event, ...args);
  }

  getListeners(event) {
    return this.listeners.get(event) || [];
  }

  isInRoom(room) {
    return this.rooms.has(room);
  }
}

module.exports = MockSocket;
