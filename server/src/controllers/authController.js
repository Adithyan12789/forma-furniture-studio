import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { registerSchema, loginSchema, validate } from '../validators/authValidators.js';

const sign = (user) =>
  jwt.sign({ sub: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, createdAt: u.createdAt });

export async function register(req, res, next) {
  try {
    const data = validate(registerSchema, req.body);
    if (await User.findOne({ email: data.email })) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    const user = await User.create(data);
    res.status(201).json({ success: true, token: sign(user), user: publicUser(user) });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const data = validate(loginSchema, req.body);
    const user = await User.findOne({ email: data.email }).select('+password');
    if (!user || !(await user.comparePassword(data.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    res.json({ success: true, token: sign(user), user: publicUser(user) });
  } catch (err) { next(err); }
}

export async function me(req, res) {
  res.json({ success: true, user: publicUser(req.user) });
}
