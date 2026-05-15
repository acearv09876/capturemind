# CaptureMind

**将 Claude Desktop 对话直接整理成可视化思维导图。**  
Turn your Claude Desktop conversations into visual mind maps — via MCP, no extra API key needed.

---

## 为什么需要它 / Why

用 Claude 聊产品思路、创业方向、个人决策时，对话结束后思路往往还是散的。CaptureMind 让 Claude 在对话结束后直接帮你把想法、目标、卡点、行动项结构化到一张导图里——特别是**卡点（Blocker）**，会被高亮显示，帮你看清自己真正卡在哪。

When you finish a deep conversation with Claude about product ideas, business strategy, or personal decisions, your thoughts are often still scattered. CaptureMind lets Claude structure them into a visual mind map — highlighting **Blockers** (the things holding you back) so you can finally see where you're stuck.

---

## 功能 / Features

- **`capturemind` MCP 工具** — Claude 自行分析对话，提取节点写入导图，无需额外 API Key
- **卡点高亮** — Blocker 节点深红色高亮，一眼看出瓶颈所在
- **自动布局** — 节点按层级树状排列，不拥挤
- **双语界面** — 中文 / English 一键切换，偏好记忆
- **画布交互** — 拖拽、缩放、连线、快捷键全支持
- **MCP 完整控制** — Claude 可直接增删节点、搜索、导出，无需打开浏览器

---

## 安装 / Setup

**前置要求：** Node.js 18+、Claude Desktop

```bash
# 1. 克隆项目
git clone https://github.com/acearv09876/capturemind.git
cd capturemind

# 2. 安装依赖
npm install

# 3. 启动（默认端口 3001）
npm start
```

浏览器打开 `http://localhost:3001`

---

## Claude Desktop MCP 配置

找到 Claude Desktop 配置文件：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

添加：

```json
{
  "mcpServers": {
    "capturemind": {
      "command": "node",
      "args": ["/path/to/capturemind/mcp-server.js"]
    }
  }
}
```

将 `/path/to/capturemind/` 替换为实际路径，**重启 Claude Desktop**。

---

## 使用方式 / Usage

**① 在 Claude Desktop 新建主题**

```
帮我用 create_topic 新建一个主题，名字叫"产品定位探讨"
```

**② 对话完成后，让 Claude 整理**

```
帮我用 capturemind 把这段对话整理成思维导图
topic_id: <主题ID>
```

Claude 会自己分析对话内容，提取节点结构并写入导图。打开 `http://localhost:3001` 即可看到结果。

**③ 布局乱了？重新整理**

```
帮我用 layout_topic 重新整理一下布局
topic_id: <主题ID>
```

---

## 节点类型 / Node Types

| Type | 中文 | 说明 |
|------|------|------|
| `root` | 主题 | 导图根节点 |
| `goal` | 目标 | 想要达成的结果 |
| `problem` | 问题 | 需要解决的挑战 |
| `idea` | 想法 | 可能的方案或创意 |
| **`blocker`** | **卡点** | **进展的瓶颈，高亮显示** |
| `insight` | 洞察 | 重要的认识或发现 |
| `action` | 行动 | 可立即执行的下一步 |
| `question` | 待解答 | 还没有明确答案的问题 |
| `note` | 备注 | 其他补充信息 |

---

## MCP 工具列表 / MCP Tools

| 工具 | 说明 |
|------|------|
| `capturemind` | **核心工具**：分析对话，提取节点写入导图 |
| `layout_topic` | 自动重新排列节点位置（层级树状布局） |
| `create_topic` | 新建主题 |
| `list_topics` | 列出所有主题 |
| `get_topic` | 获取主题详情 |
| `delete_topic` | 删除主题 |
| `add_node` | 添加节点 |
| `update_node` | 修改节点 |
| `delete_node` | 删除节点 |
| `add_edge` | 连接两个节点 |
| `delete_edge` | 删除连接 |
| `batch_add` | 批量导入节点和连接 |
| `search` | 全文搜索节点 |
| `export_topic` | 导出为 Mermaid / JSON / Markdown |

---

## 技术栈 / Tech Stack

- **Backend**: Node.js + Express，JSON 文件存储
- **Frontend**: React 18 (Babel standalone，无构建步骤) + 纯 CSS
- **MCP**: `@modelcontextprotocol/sdk`

---

## License

MIT
