import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { User } from '../models/user.js';
import { Product } from '../models/Product.js';
import { requireAuth, requireUserType } from '../middleware/auth.js';
import { Medicine } from '../models/Medicine.js';
import { Pill } from '../models/Pill.js';
import { Meal } from '../models/Meal.js';
import { GlucoseRecord } from '../models/GlucoseRecord.js';
import { HbA1cRecord } from '../models/HbA1cRecord.js';

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

// ── API маршруты инсулина ──

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

function normalizeDoseState(value, dosesPerDay) {
	const source = Array.isArray(value) ? value : [];
	return Array.from({ length: dosesPerDay }, (_, index) => Boolean(source[index]));
}

function formatMedicine(medicine, dateKey) {
	const doseState = normalizeDoseState(medicine.doseStates?.[dateKey], medicine.dosesPerDay);
	const takenCount = doseState.filter(Boolean).length;

	return {
		_id: medicine._id,
		name: medicine.name,
		insulinType: medicine.insulinType,
		units: medicine.units,
		dosesPerDay: medicine.dosesPerDay,
		doseState,
		takenCount
	};
}

async function buildDayPayload(userId, dateKey) {
	const { endOfDay } = getDayRange(dateKey);

	const medicines = await Medicine.find({
		userId,
		createdAt: { $lte: endOfDay }
	}).sort({ createdAt: 1 }).lean();

	const insulinMeds = medicines.map((medicine) => formatMedicine(medicine, dateKey));

	const totals = insulinMeds.reduce((acc, medicine) => {
		acc.today += medicine.units * medicine.takenCount;
		acc.norm += medicine.units * medicine.dosesPerDay;
		return acc;
	}, { today: 0, norm: 0 });

	return {
		date: dateKey,
		insulinMeds,
		totals: {
			today: totals.today,
			norm: totals.norm,
			percent: totals.norm > 0 ? Math.round((totals.today / totals.norm) * 100) : 0
		}
	};
}

router.get('/day/:date', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const dateKey = normalizeDateKey(req.params.date);
		return res.json(await buildDayPayload(req.user.userId, dateKey));
	} catch (error) {
		console.error('Ошибка загрузки инсулина:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

router.post('/insulin', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const name = String(req.body.name || '').trim();
		const insulinType = req.body.insulinType === 'long' ? 'long' : 'short';
		const units = Number.parseInt(req.body.units, 10);
		const dosesPerDay = Number.parseInt(req.body.dosesPerDay, 10);

		if (!name) {
			return res.status(400).json({ error: 'Введите название препарата' });
		}

		if (!Number.isFinite(units) || units < 1) {
			return res.status(400).json({ error: 'Количество единиц должно быть больше нуля' });
		}

		if (!Number.isFinite(dosesPerDay) || dosesPerDay < 1) {
			return res.status(400).json({ error: 'Количество приёмов должно быть больше нуля' });
		}

		const dateKey = getTodayKey();
		const medicine = new Medicine({
			userId: req.user.userId,
			name,
			insulinType,
			units,
			dosesPerDay,
			doseStates: {
				[dateKey]: Array.from({ length: dosesPerDay }, () => false)
			}
		});

		await medicine.save();
		return res.status(201).json(await buildDayPayload(req.user.userId, dateKey));
	} catch (error) {
		console.error('Ошибка добавления инсулина:', error);
		return res.status(500).json({ error: 'Ошибка при добавлении инсулина' });
	}
});

router.patch('/insulin/:medicineId/doses/:doseIndex/toggle', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const doseIndex = Number.parseInt(req.params.doseIndex, 10);
		const dateKey = normalizeDateKey(req.body?.date || req.query?.date || getTodayKey());

		if (!Number.isInteger(doseIndex) || doseIndex < 0) {
			return res.status(400).json({ error: 'Некорректный индекс приёма' });
		}

		const medicine = await Medicine.findOne({
			_id: req.params.medicineId,
			userId: req.user.userId
		});

		if (!medicine) {
			return res.status(404).json({ error: 'Препарат не найден' });
		}

		const currentState = normalizeDoseState(medicine.doseStates?.[dateKey], medicine.dosesPerDay);
		if (doseIndex >= currentState.length) {
			return res.status(400).json({ error: 'Приём вне диапазона' });
		}

		currentState[doseIndex] = !currentState[doseIndex];
		medicine.doseStates = {
			...(medicine.doseStates || {}),
			[dateKey]: currentState
		};
		medicine.markModified('doseStates');
		await medicine.save();

		return res.json(await buildDayPayload(req.user.userId, dateKey));
	} catch (error) {
		console.error('Ошибка обновления инсулина:', error);
		return res.status(500).json({ error: 'Ошибка при обновлении инсулина' });
	}
});

// ── API маршруты таблеток ──

function formatPill(pill, dateKey) {
	const doseState = normalizeDoseState(pill.doseStates?.[dateKey], pill.dosesPerDay);
	const takenCount = doseState.filter(Boolean).length;

	return {
		_id: pill._id,
		name: pill.name,
		dosesPerDay: pill.dosesPerDay,
		doseState,
		takenCount
	};
}

async function buildPillsDayPayload(userId, dateKey) {
	const { endOfDay } = getDayRange(dateKey);

	const pills = await Pill.find({
		userId,
		createdAt: { $lte: endOfDay }
	}).sort({ createdAt: 1 }).lean();

	const pillList = pills.map((pill) => formatPill(pill, dateKey));

	const totals = pillList.reduce((acc, pill) => {
		acc.total += pill.dosesPerDay;
		acc.taken += pill.takenCount;
		return acc;
	}, { total: 0, taken: 0 });

	return {
		date: dateKey,
		pillList,
		totals: {
			total: totals.total,
			taken: totals.taken,
			remaining: Math.max(0, totals.total - totals.taken)
		}
	};
}

router.get('/pills/day/:date', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const dateKey = normalizeDateKey(req.params.date);
		return res.json(await buildPillsDayPayload(req.user.userId, dateKey));
	} catch (error) {
		console.error('Ошибка загрузки таблеток:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

router.post('/pills', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const name = String(req.body.name || '').trim();
		const dosesPerDay = Number.parseInt(req.body.dosesPerDay, 10);

		if (!name) {
			return res.status(400).json({ error: 'Введите название препарата' });
		}

		if (!Number.isFinite(dosesPerDay) || dosesPerDay < 1) {
			return res.status(400).json({ error: 'Количество приёмов должно быть больше нуля' });
		}

		const dateKey = getTodayKey();
		const pill = new Pill({
			userId: req.user.userId,
			name,
			dosesPerDay,
			doseStates: {
				[dateKey]: Array.from({ length: dosesPerDay }, () => false)
			}
		});

		await pill.save();
		return res.status(201).json(await buildPillsDayPayload(req.user.userId, dateKey));
	} catch (error) {
		console.error('Ошибка добавления таблетки:', error);
		return res.status(500).json({ error: 'Ошибка при добавлении таблетки' });
	}
});

router.patch('/pills/:pillId/doses/:doseIndex/toggle', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const doseIndex = Number.parseInt(req.params.doseIndex, 10);
		const dateKey = normalizeDateKey(req.body?.date || req.query?.date || getTodayKey());

		if (!Number.isInteger(doseIndex) || doseIndex < 0) {
			return res.status(400).json({ error: 'Некорректный индекс приёма' });
		}

		const pill = await Pill.findOne({
			_id: req.params.pillId,
			userId: req.user.userId
		});

		if (!pill) {
			return res.status(404).json({ error: 'Таблетка не найдена' });
		}

		const currentState = normalizeDoseState(pill.doseStates?.[dateKey], pill.dosesPerDay);
		if (doseIndex >= currentState.length) {
			return res.status(400).json({ error: 'Приём вне диапазона' });
		}

		currentState[doseIndex] = !currentState[doseIndex];
		pill.doseStates = {
			...(pill.doseStates || {}),
			[dateKey]: currentState
		};
		pill.markModified('doseStates');
		await pill.save();

		return res.json(await buildPillsDayPayload(req.user.userId, dateKey));
	} catch (error) {
		console.error('Ошибка обновления таблетки:', error);
		return res.status(500).json({ error: 'Ошибка при обновлении таблетки' });
	}
});

// API: Получить все события
router.get('/events', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const user = await User.findById(req.user.userId).select('events').lean();
		return res.json({ events: user?.events || [] });
	} catch (error) {
		console.error('Ошибка загрузки событий:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

// API: Добавить событие
router.post('/events', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const { type, title, date, description } = req.body;

		if (!['pill', 'dose', 'doctor'].includes(type)) {
			return res.status(400).json({ error: 'Недопустимый тип события' });
		}

		if (!title || !date) {
			return res.status(400).json({ error: 'Укажите название и дату события' });
		}

		const user = await User.findById(req.user.userId);
		if (!user.events) user.events = [];

		user.events.push({
			type,
			title,
			date,
			description: description || '',
			createdAt: new Date()
		});

		await user.save();

		return res.json({ success: true, event: user.events[user.events.length - 1] });
	} catch (error) {
		console.error('Ошибка добавления события:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

// API: Получить историю веса за последние 14 дней
router.get('/api/weight/history', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const user = await User.findById(req.user.userId).select('weightHistory').lean();

		if (!user || !user.weightHistory || user.weightHistory.length === 0) {
			return res.json({ history: [] });
		}

		// Сортируем по дате (новые → старые) и берём последние 14 записей
		const history = user.weightHistory
			.sort((a, b) => new Date(b.date) - new Date(a.date))
			.slice(0, 14)
			.reverse(); // Переворачиваем обратно (старые → новые)

		return res.json({ history });
	} catch (error) {
		console.error('Ошибка загрузки истории веса:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

// API: Сохранить вес (ИСПРАВЛЕННЫЙ)
router.post('/api/weight', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const { weight } = req.body;

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

		// Добавляем в историю
		if (!user.weightHistory) {
			user.weightHistory = [];
		}

		const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

		// Проверяем, есть ли уже запись за сегодня
		const existingIndex = user.weightHistory.findIndex(
			entry => entry.date === today
		);

		if (existingIndex >= 0) {
			// Обновляем существующую запись
			user.weightHistory[existingIndex].weight = weight;
			console.log('Обновлена запись за сегодня:', user.weightHistory[existingIndex]);
		} else {
			// Добавляем новую запись
			user.weightHistory.push({ date: today, weight });
			console.log('Добавлена новая запись:', { date: today, weight });
		}

		user.markModified('weightHistory');
		await user.save();

		console.log('Вес сохранён:', weight);
		console.log('Всего записей в истории:', user.weightHistory.length);

		return res.json({
			message: 'Вес сохранён',
			weight: user.actualMetrics.weight,
			historyCount: user.weightHistory.length
		});
	} catch (error) {
		console.error('Ошибка сохранения веса:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

// API: Получить историю глюкозы за последние 14 дней
router.get('/api/glucose/history', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const fourteenDaysAgo = new Date();
		fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
		const dateKey = fourteenDaysAgo.toISOString().split('T')[0];

		const records = await GlucoseRecord.find({
			userId: req.user.userId,
			date: { $gte: dateKey }
		})
			.sort({ date: 1, time: 1 })
			.lean();

		// Группируем по дате и берём среднее значение
		const dailyAverage = {};
		records.forEach(record => {
			if (!dailyAverage[record.date]) {
				dailyAverage[record.date] = { sum: 0, count: 0 };
			}
			dailyAverage[record.date].sum += record.value;
			dailyAverage[record.date].count += 1;
		});

		const history = Object.keys(dailyAverage).map(date => ({
			date,
			value: (dailyAverage[date].sum / dailyAverage[date].count).toFixed(1)
		}));

		// Вычисляем статистику
		const allValues = records.map(r => r.value);
		const inRange = allValues.filter(v => v >= 3.9 && v <= 7.0).length;
		const above = allValues.filter(v => v > 7.0).length;
		const below = allValues.filter(v => v < 3.9).length;
		const total = allValues.length || 1;

		return res.json({
			history,
			stats: {
				inRange: Math.round((inRange / total) * 100),
				above: Math.round((above / total) * 100),
				below: Math.round((below / total) * 100)
			}
		});
	} catch (error) {
		console.error('Ошибка загрузки истории глюкозы:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

// API: Добавить замер глюкозы
router.post('/api/glucose', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const { value, date, time, note } = req.body;

		if (!value || value <= 0 || value > 30) {
			return res.status(400).json({ error: 'Некорректное значение глюкозы (0.1-30 ммоль/л)' });
		}

		if (!date || !time) {
			return res.status(400).json({ error: 'Укажите дату и время' });
		}

		const record = new GlucoseRecord({
			userId: req.user.userId,
			value: parseFloat(value),
			date,
			time,
			note: note || ''
		});

		await record.save();

		console.log('Замер глюкозы сохранён:', value, 'ммоль/л');

		return res.status(201).json({
			message: 'Замер сохранён',
			record: {
				_id: record._id,
				value: record.value,
				date: record.date,
				time: record.time
			}
		});
	} catch (error) {
		console.error('Ошибка сохранения замера глюкозы:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

router.get('/api/dashboard', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		console.log('=== ДАШБОРД: Начало загрузки ===');
		console.log('userId:', req.user.userId);

		const today = new Date();
		const dateKey = today.toISOString().split('T')[0];
		console.log('dateKey:', dateKey);

		// 1. Последний замер глюкозы
		console.log('Загрузка последнего замера глюкозы...');
		const latestGlucose = await GlucoseRecord.findOne({
			userId: req.user.userId
		})
			.sort({ date: -1, time: -1 })
			.lean();
		console.log('latestGlucose:', latestGlucose);

		// 2. Среднее за день
		console.log('Загрузка замеров за день...');
		const todayGlucose = await GlucoseRecord.find({
			userId: req.user.userId,
			date: dateKey
		}).lean();
		console.log('todayGlucose count:', todayGlucose.length);

		const avgGlucose = todayGlucose.length
			? (todayGlucose.reduce((sum, r) => sum + r.value, 0) / todayGlucose.length).toFixed(1)
			: null;
		console.log('avgGlucose:', avgGlucose);

		// 3. Приёмы пищи за день
		console.log('Загрузка приёмов пищи...');

		const startOfDay = new Date(today);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(today);
		endOfDay.setHours(23, 59, 59, 999);

		const meals = await Meal.find({
			userId: req.user.userId,
			date: {
				$gte: startOfDay,
				$lte: endOfDay
			}
		}).lean();

		console.log('meals count:', meals.length);

		const totalCarbs = meals.reduce((sum, m) => sum + (m.totalCarbs || 0), 0);
		console.log('totalCarbs:', totalCarbs);

		// 4. Лекарства (инсулин)
		console.log('Загрузка инсулина...');
		const insulinMeds = await Medicine.find({
			userId: req.user.userId
		}).lean();
		console.log('insulinMeds count:', insulinMeds.length);

		const insulinList = insulinMeds.map(med => {
			const doseStates = med.doseStates || {};
			const doseState = doseStates[dateKey] || Array(med.dosesPerDay).fill(false);
			const takenCount = doseState.filter(Boolean).length;

			return {
				_id: med._id,
				name: med.name,
				insulinType: med.insulinType,
				units: med.units,
				dosesPerDay: med.dosesPerDay,
				takenCount,
				doseState
			};
		});

		// 5. Таблетки
		console.log('Загрузка таблеток...');
		const pills = await Pill.find({
			userId: req.user.userId
		}).lean();
		console.log('pills count:', pills.length);

		const pillList = pills.map(pill => {
			const doseStates = pill.doseStates || {};
			const doseState = doseStates[dateKey] || Array(pill.dosesPerDay).fill(false);
			const takenCount = doseState.filter(Boolean).length;

			return {
				_id: pill._id,
				name: pill.name,
				dosesPerDay: pill.dosesPerDay,
				takenCount,
				doseState
			};
		});

		// 6. График глюкозы за 7 дней
		console.log('Загрузка графика за 7 дней...');
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		const sevenDaysKey = sevenDaysAgo.toISOString().split('T')[0];

		const weekGlucose = await GlucoseRecord.find({
			userId: req.user.userId,
			date: { $gte: sevenDaysKey }
		})
			.sort({ date: 1, time: 1 })
			.lean();
		console.log('weekGlucose count:', weekGlucose.length);

		// Группируем по дате и берём среднее
		const dailyAvg = {};
		weekGlucose.forEach(record => {
			if (!dailyAvg[record.date]) {
				dailyAvg[record.date] = { sum: 0, count: 0 };
			}
			dailyAvg[record.date].sum += record.value;
			dailyAvg[record.date].count += 1;
		});

		const glucoseChart = Object.keys(dailyAvg).map(date => ({
			date,
			value: (dailyAvg[date].sum / dailyAvg[date].count).toFixed(1)
		}));

		console.log('=== ДАШБОРД: Успешно загружен ===');

		return res.json({
			latestGlucose: latestGlucose ? {
				value: latestGlucose.value,
				time: latestGlucose.time,
				date: latestGlucose.date
			} : null,
			avgGlucose,
			mealsCount: meals.length,
			totalCarbs,
			insulinList,
			pillList,
			glucoseChart
		});
	} catch (error) {
		console.error('=== ОШИБКА ДАШБОРДА ===');
		console.error('Ошибка:', error);
		console.error('Stack:', error.stack);
		return res.status(500).json({ error: 'Ошибка сервера', details: error.message });
	}
});

// ═══════════════════════════════════════════════════════
// HbA1c — Гликированный гемоглобин
// ═══════════════════════════════════════════════════════

// Добавить замер HbA1c
router.post('/api/hba1c', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const { value, date, note } = req.body;

		if (!value || value < 3 || value > 20) {
			return res.status(400).json({ error: 'Некорректное значение HbA1c (должно быть от 3 до 20%)' });
		}

		if (!date) {
			return res.status(400).json({ error: 'Укажите дату замера' });
		}

		const record = new HbA1cRecord({
			userId: req.user.userId,
			value: parseFloat(value),
			date: new Date(date),
			note: note || ''
		});

		await record.save();

		console.log('✅ HbA1c сохранён:', record);

		return res.json({
			success: true,
			record: {
				_id: record._id,
				value: record.value,
				date: record.date,
				note: record.note
			}
		});
	} catch (error) {
		console.error('Ошибка сохранения HbA1c:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

// Получить историю HbA1c
router.get('/api/hba1c/history', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const oneYearAgo = new Date();
		oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

		const records = await HbA1cRecord.find({
			userId: req.user.userId,
			date: { $gte: oneYearAgo }
		})
			.sort({ date: -1 })
			.lean();

		console.log(`📊 Найдено ${records.length} записей HbA1c за год`);

		return res.json({
			history: records.map(r => ({
				_id: r._id,
				value: r.value,
				date: r.date,
				note: r.note,
				interpretation: getHbA1cInterpretation(r.value)
			}))
		});
	} catch (error) {
		console.error('Ошибка загрузки истории HbA1c:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

// Получить последний замер HbA1c
router.get('/api/hba1c/latest', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const latest = await HbA1cRecord.findOne({
			userId: req.user.userId
		})
			.sort({ date: -1 })
			.lean();

		if (!latest) {
			return res.json({ latest: null });
		}

		return res.json({
			latest: {
				_id: latest._id,
				value: latest.value,
				date: latest.date,
				note: latest.note,
				interpretation: getHbA1cInterpretation(latest.value)
			}
		});
	} catch (error) {
		console.error('Ошибка загрузки последнего HbA1c:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

// Удалить запись HbA1c
router.delete('/api/hba1c/:id', requireAuth, requireUserType('diabetes'), async (req, res) => {
	try {
		const record = await HbA1cRecord.findOneAndDelete({
			_id: req.params.id,
			userId: req.user.userId
		});

		if (!record) {
			return res.status(404).json({ error: 'Запись не найдена' });
		}

		console.log('🗑️ HbA1c удалён:', record._id);

		return res.json({ success: true });
	} catch (error) {
		console.error('Ошибка удаления HbA1c:', error);
		return res.status(500).json({ error: 'Ошибка сервера' });
	}
});

// Вспомогательная функция интерпретации HbA1c
function getHbA1cInterpretation(value) {
	if (value < 5.7) {
		return { level: 'normal', text: 'Норма', color: '#4ade80' };
	} else if (value < 6.5) {
		return { level: 'prediabetes', text: 'Преддиабет', color: '#facc15' };
	} else {
		return { level: 'diabetes', text: 'Диабет', color: '#f87171' };
	}
}

export default router;