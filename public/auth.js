document.getElementById('btn-login').onclick = async () => {
  const emailOrUsername = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const res = await API('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername, password })
  });
  const data = await res.json();
  if (data.token) {
    setToken(data.token);
    location.href = 'dashboard.html';
  } else alert(data.error);
};

document.getElementById('btn-signup').onclick = async () => {
  const username = document.getElementById('signup-username').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const res = await API('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  if (data.token) {
    setToken(data.token);
    location.href = 'dashboard.html';
  } else alert(data.error);
};
