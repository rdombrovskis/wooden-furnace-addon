const prisma = require('./client');

class SessionState {
    constructor() {
        this.activeSessions = new Map(); // sessionId -> { session, sensorsCache }
    }

    // Add/activate session
    async addSession(sessionId) {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                parts: {
                    include: {
                        sensorGroup: {
                            include: {
                                sensors: true,
                            },
                        },
                    },
                },
            },
        });

        if (!session) {
            throw new Error(`Session with ID ${sessionId} not found`);
        }

        const sensorsCache = new Map();
        for (const part of session.parts) {
            if (!part.sensorGroup?.sensors) continue;
            for (const sensor of part.sensorGroup.sensors) {
                sensorsCache.set(sensor.entityId, {
                    sessionId: session.id,
                    partId: part.id,
                    sensorId: sensor.id,
                    groupName: part.sensorGroup.name,
                    partName: part.name,
                });
            }
        }

        this.activeSessions.set(sessionId, {
            session,
            sensorsCache,
        });

        console.log(`[STATE] Session added: ${session.tag} (${session.id}), sensors: ${sensorsCache.size}`);
    }

    // Remove session from active
    removeSession(sessionId) {
        if (this.activeSessions.delete(sessionId)) {
            console.log(`[STATE] Session ${sessionId} removed from active`);
        }
    }

    // Restore all IN_PROGRESS sessions on startup
    async restoreActiveSessions() {
        const sessions = await prisma.session.findMany({
            where: {
                state: {
                    name: 'IN PROGRESS',
                },
            },
            include: {
                parts: {
                    include: {
                        sensorGroup: {
                            include: {
                                sensors: true,
                            },
                        },
                    },
                },
            },
        });

        for (const session of sessions) {
            const sensorsCache = new Map();
            for (const part of session.parts) {
                if (!part.sensorGroup?.sensors) continue;
                for (const sensor of part.sensorGroup.sensors) {
                    sensorsCache.set(sensor.entityId, {
                        sessionId: session.id,
                        partId: part.id,
                        sensorId: sensor.id,
                        groupName: part.sensorGroup.name,
                        partName: part.name,
                    });
                }
            }
            this.activeSessions.set(session.id, { session, sensorsCache });
            console.log(`[STATE] Restored session: ${session.tag} (${session.id})`);
        }

        console.log(`[STATE] Total active sessions: ${this.activeSessions.size}`);
    }

    // Get sensor info (first match among all active sessions)
    getSensorInfo(entityId) {
        for (const { sensorsCache } of this.activeSessions.values()) {
            const info = sensorsCache.get(entityId);
            if (info) return info;
        }
        return null;
    }

    // Get all active sessions
    getAllActiveSessions() {
        return Array.from(this.activeSessions.values()).map(entry => entry.session);
    }

    // Check if a specific session is active
    isSessionActive(sessionId) {
        return this.activeSessions.has(sessionId);
    }

    // Clear all active sessions
    clearAllSessions() {
        this.activeSessions.clear();
        console.log('[STATE] All active sessions cleared');
    }
}

module.exports = new SessionState();
