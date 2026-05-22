import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import authRouter from './routes/auth.js';
import diabetesRouter from './routes/diabetes.js';
import edRouter from './routes/ed.js';
import mealsRouter from './routes/meals.js';

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
	throw new Error('MONGO_URI is required. Add it to your .env file.');
}

const app = express();
app.use(express.json());
app.use('/auth', authRouter);
app.use('/diabetes', diabetesRouter);
app.use('/api/medicines', diabetesRouter);
app.use('/ed', edRouter);
app.use('/api/meals', mealsRouter);
app.use(express.static('public'));

const start = async () => {
	try {
		await mongoose.connect(MONGO_URI);
		console.log(`MongoDB подключена: ${MONGO_URI}`);
		app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
	} catch (e) {
		console.error('Ошибка подключения к MongoDB:', e.message);
		process.exit(1);
	}
};

start();

