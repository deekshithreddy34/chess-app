import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { userAtom } from '@repo/store/userAtom';

const BACKEND_URL =
  import.meta.env.VITE_APP_BACKEND_URL ?? 'http://localhost:3000';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [_, setUser] = useRecoilState(userAtom);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const guestNameRef = useRef<HTMLInputElement>(null);

  const returnUrl = searchParams.get('returnUrl') || '/game/random';

  const handleAuth = async () => {
    setError('');
    const email = emailRef.current?.value.trim() || '';
    const password = passwordRef.current?.value || '';
    const name = nameRef.current?.value.trim() || '';

    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please fill in all fields');
      return;
    }

    const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/signin';
    const body: Record<string, string> = { email, password };
    if (mode === 'signup') body.name = name;

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || 'Something went wrong');
      return;
    }

    setUser(data);
    navigate(returnUrl);
  };

  const loginAsGuest = async () => {
    setError('');
    const response = await fetch(`${BACKEND_URL}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: guestNameRef.current?.value || '' }),
    });
    const user = await response.json();
    setUser(user);
    navigate(returnUrl);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen text-textMain">
      <h1 className="text-4xl font-bold mb-8 text-center text-green-500 drop-shadow-lg">
        Enter the Game World
      </h1>

      <div className="bg-bgAuxiliary2 rounded-lg shadow-lg p-8 flex flex-col md:flex-row gap-8">
        {/* Email auth */}
        <div className="flex flex-col w-72">
          <div className="flex mb-4 rounded-md overflow-hidden border border-gray-600">
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-green-500 text-white' : 'hover:bg-gray-600'}`}
              onClick={() => { setMode('signin'); setError(''); }}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-green-500 text-white' : 'hover:bg-gray-600'}`}
              onClick={() => { setMode('signup'); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          {mode === 'signup' && (
            <input
              type="text"
              ref={nameRef}
              placeholder="Display name"
              className="border px-4 py-2 rounded-md mb-3 w-full text-black"
            />
          )}
          <input
            type="email"
            ref={emailRef}
            placeholder="Email"
            className="border px-4 py-2 rounded-md mb-3 w-full text-black"
          />
          <input
            type="password"
            ref={passwordRef}
            placeholder="Password"
            className="border px-4 py-2 rounded-md mb-4 w-full text-black"
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          />

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <button
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors duration-300"
            onClick={handleAuth}
          >
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex md:flex-col items-center justify-center gap-2">
          <div className="bg-gray-600 md:h-full md:w-px h-px w-full"></div>
          <span className="text-gray-400 text-sm">OR</span>
          <div className="bg-gray-600 md:h-full md:w-px h-px w-full"></div>
        </div>

        {/* Guest login */}
        <div className="flex flex-col items-center justify-center w-64">
          <input
            type="text"
            ref={guestNameRef}
            placeholder="Username (optional)"
            className="border px-4 py-2 rounded-md mb-4 w-full text-black"
          />
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors duration-300 w-full"
            onClick={loginAsGuest}
          >
            Enter as Guest
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
