import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = await User.findById(payload.sub).select('_id name email');
    if (!req.user) return res.status(401).json({ success: false, message: 'User no longer exists' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/** Authorization: the resource must belong to the requesting user. */
export function owns(resourceUserId, req) {
  return String(resourceUserId) === String(req.user._id);
}
