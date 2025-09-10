# Variables for DaorsAgro Infrastructure

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnets" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

# RDS Configuration
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r5.xlarge"
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage for RDS"
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for RDS autoscaling"
  type        = number
  default     = 1000
}

variable "db_password" {
  description = "Password for the RDS instance"
  type        = string
  sensitive   = true
}

# ElastiCache Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_auth_token" {
  description = "Auth token for Redis"
  type        = string
  sensitive   = true
}

# Domain Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "daorsagro.com"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate"
  type        = string
  default     = ""
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable enhanced monitoring"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# Backup Configuration
variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

# Scaling Configuration
variable "min_nodes" {
  description = "Minimum number of nodes in the EKS cluster"
  type        = number
  default     = 3
}

variable "max_nodes" {
  description = "Maximum number of nodes in the EKS cluster"
  type        = number
  default     = 20
}

variable "desired_nodes" {
  description = "Desired number of nodes in the EKS cluster"
  type        = number
  default     = 6
}

# Security Configuration
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the cluster"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_irsa" {
  description = "Enable IAM Roles for Service Accounts"
  type        = bool
  default     = true
}

# Cost Optimization
variable "use_spot_instances" {
  description = "Use spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "spot_instance_types" {
  description = "Instance types for spot instances"
  type        = list(string)
  default     = ["t3.large", "t3.xlarge", "m5.large", "m5.xlarge"]
}

# Feature Flags
variable "enable_cluster_autoscaler" {
  description = "Enable cluster autoscaler"
  type        = bool
  default     = true
}

variable "enable_load_balancer_controller" {
  description = "Enable AWS Load Balancer Controller"
  type        = bool
  default     = true
}

variable "enable_external_dns" {
  description = "Enable External DNS"
  type        = bool
  default     = true
}

variable "enable_cert_manager" {
  description = "Enable cert-manager for SSL certificates"
  type        = bool
  default     = true
}

# Application Configuration
variable "app_replicas" {
  description = "Number of application replicas"
  type        = map(number)
  default = {
    api_gateway      = 3
    auth_service     = 2
    financial_service = 2
    subsidy_service  = 2
    insurance_service = 2
    analytics_service = 2
    document_service = 2
    notification_service = 2
    iot_service      = 2
  }
}

variable "resource_limits" {
  description = "Resource limits for services"
  type = map(object({
    cpu_request    = string
    memory_request = string
    cpu_limit      = string
    memory_limit   = string
  }))
  default = {
    api_gateway = {
      cpu_request    = "250m"
      memory_request = "512Mi"
      cpu_limit      = "500m"
      memory_limit   = "1Gi"
    }
    auth_service = {
      cpu_request    = "100m"
      memory_request = "256Mi"
      cpu_limit      = "250m"
      memory_limit   = "512Mi"
    }
    financial_service = {
      cpu_request    = "200m"
      memory_request = "512Mi"
      cpu_limit      = "500m"
      memory_limit   = "1Gi"
    }
    subsidy_service = {
      cpu_request    = "100m"
      memory_request = "256Mi"
      cpu_limit      = "250m"
      memory_limit   = "512Mi"
    }
    insurance_service = {
      cpu_request    = "100m"
      memory_request = "256Mi"
      cpu_limit      = "250m"
      memory_limit   = "512Mi"
    }
    analytics_service = {
      cpu_request    = "500m"
      memory_request = "1Gi"
      cpu_limit      = "1000m"
      memory_limit   = "2Gi"
    }
    document_service = {
      cpu_request    = "100m"
      memory_request = "256Mi"
      cpu_limit      = "250m"
      memory_limit   = "512Mi"
    }
    notification_service = {
      cpu_request    = "100m"
      memory_request = "128Mi"
      cpu_limit      = "200m"
      memory_limit   = "256Mi"
    }
    iot_service = {
      cpu_request    = "200m"
      memory_request = "512Mi"
      cpu_limit      = "500m"
      memory_limit   = "1Gi"
    }
  }
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "dr_region" {
  description = "DR AWS region"
  type        = string
  default     = "us-east-1"
}

variable "enable_dr" {
  description = "Enable multi-region DR"
  type        = bool
  default     = true
}