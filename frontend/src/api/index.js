const API_BASE = import.meta.env.DEV
    ? 'http://localhost:8080/'
    : ''

export async function getPartNames() {
    const res = await fetch(`${API_BASE}api/part-names`);
    if (!res.ok) throw new Error("Failed to load part names");
    return res.json();
}

export async function createPart(partData) {
    const res = await fetch(`${API_BASE}api/part-names`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partData)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create part');
    }
    return res.json();
}

export async function getSensorGroups() {
    const res = await fetch(`${API_BASE}api/sensor-groups?includeSensors=true`);
    if (!res.ok) throw new Error("Failed to load sensor groups");
    return res.json();
}

// Create session
export async function createSession(sessionData) {
    const res = await fetch(`${API_BASE}api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create session');
    }
    return res.json();
}

// Get all sessions
export async function getSessions(includeParts = false, includeLogs = false) {
    const params = new URLSearchParams();
    if (includeParts) params.append('includeParts', 'true');
    if (includeLogs) params.append('includeLogs', 'true');

    const res = await fetch(`${API_BASE}api/sessions?${params}`);
    if (!res.ok) throw new Error('Failed to load sessions');
    return res.json();
}

// Get a single session by ID
export async function getSessionById(id) {
    const res = await fetch(`${API_BASE}api/sessions/${id}`);
    if (!res.ok) throw new Error('Session not found');
    return res.json();
}

// Update a session (full or partial)
export async function updateSession(id, data) {
    const res = await fetch(`${API_BASE}api/sessions/${id}`, {
        method: 'PATCH', // change PUT to PATCH
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update session');
    }
    return res.json();
}

export async function getLogs(params = {}) {
    const query = new URLSearchParams();
    if (params.sessionId) query.append('sessionId', params.sessionId);
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    if (params.partId) query.append('partId', params.partId);

    const res = await fetch(`${API_BASE}api/logs?${query}`);
    if (!res.ok) throw new Error('Failed to load logs');
    return res.json();
}
