# AWS Event Handler

TypeScript application for accepting incoming events and performing AWS actions.

## Features

- Express.js server to receive webhook events
- Support for AWS S3, DynamoDB, SNS, and SQS operations
- TypeScript for type safety
- Modular architecture for easy extension

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure AWS credentials:**
   ```bash
   cp .env.example .env
   # Edit .env with your AWS credentials
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Run the application:**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## API Usage

The server exposes a `/events` endpoint that accepts POST requests with the following format:

```json
{
  "type": "s3|dynamodb|sns|sqs",
  "action": "upload|download|put|get|etc",
  "payload": { /* action-specific data */ }
}
```

### S3 Examples

**Upload file:**
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "s3",
    "action": "upload",
    "payload": {
      "bucket": "my-bucket",
      "key": "test.txt",
      "body": "Hello World"
    }
  }'
```

**List objects:**
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "s3",
    "action": "list",
    "payload": {
      "bucket": "my-bucket",
      "prefix": "uploads/"
    }
  }'
```

### DynamoDB Examples

**Put item:**
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "dynamodb",
    "action": "put",
    "payload": {
      "tableName": "EventHandlerTable",
      "item": {
        "id": "123",
        "name": "Test Item",
        "timestamp": 1234567890
      }
    }
  }'
```

**Get item:**
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "dynamodb",
    "action": "get",
    "payload": {
      "tableName": "EventHandlerTable",
      "key": { "id": "123" }
    }
  }'
```

### SNS Example

**Publish message:**
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sns",
    "action": "publish",
    "payload": {
      "topicArn": "arn:aws:sns:us-east-1:123456789012:MyTopic",
      "message": "Hello from event handler"
    }
  }'
```

### SQS Example

**Send message:**
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sqs",
    "action": "send",
    "payload": {
      "queueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/MyQueue",
      "message": { "data": "test message" }
    }
  }'
```

## Project Structure

```
├── src/
│   ├── index.ts                 # Express server entry point
│   ├── handlers/
│   │   └── eventHandler.ts      # Event routing logic
│   └── aws/
│       ├── s3Actions.ts         # S3 operations
│       ├── dynamoActions.ts     # DynamoDB operations
│       ├── snsActions.ts        # SNS operations
│       └── sqsActions.ts        # SQS operations
├── dist/                        # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── .env                         # AWS credentials (not in git)
```

## Extending

To add support for more AWS services:

1. Create a new file in `src/aws/` (e.g., `lambdaActions.ts`)
2. Implement the actions using AWS SDK v3
3. Add a handler in `src/handlers/eventHandler.ts`
4. Add the new service type to the switch statement

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled application
- `npm run dev` - Run with ts-node (development)
- `npm run watch` - Watch mode for compilation
