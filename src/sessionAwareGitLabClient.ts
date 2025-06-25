import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import { Agent } from "http";
import { Agent as HttpsAgent } from "https";
import { URL } from "url";
import { SessionConfig } from "./dynamicGitLabConfig.js";

/**
 * 会话感知的 GitLab 客户端
 * 为每个会话提供独立的配置和代理设置
 */
export class SessionAwareGitLabClient {
  private sessionConfig: SessionConfig;
  private agent: Agent | HttpsAgent | null = null;

  constructor(sessionConfig: SessionConfig) {
    this.sessionConfig = sessionConfig;
    this.setupProxyAgent();
  }

  /**
   * 设置代理代理（如果需要）
   */
  private setupProxyAgent(): void {
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    if (!proxyUrl) {
      this.agent = null;
      return;
    }

    try {
      const apiUrl = new URL(this.sessionConfig.config.api_url);
      if (apiUrl.protocol === "https:") {
        this.agent = new HttpsProxyAgent(proxyUrl);
      } else {
        this.agent = new HttpProxyAgent(proxyUrl);
      }
      console.log(`Using proxy ${proxyUrl} for session ${this.sessionConfig.sessionId}`);
    } catch (error) {
      console.warn(`Failed to setup proxy for session ${this.sessionConfig.sessionId}:`, error);
      this.agent = null;
    }
  }

  /**
   * 发送 HTTP 请求到 GitLab API
   */
  async request(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<any> {
    const { config } = this.sessionConfig;
    const url = `${config.api_url.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
    
    const requestOptions: any = {
      method: options.method || "GET",
      headers: {
        "Authorization": `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    if (options.body) {
      requestOptions.body = typeof options.body === "string" 
        ? options.body 
        : JSON.stringify(options.body);
    }

    if (this.agent) {
      requestOptions.agent = this.agent;
    }

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitLab API error (${response.status}): ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`API request failed for session ${this.sessionConfig.sessionId}:`, {
        url: url.replace(config.access_token, "[REDACTED]"),
        method: options.method || "GET",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取会话配置
   */
  getConfig(): SessionConfig {
    return this.sessionConfig;
  }

  /**
   * 检查是否为只读模式
   */
  isReadOnly(): boolean {
    return this.sessionConfig.config.read_only === "true";
  }

  /**
   * 检查是否启用 Wiki 功能
   */
  isWikiEnabled(): boolean {
    return this.sessionConfig.config.use_wiki === "true";
  }

  /**
   * 检查是否启用里程碑功能
   */
  isMilestoneEnabled(): boolean {
    return this.sessionConfig.config.use_milestone === "true";
  }

  /**
   * 检查是否启用流水线功能
   */
  isPipelineEnabled(): boolean {
    return this.sessionConfig.config.use_pipeline === "true";
  }

  /**
   * 获取有效的项目 ID
   */
  getEffectiveProjectId(requestProjectId?: string): string {
    return requestProjectId || this.sessionConfig.config.project_id || "";
  }

  /**
   * 验证写操作权限
   */
  validateWriteOperation(operation: string): void {
    if (this.isReadOnly()) {
      throw new Error(`Write operation '${operation}' is not allowed in read-only mode for session ${this.sessionConfig.sessionId}`);
    }
  }
}

/**
 * 会话客户端管理器
 * 管理多个会话的 GitLab 客户端实例
 */
export class SessionClientManager {
  private clients = new Map<string, SessionAwareGitLabClient>();

  /**
   * 获取或创建会话客户端
   */
  getClient(sessionConfig: SessionConfig): SessionAwareGitLabClient {
    const { sessionId } = sessionConfig;
    
    let client = this.clients.get(sessionId);
    if (!client) {
      client = new SessionAwareGitLabClient(sessionConfig);
      this.clients.set(sessionId, client);
      console.log(`Created GitLab client for session ${sessionId}`);
    }
    
    return client;
  }

  /**
   * 移除会话客户端
   */
  removeClient(sessionId: string): boolean {
    const result = this.clients.delete(sessionId);
    if (result) {
      console.log(`Removed GitLab client for session ${sessionId}`);
    }
    return result;
  }

  /**
   * 获取活跃客户端数量
   */
  getActiveClientCount(): number {
    return this.clients.size;
  }

  /**
   * 清理所有客户端
   */
  clearAll(): void {
    this.clients.clear();
    console.log("Cleared all GitLab clients");
  }
}

/**
 * 全局会话客户端管理器实例
 */
export const sessionClientManager = new SessionClientManager();
