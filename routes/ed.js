import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { User } from '../models/user.js';
import { Quote } from '../models/quote.js';
import { requireAuth, requireUserType } from '../middleware/auth.js';

const router = express.Router();
const staticDir = path.join(process.cwd(), 'public', 'ed');

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

router.use(requireAuth, requireUserType('ed'));

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
        console.error(error);
        return res.status(500).json({ message: 'Ошибка загрузки цитаты' });
    }
});

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
        console.error(error);
        return res.redirect('/auth/login');
    }
});

router.use(express.static(staticDir));

export default router;




