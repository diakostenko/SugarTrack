import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../models/user.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required. Add it to your .env file.');
}

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Слишком много попыток регистрации. Попробуйте позже.' }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Слишком много попыток входа. Попробуйте позже.' }
});

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/register.html'));
});

router.post('/register', registerLimiter, async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            confirmPassword,
            phone,
            birthDate,
            userType,
            diabetesType,
            diagnosisYear,
            insulinUse,
            targetGlucose,
            hba1cGoal,
            weightGoalDiabetes,
            edType,
            supportLevel,
            triggerWarnings,
            emotionalGoal,
            trackingFrequency,
            supportGoal
        } = req.body;

        if (!name || !email || !password || !confirmPassword || !phone || !birthDate || !userType) {
            return res.status(400).json({ message: 'Заполните все обязательные поля' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Пароли не совпадают' });
        }

        if (password.length < 10) {
            return res.status(400).json({ message: 'Пароль должен быть не менее 10 символов' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const userData = {
            name,
            email,
            password: hashedPassword,
            phone,
            birthDate,
            userType
        };

        if (userType === 'diabetes') {
            userData.diabetesInfo = {
                diabetesType: diabetesType || null,
                diagnosisYear: diagnosisYear ? parseInt(diagnosisYear, 10) : null,
                insulinUse: insulinUse || null
            };
            userData.diabetesGoals = {
                targetGlucose: targetGlucose ? parseFloat(targetGlucose) : null,
                hba1cGoal: hba1cGoal ? parseFloat(hba1cGoal) : null,
                weightGoal: weightGoalDiabetes ? parseFloat(weightGoalDiabetes) : null
            };
        }

        if (userType === 'ed') {
            userData.edInfo = {
                edType: edType || null,
                supportLevel: supportLevel || null,
                triggerWarnings: triggerWarnings || null
            };
            userData.edGoals = {
                emotionalGoal: emotionalGoal || null,
                trackingFrequency: trackingFrequency || null,
                supportGoal: supportGoal || null
            };
        }

        const newUser = new User(userData);
        await newUser.save();

        return res.status(201).json({
            message: 'Регистрация успешна',
            userId: newUser._id,
            userType: newUser.userType
        });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        return res.status(500).json({ message: 'Ошибка сервера при регистрации' });
    }
});

router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Заполните email и пароль' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                userType: user.userType
            },
            JWT_SECRET,
            { expiresIn: rememberMe ? '30d' : '7d' }
        );

        res.cookie('authToken', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            message: 'Вход выполнен успешно',
            userType: user.userType,
            userId: user._id,
            rememberMe
        });
    } catch (error) {
        console.error('Ошибка при логине:', error);
        return res.status(500).json({ message: 'Ошибка сервера при входе' });
    }
});


router.post('/logout', (req, res) => {
    try {
        console.log('Выход из аккаунта');

        // Удаляем cookie с токеном
        res.clearCookie('authToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        console.log('Токен удалён, сессия завершена');

        return res.json({
            success: true,
            message: 'Выход выполнен успешно'
        });
    } catch (error) {
        console.error('Ошибка при выходе:', error);
        return res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
        });
    }
});

export default router;


