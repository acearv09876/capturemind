import 'dotenv/config';
import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const DATA_DIR = './data/topics';
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function getIndex() {
  const f = `${DATA_DIR}/index.json`;
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf8'));
}
function saveIndex(list) {
  writeFileSync(`${DATA_DIR}/index.json`, JSON.stringify(list, null, 2));
}
function readTopic(id) {
  const f = `${DATA_DIR}/${id}.json`;
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, 'utf8'));
}
function writeTopic(id, data) {
  writeFileSync(`${DATA_DIR}/${id}.json`, JSON.stringify(data, null, 2));
}

// ── Topics API ─────────────────────────────────────────────────────────────
app.get('/api/cases', (req, res) => res.json(getIndex()));

app.post('/api/cases', (req, res) => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const meta = { id, name: req.body.name || '新主题', description: req.body.description || '', createdAt: now, updatedAt: now };
  const data = { ...meta, nodes: [], edges: [] };
  writeTopic(id, data);
  const list = getIndex();
  list.unshift({ id, name: meta.name, description: meta.description, createdAt: now, updatedAt: now });
  saveIndex(list);
  res.json(data);
});

app.get('/api/cases/:id', (req, res) => {
  const c = readTopic(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

app.put('/api/cases/:id', (req, res) => {
  const c = readTopic(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  const updated = { ...c, ...req.body, id: c.id, updatedAt: now };
  writeTopic(c.id, updated);
  const list = getIndex();
  const i = list.findIndex(x => x.id === c.id);
  if (i >= 0) { list[i].name = updated.name; list[i].updatedAt = now; saveIndex(list); }
  res.json(updated);
});

app.delete('/api/cases/:id', (req, res) => {
  const f = `${DATA_DIR}/${req.params.id}.json`;
  if (existsSync(f)) unlinkSync(f);
  saveIndex(getIndex().filter(c => c.id !== req.params.id));
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`\nCaptureMind 已启动 → http://localhost:${PORT}\n`);
});
