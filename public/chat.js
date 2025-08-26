const params = new URLSearchParams(location.search);
const serverId = params.get('id');
const serverName = params.get('name');
document.getElementById('server-name').textContent = serverName;

const socket = io();
let currentChannel = null;

async function loadChannels(serverId) {
  const res = await API(`/api/servers/${serverId}/channels`);
  const data = await res.json();
  const channelsDiv = document.getElementById('channels');
  channelsDiv.innerHTML = '';
  data.channels.forEach(c => {
    const btn = document.createElement('button');
    btn.textContent = c.name;
    btn.onclick = () => joinChannel(c.id, c.name);
    channelsDiv.appendChild(btn);
  });
}

function joinChannel(id, name) {
  currentChannel = id;
  document.getElementById('currentServer').textContent = name;
  document.getElementById('chatMessages').innerHTML = '';
  socket.emit('joinChannel', id);
  loadMessages(id);
}

async function loadMessages(channelId) {
  const res = await API(`/api/channels/${channelId}/messages`);
  const data = await res.json();
  const chat = document.getElementById('chatMessages');
  chat.innerHTML = '';
  data.messages.forEach(m => addMessage(m.username, m.content));
}

document.getElementById('btnSend').onclick = () => {
  const input = document.getElementById('chatInputBox');
  if (!currentChannel || !input.value) return;
  socket.emit('message', { channelId: currentChannel, userId: me.id, username: me.username, content: input.value });
  input.value = '';
};

socket.on('message', m => { if (m.channelId===currentChannel) addMessage(m.username,m.content); });
function addMessage(u,c){ const d=document.createElement('div'); d.textContent=`${u}: ${c}`; document.getElementById('chatMessages').appendChild(d); }
// Display messages with timestamp
function addMessage(username, content, timestamp = Date.now()) {
  const chat = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.classList.add('message');
  div.innerHTML = `<strong>${username}</strong>: ${content} <span class="timestamp">${new Date(timestamp).toLocaleTimeString()}</span>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Load DM list
async function loadDMs() {
  const res = await API('/api/servers'); // You can use a /friends API later
  const dmList = document.getElementById('dmList');
  dmList.innerHTML = '';
  res.json().then(data => {
    data.servers?.forEach(u => { // temporary for demo
      const div = document.createElement('div');
      div.classList.add('dmFriend');
      div.textContent = u.name || u.username;
      const status = document.createElement('div');
      status.classList.add('online'); // assume all online for now
      div.appendChild(status);
      div.onclick = () => openDM(u.id, u.username);
      dmList.appendChild(div);
    });
  });
}

let currentDM = null;
function openDM(userId, username) {
  currentDM = userId;
  document.getElementById('chatMessages').innerHTML = '';
  fetch(`/api/dms/${userId}`, { headers: { 'Authorization': 'Bearer ' + token } })
    .then(r => r.json()).then(data => data.messages.forEach(m => addMessage(m.sender_name, m.content, m.created_at)));
}

// Send message to DM
document.getElementById('btnSend').onclick = () => {
  const input = document.getElementById('chatInputBox');
  if (currentChannel) {
    socket.emit('message', { channelId: currentChannel, userId: me.id, username: me.username, content: input.value });
  } else if (currentDM) {
    API(`/api/dms/${currentDM}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({content: input.value})});
    addMessage(me.username, input.value);
  }
  input.value = '';
};

// Socket.io receive DM
socket.on('dm', ({ sender, content }) => {
  if (currentDM) addMessage(sender, content);
});

loadDMs();
