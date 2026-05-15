/* ─────────────────────────────────────────────────────────────
   Chat Mind — Bilingual Mind Map
   ───────────────────────────────────────────────────────────── */
const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

/* ═══════════════════════════════════════════════════════════════
   i18n
   ═══════════════════════════════════════════════════════════════ */
const T = {
  zh: {
    brand_sub: "对话思维导图",
    no_topic: "— 请选择或新建主题 —",
    nodes: "节点", edges: "关联", blockers_suffix: "个卡点",
    save_tip: "保存 Ctrl+S", export_tip: "导出 JSON",
    topics_header: "主题 · Topics", new_topic_btn: "新建主题",
    no_topics: "暂无主题，点击 + 新建",
    nodes_count: n => `${n} 节点`,
    legend: "图例 · Legend", root_label: "主题根",
    mcp_desc: "Claude 可直接操控此思维导图",
    mcp_tool: "使用 capturemind 同步对话",
    untitled: "未命名", desc_ph: "补充说明...",
    priority: "重要性", tags_label: "标签（逗号分隔）", tags_ph: "产品, 技术, ...",
    root_node: "主题根节点", close_tip: "关闭 (ESC)", delete_tip: "删除 (Del)",
    insert: "INSERT", add_node: "添加节点 · INSERT", esc_cancel: "ESC 取消",
    new_topic_title: "新建主题 · NEW TOPIC",
    topic_name: "主题名称", desc_opt: "描述（可选）",
    topic_name_ph: "例: 产品定位探讨、创业路径思考",
    topic_desc_ph: "这个主题要解决什么问题",
    cancel: "取消", create: "创建",
    empty_hint: "在左侧新建主题，开始整理你的思路",
    empty_sub: "在 Claude Desktop 中对话后，使用 MCP 工具\ncapturemind 自动生成思维导图",
    confirm_delete: name => `确认删除主题「${name}」？`,
    fit_tip: "居中 F",
    help: ["TAB 添加节点", "1-8 类型", "拖拽 移动", "⌘+滚轮 缩放", "DEL 删除"],
    add_tip: label => `添加${label}`,
    toast_added: label => `已添加 ${label}`,
    toast_node_del: "已删除节点",
    toast_edge_exists: "已存在该关联", toast_edge_added: "已建立关联", toast_edge_del: "已删除关联",
    toast_topic_created: "主题已创建", toast_topic_del: "已删除主题",
    toast_saved: "已保存", toast_save_fail: "保存失败",
    toast_create_fail: "创建失败", toast_del_fail: "删除失败",
    toast_exported: "已导出 JSON",
  },
  en: {
    brand_sub: "Conversation Mind Map",
    no_topic: "— Select or create a topic —",
    nodes: "nodes", edges: "edges", blockers_suffix: "blockers",
    save_tip: "Save Ctrl+S", export_tip: "Export JSON",
    topics_header: "Topics", new_topic_btn: "New Topic",
    no_topics: "No topics. Click + to create.",
    nodes_count: n => `${n} nodes`,
    legend: "Legend", root_label: "Root",
    mcp_desc: "Claude controls this mind map",
    mcp_tool: "Use capturemind to sync chats",
    untitled: "Untitled", desc_ph: "Add description...",
    priority: "Priority", tags_label: "Tags (comma separated)", tags_ph: "product, tech, ...",
    root_node: "Root Node", close_tip: "Close (ESC)", delete_tip: "Delete (Del)",
    insert: "INSERT", add_node: "Add Node · INSERT", esc_cancel: "ESC to cancel",
    new_topic_title: "NEW TOPIC",
    topic_name: "Topic Name", desc_opt: "Description (optional)",
    topic_name_ph: "e.g. Product strategy, Startup thinking",
    topic_desc_ph: "What problem does this topic address?",
    cancel: "Cancel", create: "Create",
    empty_hint: "Create a topic on the left to get started",
    empty_sub: "After chatting in Claude Desktop, use the MCP tool\ncapturemind to generate your mind map",
    confirm_delete: name => `Delete topic "${name}"?`,
    fit_tip: "Fit F",
    help: ["TAB Add node", "1-8 Types", "Drag to move", "⌘+Wheel Zoom", "DEL Delete"],
    add_tip: label => `Add ${label}`,
    toast_added: label => `Added ${label}`,
    toast_node_del: "Node deleted",
    toast_edge_exists: "Edge already exists", toast_edge_added: "Edge added", toast_edge_del: "Edge removed",
    toast_topic_created: "Topic created", toast_topic_del: "Topic deleted",
    toast_saved: "Saved", toast_save_fail: "Save failed",
    toast_create_fail: "Create failed", toast_del_fail: "Delete failed",
    toast_exported: "Exported JSON",
  },
};

/* ═══════════════════════════════════════════════════════════════
   Node Types
   ═══════════════════════════════════════════════════════════════ */
const NODE_TYPES_DEF = [
  { key: "goal",     zh: "目标",   en: "Goal",     short: "GOAL", hotkey: "1", cssVar: "--t-goal" },
  { key: "problem",  zh: "问题",   en: "Problem",  short: "PROB", hotkey: "2", cssVar: "--t-problem" },
  { key: "idea",     zh: "想法",   en: "Idea",     short: "IDEA", hotkey: "3", cssVar: "--t-idea" },
  { key: "blocker",  zh: "卡点",   en: "Blocker",  short: "BLOK", hotkey: "4", cssVar: "--t-blocker" },
  { key: "insight",  zh: "洞察",   en: "Insight",  short: "INSG", hotkey: "5", cssVar: "--t-insight" },
  { key: "action",   zh: "行动",   en: "Action",   short: "ACT",  hotkey: "6", cssVar: "--t-action" },
  { key: "question", zh: "待解答", en: "Question", short: "Q?",   hotkey: "7", cssVar: "--t-question" },
  { key: "note",     zh: "备注",   en: "Note",     short: "NOTE", hotkey: "8", cssVar: "--t-note" },
];
const ROOT_DEF = { key: "root", zh: "主题", en: "Topic", short: "ROOT", cssVar: "--t-root" };

const getNodeTypes = lang => NODE_TYPES_DEF.map(t => ({ ...t, label: t[lang] }));
const getTypeMeta  = lang => {
  const m = Object.fromEntries(NODE_TYPES_DEF.map(t => [t.key, { ...t, label: t[lang] }]));
  m.root = { ...ROOT_DEF, label: ROOT_DEF[lang] };
  return m;
};

/* ═══════════════════════════════════════════════════════════════
   Lang Context
   ═══════════════════════════════════════════════════════════════ */
const LangContext = createContext("zh");
const useLang = () => useContext(LangContext);

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */
const uid = () => "n-" + Math.random().toString(36).slice(2, 8);
const nodeH = (n) => {
  if (n.type === "root") return 80;
  let h = 60;
  if (n.content) h += 20;
  if (n.tags?.length || n.priority) h += 18;
  return h;
};
function nodeCenter(n) { return { x: n.x + n.w / 2, y: n.y + nodeH(n) / 2 }; }
function edgePath(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const curve = Math.min(40, dist * 0.12);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const nx = -dy / dist, ny = dx / dist;
  return `M${a.x},${a.y} Q${mx + nx * curve},${my + ny * curve} ${b.x},${b.y}`;
}

async function apiFetch(method, path, body) {
  const r = await fetch(path, {
    method, headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ═══════════════════════════════════════════════════════════════
   Toast
   ═══════════════════════════════════════════════════════════════ */
function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => <div key={t.id} className={"toast " + (t.kind || "")}>{t.text}</div>)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TopBar
   ═══════════════════════════════════════════════════════════════ */
function TopBar({ activeTopic, onSave, onExport, saving, lang, onToggleLang }) {
  const t = T[lang];
  const blockers = (activeTopic?.nodes || []).filter(n => n.type === "blocker");

  return (
    <header className="topbar">
      <div className="tb-brand">
        <div className="tb-brand-mark">M</div>
        <div className="tb-brand-text">
          <span className="name">CHAT MIND</span>
          <span className="sub">{t.brand_sub}</span>
        </div>
      </div>

      <div className="tb-case">
        {!activeTopic ? (
          <span className="tb-case-id" style={{ color: "var(--ink-4)" }}>{t.no_topic}</span>
        ) : (
          <>
            <span className="tb-case-id">{activeTopic.id?.slice(0, 8)}</span>
            <span className="tb-case-name">{activeTopic.name}</span>
            <div className="tb-case-meta">
              <span><strong>{activeTopic.nodes?.length || 0}</strong> {t.nodes}</span>
              <span className="sep">|</span>
              <span><strong>{activeTopic.edges?.length || 0}</strong> {t.edges}</span>
              {blockers.length > 0 && <>
                <span className="sep">|</span>
                <span style={{ color: "var(--t-blocker)", fontWeight: 600 }}>🔴 {blockers.length} {t.blockers_suffix}</span>
              </>}
              <span className="sep">|</span>
              <span>{activeTopic.updatedAt?.slice(0, 16).replace("T", " ")}</span>
            </div>
          </>
        )}
      </div>

      <div className="tb-actions">
        <button
          className="icon-btn"
          title={lang === "zh" ? "Switch to English" : "切换为中文"}
          onClick={onToggleLang}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, padding: "4px 8px", minWidth: 36 }}
        >
          {lang === "zh" ? "EN" : "中"}
        </button>
        <button className="icon-btn" title={t.save_tip} onClick={onSave} style={{ opacity: saving ? 0.5 : 1 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/>
          </svg>
        </button>
        <button className="icon-btn" title={t.export_tip} onClick={onExport}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sidebar
   ═══════════════════════════════════════════════════════════════ */
function Sidebar({ topics, activeTopicId, onSelectTopic, onNewTopic, onDeleteTopic }) {
  const lang = useLang();
  const t = T[lang];
  const NODE_TYPES = getNodeTypes(lang);
  const TYPE_META  = getTypeMeta(lang);

  return (
    <aside className="sidebar">
      <div className="sb-section">
        <div className="sb-header">
          <span className="sb-header-title">{t.topics_header}</span>
          <button className="sb-add" title={t.new_topic_btn} onClick={onNewTopic}>+</button>
        </div>
        <div className="case-list">
          {topics.length === 0 && (
            <div style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)" }}>
              {t.no_topics}
            </div>
          )}
          {topics.map(tp => (
            <div
              key={tp.id}
              className={"case-item" + (tp.id === activeTopicId ? " active" : "")}
              onClick={() => onSelectTopic(tp.id)}
            >
              <div className="case-item-name">{tp.name}</div>
              <div className="case-item-meta">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>{tp.id?.slice(0, 8)}</span>
                <span className="sep">·</span>
                <span>{t.nodes_count(tp.nodes?.length || 0)}</span>
                <span className="sep">·</span>
                <button
                  style={{ border: "none", background: "none", color: "var(--ink-4)", cursor: "pointer", fontSize: 12, padding: "0 2px" }}
                  title={t.new_topic_btn}
                  onClick={e => { e.stopPropagation(); onDeleteTopic(tp.id, tp.name); }}
                >×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="legend">
        <div className="sb-header" style={{ padding: "0 0 8px", position: "static" }}>
          <span className="sb-header-title">{t.legend}</span>
        </div>
        <div className="legend-grid">
          {NODE_TYPES.map(nt => (
            <div key={nt.key} className={"legend-item" + (nt.key === "blocker" ? " blocker-legend" : "")} style={{ "--c": `var(${nt.cssVar})` }}>
              <span className="swatch" />
              <span>{nt.label}</span>
            </div>
          ))}
          <div className="legend-item" style={{ "--c": "var(--t-root)" }}>
            <span className="swatch" />
            <span>{t.root_label}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "auto", padding: "10px 18px 14px", borderTop: "1px solid var(--rule)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", lineHeight: 1.6 }}>
        <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>MCP CONNECTED</div>
        <div>{t.mcp_desc}</div>
        <div style={{ marginTop: 4 }}>{t.mcp_tool}</div>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Node Inline Editor
   ═══════════════════════════════════════════════════════════════ */
function NodeInlineEditor({ node, onUpdate, onDelete, onClose }) {
  const lang = useLang();
  const t = T[lang];
  const TYPE_META = getTypeMeta(lang);
  const NODE_TYPES = getNodeTypes(lang);
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus(); inputRef.current.select();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [node.id]);

  const isRoot = node.type === "root";
  const y = node.y + nodeH(node) + 8;
  return (
    <div className="nie" style={{ left: node.x, top: y, minWidth: Math.max(node.w, 240) }} onPointerDown={e => e.stopPropagation()}>
      <div className="nie-topbar">
        <span className="nie-topbar-type">{(TYPE_META[node.type] || TYPE_META.note).label}</span>
        <button className="nie-close" onClick={onClose} title={t.close_tip}>×</button>
      </div>
      <input ref={inputRef} className="nie-label" value={node.label} placeholder={t.untitled}
        onChange={e => onUpdate({ ...node, label: e.target.value })} />
      <textarea className="nie-content" rows={2} placeholder={t.desc_ph} value={node.content || ""}
        onChange={e => onUpdate({ ...node, content: e.target.value })} />
      <div className="nie-ext-row">
        <div className="nie-ext-field">
          <label className="nie-ext-label">{t.priority}</label>
          <div className="nie-priority">
            {[1,2,3,4,5].map(p => (
              <button key={p} className={"priority-btn" + (node.priority === p ? " active" : "")}
                onClick={() => onUpdate({ ...node, priority: node.priority === p ? undefined : p })}>{p}</button>
            ))}
          </div>
        </div>
        <div className="nie-ext-field">
          <label className="nie-ext-label">{t.tags_label}</label>
          <input className="nie-ext-input" placeholder={t.tags_ph}
            value={(node.tags || []).join(", ")}
            onChange={e => onUpdate({ ...node, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
        </div>
      </div>
      <div className="nie-row">
        {!isRoot && (
          <div className="nie-types">
            {NODE_TYPES.map(nt => (
              <button key={nt.key} className={"nie-type" + (node.type === nt.key ? " active" : "")} title={nt.label}
                onClick={() => onUpdate({ ...node, type: nt.key })}>
                <span className="dot" style={{ background: `var(${nt.cssVar})` }} />
              </button>
            ))}
          </div>
        )}
        {isRoot && <div className="nie-types-empty">{t.root_node}</div>}
        {!isRoot && (
          <button className="nie-delete" title={t.delete_tip} onClick={() => onDelete(node.id)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Canvas Floating Toolbar
   ═══════════════════════════════════════════════════════════════ */
function CanvasToolbar({ onAddNode }) {
  const lang = useLang();
  const t = T[lang];
  const NODE_TYPES = getNodeTypes(lang);
  return (
    <div className="canvas-toolbar">
      <span className="canvas-toolbar-label">{t.insert}</span>
      {NODE_TYPES.map(nt => (
        <button key={nt.key} className={"tool-btn" + (nt.key === "blocker" ? " is-blocker" : "")}
          style={{ "--node-color": `var(${nt.cssVar})` }}
          onClick={() => onAddNode(nt.key)} title={t.add_tip(nt.label)}>
          <span className="swatch" />
          <span>{nt.label}</span>
          <span className="hotkey">{nt.hotkey}</span>
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Quick-Add Overlay (Tab)
   ═══════════════════════════════════════════════════════════════ */
function QuickAddOverlay({ quickAdd, onClose, onAddNode, onSetQuickAdd }) {
  const lang = useLang();
  const t = T[lang];
  const NODE_TYPES = getNodeTypes(lang);
  return (
    <div className="quick-add" style={{ left: quickAdd.x, top: quickAdd.y }} onPointerDown={e => e.stopPropagation()}>
      <div className="quick-add-head">
        <span>{t.add_node}</span>
        <span className="esc">{t.esc_cancel}</span>
      </div>
      <div className="quick-add-list">
        {NODE_TYPES.map((nt, i) => (
          <button key={nt.key}
            className={"quick-add-item" + (i === quickAdd.focusIdx ? " focused" : "")}
            style={{ "--node-color": `var(${nt.cssVar})` }}
            onMouseEnter={() => onSetQuickAdd(q => q && ({ ...q, focusIdx: i }))}
            onClick={() => { onAddNode(nt.key, { x: quickAdd.x, y: quickAdd.y }); onClose(); }}>
            <span className="swatch" />
            <span>{nt.label}</span>
            <span className="short">{nt.short}</span>
            <span className="key">{nt.hotkey}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Canvas
   ═══════════════════════════════════════════════════════════════ */
function Canvas({ activeTopic, selectedNodeId, selectedEdgeId, editingNodeId,
                  onSelectNode, onSelectEdge, onEditNode, onMoveNode, onUpdateNode, onDeleteNode,
                  onAddEdge, onRemoveEdge, onAddNode,
                  cursorRef, quickAdd, onCloseQuickAdd, onSetQuickAdd }) {
  const lang = useLang();
  const t = T[lang];
  const TYPE_META = getTypeMeta(lang);

  const wrapRef = useRef(null);
  const [vp, setVp] = useState({ x: 60, y: 30, zoom: 1 });
  const panRef = useRef(null);

  const onCanvasPointerDown = (e) => {
    if (e.target.closest(".node-card") || e.target.closest(".node-port") ||
        e.target.closest(".canvas-strip") || e.target.closest(".canvas-controls") ||
        e.target.closest(".canvas-help") || e.target.closest(".canvas-toolbar") ||
        e.target.closest(".quick-add") || e.target.closest(".edge-hit") ||
        e.target.closest(".edge-delete-btn") || e.target.closest(".nie")) return;
    onSelectNode(null); onSelectEdge(null); onEditNode(null);
    if (quickAdd) onCloseQuickAdd();
    wrapRef.current?.classList.add("panning");
    panRef.current = { sx: e.clientX, sy: e.clientY, vx: vp.x, vy: vp.y };
    const move = (ev) => setVp(v => ({ ...v, x: panRef.current.vx + ev.clientX - panRef.current.sx, y: panRef.current.vy + ev.clientY - panRef.current.sy }));
    const up = () => { wrapRef.current?.classList.remove("panning"); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onCanvasMouseMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    cursorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 30) {
      e.preventDefault();
      setVp(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      return;
    }
    e.preventDefault();
    const rect = wrapRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    setVp(v => {
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const newZoom = Math.min(2, Math.max(0.3, v.zoom * factor));
      const k = newZoom / v.zoom;
      return { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, zoom: newZoom };
    });
  };

  const onNodePointerDown = (e, n) => {
    e.stopPropagation();
    onSelectNode(n.id);
    const start = { sx: e.clientX, sy: e.clientY, nx: n.x, ny: n.y };
    const move = (ev) => onMoveNode(n.id, start.nx + (ev.clientX - start.sx) / vp.zoom, start.ny + (ev.clientY - start.sy) / vp.zoom);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const [draftEdge, setDraftEdge] = useState(null);
  const onPortPointerDown = (e, n) => {
    e.stopPropagation(); e.preventDefault();
    const a = nodeCenter(n);
    setDraftEdge({ from: n.id, ax: a.x, ay: a.y, bx: a.x, by: a.y });
    const move = (ev) => {
      const rect = wrapRef.current.getBoundingClientRect();
      setDraftEdge(d => d ? { ...d, bx: (ev.clientX - rect.left - vp.x) / vp.zoom, by: (ev.clientY - rect.top - vp.y) / vp.zoom } : null);
    };
    const up = (ev) => {
      const card = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".node-card");
      const tid = card?.getAttribute("data-id");
      if (tid && tid !== n.id) onAddEdge(n.id, tid);
      setDraftEdge(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const fitToView = () => {
    const nodes = activeTopic?.nodes || [];
    if (!nodes.length) { setVp({ x: 60, y: 30, zoom: 1 }); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + nodeH(n)); });
    const rect = wrapRef.current.getBoundingClientRect();
    const pad = 60;
    const z = Math.min(1, Math.min(rect.width / (maxX - minX + pad * 2), rect.height / (maxY - minY + pad * 2)));
    setVp({ x: (rect.width - (maxX - minX) * z) / 2 - minX * z, y: (rect.height - (maxY - minY) * z) / 2 - minY * z, zoom: z });
  };

  const nodes = activeTopic?.nodes || [];
  const edges = activeTopic?.edges || [];
  const centers = useMemo(() => { const m = {}; nodes.forEach(n => { m[n.id] = nodeCenter(n); }); return m; }, [nodes]);
  const transform = `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`;

  if (!activeTopic) {
    return (
      <main className="canvas-wrap" ref={wrapRef}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontSize: 13, pointerEvents: "none" }}>
          <div style={{ fontSize: 36, opacity: 0.12 }}>◻</div>
          <div>{t.empty_hint}</div>
          <div style={{ fontSize: 11, color: "var(--ink-5)", maxWidth: 340, textAlign: "center", lineHeight: 1.7, whiteSpace: "pre-line" }}>
            {t.empty_sub}
          </div>
        </div>
      </main>
    );
  }

  const blockerCount = nodes.filter(n => n.type === "blocker").length;

  return (
    <main className="canvas-wrap" ref={wrapRef} onPointerDown={onCanvasPointerDown} onMouseMove={onCanvasMouseMove} onWheel={onWheel}>
      <div className="canvas-strip">
        <span className="case-no">{activeTopic.id?.slice(0, 8)}</span>
        <span className="sep"></span>
        <span>{nodes.length} {t.nodes} / {edges.length} {t.edges}</span>
        {blockerCount > 0 && (
          <>
            <span className="sep"></span>
            <span style={{ color: "var(--t-blocker)", fontWeight: 600 }}>🔴 {blockerCount} {t.blockers_suffix}</span>
          </>
        )}
      </div>

      <CanvasToolbar onAddNode={onAddNode} />

      <svg id="viewport-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow-h" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--ink-3)" />
          </marker>
          <marker id="arrow-h-accent" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)" />
          </marker>
        </defs>
        <g className="edges-layer" style={{ transform, transformOrigin: "0 0" }}>
          {edges.map(e => {
            const a = centers[e.from], b = centers[e.to];
            if (!a || !b) return null;
            const isSel = selectedEdgeId === e.id;
            const nodeSel = !isSel && (selectedNodeId === e.from || selectedNodeId === e.to);
            const hi = isSel || nodeSel;
            const d = edgePath(a, b);
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const edgeLbl = e.label || "";
            const lblW = Math.max(40, Math.min(90, edgeLbl.length * 6 + 16));
            return (
              <g key={e.id}>
                <path d={d} fill="none" stroke={hi ? "var(--accent)" : "var(--ink-3)"} strokeWidth={isSel ? 2 : (nodeSel ? 1.6 : 1.1)} strokeOpacity={hi ? 1 : 0.7} markerEnd={hi ? "url(#arrow-h-accent)" : "url(#arrow-h)"} />
                <path className="edge-hit" d={d} fill="none" stroke="transparent" strokeWidth="14" style={{ cursor: "pointer" }} onPointerDown={ev => { ev.stopPropagation(); onSelectEdge(e.id); }} />
                {edgeLbl && !isSel && (
                  <g transform={`translate(${mx}, ${my - 10})`} style={{ pointerEvents: "none" }}>
                    <rect x={-lblW/2} y="-9" width={lblW} height="16" fill="var(--bg)" stroke="var(--rule-2)" strokeWidth="0.8" />
                    <text x="0" y="2" textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: nodeSel ? "var(--accent)" : "var(--ink-2)", letterSpacing: 0.3 }}>{edgeLbl}</text>
                  </g>
                )}
                {isSel && (
                  <g transform={`translate(${mx}, ${my})`} style={{ cursor: "pointer" }} onPointerDown={ev => { ev.stopPropagation(); onRemoveEdge(e.id); }}>
                    <rect x="-14" y="-10" width="28" height="20" fill="var(--accent)" />
                    <line x1="-5" y1="-4" x2="5" y2="4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="5" y1="-4" x2="-5" y2="4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                  </g>
                )}
              </g>
            );
          })}
          {draftEdge && (
            <path d={`M${draftEdge.ax},${draftEdge.ay} L${draftEdge.bx},${draftEdge.by}`} fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeDasharray="4 4" />
          )}
        </g>
      </svg>

      <div className="nodes-layer">
        <div className="viewport-transform" style={{ transform }}>
          {nodes.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.note;
            const isRoot = n.type === "root";
            const isBlocker = n.type === "blocker";
            return (
              <div key={n.id} data-id={n.id}
                className={"node-card" + (isRoot ? " is-root" : "") + (isBlocker ? " is-blocker" : "") + (selectedNodeId === n.id ? " selected" : "") + (editingNodeId === n.id ? " editing" : "")}
                style={{ left: n.x, top: n.y, width: n.w, "--node-color": `var(${meta.cssVar})` }}
                onPointerDown={e => onNodePointerDown(e, n)}
                onDoubleClick={e => { e.stopPropagation(); onEditNode(n.id); }}>
                <div className="node-card-head">{meta.short}</div>
                <div className="node-card-body">
                  <div className="node-card-label">{n.label}</div>
                  {n.content && <div className="node-card-content">{n.content}</div>}
                  {(n.tags?.length > 0 || n.priority) && (
                    <div className="node-meta-row">
                      {n.priority && <span className="node-priority-pip">{"P"+n.priority}</span>}
                      {n.tags?.slice(0,3).map(tg => <span key={tg} className="node-tag">{tg}</span>)}
                    </div>
                  )}
                  <div className="node-card-id">{n.id}</div>
                </div>
                {!isRoot && (
                  <>
                    <div className="node-port n" onPointerDown={e => onPortPointerDown(e, n)} />
                    <div className="node-port s" onPointerDown={e => onPortPointerDown(e, n)} />
                    <div className="node-port w" onPointerDown={e => onPortPointerDown(e, n)} />
                    <div className="node-port e" onPointerDown={e => onPortPointerDown(e, n)} />
                  </>
                )}
              </div>
            );
          })}
          {(() => {
            const sn = nodes.find(n => n.id === editingNodeId);
            if (!sn) return null;
            return <NodeInlineEditor key={sn.id} node={sn} onUpdate={onUpdateNode} onDelete={onDeleteNode} onClose={() => onEditNode(null)} />;
          })()}
        </div>
      </div>

      <div className="canvas-controls">
        <button onClick={fitToView} title={t.fit_tip}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        </button>
        <button onClick={() => setVp(v => ({ ...v, zoom: Math.max(0.3, v.zoom / 1.15) }))} title={t.zoom_out}>−</button>
        <span className="zoom-label">{Math.round(vp.zoom * 100)}%</span>
        <button onClick={() => setVp(v => ({ ...v, zoom: Math.min(2, v.zoom * 1.15) }))} title={t.zoom_in}>+</button>
        <button onClick={() => setVp({ x: 60, y: 30, zoom: 1 })} title="100%">100</button>
      </div>

      <div className="canvas-help">
        {t.help.map((h, i) => {
          const parts = h.split(" ");
          return <span key={i}><span className="kbd">{parts[0]}</span>{parts.slice(1).join(" ")}</span>;
        })}
      </div>

      {quickAdd && (
        <QuickAddOverlay quickAdd={quickAdd} onClose={onCloseQuickAdd} onAddNode={onAddNode} onSetQuickAdd={onSetQuickAdd} />
      )}
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════
   New Topic Modal
   ═══════════════════════════════════════════════════════════════ */
function NewTopicModal({ onClose, onCreate }) {
  const lang = useLang();
  const t = T[lang];
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);
  const submit = () => { if (!name.trim()) return; onCreate(name.trim(), desc.trim()); onClose(); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onPointerDown={onClose}>
      <div style={{ background: "var(--bg)", border: "1px solid var(--ink)", padding: 24, minWidth: 360, boxShadow: "4px 4px 0 var(--ink)" }} onPointerDown={e => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 12, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 16 }}>{t.new_topic_title}</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 4 }}>{t.topic_name}</label>
          <input ref={ref} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder={t.topic_name_ph}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--rule-2)", background: "var(--bg)", fontSize: 13, fontFamily: "inherit", outline: "none", borderRadius: 0 }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 4 }}>{t.desc_opt}</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.topic_desc_ph}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--rule-2)", background: "var(--bg)", fontSize: 13, fontFamily: "inherit", outline: "none", borderRadius: 0 }} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 16px", border: "1px solid var(--rule-2)", background: "var(--bg)", fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}>{t.cancel}</button>
          <button onClick={submit} style={{ padding: "7px 16px", border: "none", background: "var(--ink)", color: "var(--bg)", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t.create}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   App root
   ═══════════════════════════════════════════════════════════════ */
function App() {
  const [lang, setLang] = useState(() => localStorage.getItem("cm_lang") || "zh");
  const t = T[lang];
  const TYPE_META = getTypeMeta(lang);
  const NODE_TYPES = getNodeTypes(lang);

  const toggleLang = () => {
    const next = lang === "zh" ? "en" : "zh";
    setLang(next);
    localStorage.setItem("cm_lang", next);
  };

  const [topics, setTopics] = useState([]);
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [activeTopicFull, setActiveTopicFull] = useState(null);
  const [selectedNodeId, setSelectedNodeIdRaw] = useState(null);
  const [selectedEdgeId, setSelectedEdgeIdRaw] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [quickAdd, setQuickAdd] = useState(null);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [saving, setSaving] = useState(false);
  const cursorRef = useRef({ x: 400, y: 300 });
  const saveTimerRef = useRef(null);
  const dirtyRef = useRef(false);

  const setSelectedNodeId = id => { setSelectedNodeIdRaw(id); if (id) setSelectedEdgeIdRaw(null); };
  const setSelectedEdgeId = id => { setSelectedEdgeIdRaw(id); if (id) setSelectedNodeIdRaw(null); };

  const pushToast = useCallback((toast) => {
    const id = uid();
    setToasts(ts => [...ts, { id, ...toast }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 2400);
  }, []);

  const loadTopics = useCallback(async () => {
    try { setTopics(await apiFetch("GET", "/api/cases")); } catch (e) { console.error(e); }
  }, []);

  const loadActiveTopic = useCallback(async (id) => {
    if (!id) { setActiveTopicFull(null); return; }
    try { setActiveTopicFull(await apiFetch("GET", `/api/cases/${id}`)); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadTopics(); }, []);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (dirtyRef.current) return;
      await loadTopics();
      if (activeTopicId) await loadActiveTopic(activeTopicId);
    }, 3000);
    return () => clearInterval(timer);
  }, [activeTopicId, loadTopics, loadActiveTopic]);

  useEffect(() => { loadActiveTopic(activeTopicId); }, [activeTopicId]);

  const saveTopic = useCallback(async (data) => {
    if (!data?.id) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await apiFetch("PUT", `/api/cases/${data.id}`, data);
        dirtyRef.current = false;
        await loadTopics();
      } catch { pushToast({ kind: "err", text: T[lang].toast_save_fail }); }
      finally { setSaving(false); }
    }, 800);
  }, [loadTopics, pushToast, lang]);

  const mutate = useCallback((fn) => {
    dirtyRef.current = true;
    setActiveTopicFull(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      saveTopic(next);
      return next;
    });
  }, [saveTopic]);

  const addNode = (type, pos) => {
    const meta = TYPE_META[type];
    const vt = document.querySelector(".viewport-transform");
    let vx = 0, vy = 0, vz = 1;
    if (vt) { const m = new DOMMatrixReadOnly(getComputedStyle(vt).transform); vx = m.e; vy = m.f; vz = m.a || 1; }
    const wrap = document.querySelector(".canvas-wrap");
    const rect = wrap?.getBoundingClientRect();
    const localX = pos ? pos.x : (rect ? rect.width / 2 : 400);
    const localY = pos ? pos.y : (rect ? rect.height / 2 : 300);
    const n = { id: uid(), type, label: lang === "zh" ? `新${meta.label}` : `New ${meta.label}`, x: Math.round((localX - vx) / vz - 80), y: Math.round((localY - vy) / vz - 30), w: 170, content: "" };
    mutate(c => ({ ...c, nodes: [...(c.nodes || []), n] }));
    setSelectedNodeId(n.id);
    pushToast({ kind: "ok", text: T[lang].toast_added(meta.label) });
  };

  const updateNode = (next) => mutate(c => ({ ...c, nodes: c.nodes.map(n => n.id === next.id ? next : n) }));
  const moveNode = (id, x, y) => mutate(c => ({ ...c, nodes: c.nodes.map(n => n.id === id ? { ...n, x, y } : n) }));
  const deleteNode = (id) => {
    mutate(c => ({ ...c, nodes: c.nodes.filter(n => n.id !== id), edges: c.edges.filter(e => e.from !== id && e.to !== id) }));
    setSelectedNodeId(null); setEditingNodeId(null);
    pushToast({ text: T[lang].toast_node_del });
  };
  const addEdge = (from, to) => {
    if (activeTopicFull?.edges?.find(e => e.from === from && e.to === to)) { pushToast({ kind: "err", text: T[lang].toast_edge_exists }); return; }
    mutate(c => ({ ...c, edges: [...(c.edges || []), { id: uid(), from, to, label: "" }] }));
    pushToast({ kind: "ok", text: T[lang].toast_edge_added });
  };
  const removeEdge = (id) => {
    mutate(c => ({ ...c, edges: c.edges.filter(e => e.id !== id) }));
    setSelectedEdgeId(null);
    pushToast({ text: T[lang].toast_edge_del });
  };

  const onNewTopic = async (name, description) => {
    try {
      const tp = await apiFetch("POST", "/api/cases", { name, description });
      await loadTopics(); setActiveTopicId(tp.id);
      pushToast({ kind: "ok", text: T[lang].toast_topic_created });
    } catch { pushToast({ kind: "err", text: T[lang].toast_create_fail }); }
  };

  const onDeleteTopic = async (id, name) => {
    if (!confirm(T[lang].confirm_delete(name))) return;
    try {
      await apiFetch("DELETE", `/api/cases/${id}`);
      await loadTopics();
      if (activeTopicId === id) { setActiveTopicId(null); setActiveTopicFull(null); }
      pushToast({ text: T[lang].toast_topic_del });
    } catch { pushToast({ kind: "err", text: T[lang].toast_del_fail }); }
  };

  const onSave = async () => {
    if (!activeTopicFull) return;
    setSaving(true);
    try {
      await apiFetch("PUT", `/api/cases/${activeTopicFull.id}`, activeTopicFull);
      pushToast({ kind: "ok", text: T[lang].toast_saved });
    } catch { pushToast({ kind: "err", text: T[lang].toast_save_fail }); }
    finally { setSaving(false); }
  };

  const onExport = () => {
    if (!activeTopicFull) return;
    const blob = new Blob([JSON.stringify(activeTopicFull, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${activeTopicFull.name || activeTopicFull.id}.json`; a.click();
    pushToast({ kind: "ok", text: T[lang].toast_exported });
  };

  const selectedNode = activeTopicFull?.nodes?.find(n => n.id === selectedNodeId);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "Tab" && !quickAdd) { e.preventDefault(); setQuickAdd({ x: cursorRef.current.x, y: cursorRef.current.y, focusIdx: 0 }); return; }
      if (quickAdd) {
        if (e.key === "Escape") { e.preventDefault(); setQuickAdd(null); return; }
        if (e.key >= "1" && e.key <= "8") { e.preventDefault(); const nt = NODE_TYPES[+e.key - 1]; if (nt) { addNode(nt.key, { x: quickAdd.x, y: quickAdd.y }); setQuickAdd(null); } return; }
        if (e.key === "ArrowDown") { e.preventDefault(); setQuickAdd(q => ({ ...q, focusIdx: (q.focusIdx + 1) % NODE_TYPES.length })); return; }
        if (e.key === "ArrowUp")   { e.preventDefault(); setQuickAdd(q => ({ ...q, focusIdx: (q.focusIdx - 1 + NODE_TYPES.length) % NODE_TYPES.length })); return; }
        if (e.key === "Enter")     { e.preventDefault(); addNode(NODE_TYPES[quickAdd.focusIdx].key, { x: quickAdd.x, y: quickAdd.y }); setQuickAdd(null); return; }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId && selectedNode?.type !== "root") { e.preventDefault(); deleteNode(selectedNodeId); return; }
        if (selectedEdgeId) { e.preventDefault(); removeEdge(selectedEdgeId); return; }
      }
      if (!quickAdd && e.key >= "1" && e.key <= "8" && activeTopicFull) { e.preventDefault(); addNode(NODE_TYPES[+e.key - 1].key); }
      if (e.key === "Escape") { setSelectedNodeId(null); setSelectedEdgeId(null); setEditingNodeId(null); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); onSave(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedNodeId, selectedNode, selectedEdgeId, activeTopicId, activeTopicFull, quickAdd, lang]);

  return (
    <LangContext.Provider value={lang}>
      <div id="app-root">
        <TopBar activeTopic={activeTopicFull} onSave={onSave} onExport={onExport} saving={saving} lang={lang} onToggleLang={toggleLang} />
        <Sidebar topics={topics} activeTopicId={activeTopicId} onSelectTopic={setActiveTopicId} onNewTopic={() => setShowNewTopic(true)} onDeleteTopic={onDeleteTopic} />
        <Canvas
          activeTopic={activeTopicFull}
          selectedNodeId={selectedNodeId} selectedEdgeId={selectedEdgeId} editingNodeId={editingNodeId}
          onSelectNode={setSelectedNodeId} onSelectEdge={setSelectedEdgeId} onEditNode={setEditingNodeId}
          onMoveNode={moveNode} onUpdateNode={updateNode} onDeleteNode={deleteNode}
          onAddEdge={addEdge} onRemoveEdge={removeEdge} onAddNode={addNode}
          cursorRef={cursorRef} quickAdd={quickAdd} onCloseQuickAdd={() => setQuickAdd(null)} onSetQuickAdd={setQuickAdd}
        />
        <ToastStack toasts={toasts} />
        {showNewTopic && <NewTopicModal onClose={() => setShowNewTopic(false)} onCreate={onNewTopic} />}
      </div>
    </LangContext.Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById("react-root"));
root.render(<App />);
