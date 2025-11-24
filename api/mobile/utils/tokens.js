import jwt from 'jsonwebtoken';

const ACCESS_EXPIRES_IN = process.env.MOBILE_ACCESS_TTL || '15m';
const REFRESH_EXPIRES_IN = process.env.MOBILE_REFRESH_TTL || '30d';

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

function buildPayload(user) {
  return {
    id: user._id,
    role: user.role,
  };
}

export function generateTokens(user) {
  const payload = buildPayload(user);
  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}
