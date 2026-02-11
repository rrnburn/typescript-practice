#!/bin/bash
set -e

# Log output
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting user data script..."

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install git
apt-get install -y git

# Install CloudWatch agent
echo "Installing CloudWatch agent..."
wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Configure CloudWatch agent
# Configure CloudWatch agent
echo "Configuring CloudWatch agent..."
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'CWCONFIG'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/aws/ec2/event-handler",
            "log_stream_name": "{instance_id}/user-data",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/event-handler.log",
            "log_group_name": "/aws/ec2/event-handler",
            "log_stream_name": "{instance_id}/application",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
CWCONFIG

# Start CloudWatch agent
echo "Starting CloudWatch agent..."
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

# Create app directory
mkdir -p /opt/event-handler
cd /opt/event-handler

# Clone repository if provided, otherwise create app from scratch
%{ if github_repo != "" }
echo "Cloning repository from ${github_repo}..."
git clone -b ${github_branch} ${github_repo} .
%{ else }
echo "No repository provided, creating app structure..."
# This would need the actual files - better to use a git repo
echo "ERROR: github_repo_url must be provided in terraform.tfvars"
exit 1
%{ endif }

# Install dependencies
npm install

# Build the application
npm run build

# Create .env file
cat > .env <<EOF
AWS_REGION=${aws_region}
DYNAMODB_TABLE_NAME=${dynamodb_table}
SNS_TOPIC_ARN=${sns_topic_arn}
PORT=${app_port}
EOF

# Create systemd service
cat > /etc/systemd/system/event-handler.service <<EOF
[Unit]
Description=Event Handler Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/event-handler
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:/var/log/event-handler.log
StandardError=append:/var/log/event-handler.log
SyslogIdentifier=event-handler
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable event-handler
systemctl start event-handler

echo "User data script completed successfully!"
echo "Application should be running on port ${app_port}"
