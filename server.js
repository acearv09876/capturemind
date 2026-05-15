#!/usr/bin/env node
/**
 * CaptureMind MCP Server v1.0
 * 将 Claude Desktop 对话整理成思维导图
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = 'http://localhost:3001';

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE_URL}${path}`, opts);
  if (!r.ok) throw new Error(`API error ${r.status}: ${await r.text()}`);
  return r.json();
}

function resolveNode(nodes, ref) {
  return nodes.find(n => n.id === ref || n.id.startsWith(ref));
}

function fmtNode(n) {
  const TYPE_ZH = { root:'主题', goal:'目标', problem:'问题', idea:'想法', blocker:'卡点', insight:'洞察', action:'行动', question:'待解答', note:'备注' };
  const lines = [`[${n.id.slice(0,8)}] (${TYPE_ZH[n.type] || n.type}) ${n.label}`];
  if (n.content) lines.push(`  说明: ${n.content}`);
  if (n.tags?.length) lines.push(`  标签: ${n.tags.join(', ')}`);
  if (n.priority) lines.push(`  重要性: ${'★'.repeat(n.priority)}${'☆'.repeat(5 - n.priority)}`);
  return lines.join('\n');
}

function fmtEdge(e, nodes) {
  const from = nodes.find(n => n.id === e.from);
  const to   = nodes.find(n => n.id === e.to);
  let s = `${from?.label || e.from.slice(0,8)} → ${to?.label || e.to.slice(0,8)}`;
  if (e.label) s += ` [${e.label}]`;
  return s;
}

// 层级树状布局：root 在顶，按 BFS 层级向下展开
function computeLayout(nodes, edges) {
  if (!nodes.length) return {};

  const children = {};
  const inDegree = {};
  nodes.forEach(n => { children[n.id] = []; inDegree[n.id] = 0; });
  edges.forEach(e => {
    if (children[e.from] !== undefined) children[e.from].push(e.to);
    if (inDegree[e.to] !== undefined) inDegree[e.to]++;
  });

  // 优先取 type=root，其次取入度为0的节点
  let rootIds = nodes.filter(n => n.type === 'root').map(n => n.id);
  if (!rootIds.length) rootIds = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
  if (!rootIds.length) rootIds = [nodes[0].id];

  // BFS 分配层级
  const level = {};
  const visited = new Set();
  const queue = rootIds.map(id => [id, 0]);
  for (let i = 0; i < queue.length; i++) {
    const [id, lv] = queue[i];
    if (visited.has(id)) continue;
    visited.add(id);
    level[id] = lv;
    (children[id] || []).forEach(cid => {
      if (!visited.has(cid)) queue.push([cid, lv + 1]);
    });
  }
  // 孤立节点放第0层
  nodes.forEach(n => { if (!(n.id in level)) level[n.id] = 0; });

  // 按层分组
  const byLevel = {};
  nodes.forEach(n => {
    const lv = level[n.id];
    if (!byLevel[lv]) byLevel[lv] = [];
    byLevel[lv].push(n.id);
  });

  const HGAP = 300, VGAP = 200, CENTER_X = 700, TOP_Y = 80;
  const pos = {};
  Object.keys(byLevel).sort((a, b) => +a - +b).forEach(lv => {
    const ids = byLevel[lv];
    const totalW = (ids.length - 1) * HGAP;
    ids.forEach((id, i) => {
      pos[id] = { x: CENTER_X - totalW / 2 + i * HGAP, y: TOP_Y + +lv * VGAP };
    });
  });
  return pos;
}

const NODE_TYPE_ENUM = z.enum(['root','goal','problem','idea','blocker','insight','action','question','note']);

const server = new McpServer({ name: 'capturemind', version: '1.0.0' });

// ── 主题管理 ──────────────────────────────────────────────────────────────

server.tool('list_topics', '列出所有思维主题', {}, async () => {
  const topics = await api('GET', '/api/cases');
  if (!topics.length) return { content: [{ type: 'text', text: '暂无主题。' }] };
  const text = topics.map(t =>
    `• [${t.id.slice(0,8)}] ${t.name}${t.description ? ' — ' + t.description : ''}`
  ).join('\n');
  return { content: [{ type: 'text', text: `共 ${topics.length} 个主题:\n${text}` }] };
});

server.tool('create_topic', '新建一个思维主题',
  { name: z.string(), description: z.string().optional() },
  async ({ name, description }) => {
    const t = await api('POST', '/api/cases', { name, description: description || '' });
    return { content: [{ type: 'text', text: `主题已创建\nID: ${t.id}\n名称: ${t.name}` }] };
  }
);

server.tool('get_topic', '获取主题的完整内容（节点、连接）',
  { topic_id: z.string() },
  async ({ topic_id }) => {
    const t = await api('GET', `/api/cases/${topic_id}`);
    const nodes = t.nodes || [];
    const edges = t.edges || [];
    const nodeLines = nodes.map(n => '  ' + fmtNode(n).split('\n').join('\n  '));
    const edgeLines = edges.map(e => '  ' + fmtEdge(e, nodes));
    const text = [
      `主题: ${t.name}`,
      t.description ? `描述: ${t.description}` : '',
      `\n节点 (${nodeLines.length}个):`,
      ...nodeLines,
      `\n连接 (${edgeLines.length}个):`,
      ...edgeLines,
    ].filter(Boolean).join('\n');
    return { content: [{ type: 'text', text }] };
  }
);

server.tool('delete_topic', '删除一个思维主题',
  { topic_id: z.string() },
  async ({ topic_id }) => {
    await api('DELETE', `/api/cases/${topic_id}`);
    return { content: [{ type: 'text', text: `主题 ${topic_id} 已删除` }] };
  }
);

// ── 节点操作 ──────────────────────────────────────────────────────────────

server.tool('add_node', '向思维导图添加一个节点',
  {
    topic_id: z.string(),
    type:     NODE_TYPE_ENUM.describe('节点类型：root/goal/problem/idea/blocker/insight/action/question/note'),
    label:    z.string().describe('节点标题（简短，10字以内）'),
    content:  z.string().optional().describe('详细说明'),
    x:        z.number().optional(),
    y:        z.number().optional(),
    tags:     z.array(z.string()).optional(),
    priority: z.number().min(1).max(5).optional().describe('重要性 1-5'),
  },
  async ({ topic_id, type, label, content, x, y, tags, priority }) => {
    const t = await api('GET', `/api/cases/${topic_id}`);
    const nodes = t.nodes || [];
    const col = nodes.length % 5;
    const row = Math.floor(nodes.length / 5);
    const newNode = {
      id: crypto.randomUUID(),
      type, label,
      content: content || '',
      x: x ?? col * 210,
      y: y ?? row * 160,
      w: Math.max(140, Math.min(260, label.length * 9 + 50)),
      h: content ? 72 : 52,
      ...(tags?.length    && { tags }),
      ...(priority        && { priority }),
    };
    await api('PUT', `/api/cases/${topic_id}`, { ...t, nodes: [...nodes, newNode] });
    return { content: [{ type: 'text', text: `节点已添加\nID: ${newNode.id}\n类型: ${type}\n名称: ${label}` }] };
  }
);

server.tool('update_node', '修改节点内容',
  {
    topic_id: z.string(),
    node_id:  z.string().describe('节点ID（可用前8位）'),
    label:    z.string().optional(),
    content:  z.string().optional(),
    type:     NODE_TYPE_ENUM.optional(),
    tags:     z.array(z.string()).optional(),
    priority: z.number().min(1).max(5).optional(),
    x:        z.number().optional(),
    y:        z.number().optional(),
  },
  async ({ topic_id, node_id, label, content, type, tags, priority, x, y }) => {
    const t = await api('GET', `/api/cases/${topic_id}`);
    const nodes = t.nodes || [];
    const node = resolveNode(nodes, node_id);
    if (!node) throw new Error(`找不到节点: ${node_id}`);

    if (label    !== undefined) node.label    = label;
    if (content  !== undefined) node.content  = content;
    if (type     !== undefined) node.type     = type;
    if (tags     !== undefined) node.tags     = tags;
    if (priority !== undefined) node.priority = priority;
    if (x        !== undefined) node.x        = x;
    if (y        !== undefined) node.y        = y;
    node.w = Math.max(140, Math.min(260, node.label.length * 9 + 50));

    await api('PUT', `/api/cases/${topic_id}`, { ...t, nodes });
    return { content: [{ type: 'text', text: `节点 ${node.id.slice(0,8)} 已更新` }] };
  }
);

server.tool('delete_node', '删除一个节点（同时删除相关连接）',
  { topic_id: z.string(), node_id: z.string() },
  async ({ topic_id, node_id }) => {
    const t = await api('GET', `/api/cases/${topic_id}`);
    const node = resolveNode(t.nodes || [], node_id);
    if (!node) throw new Error(`找不到节点: ${node_id}`);
    await api('PUT', `/api/cases/${topic_id}`, {
      ...t,
      nodes: t.nodes.filter(n => n.id !== node.id),
      edges: (t.edges || []).filter(e => e.from !== node.id && e.to !== node.id),
    });
    return { content: [{ type: 'text', text: `节点 ${node.id.slice(0,8)} 已删除` }] };
  }
);

// ── 连接操作 ──────────────────────────────────────────────────────────────

server.tool('add_edge', '连接两个节点',
  {
    topic_id: z.string(),
    from_id:  z.string(),
    to_id:    z.string(),
    label:    z.string().optional().describe('关系描述，如"阻碍"、"启发"、"需要"'),
  },
  async ({ topic_id, from_id, to_id, label }) => {
    const t = await api('GET', `/api/cases/${topic_id}`);
    const nodes = t.nodes || [];
    const edges = t.edges || [];
    const fromNode = resolveNode(nodes, from_id);
    const toNode   = resolveNode(nodes, to_id);
    if (!fromNode) throw new Error(`找不到起始节点: ${from_id}`);
    if (!toNode)   throw new Error(`找不到目标节点: ${to_id}`);
    if (edges.find(e => e.from === fromNode.id && e.to === toNode.id))
      return { content: [{ type: 'text', text: '这两个节点已经连接' }] };

    const newEdge = { id: crypto.randomUUID(), from: fromNode.id, to: toNode.id, label: label || '' };
    await api('PUT', `/api/cases/${topic_id}`, { ...t, edges: [...edges, newEdge] });
    return { content: [{ type: 'text', text: `已连接: ${fromNode.label} → ${toNode.label}${label ? ' ['+label+']' : ''}` }] };
  }
);

server.tool('delete_edge', '删除两个节点之间的连接',
  { topic_id: z.string(), from_id: z.string(), to_id: z.string() },
  async ({ topic_id, from_id, to_id }) => {
    const t = await api('GET', `/api/cases/${topic_id}`);
    const fromNode = resolveNode(t.nodes || [], from_id);
    const toNode   = resolveNode(t.nodes || [], to_id);
    if (!fromNode || !toNode) throw new Error('找不到节点');
    const before = (t.edges || []).length;
    const edges = (t.edges || []).filter(e => !(e.from === fromNode.id && e.to === toNode.id));
    await api('PUT', `/api/cases/${topic_id}`, { ...t, edges });
    return { content: [{ type: 'text', text: before - edges.length > 0 ? '连接已删除' : '未找到该连接' }] };
  }
);

// ── 批量操作 ──────────────────────────────────────────────────────────────

server.tool('batch_add', '批量添加多个节点和连接（一次性导入）',
  {
    topic_id: z.string(),
    nodes: z.array(z.object({
      id:       z.string().describe('临时ID，用于edges引用，如 "n1"、"goal_1"'),
      type:     NODE_TYPE_ENUM,
      label:    z.string(),
      content:  z.string().optional(),
      tags:     z.array(z.string()).optional(),
      priority: z.number().min(1).max(5).optional(),
    })),
    edges: z.array(z.object({
      from:  z.string(),
      to:    z.string(),
      label: z.string().optional(),
    })).optional(),
  },
  async ({ topic_id, nodes: newNodes, edges: newEdges = [] }) => {
    const t = await api('GET', `/api/cases/${topic_id}`);
    const existingNodes = t.nodes || [];
    const existingEdges = t.edges || [];
    const startIdx = existingNodes.length;

    const idMap = {};
    const added = newNodes.map((n, i) => {
      const realId = crypto.randomUUID();
      idMap[n.id] = realId;
      const col = (startIdx + i) % 5;
      const row = Math.floor((startIdx + i) / 5);
      return {
        id: realId,
        type: n.type, label: n.label,
        content: n.content || '',
        x: col * 210,
        y: row * 160,
        w: Math.max(140, Math.min(260, n.label.length * 9 + 50)),
        h: n.content ? 72 : 52,
        ...(n.tags?.length && { tags: n.tags }),
        ...(n.priority     && { priority: n.priority }),
      };
    });

    const resolveId = (ref) => {
      if (idMap[ref]) return idMap[ref];
      return resolveNode(existingNodes, ref)?.id || null;
    };

    const addedEdges = [];
    const skipped = [];
    for (const e of newEdges) {
      const fromId = resolveId(e.from);
      const toId   = resolveId(e.to);
      if (!fromId || !toId) { skipped.push(`${e.from} → ${e.to}`); continue; }
      addedEdges.push({ id: crypto.randomUUID(), from: fromId, to: toId, label: e.label || '' });
    }

    await api('PUT', `/api/cases/${topic_id}`, {
      ...t,
      nodes: [...existingNodes, ...added],
      edges: [...existingEdges, ...addedEdges],
    });

    let result = `批量导入完成\n添加节点: ${added.length} 个\n添加连接: ${addedEdges.length} 条`;
    if (skipped.length)
      result += `\n⚠️ 跳过 ${skipped.length} 条边（节点ID未匹配）:\n${skipped.map(s => '  '+s).join('\n')}`;
    return { content: [{ type: 'text', text: result }] };
  }
);

// ── 核心工具：将已提取的节点写入思维导图 ─────────────────────────────────
// 使用方式：先由 Claude 分析对话，提取节点结构，再调用此工具写入。
// Claude 在调用前应自行完成分析，nodes/edges 为结构化结果。

server.tool('capturemind',
  `将从对话中提取的思维节点写入思维导图。

【重要】调用此工具前，Claude 应先分析对话，识别以下节点类型并组织好结构再传入：
- root: 核心议题（一般只有1个）
- goal: 目标
- problem: 问题/挑战
- idea: 想法/方案
- blocker: 卡点（进展的瓶颈，要积极识别，这是最核心的价值）
- insight: 洞察/发现
- action: 下一步行动
- question: 待解答的问题
- note: 补充备注

节点 label 限10字以内，content 是详细说明。`,
  {
    topic_id: z.string().describe('要更新的主题 ID'),
    nodes: z.array(z.object({
      id:      z.string().describe('临时ID，如 n1/n2，用于 edges 引用'),
      type:    z.enum(['root','goal','problem','idea','blocker','insight','action','question','note']),
      label:   z.string().describe('节点标题，10字以内'),
      content: z.string().optional().describe('详细说明'),
      tags:    z.array(z.string()).optional(),
      priority: z.number().min(1).max(5).optional(),
    })).describe('提取的节点列表'),
    edges: z.array(z.object({
      from:  z.string().describe('起始节点的临时ID'),
      to:    z.string().describe('目标节点的临时ID'),
      label: z.string().optional().describe('关系描述，如"阻碍"、"启发"'),
    })).optional().describe('节点间的关系'),
    mode: z.enum(['append', 'replace']).optional().default('append').describe('append=追加，replace=清空重建'),
  },
  async ({ topic_id, nodes: newNodes, edges: newEdges = [], mode = 'append' }) => {
    const t = await api('GET', `/api/cases/${topic_id}`);
    if (t.error) return { content: [{ type: 'text', text: `主题不存在: ${topic_id}` }] };

    const existingNodes = mode === 'replace' ? [] : (t.nodes || []);
    const existingEdges = mode === 'replace' ? [] : (t.edges || []);
    const startIdx = existingNodes.length;

    const idMap = {};
    const added = newNodes.map((n) => {
      const realId = crypto.randomUUID();
      idMap[n.id] = realId;
      return {
        id: realId,
        type: n.type || 'note',
        label: n.label,
        content: n.content || '',
        tags: n.tags || [],
        priority: n.priority || 3,
        x: 0, y: 0,
        w: Math.max(140, Math.min(260, n.label.length * 9 + 50)),
        h: n.content ? 72 : 52,
      };
    });

    const addedEdges = newEdges.map(e => ({
      id: crypto.randomUUID(),
      from:  idMap[e.from] || e.from,
      to:    idMap[e.to]   || e.to,
      label: e.label || '',
    })).filter(e => e.from && e.to);

    const allNodes = [...existingNodes, ...added];
    const allEdges = [...existingEdges, ...addedEdges];

    // 自动排版：整体重新计算层级布局
    const pos = computeLayout(allNodes, allEdges);
    allNodes.forEach(n => { if (pos[n.id]) { n.x = pos[n.id].x; n.y = pos[n.id].y; } });

    await api('PUT', `/api/cases/${topic_id}`, { ...t, nodes: allNodes, edges: allEdges });

    const blockers = added.filter(n => n.type === 'blocker');
    let summary = `思维导图已更新\n新增节点: ${added.length} 个\n建立连接: ${addedEdges.length} 条`;
    if (blockers.length > 0) {
      summary += `\n\n🔴 识别到 ${blockers.length} 个卡点：\n${blockers.map(b => `  • ${b.label}${b.content ? ': ' + b.content : ''}`).join('\n')}`;
    }
    summary += `\n\n打开 http://localhost:3001 查看思维导图`;
    return { content: [{ type: 'text', text: summary }] };
  }
);

// ── 布局整理 ──────────────────────────────────────────────────────────────

server.tool('layout_topic', '重新整理思维导图节点的位置，让布局清晰不拥挤（层级树状排列）',
  { topic_id: z.string() },
  async ({ topic_id }) => {
    const t = await api('GET', `/api/cases/${topic_id}`);
    const nodes = t.nodes || [];
    if (!nodes.length) return { content: [{ type: 'text', text: '主题没有节点' }] };

    const pos = computeLayout(nodes, t.edges || []);
    nodes.forEach(n => { if (pos[n.id]) { n.x = pos[n.id].x; n.y = pos[n.id].y; } });

    await api('PUT', `/api/cases/${topic_id}`, { ...t, nodes });
    return { content: [{ type: 'text', text: `布局已整理，共 ${nodes.length} 个节点` }] };
  }
);

// ── 搜索 ──────────────────────────────────────────────────────────────────

server.tool('search', '在主题中全文搜索节点',
  {
    topic_id: z.string(),
    query:    z.string(),
  },
  async ({ topic_id, query }) => {
    const t = await api('GET', `/api/cases/${topic_id}`);
    const nodes = t.nodes || [];
    const edges = t.edges || [];
    const q = query.toLowerCase();

    const hitNodes = nodes.filter(n =>
      n.label.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q) ||
      n.id.toLowerCase().includes(q) ||
      n.tags?.some(tag => tag.toLowerCase().includes(q))
    );

    const hitEdges = edges.filter(e => e.label?.toLowerCase().includes(q));

    if (!hitNodes.length && !hitEdges.length)
      return { content: [{ type: 'text', text: `搜索 "${query}" 无结果` }] };

    const lines = [`搜索 "${query}" 结果:\n`];
    if (hitNodes.length) {
      lines.push(`节点 (${hitNodes.length}个):`);
      hitNodes.forEach(n => lines.push('  ' + fmtNode(n).split('\n').join('\n  ')));
    }
    if (hitEdges.length) {
      lines.push(`\n边 (${hitEdges.length}条):`);
      hitEdges.forEach(e => lines.push('  ' + fmtEdge(e, nodes)));
    }
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

// ── 导出 ──────────────────────────────────────────────────────────────────

server.tool('export_topic', '导出主题为 Mermaid / JSON / Markdown 格式',
  {
    topic_id: z.string(),
    format:   z.enum(['mermaid','json','markdown']),
  },
  async ({ topic_id, format }) => {
    const t = await api('GET', `/api/cases/${topic_id}`);
    const nodes = t.nodes || [];
    const edges = t.edges || [];

    if (format === 'json') {
      return { content: [{ type: 'text', text: JSON.stringify(t, null, 2) }] };
    }

    if (format === 'mermaid') {
      const sid = (id) => 'N' + id.replace(/-/g, '').slice(0, 10);
      const safe = (s) => (s || '').replace(/"/g, "'").replace(/[<>]/g, '');
      const icon = { root:'◎', goal:'✓', problem:'!', idea:'💡', blocker:'🔴', insight:'★', action:'▶', question:'?', note:'…' };
      const lines = ['graph LR'];
      nodes.forEach(n => lines.push(`  ${sid(n.id)}["${icon[n.type]||''} ${safe(n.label)}"]`));
      edges.forEach(e => {
        const lbl = e.label || '';
        lines.push(`  ${sid(e.from)} -->|"${safe(lbl)}"| ${sid(e.to)}`);
      });
      return { content: [{ type: 'text', text: '```mermaid\n' + lines.join('\n') + '\n```' }] };
    }

    if (format === 'markdown') {
      const TYPE_ZH = { root:'主题', goal:'目标', problem:'问题', idea:'想法', blocker:'卡点', insight:'洞察', action:'行动', question:'待解答', note:'备注' };
      const lines = [
        `# ${t.name}`,
        t.description ? `\n> ${t.description}\n` : '',
        `**节点**: ${nodes.length}  **连接**: ${edges.length}`,
        '\n---\n',
      ];
      const byType = {};
      nodes.forEach(n => (byType[n.type] = byType[n.type] || []).push(n));
      Object.entries(byType).forEach(([type, ns]) => {
        lines.push(`## ${TYPE_ZH[type] || type}\n`);
        ns.forEach(n => {
          lines.push(`**${n.label}**`);
          if (n.content) lines.push(`> ${n.content}`);
          if (n.tags?.length) lines.push(`标签: ${n.tags.join(', ')}`);
          lines.push('');
        });
      });
      lines.push('## 关联关系\n');
      edges.forEach(e => {
        const from = nodes.find(n => n.id === e.from);
        const to   = nodes.find(n => n.id === e.to);
        let s = `- **${from?.label||'?'}** → **${to?.label||'?'}**`;
        if (e.label) s += ` _(${e.label})_`;
        lines.push(s);
      });
      return { content: [{ type: 'text', text: lines.filter(l => l !== null).join('\n') }] };
    }
  }
);

// ── 启动 ──────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
