import express, { Request, Response } from 'express';
import { eventHandler } from './handlers/eventHandler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

// Event webhook endpoint
app.post('/events', async (req: Request, res: Response) => {
  // Handle SNS subscription confirmation
  if (req.headers['x-amz-sns-message-type'] === 'SubscriptionConfirmation') {
    console.log('Confirming SNS subscription:', req.body.SubscribeURL);
    // Visit the SubscribeURL to confirm (or use fetch/axios)
    return res.status(200).send('OK');
  }

  // Handle SNS notifications
  if (req.headers['x-amz-sns-message-type'] === 'Notification') {
    const message = JSON.parse(req.body.Message);
    const result = await eventHandler(message);
    return res.status(200).json({ success: true, result });
  }

  // Handle regular events (non-SNS)
  const event = req.body;
  const result = await eventHandler(event);
  res.status(200).json({ success: true, result });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
