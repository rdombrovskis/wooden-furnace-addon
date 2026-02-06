const express = require('express');
const router = express.Router();
const prisma = require('./../client');

// GET /api/sensor-groups — все группы с опциональным include сенсоров
router.get('/', async (req, res) => {
    try {
        const { includeSensors } = req.query; // ?includeSensors=true
        const groups = await prisma.sensorGroup.findMany({
            orderBy: { name: 'asc' },
            include: {
                sensors: includeSensors === 'true',
                part: true, // если нужно увидеть, к какой детали привязана
            },
        });
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/sensor-groups/:id — одна группа по ID
router.get('/:id', async (req, res) => {
    try {
        const group = await prisma.sensorGroup.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                sensors: true,
                part: true,
            },
        });
        if (!group) {
            return res.status(404).json({ error: 'SensorGroup not found' });
        }
        res.json(group);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sensor-groups — создать группу (без сенсоров, они добавляются отдельно)
router.post('/', async (req, res) => {
    try {
        const { name, version } = req.body; // version = хэш состава
        if (!name || !version) {
            return res.status(400).json({ error: 'Name and version are required' });
        }
        const group = await prisma.sensorGroup.create({
            data: {
                name: name.trim(),
                version: version.trim(),
            },
        });
        res.status(201).json(group);
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'SensorGroup with this name+version already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/sensor-groups/:id — обновить группу (только name, version)
router.put('/:id', async (req, res) => {
    try {
        const { name, version } = req.body;
        if (!name || !version) {
            return res.status(400).json({ error: 'Name and version are required' });
        }
        const group = await prisma.sensorGroup.update({
            where: { id: parseInt(req.params.id) },
            data: {
                name: name.trim(),
                version: version.trim(),
            },
        });
        res.json(group);
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'SensorGroup not found' });
        }
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'SensorGroup with this name+version already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/sensor-groups/:id — удалить группу, если нет привязанных сенсоров и деталей
router.delete('/:id', async (req, res) => {
    try {
        const group = await prisma.sensorGroup.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                sensors: true,
                part: true,
            },
        });
        if (!group) {
            return res.status(404).json({ error: 'SensorGroup not found' });
        }
        if (group.sensors.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete SensorGroup: it has sensors attached',
            });
        }
        if (group.part) {
            return res.status(400).json({
                error: 'Cannot delete SensorGroup: it is used by a part',
            });
        }
        await prisma.sensorGroup.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sensor-groups/:id/sensors — добавить сенсоры в группу
router.post('/:id/sensors', async (req, res) => {
    try {
        const { entityIds } = req.body; // массив entityId
        if (!Array.isArray(entityIds)) {
            return res.status(400).json({ error: 'entityIds must be an array' });
        }
        const group = await prisma.sensorGroup.findUnique({
            where: { id: parseInt(req.params.id) },
        });
        if (!group) {
            return res.status(404).json({ error: 'SensorGroup not found' });
        }
        // Создаём или находим сенсоры и привязываем к группе
        const sensors = await Promise.all(
            entityIds.map(entityId =>
                prisma.sensor.upsert({
                    where: { entityId },
                    update: { groupId: group.id }, // если сенсор уже есть — привязываем к этой группе
                    create: { entityId, groupId: group.id },
                })
            )
        );
        res.status(201).json(sensors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/sensor-groups/:id/sensors/:sensorId — отвязать сенсор от группы
router.delete('/:id/sensors/:sensorId', async (req, res) => {
    try {
        // Проверяем, что сенсор принадлежит этой группе
        const sensor = await prisma.sensor.findFirst({
            where: {
                id: parseInt(req.params.sensorId),
                groupId: parseInt(req.params.id),
            },
        });
        if (!sensor) {
            return res.status(404).json({ error: 'Sensor not found in this group' });
        }
        // Отвязываем сенсор (устанавливаем groupId = null)
        await prisma.sensor.update({
            where: { id: sensor.id },
            data: { groupId: null },
        });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
