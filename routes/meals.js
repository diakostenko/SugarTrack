import express from 'express';
import { Meal } from '../models/Meal.js';
import { WaterIntake } from '../models/WaterIntake.js';
import { Product } from '../models/Product.js';
import { requireAuth, requireUserType } from '../middleware/auth.js';

const router = express.Router();

function getDayRange(dateValue) {
    const [year, month, day] = String(dateValue || '').split('-').map(Number);

    if (!year || !month || !day) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return { startOfDay: start, endOfDay: end };
    }

    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { startOfDay, endOfDay };
}

// Получить все приёмы пищи за день
router.get('/day/:date', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        const { startOfDay, endOfDay } = getDayRange(req.params.date);

        const meals = await Meal.find({
            userId: req.user.userId,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ time: 1 });

        const water = await WaterIntake.findOne({
            userId: req.user.userId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        const totals = {
            calories: meals.reduce((sum, m) => sum + (m.totalCalories || 0), 0),
            carbs: meals.reduce((sum, m) => sum + (m.totalCarbs || 0), 0),
            protein: meals.reduce((sum, m) => sum + (m.totalProtein || 0), 0),
            fat: meals.reduce((sum, m) => sum + (m.totalFat || 0), 0)
        };

        return res.json({
            meals,
            water: water || { glasses: 0, amount: 0 },
            totals
        });
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать новый приём пищи
router.post('/', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        const { date, mealType, time, foods } = req.body;

        const meal = new Meal({
            userId: req.user.userId,
            date: new Date(date),
            mealType,
            time,
            foods: foods || []
        });

        await meal.save();
        return res.json(meal);
    } catch (error) {
        console.error('Ошибка создания приёма пищи:', error);
        return res.status(500).json({ error: 'Ошибка при создании приёма пищи' });
    }
});

// ДОБАВЬ ЭТОТ РОУТ СЮДА
// Добавить продукт в приём пищи (с автоматическим созданием приёма)
router.post('/add-food', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        const { date, mealType, time, food } = req.body;

        console.log('Получен запрос на добавление:', { date, mealType, time, food });

        if (!date || !mealType || !food) {
            console.error('Не все данные переданы');
            return res.status(400).json({ error: 'Не все данные переданы' });
        }

        const { startOfDay, endOfDay } = getDayRange(date);

        // Ищем существующий приём пищи
        let meal = await Meal.findOne({
            userId: req.user.userId,
            date: { $gte: startOfDay, $lte: endOfDay },
            mealType: mealType
        });

        // Если не найден - создаём новый
        if (!meal) {
            console.log('Приём пищи не найден, создаём новый');
            meal = new Meal({
                userId: req.user.userId,
                date: startOfDay,
                mealType: mealType,
                time: time || '12:00',
                foods: []
            });
        }

        // Добавляем продукт
        meal.foods.push(food);
        await meal.save();

        console.log('Продукт успешно добавлен:', meal);

        return res.json(meal);
    } catch (error) {
        console.error('Ошибка добавления продукта:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Добавить продукт в приём пищи (старый роут, можно оставить для совместимости)
router.post('/:mealId/food', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        const meal = await Meal.findOne({
            _id: req.params.mealId,
            userId: req.user.userId
        });

        if (!meal) {
            return res.status(404).json({ error: 'Приём пищи не найден' });
        }

        meal.foods.push(req.body);
        await meal.save();

        return res.json(meal);
    } catch (error) {
        console.error('Ошибка добавления продукта:', error);
        return res.status(500).json({ error: 'Ошибка при добавлении продукта' });
    }
});

// Удалить продукт из приёма пищи
router.delete('/:mealId/food/:foodId', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        const meal = await Meal.findOne({
            _id: req.params.mealId,
            userId: req.user.userId
        });

        if (!meal) {
            return res.status(404).json({ error: 'Приём пищи не найден' });
        }

        meal.foods = meal.foods.filter(f => f._id.toString() !== req.params.foodId);
        await meal.save();

        return res.json(meal);
    } catch (error) {
        console.error('Ошибка удаления продукта:', error);
        return res.status(500).json({ error: 'Ошибка при удалении продукта' });
    }
});

// Удалить приём пищи
router.delete('/:mealId', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        await Meal.findOneAndDelete({
            _id: req.params.mealId,
            userId: req.user.userId
        });

        return res.json({ message: 'Приём пищи удалён' });
    } catch (error) {
        console.error('Ошибка удаления приёма пищи:', error);
        return res.status(500).json({ error: 'Ошибка при удалении' });
    }
});

// Поиск продуктов в СВОЕЙ базе данных
router.get('/search', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim().length < 2) {
            return res.json([]);
        }

        const searchQuery = query.trim();

        // Поиск по русскому И английскому названию (регистронезависимый)
        const products = await Product.find({
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { nameEn: { $regex: searchQuery, $options: 'i' } }
            ]
        })
            .limit(20)
            .lean();

        // Преобразуем в формат для фронтенда
        const formattedProducts = products.map(p => ({
            _id: p._id,
            barcode: '',
            name: p.name,
            nameEn: p.nameEn,
            brand: '',
            image: '',
            category: p.category,
            source: 'local',
            per100g: p.per100g
        }));

        console.log(`Найдено продуктов: ${formattedProducts.length}`);
        return res.json(formattedProducts);
    } catch (error) {
        console.error('Ошибка поиска продуктов:', error);
        return res.status(500).json({ error: 'Ошибка при поиске продуктов' });
    }
});

// Получить все продукты (опционально, для отладки)
router.get('/products/all', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        const products = await Product.find().limit(100).lean();
        return res.json(products);
    } catch (error) {
        console.error('Ошибка получения продуктов:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить продукт по ID
router.get('/products/:id', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Продукт не найден' });
        }

        return res.json({
            _id: product._id,
            name: product.name,
            nameEn: product.nameEn,
            category: product.category,
            per100g: product.per100g
        });
    } catch (error) {
        console.error('Ошибка получения продукта:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вода - получить за день
router.get('/water/:date', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        const { startOfDay, endOfDay } = getDayRange(req.params.date);

        let water = await WaterIntake.findOne({
            userId: req.user.userId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!water) {
            water = new WaterIntake({
                userId: req.user.userId,
                date: startOfDay,
                glasses: 0,
                amount: 0
            });
            await water.save();
        }

        return res.json(water);
    } catch (error) {
        console.error('Ошибка получения воды:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вода - добавить стакан
router.post('/water/:date/add', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        const { startOfDay, endOfDay } = getDayRange(req.params.date);

        let water = await WaterIntake.findOne({
            userId: req.user.userId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!water) {
            water = new WaterIntake({
                userId: req.user.userId,
                date: startOfDay,
                glasses: 1,
                amount: 250
            });
        } else {
            water.glasses += 1;
            water.amount += 250;
        }

        await water.save();
        return res.json(water);
    } catch (error) {
        console.error('Ошибка добавления воды:', error);
        return res.status(500).json({ error: 'Ошибка при добавлении воды' });
    }
});

// Вода - убрать стакан
router.post('/water/:date/remove', requireAuth, requireUserType('diabetes'), async (req, res) => {
    try {
        const { startOfDay, endOfDay } = getDayRange(req.params.date);

        const water = await WaterIntake.findOne({
            userId: req.user.userId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (water && water.glasses > 0) {
            water.glasses -= 1;
            water.amount -= 250;
            await water.save();
        }

        return res.json(water || { glasses: 0, amount: 0 });
    } catch (error) {
        console.error('Ошибка удаления воды:', error);
        return res.status(500).json({ error: 'Ошибка при удалении воды' });
    }
});

export default router;