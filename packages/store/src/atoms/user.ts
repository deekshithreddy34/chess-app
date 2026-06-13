import { atom, selector } from 'recoil';

// How do you put this in .env? @hkirat
// packages/config/src/index.ts

export const BACKEND_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://chess-app-backend-x28x.onrender.com'
    : 'http://localhost:3000';
export interface User {
  token: string;
  id: string;
  name: string;
}

export const userAtom = atom<User>({
  key: 'user',
  default: selector({
    key: 'user/default',
    get: async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch (e) {
        console.error(e);
      }

      return null;
    },
  }),
});
