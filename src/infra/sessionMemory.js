const sessions = new Map();

export function setSession(userId, data, ttl = 300000) {
  clearTimeout(sessions.get(userId)?.timeout);
  const timeout = setTimeout(() => sessions.delete(userId), ttl);
  sessions.set(userId, { ...data, timeout });
}

export function getSession(userId) {
  const session = sessions.get(userId);
  if (!session) return null;
  const { timeout, ...publicData } = session;
  return { ...publicData };
}

export function clearSession(userId) {
  const session = sessions.get(userId);
  if (session) clearTimeout(session.timeout);
  sessions.delete(userId);
}