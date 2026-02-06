const express = require('express');
const router = express.Router();
const prisma = require('./../client');
const state = require('./../state');

// Helpers
function parseBool(v) {
    if (v === undefined || v === null) return false;
    return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function safeParseInt(v) {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
}

router.post('/', async (req, res) => {
    try {
        const { tag = `session_${Date.now()}`, parts } = req.body;

        if (!Array.isArray(parts) || parts.length === 0) {
            return res.status(400).json({ error: 'Parts array is required and cannot be empty' });
        }

        // validate parts items
        const validatedParts = parts.map((p, i) => {
            const partNamesId = safeParseInt(p.partNamesId ?? p.partNameId);
            const sensorGroupId = safeParseInt(p.sensorGroupId ?? p.sensorGroup);
            if (!partNamesId || !sensorGroupId) {
                throw { status: 400, message: `Invalid part at index ${i}: partNamesId and sensorGroupId are required and must be integers` };
            }
            return { partNamesId, sensorGroupId };
        });

        const session = await prisma.session.create({
            data: {
                tag,
                stateId: 1, // CREATED
                parts: {
                    create: validatedParts.map(p => ({
                        partNamesId: p.partNamesId,
                        sensorGroupId: p.sensorGroupId,
                    })),
                },
            },
            include: { parts: true, state: true },
        });

        res.status(201).json(session);
    } catch (err) {
        if (err && err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Session with this tag already exists' });
        }
        // Проверка на существование partNameId/sensorGroupId
        if (err.code === 'P2003') {
            return res.status(400).json({ error: 'Invalid partNameId or sensorGroupId' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/sessions — список всех сессий с опциональными include
router.get('/', async (req, res) => {
    try {
        const { includeParts, includeLogs, limit } = req.query;
        const take = Math.min(1000, Math.max(1, safeParseInt(limit) || 100)); // default 100, cap 1000
        const sessions = await prisma.session.findMany({
            orderBy: { createdAt: 'desc' },
            take,
            include: {
                state: true, // всегда включаем статус
                parts: parseBool(includeParts) ? {
                    include: {
                        partNames: true,
                        sensorGroup: true,
                    },
                } : false,
                logs: parseBool(includeLogs) ? {
                    take: 50, // лимит логов, чтобы не перегружать
                    orderBy: { timestamp: 'desc' },
                } : false,
            },
        });
        res.json(sessions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/sessions/:id — конкретная сессия
router.get('/:id', async (req, res) => {
    try {
        const id = safeParseInt(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid session id' });

        const session = await prisma.session.findUnique({
            where: { id },
            include: {
                state: true,
                parts: {
                    include: {
                        partNames: true,
                        sensorGroup: {
                            include: {
                                sensors: true, // все датчики группы
                            },
                        },
                    },
                },
                logs: {
                    orderBy: { timestamp: 'desc' },
                    take: 100,
                },
            },
        });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json(session);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const id = safeParseInt(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid session id' });

        const { tag, stateId, startTime, endTime } = req.body;
        const data = {};
        if (tag !== undefined) data.tag = String(tag);
        if (stateId !== undefined) {
            const sid = safeParseInt(stateId);
            if (!sid) return res.status(400).json({ error: 'Invalid stateId' });
            data.stateId = sid;
        }
        if (startTime !== undefined) {
            if (Number.isNaN(Date.parse(startTime))) return res.status(400).json({ error: 'Invalid startTime' });
            data.startTime = new Date(startTime);
        }
        if (endTime !== undefined) {
            if (Number.isNaN(Date.parse(endTime))) return res.status(400).json({ error: 'Invalid endTime' });
            data.endTime = new Date(endTime);
        }

        const session = await prisma.session.update({
            where: { id },
            data,
        });

        // Синхронизируем state.js
        if (stateId === 2) { // IN_PROGRESS
            // Добавляем сессию в активные
            await state.addSession(id);
        } else if (stateId === 3 || stateId === 4) { // STOPPED или COMPLETED
            // Удаляем из активных
            state.removeSession(id);
        }

        res.json(session);
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Session not found' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;