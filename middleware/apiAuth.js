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

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Просто используем данные из токена, без запроса к БД
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            userType: decoded.userType
        };

        return next();
    } catch (error) {
        console.error('Ошибка аутентификации:', error);
        return res.status(401).json({ error: 'Неверный токен' });
    }
}

export function requireUserType(expectedType) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Не авторизован' });
        }

        if (req.user.userType !== expectedType) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        return next();
    };
}