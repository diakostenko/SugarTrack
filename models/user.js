import { Schema, model } from 'mongoose';

const userSchema = new Schema({
	name: { type: String, required: true },
	email: { type: String, unique: true, required: true },
	password: { type: String, required: true },
	phone: { type: String, required: true },
	birthDate: { type: Date, required: true },
	userType: { type: String, required: true, enum: ['diabetes', 'ed'] },
	createdAt: { type: Date, default: Date.now },
	diabetesInfo: {
		type: {
			diabetesType: { type: String, enum: ['type1', 'type2', 'gestational'] },
			diagnosisYear: { type: Number, min: 1950, max: 2026 },
			insulinUse: { type: String, enum: ['yes', 'no'] }
		},
		default: null
	},
	diabetesGoals: {
		type: {
			targetGlucose: { type: Number, min: 0 },
			hba1cGoal: { type: Number, min: 0 },
			weightGoal: { type: Number, min: 0 }
		},
		default: null
	},
	edInfo: {
		type: {
			edType: { type: String, enum: ['anorexia', 'bulimia', 'bed', 'other'] },
			supportLevel: { type: String, enum: ['professional', 'recovery', 'self'] }
		},
		default: null
	},
	edGoals: {
		type: {
			emotionalGoal: { type: String, enum: ['awareness', 'balance', 'positive', 'control'] },
			trackingFrequency: { type: String, enum: ['daily', 'weekly', 'asNeeded'] },
			supportGoal: { type: String, enum: ['community', 'self-care', 'recovery'] }
		},
		default: null
	},
	actualMetrics: {
		type: {
			weight: { type: Number, min: 0 },
			glucose: { type: Number, min: 0 },
			hba1c: { type: Number, min: 0 },
			// НОВЫЕ ПОЛЯ
			gender: { type: String, enum: ['male', 'female'] },
			height: { type: Number, min: 0 },
			waist: { type: Number, min: 0 },
			hips: { type: Number, min: 0 },
			chest: { type: Number, min: 0 },
			arm: { type: Number, min: 0 }
		},
		default: null
	},
	edActual: {
		type: {
			moodStatus: { type: String },
			diaryFrequency: { type: String }
		},
		default: null
	},
	events: [{
		type: { type: String, enum: ['pill', 'dose', 'doctor'], required: true },
		title: { type: String, required: true },
		date: { type: String, required: true }, // YYYY-MM-DD
		description: String,
		createdAt: { type: Date, default: Date.now }
	}],
	weightHistory: [{
		date: { type: String, required: true }, // YYYY-MM-DD
		weight: { type: Number, required: true, min: 0 }
	}]
});

// Виртуальное поле ИМТ
userSchema.virtual('bmi').get(function() {
	if (!this.actualMetrics?.weight || !this.actualMetrics?.height) {
		return null;
	}
	const heightInMeters = this.actualMetrics.height / 100;
	const bmi = this.actualMetrics.weight / (heightInMeters * heightInMeters);
	return Math.round(bmi * 10) / 10;
});

// Категория ИМТ
userSchema.methods.getBMICategory = function() {
	const bmi = this.bmi;
	if (!bmi) return 'Нет данных';
	if (bmi < 16) return 'Выраженный дефицит массы';
	if (bmi < 18.5) return 'Недостаточная масса';
	if (bmi < 25) return 'Норма';
	if (bmi < 30) return 'Избыточная масса';
	if (bmi < 35) return 'Ожирение 1 степени';
	if (bmi < 40) return 'Ожирение 2 степени';
	return 'Ожирение 3 степени';
};



userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export const User = model('User', userSchema);