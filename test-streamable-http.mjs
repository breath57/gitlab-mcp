#!/usr/bin/env node

// Streamable HTTP 测试脚本
// 用于测试 GitLab MCP 服务器的 Streamable HTTP 协议支持

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 .env 文件
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SERVER_URL = `http://localhost:${process.env.PORT || 3002}`;

async function testStreamableHttp() {
  console.log('🧪 测试 Streamable HTTP 协议');
  console.log('📡 服务器地址:', SERVER_URL);
  console.log('');

  try {
    // 1. 测试健康检查
    console.log('1️⃣ 测试健康检查...');
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ 健康检查结果:', healthData);
    console.log('');

    // 2. 初始化会话
    console.log('2️⃣ 初始化 MCP 会话...');
    const initRequest = {
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "streamable-http-test-client",
          version: "1.0.0"
        }
      },
      id: 1
    };

    const initResponse = await fetch(`${SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(initRequest)
    });

    if (!initResponse.ok) {
      throw new Error(`初始化失败: ${initResponse.status} ${initResponse.statusText}`);
    }

    const initData = await initResponse.json();
    console.log('✅ 初始化响应:', JSON.stringify(initData, null, 2));

    // 获取会话 ID
    const sessionId = initResponse.headers.get('mcp-session-id');
    if (!sessionId) {
      throw new Error('未收到会话 ID');
    }
    console.log('🔑 会话 ID:', sessionId);
    console.log('');

    // 3. 测试工具列表
    console.log('3️⃣ 获取工具列表...');
    const toolsRequest = {
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
      id: 2
    };

    const toolsResponse = await fetch(`${SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId
      },
      body: JSON.stringify(toolsRequest)
    });

    if (!toolsResponse.ok) {
      throw new Error(`获取工具列表失败: ${toolsResponse.status} ${toolsResponse.statusText}`);
    }

    const toolsData = await toolsResponse.json();
    console.log('✅ 工具列表响应:');
    if (toolsData.result && toolsData.result.tools) {
      console.log(`   发现 ${toolsData.result.tools.length} 个工具:`);
      toolsData.result.tools.slice(0, 3).forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });
      if (toolsData.result.tools.length > 3) {
        console.log(`   ... 和其他 ${toolsData.result.tools.length - 3} 个工具`);
      }
    }
    console.log('');

    // 4. 测试会话恢复（通过再次发送相同请求）
    console.log('4️⃣ 测试会话恢复...');
    const retryResponse = await fetch(`${SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': sessionId
      },
      body: JSON.stringify(toolsRequest)
    });

    if (retryResponse.ok) {
      console.log('✅ 会话恢复测试成功');
    } else {
      console.log('❌ 会话恢复测试失败');
    }
    console.log('');

    // 5. 终止会话
    console.log('5️⃣ 终止会话...');
    const deleteResponse = await fetch(`${SERVER_URL}/mcp`, {
      method: 'DELETE',
      headers: {
        'mcp-session-id': sessionId
      }
    });

    if (deleteResponse.ok) {
      console.log('✅ 会话终止成功');
    } else {
      console.log('❌ 会话终止失败');
    }

    console.log('');
    console.log('🎉 Streamable HTTP 协议测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    const response = await fetch(`${SERVER_URL}/health`, {
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  const isServerRunning = await checkServer();
  if (!isServerRunning) {
    console.log('❌ 服务器未运行或无法连接');
    console.log('');
    console.log('请先启动服务器:');
    console.log('1. 设置环境变量: export STREAMABLE_HTTP=true');
    console.log('2. 启动服务器: npm run dev');
    console.log('');
    process.exit(1);
  }

  await testStreamableHttp();
}

main().catch(console.error); 