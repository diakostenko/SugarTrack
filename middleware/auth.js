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

/**
 * Middleware для проверки аутентификации пользователя
 * Поддерживает токены как из cookie, так и из Authorization header (Bearer token)
 */
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

/**
 * Middleware для проверки типа пользователя (роли)
 * @param {string} expectedType - Ожидаемый тип пользователя (например, 'diabetes', 'ed')
 */
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

// Экспортируем функции с одинаковыми именами для совместимости
// (ранее использовались как requireAuthAPI и requireUserTypeAPI)
export const requireAuthAPI = requireAuth;
export const requireUserTypeAPI = requireUserType;