# AWS Event Handler Infrastructure

This Terraform configuration deploys a complete event-driven system on AWS with DynamoDB, SNS, and EC2.

## Architecture Overview

```
External System → SNS Topic → EC2 Instance (TypeScript App) → DynamoDB
                      ↓
                  (HTTP POST)
                      ↓
              Your App (/events endpoint)
                      ↓
                Event Handler
                      ↓
              DynamoDB Actions
```

## How It Works End-to-End

1. **External system publishes** a message to SNS Topic
2. **SNS pushes HTTP POST** to your EC2 instance's `/events` endpoint
3. **TypeScript app receives** the event and validates it
4. **Event handler routes** to appropriate DynamoDB action (put/get/query/delete)
5. **DynamoDB operation** executes and returns result
6. **App responds** to SNS with success/failure

## Prerequisites

### 1. Install Required Tools
```bash
# Terraform
# https://www.terraform.io/downloads

# AWS CLI
# https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# Git
sudo apt-get install git
```

### 2. Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

### 3. Create SSH Key Pair
```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/event-handler-key

# Import to AWS
aws ec2 import-key-pair --key-name event-handler-key \
  --public-key-material fileb://~/.ssh/event-handler-key.pub \
  --region us-east-1
```

### 4. Push Your Code to GitHub
```bash
cd /home/robbie/typescript-practice/my-aws-event-handler

# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/my-aws-event-handler.git
git branch -M main
git push -u origin main
```

## Complete Deployment Guide

### Step 1: Configure Terraform Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region                    = "us-east-1"
table_name                    = "EventHandlerTable"
environment                   = "dev"
enable_point_in_time_recovery = false
enable_ttl                    = false

# SNS Configuration
sns_topic_name                = "EventHandlerTopic"
endpoint_url                  = ""  # Leave empty, will be set after EC2 creation
endpoint_protocol             = "http"

# EC2 Configuration
create_ec2_instance           = true
ec2_instance_type             = "t2.micro"  # Free tier eligible
ec2_ami_id                    = ""  # Will auto-select latest Ubuntu 22.04
ec2_key_name                  = "event-handler-key"
vpc_id                        = ""  # Uses default VPC
subnet_id                     = ""  # Uses default subnet
app_port                      = 3000
ssh_allowed_cidr              = ["YOUR_IP/32"]  # Restrict to your IP!
app_allowed_cidr              = ["0.0.0.0/0"]
allocate_elastic_ip           = true
github_repo_url               = "https://github.com/YOUR_USERNAME/my-aws-event-handler.git"
github_branch                 = "main"
```

**Important:** Replace `YOUR_IP` with your actual IP address (get it from `curl ifconfig.me`)

### Step 2: Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Deploy (this takes ~5 minutes)
terraform apply
```

### Step 3: Get Your Endpoints

```bash
# Get all outputs
terraform output

# Save important values
export APP_ENDPOINT=$(terraform output -raw app_endpoint)
export SNS_TOPIC_ARN=$(terraform output -raw sns_topic_arn)
export EC2_IP=$(terraform output -raw ec2_elastic_ip)

echo "App Endpoint: $APP_ENDPOINT"
echo "SNS Topic ARN: $SNS_TOPIC_ARN"
echo "EC2 IP: $EC2_IP"
```

### Step 4: Subscribe SNS to Your Endpoint

```bash
# Create SNS subscription
aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol http \
  --notification-endpoint "http://$EC2_IP:3000/events" \
  --region us-east-1

# Check subscription status
aws sns list-subscriptions-by-topic \
  --topic-arn $SNS_TOPIC_ARN \
  --region us-east-1
```

### Step 5: Confirm SNS Subscription

The app will automatically receive a subscription confirmation. Check logs:

```bash
# SSH into EC2
ssh -i ~/.ssh/event-handler-key ubuntu@$EC2_IP

# Check app logs
sudo journalctl -u event-handler -f

# Look for: "Confirming SNS subscription"
```

Or manually confirm by checking the app received the SubscribeURL and visiting it.

### Step 6: Test the Complete Flow

#### Test 1: Direct API Call (Bypass SNS)

```bash
# Put an item in DynamoDB
curl -X POST http://$EC2_IP:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "action": "put",
    "payload": {
      "tableName": "EventHandlerTable",
      "item": {
        "id": "test-001",
        "name": "Direct API Test",
        "timestamp": 1707580800
      }
    }
  }'

# Get the item back
curl -X POST http://$EC2_IP:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get",
    "payload": {
      "tableName": "EventHandlerTable",
      "key": {
        "id": "test-001"
      }
    }
  }'
```

#### Test 2: Via SNS (Full End-to-End)

```bash
# Publish message to SNS
aws sns publish \
  --topic-arn $SNS_TOPIC_ARN \
  --message '{
    "action": "put",
    "payload": {
      "tableName": "EventHandlerTable",
      "item": {
        "id": "sns-test-001",
        "name": "SNS Event Test",
        "source": "sns",
        "timestamp": 1707580900
      }
    }
  }' \
  --region us-east-1

# Verify it was written to DynamoDB
curl -X POST http://$EC2_IP:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get",
    "payload": {
      "tableName": "EventHandlerTable",
      "key": {
        "id": "sns-test-001"
      }
    }
  }'
```

#### Test 3: Query Items

```bash
# Note: Query requires GSI or uses hash key
curl -X POST http://$EC2_IP:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get",
    "payload": {
      "tableName": "EventHandlerTable",
      "key": {
        "id": "test-001"
      }
    }
  }'
```

### Step 7: Monitor and Debug

```bash
# SSH to EC2
ssh -i ~/.ssh/event-handler-key ubuntu@$EC2_IP

# View application logs
sudo journalctl -u event-handler -f

# Check app status
sudo systemctl status event-handler

# Restart app if needed
sudo systemctl restart event-handler

# View recent errors
sudo journalctl -u event-handler --since "10 minutes ago" | grep -i error
```

### Step 8: View Data in AWS Console

1. **DynamoDB:**
   - Go to AWS Console → DynamoDB → Tables → EventHandlerTable
   - Click "Explore table items" to see stored data

2. **SNS:**
   - Go to AWS Console → SNS → Topics → EventHandlerTopic
   - Check subscriptions and delivery status

3. **EC2:**
   - Go to AWS Console → EC2 → Instances
   - View instance status, logs, and monitoring

## Understanding the Message Flow

### SNS Message Format

When SNS delivers to your endpoint, it sends:

```json
{
  "Type": "Notification",
  "MessageId": "...",
  "TopicArn": "arn:aws:sns:us-east-1:...:EventHandlerTopic",
  "Subject": "...",
  "Message": "{\"action\":\"put\",\"payload\":{...}}",
  "Timestamp": "2026-02-10T12:00:00.000Z",
  "SignatureVersion": "1",
  "Signature": "...",
  "SigningCertURL": "...",
  "UnsubscribeURL": "..."
}
```

Your app parses the `Message` field and routes it to the event handler.

## Cost Estimate (Free Tier)

- **EC2 t2.micro:** Free for 750 hours/month (12 months)
- **DynamoDB:** Free for 25 GB + 2.5M requests/month (always)
- **SNS:** Free for 1,000 notifications/month (always)
- **Data Transfer:** Free for 100 GB/month out (12 months)

**Total cost in free tier:** $0/month

**After 12 months:** ~$8.50/month (just EC2)

## Cleanup

When you're done, destroy all resources:

```bash
cd terraform

# Preview what will be destroyed
terraform plan -destroy

# Destroy everything
terraform destroy

# Verify deletion in AWS Console
```

**Important:** Also delete your SSH key from AWS if no longer needed:
```bash
aws ec2 delete-key-pair --key-name event-handler-key --region us-east-1
```

## Troubleshooting

### App not responding
```bash
# SSH to EC2
ssh -i ~/.ssh/event-handler-key ubuntu@$EC2_IP

# Check if app is running
sudo systemctl status event-handler

# View logs
sudo journalctl -u event-handler -n 100

# Check if port is listening
sudo netstat -tulpn | grep 3000

# Restart app
sudo systemctl restart event-handler
```

### SNS not delivering messages
```bash
# Check subscription status
aws sns list-subscriptions-by-topic --topic-arn $SNS_TOPIC_ARN

# Status should be "Confirmed", not "PendingConfirmation"

# Check app logs for subscription confirmation
ssh -i ~/.ssh/event-handler-key ubuntu@$EC2_IP
sudo journalctl -u event-handler | grep -i subscription
```

### DynamoDB access denied
```bash
# Verify IAM role is attached to EC2
aws ec2 describe-instances \
  --instance-ids $(terraform output -raw ec2_instance_id) \
  --query 'Reservations[0].Instances[0].IamInstanceProfile'

# Check IAM role permissions
aws iam get-role-policy \
  --role-name dev-event-handler-ec2-role \
  --policy-name dynamodb-access
```

### Can't SSH to EC2
```bash
# Check security group allows your IP
terraform output ssh_command

# Verify key permissions
chmod 400 ~/.ssh/event-handler-key

# Check instance is running
aws ec2 describe-instances \
  --instance-ids $(terraform output -raw ec2_instance_id) \
  --query 'Reservations[0].Instances[0].State.Name'
```

## Configuration Reference

### All Terraform Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `aws_region` | AWS region | `us-east-1` | No |
| `table_name` | DynamoDB table name | `EventHandlerTable` | No |
| `environment` | Environment tag | `dev` | No |
| `sns_topic_name` | SNS topic name | `EventHandlerTopic` | No |
| `create_ec2_instance` | Deploy EC2 instance | `false` | No |
| `ec2_instance_type` | Instance type | `t2.micro` | No |
| `ec2_key_name` | SSH key pair name | - | Yes (if EC2) |
| `github_repo_url` | GitHub repo URL | - | Yes (if EC2) |
| `app_port` | Application port | `3000` | No |
| `allocate_elastic_ip` | Allocate Elastic IP | `true` | No |

### Supported DynamoDB Actions

Your event handler supports these actions:

- **`put`** - Insert or update an item
- **`get`** - Retrieve an item by key
- **`query`** - Query items (requires GSI or hash key)
- **`delete`** - Delete an item by key

## Next Steps

1. **Add authentication** - Secure your `/events` endpoint
2. **Set up CloudWatch alarms** - Monitor errors and latency
3. **Add more AWS services** - Extend to S3, SQS, Lambda, etc.
4. **Implement retries** - Add DLQ for failed messages
5. **Use HTTPS** - Get SSL certificate and use HTTPS endpoint
6. **Add CI/CD** - Automate deployments with GitHub Actions

## Resources

- [AWS Free Tier Details](https://aws.amazon.com/free/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [SNS Developer Guide](https://docs.aws.amazon.com/sns/)
- [EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
