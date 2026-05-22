import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required. Add it to your .env file.');
}

function getTokenFromCookie(cookieHeader) {
    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
        const [rawName, ...rest] = cookie.trim().split('=');
        if (rawName === 'authToken') {
            return decodeURIComponent(rest.join('='));
        }
    }

    return null;
}

export async function requireAuth(req, res, next) {
    const tokenFromCookie = getTokenFromCookie(req.headers.cookie);
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    const token = tokenFromCookie || tokenFromHeader;

    console.log('requireAuth: токен из cookie:', tokenFromCookie ? 'найден' : 'не найден');
    console.log('requireAuth: токен из header:', tokenFromHeader ? 'найден' : 'не найден');

    if (!token) {
        console.log('requireAuth: токен отсутствует');
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            userType: decoded.userType
        };

        console.log('requireAuth: пользователь авторизован:', req.user.userId, req.user.userType);
        return next();
    } catch (error) {
        console.error('requireAuth: ошибка аутентификации:', error.message);
        return res.status(401).json({ error: 'Неверный токен' });
    }
}

export function requireUserType(expectedType) {
    return (req, res, next) => {
        if (!req.user) {
            console.log('requireUserType: пользователь не авторизован');
            return res.status(401).json({ error: 'Не авторизован' });
        }

        if (req.user.userType !== expectedType) {
            console.log(`requireUserType: ожидался ${expectedType}, получен ${req.user.userType}`);
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        console.log(`requireUserType: тип ${expectedType} подтверждён`);
        return next();
    };
}

// Алиасы для API роутов (для совместимости)
export const requireAuthAPI = requireAuth;
export const requireUserTypeAPI = requireUserType;