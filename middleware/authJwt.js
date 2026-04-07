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

export function requireAuth(req, res, next) {
    const tokenFromCookie = getTokenFromCookie(req.headers.cookie);
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
        return res.redirect('/auth/login');
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (error) {
        return res.redirect('/auth/login');
    }
}

export function requireUserType(expectedType) {
    return (req, res, next) => {
        if (req.user?.userType !== expectedType) {
            return res.redirect('/auth/login');
        }

        return next();
    };
}

