const adminModal = document.getElementById('adminModal');
document.getElementById('btn-admin').onclick = async () => {
  adminModal.style.display = 'block';
  const res = await API('/api/admin/users');
  const data = await res.json();
  const tbody = adminModal.querySelector('tbody');
  tbody.innerHTML = '';
  data.users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.id}</td><td>${u.username}</td><td>${u.email}</td>
    <td>
      <button onclick="deleteUser(${u.id})">Delete</button>
      <button onclick="banUser(${u.id})">Ban</button>
      <button onclick="warnUser(${u.id})">Warn</button>
    </td>`;
    tbody.appendChild(tr);
  });
};
document.getElementById('closeAdmin').onclick = () => adminModal.style.display = 'none';

async function deleteUser(id) { await API(`/api/admin/delete/${id}`, { method: 'POST' }); alert('Deleted'); }
async function banUser(id) { const reason = prompt('Reason?'); await API(`/api/admin/ban/${id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({reason})}); alert('Banned'); }
async function warnUser(id) { const reason = prompt('Reason?'); await API(`/api/admin/warn/${id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({reason})}); alert('Warned'); }
