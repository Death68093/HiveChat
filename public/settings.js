async function loadSettings() {
  const res = await API('/api/me');
  const data = await res.json();
  document.getElementById('username').value = data.user.username;
  document.getElementById('email').value = data.user.email;
}

document.getElementById('saveSettings').onclick = async () => {
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  await API('/api/me', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,email,password})});
  alert('Saved');
};

loadSettings();
