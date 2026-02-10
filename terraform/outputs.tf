output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.event_handler_table.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.event_handler_table.arn
}

output "dynamodb_table_id" {
  description = "ID of the DynamoDB table"
  value       = aws_dynamodb_table.event_handler_table.id
}

output "aws_region" {
  description = "AWS region where the table was created"
  value       = var.aws_region
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic"
  value       = aws_sns_topic.event_topic.arn
}

output "sns_topic_name" {
  description = "Name of the SNS topic"
  value       = aws_sns_topic.event_topic.name
}

output "sns_subscription_arn" {
  description = "ARN of the SNS subscription (if created)"
  value       = length(aws_sns_topic_subscription.http_subscription) > 0 ? aws_sns_topic_subscription.http_subscription[0].arn : "No subscription created"
}

output "ec2_instance_id" {
  description = "ID of the EC2 instance (if created)"
  value       = length(aws_instance.app_server) > 0 ? aws_instance.app_server[0].id : "No EC2 instance created"
}

output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = length(aws_instance.app_server) > 0 ? aws_instance.app_server[0].public_ip : "No EC2 instance created"
}

output "ec2_elastic_ip" {
  description = "Elastic IP address (if allocated)"
  value       = length(aws_eip.app_eip) > 0 ? aws_eip.app_eip[0].public_ip : "No Elastic IP allocated"
}

output "app_endpoint" {
  description = "Application endpoint URL"
  value       = length(aws_instance.app_server) > 0 ? "http://${length(aws_eip.app_eip) > 0 ? aws_eip.app_eip[0].public_ip : aws_instance.app_server[0].public_ip}:${var.app_port}/events" : "No EC2 instance created"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = length(aws_instance.app_server) > 0 ? "ssh -i ~/.ssh/${var.ec2_key_name}.pem ubuntu@${length(aws_eip.app_eip) > 0 ? aws_eip.app_eip[0].public_ip : aws_instance.app_server[0].public_ip}" : "No EC2 instance created"
}
