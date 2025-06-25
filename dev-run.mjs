#!/usr/bin/env node

// 开发调试脚本 (ES Module 版本)
// 用于本地运行 GitLab MCP 服务器

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 .env 文件
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  console.log('📂 加载环境变量文件:', envPath);
  dotenv.config({ path: envPath });
} else {
  console.log('⚠️  未找到 .env 文件，使用默认配置');
  console.log('💡 提示: 复制 env.template 为 .env 并修改配置');
}

console.log('🚀 启动 GitLab MCP 服务器...');
console.log('📝 环境配置:');
console.log('   GITLAB_API_URL:', process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4');
console.log('   GITLAB_READ_ONLY_MODE:', process.env.GITLAB_READ_ONLY_MODE || 'false');
console.log('   USE_GITLAB_WIKI:', process.env.USE_GITLAB_WIKI || 'false');
console.log('   USE_MILESTONE:', process.env.USE_MILESTONE || 'false');
console.log('   USE_PIPELINE:', process.env.USE_PIPELINE || 'false');
console.log('   SSE:', process.env.SSE || 'false');
console.log('   STREAMABLE_HTTP:', process.env.STREAMABLE_HTTP || 'false');
console.log('   GITLAB_IS_OLD:', process.env.GITLAB_IS_OLD || 'false');
console.log('   GITLAB_PERSONAL_ACCESS_TOKEN:', process.env.GITLAB_PERSONAL_ACCESS_TOKEN ? '***已设置***' : '❌未设置');
console.log('   GITLAB_PROJECT_ID:', process.env.GITLAB_PROJECT_ID || '(未设置)');
console.log('');

if (!process.env.GITLAB_PERSONAL_ACCESS_TOKEN) {
  console.log('❌ 错误: GITLAB_PERSONAL_ACCESS_TOKEN 未设置');
  console.log('');
  console.log('请执行以下步骤:');
  console.log('1. 复制模板文件: cp env.template .env');
  console.log('2. 编辑 .env 文件，设置您的 GitLab Token');
  console.log('3. 重新运行此脚本');
  console.log('');
  console.log('或者设置环境变量:');
  console.log('   $env:GITLAB_PERSONAL_ACCESS_TOKEN="your_token"');
  console.log('');
  process.exit(1);
}

// 运行构建后的服务器
const serverPath = join(__dirname, 'build', 'index.js');
console.log('📦 启动服务器:', serverPath);
console.log('');

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('❌ 服务器启动失败:', err);
});

server.on('close', (code) => {
  console.log(`🛑 服务器已关闭，退出码: ${code}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.kill('SIGTERM');
}); 