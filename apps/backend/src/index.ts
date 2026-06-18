import express from 'express';
import v1Router from './router/v1';
import cors from 'cors';
import authRoute from './router/auth';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

const app = express();

dotenv.config();

app.use(express.json());
app.use(cookieParser());

const allowedHosts = process.env.ALLOWED_HOSTS
  ? process.env.ALLOWED_HOSTS.split(',')
  : [];

console.log('ALLOWED_HOSTS =', allowedHosts);

app.use(
  cors({
    origin: (origin, callback) => {
      console.log('--------------------------------');
      console.log('Incoming Origin:', origin);
      console.log('Allowed Hosts:', allowedHosts);

      const isAllowed =
        !origin ||
        allowedHosts.some((host) => {
          host = host.trim();

          if (host.startsWith('*.')) {
            const result = origin.endsWith(host.slice(1));
            console.log(
              `Wildcard Check: ${origin} endsWith(${host.slice(1)}) =>`,
              result,
            );
            return result;
          }

          const result = host === origin;
          console.log(
            `Exact Check: ${host} === ${origin} =>`,
            result,
          );
          return result;
        });

      if (isAllowed) {
        console.log('CORS ALLOWED');
        callback(null, true);
      } else {
        console.log('CORS BLOCKED');
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }),
);

app.use('/auth', authRoute);
app.use('/v1', v1Router);

app.get('/', (_, res) => {
  res.json({
    status: 'ok',
    allowedHosts,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});