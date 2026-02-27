import { randomUUID } from 'node:crypto';

export class InMemoryAuthStore {
  constructor() {
    this.usersById = new Map();
    this.userIdByEmail = new Map();
    this.sessionsById = new Map();
    this.sessionIdByTokenHash = new Map();
  }

  createUser({ fullName, email, passwordHash }) {
    const normalizedEmail = email.trim().toLowerCase();
    if (this.userIdByEmail.has(normalizedEmail)) {
      return null;
    }

    const user = {
      id: randomUUID(),
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    this.usersById.set(user.id, user);
    this.userIdByEmail.set(normalizedEmail, user.id);
    return user;
  }

  findUserByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const id = this.userIdByEmail.get(normalizedEmail);
    return id ? this.usersById.get(id) || null : null;
  }

  findUserById(id) {
    return this.usersById.get(id) || null;
  }

  createSession({ userId, tokenHash, expiresAt }) {
    const session = {
      id: randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
      createdAt: new Date().toISOString()
    };

    this.sessionsById.set(session.id, session);
    this.sessionIdByTokenHash.set(tokenHash, session.id);
    return session;
  }

  findSessionByTokenHash(tokenHash) {
    const id = this.sessionIdByTokenHash.get(tokenHash);
    return id ? this.sessionsById.get(id) || null : null;
  }

  revokeSession(sessionId) {
    const session = this.sessionsById.get(sessionId);
    if (!session || session.revokedAt) {
      return;
    }
    session.revokedAt = new Date().toISOString();
  }
}
