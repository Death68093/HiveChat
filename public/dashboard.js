async function loadMe() {
  const res = await API('/api/me');
  const data = await res.json();
  document.getElementById('me').textContent = data.user.username;
  if (data.isOwner) document.getElementById('btn-admin').classList.remove('hidden');
}

async function loadServers() {
  const res = await API('/api/servers');
  const data = await res.json();
  const div = document.getElementById('servers');
  div.innerHTML = '';
  data.servers.forEach(s => {
    const btn = document.createElement('button');
    btn.textContent = s.name;
    btn.onclick = () => {
      location.href = `server.html?id=${s.id}&name=${encodeURIComponent(s.name)}`;
    };
    div.appendChild(btn);
  });
}

document.getElementById('btn-logout').onclick = () => {
  setToken(null);
  location.href = 'index.html';
};

document.getElementById('btn-create-server').onclick = async () => {
  const name = document.getElementById('new-server').value;
  await API('/api/servers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  loadServers();
};

document.getElementById('btn-admin').onclick = async () => {
  const res = await API('/api/admin/users');
  const data = await res.json();
  document.getElementById('admin').textContent = JSON.stringify(data.users, null, 2);
};

loadMe();
loadServers();
