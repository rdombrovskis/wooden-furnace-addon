const express = require('express');
const router = express.Router();
const prisma = require('../client');


router.get('/', async (req, res) => {
    try {
        const { sessionId, from, to, partId, sensorId } = req.query;

        // sessionId обязателен
        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required' });
        }

        const where = {
            sessionId: parseInt(sessionId),
        };

        // Фильтр по времени
        if (from || to) {
            where.timestamp = {};
            if (from) where.timestamp.gte = new Date(from);
            if (to) where.timestamp.lte = new Date(to);
        }

        // Фильтр по детали
        if (partId) {
            where.partId = parseInt(partId);
        }

        // Фильтр по датчику
        if (sensorId) {
            where.sensorId = parseInt(sensorId);
        }

        const logs = await prisma.log.findMany({
            where,
            include: {
                sensor: true,   // получаем Sensor (entityId, имя)
                part: {
                    include: {
                        partNames: true, // название детали
                        sensorGroup: true, // группа датчиков
                    },
                },
            },
            orderBy: {
                timestamp: 'asc',
            },
            take: 10000, // лимит на всякий случай
        });

        res.json(logs);
    } catch (err) {
        console.error('Error fetching logs:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
