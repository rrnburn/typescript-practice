variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-east-1"
}

variable "table_name" {
  description = "Name of the DynamoDB table"
  type        = string
  default     = "EventHandlerTable"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for the DynamoDB table"
  type        = bool
  default     = false
}

variable "enable_ttl" {
  description = "Enable TTL (Time to Live) for the DynamoDB table"
  type        = bool
  default     = false
}

variable "sns_topic_name" {
  description = "Name of the SNS topic"
  type        = string
  default     = "EventHandlerTopic"
}

variable "endpoint_url" {
  description = "HTTP/HTTPS endpoint URL for SNS subscription (leave empty to skip subscription creation)"
  type        = string
  default     = ""
}

variable "endpoint_protocol" {
  description = "Protocol for the SNS subscription endpoint (http or https)"
  type        = string
  default     = "http"
  
  validation {
    condition     = contains(["http", "https"], var.endpoint_protocol)
    error_message = "Endpoint protocol must be either 'http' or 'https'."
  }
}

# EC2 Variables
variable "create_ec2_instance" {
  description = "Whether to create an EC2 instance"
  type        = bool
  default     = false
}

variable "ec2_instance_type" {
  description = "EC2 instance type (t2.micro is free tier eligible - 750 hours/month for 12 months)"
  type        = string
  default     = "t2.micro"
}

variable "ec2_ami_id" {
  description = "AMI ID for the EC2 instance (Ubuntu 22.04 LTS recommended)"
  type        = string
  default     = ""  # Will use latest Ubuntu 22.04 in us-east-1: ami-0c7217cdde317cfec
}

variable "ec2_key_name" {
  description = "SSH key pair name for EC2 access"
  type        = string
  default     = ""
}

variable "vpc_id" {
  description = "VPC ID where EC2 instance will be launched"
  type        = string
  default     = ""  # Use default VPC if not specified
}

variable "subnet_id" {
  description = "Subnet ID where EC2 instance will be launched"
  type        = string
  default     = ""
}

variable "app_port" {
  description = "Port on which the application runs"
  type        = number
  default     = 3000
}

variable "ssh_allowed_cidr" {
  description = "CIDR blocks allowed to SSH to the EC2 instance"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict this in production!
}

variable "app_allowed_cidr" {
  description = "CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "allocate_elastic_ip" {
  description = "Whether to allocate an Elastic IP for the EC2 instance"
  type        = bool
  default     = true
}

variable "github_repo_url" {
  description = "GitHub repository URL for the application code"
  type        = string
  default     = ""
}

variable "github_branch" {
  description = "GitHub branch to deploy"
  type        = string
  default     = "main"
}
