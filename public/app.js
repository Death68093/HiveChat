function token() {
  return localStorage.getItem('token');
}

function setToken(t) {
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

async function API(path, opts = {}) {
  opts.headers = opts.headers || {};
  if (token()) opts.headers.Authorization = 'Bearer ' + token();
  return fetch(path, opts);
}
