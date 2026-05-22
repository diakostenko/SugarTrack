import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { User } from '../models/user.js';
import { Meal } from '../models/Meal.js';
import { Quote } from '../models/quote.js';
import { requireAuth, requireUserType } from '../middleware/auth.js';

const router = express.Router();
const staticDir = path.join(process.cwd(), 'public', 'ed');

// ═══════════════════════════════════════════════════════
// Вспомогательные функции
// ═══════════════════════════════════════════════════════

function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatDate(dateValue) {
    if (!dateValue) return 'Не указана';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Не указана';
    return date.toLocaleDateString('ru-RU');
}

function toValue(value) {
    if (value === null || value === undefined || value === '') return 'Не задано';
    return String(value);
}

function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeDateKey(dateValue) {
    const raw = String(dateValue || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return getTodayKey();
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDayRange(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { startOfDay, endOfDay };
}

function mapEdGoalValue(key, value) {
    if (!value) return null;
    if (key === 'emotionalGoal') {
        return {
            awareness: 'Повысить осознанность питания',
            balance: 'Найти баланс в питании',
            positive: 'Улучшить отношение к еде',
            control: 'Контролировать приступы'
        }[value] || value;
    }
    if (key === 'trackingFrequency') {
        return {
            daily: 'Ежедневно',
            weekly: 'Еженедельно',
            asNeeded: 'По необходимости'
        }[value] || value;
    }
    if (key === 'supportGoal') {
        return {
            community: 'Найти поддержку сообщества',
            'self-care': 'Развить навыки самопомощи',
            recovery: 'Работать над восстановлением'
        }[value] || value;
    }
    return value;
}

function mapEdInfoType(value) {
    return {
        anorexia: 'Анорексия',
        bulimia: 'Булимия',
        bed: 'Компульсивное переедание',
        other: 'Другое'
    }[value] || value;
}

function mapSupport(value) {
    return {
        professional: 'Под наблюдением специалиста',
        recovery: 'В процессе восстановления',
        self: 'Самостоятельная работа'
    }[value] || value;
}

function buildGoalCards(user) {
    const goals = [];
    if (user.edGoals?.emotionalGoal) {
        goals.push({ title: 'Эмоциональная цель', value: mapEdGoalValue('emotionalGoal', user.edGoals.emotionalGoal) });
    }
    if (user.edGoals?.trackingFrequency) {
        goals.push({ title: 'Частота отслеживания', value: mapEdGoalValue('trackingFrequency', user.edGoals.trackingFrequency) });
    }
    if (user.edGoals?.supportGoal) {
        goals.push({ title: 'Цель поддержки', value: mapEdGoalValue('supportGoal', user.edGoals.supportGoal) });
    }

    if (!goals.length) {
        return '<div class="profile-empty">Цели не заполнены</div>';
    }

    return goals.map((goal) => `
        <div class="profile-card profile-card-goal">
            <div class="profile-card-label">${esc(goal.title)}</div>
            <div class="profile-card-value">${esc(goal.value)}</div>
        </div>
    `).join('');
}

function buildFactCards(user) {
    const moodStatus = user.edActual?.moodStatus ?? '';
    const diaryFrequency = user.edActual?.diaryFrequency ?? '';

    return `
        <div class="profile-card profile-card-fact">
            <div class="profile-card-label">Текущее состояние</div>
            <input type="text" class="form-control profile-input" value="${esc(moodStatus)}" placeholder="Например, стабильно">
            <div class="profile-card-note">Изменяется пользователем</div>
        </div>
        <div class="profile-card profile-card-fact">
            <div class="profile-card-label">Текущая частота записей</div>
            <input type="text" class="form-control profile-input" value="${esc(diaryFrequency)}" placeholder="Например, ежедневно">
            <div class="profile-card-note">Изменяется пользователем</div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════
// Middleware для всех роутов
// ═══════════════════════════════════════════════════════

router.use(requireAuth, requireUserType('ed'));

// ═══════════════════════════════════════════════════════
// API: Случайная цитата
// ═══════════════════════════════════════════════════════

router.get('/api/quote', async (req, res) => {
    try {
        const [randomQuote] = await Quote.aggregate([{ $sample: { size: 1 } }]);
        if (!randomQuote) {
            return res.status(404).json({ message: 'Цитаты не найдены' });
        }

        return res.json({
            quote: randomQuote.quote,
            autor: randomQuote.autor
        });
    } catch (error) {
        console.error('Ошибка загрузки цитаты:', error);
        return res.status(500).json({ message: 'Ошибка загрузки цитаты' });
    }
});

// ═══════════════════════════════════════════════════════
// HTML: Профиль
// ═══════════════════════════════════════════════════════

router.get('/profile.html', async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).lean();
        if (!user) return res.redirect('/auth/login');

        const templatePath = path.join(staticDir, 'profile.html');
        let html = await fs.readFile(templatePath, 'utf8');

        html = html
            .replaceAll('{{USER_NAME}}', esc(user.name))
            .replaceAll('{{USER_EMAIL}}', esc(user.email))
            .replaceAll('{{USER_PHONE}}', esc(user.phone))
            .replaceAll('{{USER_BIRTH_DATE}}', esc(formatDate(user.birthDate)))
            .replaceAll('{{USER_TYPE_RU}}', 'рпп')
            .replaceAll('{{ED_INFO_TYPE}}', esc(toValue(mapEdInfoType(user.edInfo?.edType))))
            .replaceAll('{{ED_INFO_SUPPORT}}', esc(toValue(mapSupport(user.edInfo?.supportLevel))))
            .replaceAll('{{ED_INFO_TRIGGERS}}', esc(toValue(user.edInfo?.triggerWarnings === 'yes' ? 'Да' : user.edInfo?.triggerWarnings === 'no' ? 'Нет' : null)))
            .replaceAll('{{GOALS_CARDS}}', buildGoalCards(user))
            .replaceAll('{{FACT_CARDS}}', buildFactCards(user));

        return res.send(html);
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        return res.redirect('/auth/login');
    }
});

// ═══════════════════════════════════════════════════════
// API: Получить данные дня (эмоциональный дневник)
// ═══════════════════════════════════════════════════════

router.get('/api/day/:date', requireAuth, requireUserType('ed'), async (req, res) => {
    try {
        const dateKey = normalizeDateKey(req.params.date);
        const { startOfDay, endOfDay } = getDayRange(dateKey);

        const meals = await Meal.find({
            userId: req.user.userId,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        console.log('[DEBUG] Загруженные приёмы пищи:', meals); // ← Добавь это

        return res.json({
            date: dateKey,
            meals: meals.map(meal => ({
                _id: meal._id,
                mealType: meal.mealType,
                time: meal.time,
                note: meal.note || '',
                moodRating: meal.moodRating || null,
                foods: meal.foods || []
            }))
        });
    } catch (error) {
        console.error('Ошибка загрузки дня:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ═══════════════════════════════════════════════════════
// API: Сохранить/обновить приём пищи
// ═══════════════════════════════════════════════════════


router.post('/api/save-meal', requireAuth, requireUserType('ed'), async (req, res) => {
    try {
        const { date, mealType, rating, note } = req.body;

        if (!date || !mealType || !rating) {
            return res.status(400).json({ error: 'Не указаны обязательные поля' });
        }

        const dateKey = normalizeDateKey(date);
        const { startOfDay, endOfDay } = getDayRange(dateKey);

        const mealTimes = {
            breakfast: '07:30',
            lunch: '13:00',
            dinner: '19:00',
            snacks: '16:30'
        };

        let meal = await Meal.findOne({
            userId: req.user.userId,
            mealType: mealType,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (meal) {
            meal.moodRating = rating;
            meal.note = note || '';
            await meal.save();
        } else {
            meal = new Meal({
                userId: req.user.userId,
                mealType: mealType,
                time: mealTimes[mealType] || '12:00',
                date: startOfDay,
                moodRating: rating,
                note: note || '',
                foods: []
            });
            await meal.save();
        }

        return res.json({
            success: true,
            meal: {
                _id: meal._id,
                mealType: meal.mealType,
                moodRating: meal.moodRating,
                note: meal.note
            }
        });
    } catch (error) {
        console.error('[ERROR] Ошибка сохранения приёма пищи:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ═══════════════════════════════════════════════════════
// API: Получить данные за последние 30 дней (для диаграммы)
// ═══════════════════════════════════════════════════════

router.get('/api/emotion-chart', requireAuth, requireUserType('ed'), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // Включая сегодня = 30 дней

        const meals = await Meal.find({
            userId: req.user.userId,
            date: { $gte: thirtyDaysAgo, $lte: today }
        }).lean();

        // Группируем по дням
        const dayMap = {};

        for (let i = 0; i < 30; i++) {
            const date = new Date(thirtyDaysAgo);
            date.setDate(date.getDate() + i);
            const key = normalizeDateKey(date);
            dayMap[key] = {
                breakfast: null,
                lunch: null,
                dinner: null,
                snacks: null
            };
        }

        // Заполняем данными
        meals.forEach(meal => {
            const key = normalizeDateKey(meal.date);
            if (dayMap[key] && meal.moodRating) {
                dayMap[key][meal.mealType] = meal.moodRating;
            }
        });

        return res.json({ days: dayMap });

    } catch (error) {
        console.error('Ошибка загрузки данных диаграммы:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Статистика за последние 7 дней
router.get('/api/weekly-stats', requireAuth, requireUserType('ed'), async (req, res) => {
    try {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const meals = await Meal.find({
            userId: req.user.userId,
            date: { $gte: weekAgo, $lte: now },
            moodRating: { $exists: true, $ne: null }
        });

        const stats = {
            total: meals.length,
            good: meals.filter(m => m.moodRating === 'good').length,
            normal: meals.filter(m => m.moodRating === 'normal').length,
            bad: meals.filter(m => m.moodRating === 'bad').length
        };

        return res.json(stats);
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.use(express.static(staticDir));

export default router;