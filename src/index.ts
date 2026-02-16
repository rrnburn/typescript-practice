import express, { Request, Response } from 'express';
import path from 'path';
import { eventHandler } from './handlers/eventHandler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.text({ type: 'text/plain' }));
app.use(express.static(path.join(__dirname, '../public')));

function parseRequestBody(body: any): any {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse body as JSON:', e);
      return body;
    }
  }
  return body;
}

function handleSnsSubscriptionConfirmation(body: any, res: Response): boolean {
  console.log('Received SNS subscription confirmation');
  
  const subscribeUrl = body.SubscribeURL;
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
    console.error('No SubscribeURL found in body:', Object.keys(body));
  }

  res.status(200).send('OK');
  return true;
}

async function handleSnsNotification(body: any, res: Response): Promise<boolean> {
  console.log('Received SNS notification');
  const message = JSON.parse(body.Message);
  const result = await eventHandler(message);
  res.status(200).json({ success: true, result });
  return true;
}

async function handleDirectEvent(body: any, res: Response): Promise<void> {
  console.log('Received event:', body);
  const result = await eventHandler(body);
  res.status(200).json({
    success: true,
    message: 'Event processed successfully',
    result,
  });
}

function handleError(error: unknown, res: Response): void {
  console.error('Error processing event:', error);
  res.status(500).json({
    success: false,
    message: 'Error processing event',
    error: error instanceof Error ? error.message : 'Unknown error',
  });
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

// Download S3 object endpoint
app.get('/download/s3/:bucketName/:objectKey(*)', async (req: Request, res: Response) => {
  try {
    const { bucketName, objectKey } = req.params;
    console.log(`Downloading object: ${objectKey} from bucket: ${bucketName}`);
    
    const event = {
      type: 's3',
      action: 'get',
      payload: {
        action: 'getObject',
        bucketName,
        objectKey
      }
    };
    
    const result = await eventHandler(event);
    
    if (result && result.isBase64 && result.Body) {
      const buffer = Buffer.from(result.Body, 'base64');
      const filename = objectKey.split('/').pop() || 'download';
      
      res.setHeader('Content-Type', result.ContentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } else {
      res.status(500).json({ error: 'Failed to retrieve object' });
    }
  } catch (error) {
    console.error('Error downloading object:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Event webhook endpoint
app.post('/events', async (req: Request, res: Response) => {
  try {
    const body = parseRequestBody(req.body);
    const messageType = req.headers['x-amz-sns-message-type'];
    
    if (messageType === 'SubscriptionConfirmation') {
      return handleSnsSubscriptionConfirmation(body, res);
    }
    
    if (messageType === 'Notification') {
      return await handleSnsNotification(body, res);
    }

    await handleDirectEvent(body, res);
  } catch (error) {
    handleError(error, res);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});