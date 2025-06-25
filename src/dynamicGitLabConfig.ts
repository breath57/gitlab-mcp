import { z } from "zod";

/**
 * 动态 GitLab 配置参数验证 Schema
 */
export const DynamicConfigSchema = z.object({
  api_url: z.string().url("Invalid GitLab API URL"),
  access_token: z.string().min(1, "Access token is required"),
  project_id: z.string().optional(),
  read_only: z.enum(["true", "false"]).optional().default("false"),
  use_wiki: z.enum(["true", "false"]).optional().default("false"),
  use_milestone: z.enum(["true", "false"]).optional().default("false"),
  use_pipeline: z.enum(["true", "false"]).optional().default("false"),
});

export type DynamicConfig = z.infer<typeof DynamicConfigSchema>;

/**
 * 会话配置接口
 */
export interface SessionConfig {
  sessionId: string;
  config: DynamicConfig;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * 动态 GitLab 配置管理器
 * 支持多租户、并发安全的配置管理
 */
export class DynamicGitLabConfigManager {
  private sessions = new Map<string, SessionConfig>();
  private readonly maxSessions: number;
  private readonly sessionTimeout: number; // 毫秒

  constructor(maxSessions: number = 1000, sessionTimeoutMinutes: number = 60) {
    this.maxSessions = maxSessions;
    this.sessionTimeout = sessionTimeoutMinutes * 60 * 1000;
    
    // 启动清理定时器，每5分钟清理一次过期会话
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * 从 URL 查询参数创建或获取会话配置
   */
  createSessionConfig(sessionId: string, queryParams: Record<string, any>): SessionConfig {
    try {
      // 验证配置参数
      const config = DynamicConfigSchema.parse(queryParams);
      
      const sessionConfig: SessionConfig = {
        sessionId,
        config,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      // 检查会话数量限制
      if (this.sessions.size >= this.maxSessions) {
        this.cleanupOldestSessions(Math.floor(this.maxSessions * 0.1)); // 清理10%的最旧会话
      }

      this.sessions.set(sessionId, sessionConfig);
      console.log(`Created session config for ${sessionId}:`, {
        api_url: config.api_url,
        has_token: !!config.access_token,
        project_id: config.project_id,
        read_only: config.read_only,
      });

      return sessionConfig;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid configuration parameters: ${error.errors
          .map(e => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`);
      }
      throw error;
    }
  }

  /**
   * 获取会话配置
   */
  getSessionConfig(sessionId: string): SessionConfig | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // 检查会话是否过期
    if (Date.now() - session.lastUsed.getTime() > this.sessionTimeout) {
      this.sessions.delete(sessionId);
      console.log(`Session ${sessionId} expired and removed`);
      return null;
    }

    // 更新最后使用时间
    session.lastUsed = new Date();
    return session;
  }

  /**
   * 删除会话配置
   */
  removeSessionConfig(sessionId: string): boolean {
    const result = this.sessions.delete(sessionId);
    if (result) {
      console.log(`Removed session config for ${sessionId}`);
    }
    return result;
  }

  /**
   * 获取当前活跃会话数量
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastUsed.getTime() > this.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * 清理最旧的会话
   */
  private cleanupOldestSessions(count: number): void {
    const sortedSessions = Array.from(this.sessions.entries())
      .sort(([, a], [, b]) => a.lastUsed.getTime() - b.lastUsed.getTime())
      .slice(0, count);

    sortedSessions.forEach(([sessionId]) => {
      this.sessions.delete(sessionId);
    });

    console.log(`Cleaned up ${sortedSessions.length} oldest sessions`);
  }

  /**
   * 获取会话统计信息
   */
  getStats(): {
    activeSessions: number;
    maxSessions: number;
    sessionTimeoutMinutes: number;
  } {
    return {
      activeSessions: this.sessions.size,
      maxSessions: this.maxSessions,
      sessionTimeoutMinutes: this.sessionTimeout / (60 * 1000),
    };
  }
}

/**
 * 全局配置管理器实例
 */
export const configManager = new DynamicGitLabConfigManager(); 