import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { COOKIE_MAX_AGE } from '../consts';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

interface userJwtClaims {
  userId: string;
  name: string;
  isGuest?: boolean;
}

interface UserDetails {
  id: string;
  token?: string;
  name: string;
  isGuest?: boolean;
}

router.post('/signup', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ success: false, message: 'Email, password and name are required' });
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, message: 'Email already in use' });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { email, name, password: hashed, provider: 'EMAIL' },
  });

  const token = jwt.sign({ userId: user.id, name: user.name }, JWT_SECRET);
  res.cookie('auth', token, { maxAge: COOKIE_MAX_AGE, httpOnly: true });
  res.json({ id: user.id, name: user.name, token } as UserDetails);
});

router.post('/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ userId: user.id, name: user.name }, JWT_SECRET);
  res.cookie('auth', token, { maxAge: COOKIE_MAX_AGE, httpOnly: true });
  res.json({ id: user.id, name: user.name, token } as UserDetails);
});

router.post('/guest', async (req: Request, res: Response) => {
  const bodyData = req.body;
  let guestUUID = 'guest-' + uuidv4();

  const user = await db.user.create({
    data: {
      username: guestUUID,
      email: guestUUID + '@chess100x.com',
      name: bodyData.name || guestUUID,
      provider: 'GUEST',
    },
  });

  const token = jwt.sign(
    { userId: user.id, name: user.name, isGuest: true },
    JWT_SECRET,
  );
  res.cookie('guest', token, { maxAge: COOKIE_MAX_AGE });
  res.json({ id: user.id, name: user.name!, token, isGuest: true } as UserDetails);
});

router.get('/refresh', async (req: Request, res: Response) => {
  if (req.cookies && req.cookies.auth) {
    try {
      const decoded = jwt.verify(req.cookies.auth, JWT_SECRET) as userJwtClaims;
      const user = await db.user.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const token = jwt.sign({ userId: user.id, name: user.name }, JWT_SECRET);
      res.cookie('auth', token, { maxAge: COOKIE_MAX_AGE });
      res.json({ id: user.id, name: user.name, token });
    } catch {
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  } else if (req.cookies && req.cookies.guest) {
    try {
      const decoded = jwt.verify(req.cookies.guest, JWT_SECRET) as userJwtClaims;
      const token = jwt.sign(
        { userId: decoded.userId, name: decoded.name, isGuest: true },
        JWT_SECRET,
      );
      res.cookie('guest', token, { maxAge: COOKIE_MAX_AGE });
      res.json({ id: decoded.userId, name: decoded.name, token, isGuest: true });
    } catch {
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
});

router.get('/logout', (req: Request, res: Response) => {
  res.clearCookie('guest');
  res.clearCookie('auth');
  res.redirect('http://localhost:5173/');
});

export default router;
