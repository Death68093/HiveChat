import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const SECRET = process.env.JWT_SECRET || 'supersecret';
const OWNER = process.env.OWNER || 'Death68093';

// --- Database ---
const DB_FILE = path.join('./data.json');
let db = { users: [], servers: [], channels: [], dms: [] };
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE));

// --- Helpers ---
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = db.users.find(u => u.id === payload.id);
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

function isAdmin(user) { return user.username === OWNER; }

// --- Auth Routes ---
app.post('/api/signup', (req, res) => {
  const { username, email, password } = req.body;
  if (db.users.find(u => u.username === username)) return res.status(400).json({ error:'Username exists' });
  if (db.users.find(u => u.email === email)) return res.status(400).json({ error:'Email exists' });
  const id = db.users.length + 1;
  const user = { id, username, email, password, banned: false, warnings: 0 };
  db.users.push(user); saveDB();
  const token = jwt.sign({ id }, SECRET);
  res.json({ token });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  if (user.banned) return res.status(403).json({ error: 'You are banned' });
  const token = jwt.sign({ id: user.id }, SECRET);
  res.json({ token });
});

app.post('/api/logout', authMiddleware, (req, res) => res.json({ success:true }));

// --- Me ---
app.get('/api/me', authMiddleware, (req, res) => {
  const { password, ...safe } = req.user;
  res.json({ user: safe });
});

app.patch('/api/me', authMiddleware, (req, res) => {
  const { username, email, password } = req.body;
  if (username && db.users.find(u => u.username === username && u.id !== req.user.id))
    return res.status(400).json({ error:'Username exists' });
  if (email && db.users.find(u => u.email === email && u.id !== req.user.id))
    return res.status(400).json({ error:'Email exists' });
  if (username) req.user.username = username;
  if (email) req.user.email = email;
  if (password) req.user.password = password;
  saveDB();
  res.json({ success:true });
});

// --- Servers ---
app.get('/api/servers', authMiddleware, (req, res) => res.json({ servers: db.servers }));

app.post('/api/servers', authMiddleware, (req,res)=>{
  const { name } = req.body;
  if (!name) return res.status(400).json({ error:'Server name required' });
  if (db.servers.find(s=>s.name.toLowerCase()===name.toLowerCase())) return res.status(400).json({ error:'Server name exists' });
  const server = { id: db.servers.length+1, name, owner:req.user.id };
  db.servers.push(server);
  saveDB();
  res.json({ success:true, server });
});

// --- Channels ---
app.get('/api/servers/:serverId/channels', authMiddleware, (req,res)=>{
  const serverId = parseInt(req.params.serverId);
  const channels = db.channels.filter(c=>c.serverId===serverId);
  res.json({ channels });
});

app.post('/api/servers/:serverId/channels', authMiddleware, (req,res)=>{
  const serverId = parseInt(req.params.serverId);
  const server = db.servers.find(s=>s.id===serverId);
  if (!server) return res.status(404).json({ error:'Server not found' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error:'Channel name required' });
  if (db.channels.find(c=>c.serverId===serverId && c.name.toLowerCase()===name.toLowerCase()))
    return res.status(400).json({ error:'Channel name exists' });
  const channel = { id: db.channels.length+1, serverId, name, messages:[] };
  db.channels.push(channel);
  saveDB();
  res.json({ success:true, channel });
});

// --- Channel Messages ---
app.get('/api/channels/:channelId/messages', authMiddleware, (req,res)=>{
  const channel = db.channels.find(c=>c.id===parseInt(req.params.channelId));
  res.json({ messages: channel?.messages || [] });
});

// --- DMs ---
app.get('/api/dms/:userId', authMiddleware, (req,res)=>{
  const toId = parseInt(req.params.userId);
  const dm = db.dms.find(d=>(d.user1===req.user.id && d.user2===toId)||(d.user2===req.user.id && d.user1===toId));
  res.json({ messages: dm?.messages || [] });
});

app.post('/api/dms/:userId', authMiddleware, (req,res)=>{
  const toId = parseInt(req.params.userId);
  let dm = db.dms.find(d=>(d.user1===req.user.id && d.user2===toId)||(d.user2===req.user.id && d.user1===toId));
  if (!dm) { dm={user1:req.user.id,user2:toId,messages:[]}; db.dms.push(dm); }
  dm.messages.push({ sender:req.user.id, sender_name:req.user.username, content:req.body.content, created_at:Date.now() });
  saveDB();
  io.to(`dm-${toId}`).emit('dm',{ sender:req.user.username, content:req.body.content });
  res.json({ success:true });
});

// --- Admin ---
app.get('/api/admin/users', authMiddleware, (req,res)=>{
  if (!isAdmin(req.user)) return res.status(403).json({ error:'Forbidden' });
  res.json({ users: db.users });
});
app.post('/api/admin/delete/:id', authMiddleware, (req,res)=>{
  if (!isAdmin(req.user)) return res.status(403).json({ error:'Forbidden' });
  db.users = db.users.filter(u=>u.id!==parseInt(req.params.id)); saveDB(); res.json({ success:true });
});
app.post('/api/admin/ban/:id', authMiddleware, (req,res)=>{
  if (!isAdmin(req.user)) return res.status(403).json({ error:'Forbidden' });
  const u = db.users.find(u=>u.id===parseInt(req.params.id)); if(u) u.banned=true; saveDB(); res.json({ success:true });
});
app.post('/api/admin/warn/:id', authMiddleware, (req,res)=>{
  if (!isAdmin(req.user)) return res.status(403).json({ error:'Forbidden' });
  const u = db.users.find(u=>u.id===parseInt(req.params.id)); if(u) { u.warnings=(u.warnings||0)+1; saveDB(); }
  res.json({ success:true });
});

// --- Socket.IO ---
io.on('connection', socket => {
  socket.on('joinChannel', channelId => socket.join(`channel-${channelId}`));
  socket.on('message', ({ channelId, userId, username, content }) => {
    const channel = db.channels.find(c=>c.id===channelId);
    if (!channel) return;
    const msg = { username, content, created_at:Date.now() };
    channel.messages.push(msg);
    saveDB();
    io.to(`channel-${channelId}`).emit('message', msg);
  });
  socket.on('joinDM', userId => socket.join(`dm-${userId}`));
});

// --- Start server ---
server.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
