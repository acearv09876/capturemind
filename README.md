# Chat Mind

将 Claude Desktop 对话直接整理成思维导图。

## 启动

```bash
# 1. 配置 API Key
cp .env.example .env
# 编辑 .env，填入 ANTHROPIC_API_KEY

# 2. 安装依赖
npm install

# 3. 启动服务（默认端口 3001）
npm start
```

浏览器打开 http://localhost:3001

## Claude Desktop MCP 配置

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "chat-mind": {
      "command": "node",
      "args": ["C:/Users/admin/Desktop/chatmind/mcp-server.js"]
    }
  }
}
```

## 核心用法

在 Claude Desktop 对话完成后，告诉 Claude：

```
帮我用 capturemind 把这段对话整理成思维导图
topic_id: <你的主题ID>
```

Claude 会自动提取目标、问题、想法、卡点、洞察、行动项，
并更新到 http://localhost:3001 的可视化导图中。

## 节点类型

| 类型 | 用途 |
|------|------|
| root | 主题根节点 |
| goal | 目标 |
| problem | 问题 |
| idea | 想法 |
| **blocker** | **卡点（核心价值）** |
| insight | 洞察 |
| action | 行动项 |
| question | 待解答 |
| note | 备注 |

## MCP 工具列表

- `list_topics` — 列出所有主题
- `create_topic` — 新建主题
- `get_topic` — 获取主题详情
- `capturemind` — **核心工具**：从对话提取思维节点
- `add_node` / `update_node` / `delete_node` — 节点操作
- `add_edge` / `delete_edge` — 连接操作
- `batch_add` — 批量导入
- `search` — 搜索
- `export_topic` — 导出 Mermaid/JSON/Markdown
