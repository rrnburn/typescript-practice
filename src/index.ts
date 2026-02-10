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
  try {
    // Log everything for debugging
    console.log('Request headers:', req.headers);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Handle SNS subscription confirmation
    if (req.headers['x-amz-sns-message-type'] === 'SubscriptionConfirmation') {
      console.log('Received SNS subscription confirmation');
      
      // Try different property names (SNS can be inconsistent with casing)
      const subscribeUrl = req.body.SubscribeURL || req.body.subscribeUrl || req.body.SubscribeUrl;
      
      console.log('Subscribe URL:', subscribeUrl);

      if (subscribeUrl) {
        console.log('Confirming subscription:', subscribeUrl);
        
        const https = require('https');
        const http = require('http');
        const client = subscribeUrl.startsWith('https') ? https : http;

        client.get(subscribeUrl, (response: any) => {
          console.log('Subscription confirmed! Status:', response.statusCode);
        }).on('error', (err: any) => {
          console.error('Error confirming subscription:', err);
        });
      } else {
        console.error('No SubscribeURL found in body:', Object.keys(req.body));
      }

      return res.status(200).send('OK');
    }
    
    // Handle SNS notifications
    if (req.headers['x-amz-sns-message-type'] === 'Notification') {
      console.log('Received SNS notification');
      const message = JSON.parse(req.body.Message);
      const result = await eventHandler(message);
      return res.status(200).json({ success: true, result });
    }

    // Handle regular direct API calls (non-SNS)
    const event = req.body;
    console.log('Received event:', event);

    const result = await eventHandler(event);

    res.status(200).json({
      success: true,
      message: 'Event processed successfully',
      result,
    });
  } catch (error) {
    console.error('Error processing event:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing event',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
