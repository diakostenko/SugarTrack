import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { User } from '../models/user.js';
import { Product } from '../models/Product.js';
import { requireAuth, requireUserType } from '../middleware/auth.js';

const router = express.Router();
const staticDir = path.join(process.cwd(), 'public', 'diabetes');

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

function toValue(value, suffix = '') {
	if (value === null || value === undefined || value === '') return 'Не задано';
	return `${value}${suffix}`;
}

function buildGoalCards(user) {
	const goals = [];
	if (user.diabetesGoals?.targetGlucose !== null && user.diabetesGoals?.targetGlucose !== undefined) {
		goals.push({ title: 'Целевая глюкоза', value: `${user.diabetesGoals.targetGlucose} ммоль/л` });
	}
	if (user.diabetesGoals?.hba1cGoal !== null && user.diabetesGoals?.hba1cGoal !== undefined) {
		goals.push({ title: 'Целевой HbA1c', value: `${user.diabetesGoals.hba1cGoal} %` });
	}
	if (user.diabetesGoals?.weightGoal !== null && user.diabetesGoals?.weightGoal !== undefined) {
		goals.push({ title: 'Целевой вес', value: `${user.diabetesGoals.weightGoal} кг` });
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
	const weight = user.actualMetrics?.weight ?? '';
	const glucose = user.actualMetrics?.glucose ?? '';
	const hba1c = user.actualMetrics?.hba1c ?? '';
	const gender = user.actualMetrics?.gender ?? '';
	const height = user.actualMetrics?.height ?? '';
	const waist = user.actualMetrics?.waist ?? '';
	const hips = user.actualMetrics?.hips ?? '';
	const chest = user.actualMetrics?.chest ?? '';
	const arm = user.actualMetrics?.arm ?? '';

	const genderMaleSelected = gender === 'male' ? 'selected' : '';
	const genderFemaleSelected = gender === 'female' ? 'selected' : '';

	return `
		<div class="profile-card profile-card-fact">
			<div class="profile-card-label">Вес</div>
			<input type="number" class="profile-card-value-input" id="weight" value="${esc(weight)}" placeholder="0">
			<div class="profile-card-unit">кг</div>
		</div>
		
		<div class="profile-card profile-card-fact">
			<div class="profile-card-label">Глюкоза</div>
			<input type="number" class="profile-card-value-input" id="glucose" value="${esc(glucose)}" placeholder="0">
			<div class="profile-card-unit">ммоль/л</div>
		</div>
		
		<div class="profile-card profile-card-fact">
			<div class="profile-card-label">HbA1c</div>
			<input type="number" class="profile-card-value-input" id="hba1c" value="${esc(hba1c)}" placeholder="0">
			<div class="profile-card-unit">%</div>
		</div>
		
		<div class="profile-card profile-card-fact">
			<div class="profile-card-label">Пол</div>
			<select class="profile-card-value-input" id="gender">
				<option value="">Не указан</option>
				<option value="male" ${genderMaleSelected}>Мужской</option>
				<option value="female" ${genderFemaleSelected}>Женский</option>
			</select>
		</div>
		
		<div class="profile-card profile-card-fact">
			<div class="profile-card-label">Рост</div>
			<input type="number" class="profile-card-value-input" id="height" value="${esc(height)}" placeholder="0">
			<div class="profile-card-unit">см</div>
		</div>
		
		<div class="profile-card profile-card-fact">
			<div class="profile-card-label">Талия</div>
			<input type="number" class="profile-card-value-input" id="waist" value="${esc(waist)}" placeholder="0">
			<div class="profile-card-unit">см</div>
		</div>
		
		<div class="profile-card profile-card-fact">
			<div class="profile-card-label">Бёдра</div>
			<input type="number" class="profile-card-value-input" id="hips" value="${esc(hips)}" placeholder="0">
			<div class="profile-card-unit">см</div>
		</div>
		
		<div class="profile-card profile-card-fact">
			<div class="profile-card-label">Грудь</div>
			<input type="number" class="profile-card-value-input" id="chest" value="${esc(chest)}" placeholder="0">
			<div class="profile-card-unit">см</div>
		</div>
		
		<div class="profile-card profile-card-fact">
			<div class="profile-card-label">Рука</div>
			<input type="number" class="profile-card-value-input" id="arm" value="${esc(arm)}" placeholder="0">
			<div class="profile-card-unit">см</div>
		</div>
	`;
}

function calculateBMI(user) {
	const weight = user.actualMetrics?.weight;
	const height = user.actualMetrics?.height;

	if (!weight || !height || height === 0) {
		return { value: '—', category: 'Нет данных' };
	}

	const heightInMeters = height / 100;
	const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);

	let category;
	if (bmi < 16) category = 'Выраженный дефицит массы';
	else if (bmi < 18.5) category = 'Недостаточная масса';
	else if (bmi < 25) category = 'Норма';
	else if (bmi < 30) category = 'Избыточная масса';
	else if (bmi < 35) category = 'Ожирение 1 степени';
	else if (bmi < 40) category = 'Ожирение 2 степени';
	else category = 'Ожирение 3 степени';

	return { value: bmi, category };
}

router.use(requireAuth, requireUserType('diabetes'));

// API: Обновление метрик
router.put('/api/metrics', express.json(), async (req, res) => {
	try {
		const { weight, glucose, hba1c, gender, height, waist, hips, chest, arm } = req.body;

		console.log('Обновление метрик для пользователя:', req.user.userId);
		console.log('Данные:', req.body);

		const user = await User.findById(req.user.userId);

		if (!user) {
			return res.status(404).json({ error: 'Пользователь не найден' });
		}

		// Если actualMetrics нет - создаём пустой объект
		if (!user.actualMetrics) {
			user.actualMetrics = {};
		}

		// Обновляем только переданные поля
		if (weight !== undefined && weight !== null) user.actualMetrics.weight = weight;
		if (glucose !== undefined && glucose !== null) user.actualMetrics.glucose = glucose;
		if (hba1c !== undefined && hba1c !== null) user.actualMetrics.hba1c = hba1c;
		if (gender !== undefined && gender !== null) user.actualMetrics.gender = gender;
		if (height !== undefined && height !== null) user.actualMetrics.height = height;
		if (waist !== undefined && waist !== null) user.actualMetrics.waist = waist;
		if (hips !== undefined && hips !== null) user.actualMetrics.hips = hips;
		if (chest !== undefined && chest !== null) user.actualMetrics.chest = chest;
		if (arm !== undefined && arm !== null) user.actualMetrics.arm = arm;

		// Помечаем поле как изменённое (для вложенных объектов)
		user.markModified('actualMetrics');

		await user.save();

		console.log('Метрики успешно обновлены:', user.actualMetrics);

		const bmiData = calculateBMI(user);

		return res.json({
			message: 'Данные обновлены',
			actualMetrics: user.actualMetrics,
			bmi: bmiData.value,
			bmiCategory: bmiData.category
		});
	} catch (error) {
		console.error('Ошибка обновления метрик:', error);
		return res.status(500).json({ error: 'Ошибка сервера', details: error.message });
	}
});

// API: Сохранить вес
router.post('/api/weight', express.json(), async (req, res) => {
	try {
		const { weight, date } = req.body;

		if (!weight || weight <= 0) {
			return res.status(400).json({ error: 'Некорректное значение веса' });
		}

		const user = await User.findById(req.user.userId);
		if (!user) {
			return res.status(404).json({ error: 'Пользователь не найден' });
		}

		// Обновляем вес в actualMetrics
		if (!user.actualMetrics) {
			user.actualMetrics = {};
		}
		user.actualMetrics.weight = weight;
		user.markModified('actualMetrics');

		await user.save();

		console.log('Вес сохранён:', weight, 'для пользователя:', req.user.userId);

		return res.json({
			message: 'Вес сохранён',
			weight: user.actualMetrics.weight
		});
	} catch (error) {
		console.error('Ошибка сохранения веса:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

// API: Сохранить замеры тела
router.post('/api/body-measurements', express.json(), async (req, res) => {
	try {
		const { height, waist, hips, chest, arm } = req.body;

		const user = await User.findById(req.user.userId);
		if (!user) {
			return res.status(404).json({ error: 'Пользователь не найден' });
		}

		// Обновляем замеры в actualMetrics
		if (!user.actualMetrics) {
			user.actualMetrics = {};
		}

		if (height !== undefined && height !== null) user.actualMetrics.height = height;
		if (waist !== undefined && waist !== null) user.actualMetrics.waist = waist;
		if (hips !== undefined && hips !== null) user.actualMetrics.hips = hips;
		if (chest !== undefined && chest !== null) user.actualMetrics.chest = chest;
		if (arm !== undefined && arm !== null) user.actualMetrics.arm = arm;

		user.markModified('actualMetrics');
		await user.save();

		console.log('Замеры сохранены для пользователя:', req.user.userId);

		// Пересчитываем ИМТ
		const bmiData = calculateBMI(user);

		return res.json({
			message: 'Замеры сохранены',
			actualMetrics: user.actualMetrics,
			bmi: bmiData.value,
			bmiCategory: bmiData.category
		});
	} catch (error) {
		console.error('Ошибка сохранения замеров:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

// HTML: Профиль
router.get('/profile.html', async (req, res) => {
	try {
		const user = await User.findById(req.user.userId).lean();
		if (!user) return res.redirect('/auth/login');

		const bmiData = calculateBMI(user);

		// Функция для форматирования значений
		const formatMetric = (value, unit = '') => {
			if (value === null || value === undefined || value === '') return 'Не задано';
			return `${value}${unit}`;
		};

		// Форматирование пола
		let genderDisplay = 'Не указан';
		if (user.actualMetrics?.gender === 'male') genderDisplay = 'Мужской';
		if (user.actualMetrics?.gender === 'female') genderDisplay = 'Женский';

		const templatePath = path.join(staticDir, 'profile.html');
		let html = await fs.readFile(templatePath, 'utf8');
		html = html
			.replaceAll('{{USER_NAME}}', esc(user.name))
			.replaceAll('{{USER_EMAIL}}', esc(user.email))
			.replaceAll('{{USER_PHONE}}', esc(user.phone))
			.replaceAll('{{USER_BIRTH_DATE}}', esc(formatDate(user.birthDate)))
			.replaceAll('{{USER_TYPE_RU}}', 'диабет')
			.replaceAll('{{DIABETES_INFO_TYPE}}', esc(toValue(user.diabetesInfo?.diabetesType === 'type1' ? 'Тип 1' : user.diabetesInfo?.diabetesType === 'type2' ? 'Тип 2' : user.diabetesInfo?.diabetesType === 'gestational' ? 'Гестационный' : null)))
			.replaceAll('{{DIABETES_INFO_YEAR}}', esc(toValue(user.diabetesInfo?.diagnosisYear)))
			.replaceAll('{{DIABETES_INFO_INSULIN}}', esc(toValue(user.diabetesInfo?.insulinUse === 'yes' ? 'Да' : user.diabetesInfo?.insulinUse === 'no' ? 'Нет' : null)))
			.replaceAll('{{GOALS_CARDS}}', buildGoalCards(user))
			// Фактические показатели - статичные
			.replaceAll('{{ACTUAL_WEIGHT_DISPLAY}}', esc(formatMetric(user.actualMetrics?.weight, ' кг')))
			.replaceAll('{{ACTUAL_GLUCOSE_DISPLAY}}', esc(formatMetric(user.actualMetrics?.glucose, ' ммоль/л')))
			.replaceAll('{{ACTUAL_HBA1C_DISPLAY}}', esc(formatMetric(user.actualMetrics?.hba1c, ' %')))
			.replaceAll('{{GENDER_DISPLAY}}', esc(genderDisplay))
			.replaceAll('{{ACTUAL_HEIGHT_DISPLAY}}', esc(formatMetric(user.actualMetrics?.height, ' см')))
			.replaceAll('{{ACTUAL_WAIST_DISPLAY}}', esc(formatMetric(user.actualMetrics?.waist, ' см')))
			.replaceAll('{{ACTUAL_HIPS_DISPLAY}}', esc(formatMetric(user.actualMetrics?.hips, ' см')))
			.replaceAll('{{ACTUAL_CHEST_DISPLAY}}', esc(formatMetric(user.actualMetrics?.chest, ' см')))
			.replaceAll('{{ACTUAL_ARM_DISPLAY}}', esc(formatMetric(user.actualMetrics?.arm, ' см')))
			.replaceAll('{{BMI_VALUE}}', esc(bmiData.value))
			.replaceAll('{{BMI_CATEGORY}}', esc(bmiData.category));
		return res.send(html);
	} catch (error) {
		console.error(error);
		return res.redirect('/auth/login');
	}
});

router.get('/measurements.html', async (req, res) => {
	try {
		const user = await User.findById(req.user.userId).lean();
		if (!user) return res.redirect('/auth/login');

		const bmiData = calculateBMI(user);

		const templatePath = path.join(staticDir, 'measurements.html');
		let html = await fs.readFile(templatePath, 'utf8');

		html = html
			.replaceAll('{{ACTUAL_WEIGHT}}', user.actualMetrics?.weight || '')
			.replaceAll('{{ACTUAL_HEIGHT}}', user.actualMetrics?.height || '')
			.replaceAll('{{ACTUAL_WAIST}}', user.actualMetrics?.waist || '')
			.replaceAll('{{ACTUAL_HIPS}}', user.actualMetrics?.hips || '')
			.replaceAll('{{ACTUAL_CHEST}}', user.actualMetrics?.chest || '')
			.replaceAll('{{ACTUAL_ARM}}', user.actualMetrics?.arm || '')
			.replaceAll('{{BMI_VALUE}}', bmiData.value);

		return res.send(html);
	} catch (error) {
		console.error(error);
		return res.redirect('/auth/login');
	}
});

router.get('/api/products/search', async (req, res) => {
	try {
		const { q } = req.query;

		console.log('Поиск продукта:', q);

		if (!q || q.trim().length < 2) {
			return res.json({ products: [] });
		}

		const products = await Product.find({
			$or: [
				{ name: { $regex: q, $options: 'i' } },
				{ nameEn: { $regex: q, $options: 'i' } }
			]
		})
			.limit(10)
			.select('name nameEn category gi per100g')
			.lean();

		console.log('Найдено продуктов:', products.length);

		return res.json({ products });
	} catch (error) {
		console.error('Ошибка поиска продуктов:', error);
		return res.status(500).json({ error: error.message });
	}
});

router.get('/api/products/popular-gi', async (req, res) => {
	try {
		console.log('Загрузка популярных продуктов...');

		const popularProducts = [
			'Гречка вареная',
			'Рис белый вареный',
			'Овсянка на воде',
			'Яблоко',
			'Банан',
			'Хлеб белый',
			'Макароны вареные',
			'Картофель вареный'
		];

		const products = await Product.find({
			name: { $in: popularProducts }
		})
			.select('name category gi per100g')
			.lean();

		console.log('Загружено популярных продуктов:', products.length);

		// Сортируем в том же порядке
		const sortedProducts = popularProducts
			.map(name => products.find(p => p.name === name))
			.filter(Boolean);

		return res.json({ products: sortedProducts });
	} catch (error) {
		console.error('Ошибка загрузки популярных продуктов:', error);
		return res.status(500).json({ error: error.message });
	}
});

router.use(express.static(staticDir));

export default router;