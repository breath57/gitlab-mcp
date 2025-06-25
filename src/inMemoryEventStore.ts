import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { EventStore } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

/**
 * 简单实现 EventStore 接口的内存实现，用于恢复
 * 主要用于示例和测试，不适用于生产环境，需要使用持久化存储解决方案
 */
export class InMemoryEventStore implements EventStore {
  private events: Map<string, { streamId: string; message: JSONRPCMessage }> =
    new Map();

  /**
   * 生成一个唯一的 event ID 给定 stream ID
   */
  private generateEventId(streamId: string): string {
    return `${streamId}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)}`;
  }

  /**
   * 从 event ID 提取 stream ID
   */
  private getStreamIdFromEventId(eventId: string): string {
    const parts = eventId.split("_");
    return parts.length > 0 ? parts[0] : "";
  }

  /**
   * 存储一个带有生成 event ID 的事件
   * Implements EventStore.storeEvent
   */
  async storeEvent(streamId: string, message: JSONRPCMessage): Promise<string> {
    const eventId = this.generateEventId(streamId);
    this.events.set(eventId, { streamId, message });
    console.log(`Stored event ${eventId} for stream ${streamId}:`, message);
    return eventId;
  }

  /**
   * 重放发生在特定 event ID 之后的事件
   * Implements EventStore.replayEventsAfter
   */
  async replayEventsAfter(
    lastEventId: string,
    {
      send,
    }: { send: (eventId: string, message: JSONRPCMessage) => Promise<void> },
  ): Promise<string> {
    if (!lastEventId || !this.events.has(lastEventId)) {
      return "";
    }

    // 从 event ID 提取 stream ID
    const streamId = this.getStreamIdFromEventId(lastEventId);
    if (!streamId) {
      return "";
    }

    let foundLastEvent = false;

    // 按 eventId 排序事件以进行时间顺序排序
    const sortedEvents = [...this.events.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    for (const [
      eventId,
      { streamId: eventStreamId, message },
    ] of sortedEvents) {
      // 只包含来自同一 stream 的事件
      if (eventStreamId !== streamId) {
        continue;
      }

      // 找到 lastEventId 后开始发送事件
      if (eventId === lastEventId) {
        foundLastEvent = true;
        continue;
      }

      if (foundLastEvent) {
        await send(eventId, message);
      }
    }
    return streamId;
  }

  /**
   * 清理指定流的所有事件（可选的清理方法）
   */
  async clearStream(streamId: string): Promise<void> {
    const eventsToDelete = Array.from(this.events.keys()).filter((eventId) =>
      this.getStreamIdFromEventId(eventId) === streamId
    );

    for (const eventId of eventsToDelete) {
      this.events.delete(eventId);
    }

    console.log(`Cleared ${eventsToDelete.length} events from stream ${streamId}`);
  }

  /**
   * 获取当前存储的事件总数（用于调试）
   */
  getEventCount(): number {
    return this.events.size;
  }

  /**
   * 获取特定流的事件数量（用于调试）
   */
  getStreamEventCount(streamId: string): number {
    return Array.from(this.events.values()).filter(
      (event) => event.streamId === streamId,
    ).length;
  }
} 