const express = require('express');
const router = express.Router();
const prisma = require('./../client');


router.get('/', async (req, res) => {
    try {
        const partNames = await prisma.partName.findMany({
            orderBy: { name: 'asc' },
        });
        res.status(200).json(partNames);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.get('/:id', async (req, res) => {
    console.log(req.params);
    try {
        const partName = await prisma.partName.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { part: true }, // опционально: показать все экземпляры деталей с этим именем
        });
        if (!partName) {
            return res.status(404).json({ error: 'PartName not found' });
        }
        res.json(partName);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Name is required' });
        }
        const partName = await prisma.partName.create({
            data: { name: name.trim() },
        });
        res.status(201).json(partName);
    } catch (err) {
        // Если имя уже существует (уникальное поле), Prisma выбросит ошибку
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'PartName already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});


router.put('/:id', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Name is required' });
        }
        const partName = await prisma.partName.update({
            where: { id: parseInt(req.params.id) },
            data: { name: name.trim() },
        });
        res.json(partName);
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'PartName not found' });
        }
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'PartName already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});


router.delete('/:id', async (req, res) => {
    try {
        // Проверяем, есть ли связанные Part
        const partName = await prisma.partName.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { part: true },
        });
        if (!partName) {
            return res.status(404).json({ error: 'PartName not found' });
        }
        if (partName.part.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete PartName: it is used in existing parts',
            });
        }
        await prisma.partName.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.status(204).send(); // No Content
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;