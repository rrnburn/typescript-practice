terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# DynamoDB Free Tier: 25 GB storage, 25 WCUs, 25 RCUs (always free)
resource "aws_dynamodb_table" "event_handler_table" {
  name           = var.table_name
  billing_mode   = "PAY_PER_REQUEST"  # Free tier: 2.5M reads, 2.5M writes per month
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name        = var.table_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled = true
  }

  ttl {
    enabled        = var.enable_ttl
    attribute_name = "ttl"
  }
}

# SNS Topic for event notifications
# Free Tier: 1,000 notifications per month, 100,000 HTTP/S deliveries
resource "aws_sns_topic" "event_topic" {
  name              = var.sns_topic_name
  display_name      = "Event Handler Topic"
  fifo_topic        = false
  
  tags = {
    Name        = var.sns_topic_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# SNS Subscription to HTTP(S) endpoint - automatically uses EC2 Elastic IP
resource "aws_sns_topic_subscription" "http_subscription" {
  count     = var.create_ec2_instance && var.allocate_elastic_ip ? 1 : 0
  topic_arn = aws_sns_topic.event_topic.arn
  protocol  = "http"
  endpoint  = "http://${aws_eip.app_eip[0].public_ip}:${var.app_port}/events"
  
  depends_on = [aws_instance.app_server, aws_eip.app_eip]
}

# IAM Role for EC2 instance
resource "aws_iam_role" "ec2_role" {
  name = "${var.environment}-event-handler-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-event-handler-ec2-role"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# IAM Policy for DynamoDB access
resource "aws_iam_role_policy" "dynamodb_policy" {
  name = "dynamodb-access"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:DeleteItem",
          "dynamodb:UpdateItem",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.event_handler_table.arn
      }
    ]
  })
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.environment}-event-handler-profile"
  role = aws_iam_role.ec2_role.name
}

# Security Group for EC2
resource "aws_security_group" "app_sg" {
  name        = "${var.environment}-event-handler-sg"
  description = "Security group for Event Handler application"
  vpc_id      = var.vpc_id != "" ? var.vpc_id : data.aws_vpc.default.id

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidr
    description = "SSH access"
  }

  # Application port
  ingress {
    from_port   = var.app_port
    to_port     = var.app_port
    protocol    = "tcp"
    cidr_blocks = var.app_allowed_cidr
    description = "Application access"
  }

  # Outbound internet access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.environment}-event-handler-sg"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# EC2 Instance
resource "aws_instance" "app_server" {
  count                  = var.create_ec2_instance ? 1 : 0
  ami                    = var.ec2_ami_id != "" ? var.ec2_ami_id : data.aws_ami.ubuntu.id
  instance_type          = var.ec2_instance_type
  key_name               = var.ec2_key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name
  vpc_security_group_ids = [aws_security_group.app_sg.id]
  subnet_id              = var.subnet_id != "" ? var.subnet_id : data.aws_subnets.default.ids[0]

  user_data = templatefile("${path.module}/user_data.sh", {
    aws_region         = var.aws_region
    dynamodb_table     = aws_dynamodb_table.event_handler_table.name
    sns_topic_arn      = aws_sns_topic.event_topic.arn
    app_port           = var.app_port
    github_repo        = var.github_repo_url
    github_branch      = var.github_branch
  })

  root_block_device {
    volume_size = 8  # Free tier: up to 30 GB of EBS storage
    volume_type = "gp2"  # gp2 is free tier eligible (gp3 is not)
    encrypted   = true
    delete_on_termination = true
  }

  tags = {
    Name        = "${var.environment}-event-handler-server"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Elastic IP (optional but recommended for stable endpoint)
resource "aws_eip" "app_eip" {
  count    = var.create_ec2_instance && var.allocate_elastic_ip ? 1 : 0
  instance = aws_instance.app_server[0].id
  domain   = "vpc"

  tags = {
    Name        = "${var.environment}-event-handler-eip"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
