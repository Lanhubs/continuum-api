import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './src/auth';
import { HistoryController } from './src/controllers/history';
import { InterpretController } from './src/controllers/interpret';
import { ChatController } from './src/controllers/chat';
import { authMiddleware } from './src/middleware/auth';

type Variables = {
  userId: string;
};

const app = new Hono<{ Variables: Variables }>();

app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5173'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use('/api/*', (c, next) => {
  if (c.req.path.startsWith('/api/auth')) return next();
  return authMiddleware(c, next);
});

app.on(['GET', 'POST'], '/api/auth/**', (c) => auth.handler(c.req.raw));

app.get('/api/history', (c) => HistoryController.getHistory(c));
app.get('/api/prescriptions', (c) => HistoryController.getPrescriptions(c));
app.get('/api/trends/:markerName', (c) => HistoryController.getTrends(c));

app.post('/api/interpret/lab', (c) => InterpretController.interpretLab(c));
app.post('/api/interpret/prescription', (c) => InterpretController.interpretPrescription(c));
app.post('/api/interpret/radiology', (c) => InterpretController.processInterpretation(c, "RADIOLOGY"));
app.post('/api/interpret', (c) => InterpretController.interpret(c));
app.get('/api/status/:id', (c) => InterpretController.getStatus(c));

app.post('/api/chat', (c) => ChatController.chat(c));
app.get('/api/documents/recent', (c) => ChatController.getRecentDocuments(c));

app.get('/', (c) => c.json({ status: 'ok', service: 'Continuum Medical API' }));

export default {
  port: 3000,
  fetch: app.fetch,
};

