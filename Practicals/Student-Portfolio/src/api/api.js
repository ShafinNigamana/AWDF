const BASE_URL = 'http://localhost:5000';
const TOKEN_KEY = 'task-manager-token';

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('auth-expired'));
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'The server request failed.');
  }

  return data;
}

export function getTasks(signal) {
  return request('/tasks', { signal });
}

export function createTask(task) {
  return request('/tasks', { method: 'POST', body: JSON.stringify(task) });
}

export function updateTask(id, task) {
  return request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) });
}

export function deleteTask(id) {
  return request(`/tasks/${id}`, { method: 'DELETE' });
}

export function register(email, password) {
  return request('/register', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function login(email, password) {
  const data = await request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setToken(data.token);
  return data;
}

export function getMe() {
  return request('/me');
}