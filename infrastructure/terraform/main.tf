# DaorsAgro Infrastructure as Code
# AWS EKS cluster with optimized configuration for agricultural platform

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }

  backend "s3" {
    bucket = "daorsagro-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
    
    dynamodb_table = "daorsagro-terraform-locks"
    encrypt        = true
  }
}

# Configure providers
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "DaorsAgro"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  cluster_name = "daorsagro-${var.environment}"
  
  common_tags = {
    Project     = "DaorsAgro"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.cluster_name}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Enable VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }

  tags = local.common_tags
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = local.cluster_name
  cluster_version = var.kubernetes_version

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true

  # Cluster encryption
  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }

  # Cluster logging
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  # EKS Managed Node Groups
  eks_managed_node_groups = {
    # General purpose nodes
    general = {
      name = "general"
      
      instance_types = ["t3.large", "t3.xlarge"]
      capacity_type  = "ON_DEMAND"
      
      min_size     = 3
      max_size     = 10
      desired_size = 3

      # Node group configuration
      ami_type       = "AL2_x86_64"
      disk_size      = 50
      disk_type      = "gp3"
      disk_encrypted = true

      # Kubernetes labels
      labels = {
        role = "general"
      }

      # Taints for dedicated workloads
      taints = []

      tags = merge(local.common_tags, {
        NodeGroup = "general"
      })
    }

    # Database nodes with high memory
    database = {
      name = "database"
      
      instance_types = ["r5.xlarge", "r5.2xlarge"]
      capacity_type  = "ON_DEMAND"
      
      min_size     = 2
      max_size     = 6
      desired_size = 2

      ami_type       = "AL2_x86_64"
      disk_size      = 100
      disk_type      = "gp3"
      disk_encrypted = true

      labels = {
        role = "database"
      }

      taints = [
        {
          key    = "database"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]

      tags = merge(local.common_tags, {
        NodeGroup = "database"
      })
    }

    # Compute-intensive nodes for analytics
    compute = {
      name = "compute"
      
      instance_types = ["c5.2xlarge", "c5.4xlarge"]
      capacity_type  = "SPOT"
      
      min_size     = 1
      max_size     = 8
      desired_size = 2

      ami_type       = "AL2_x86_64"
      disk_size      = 100
      disk_type      = "gp3"
      disk_encrypted = true

      labels = {
        role = "compute"
      }

      taints = [
        {
          key    = "compute"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]

      tags = merge(local.common_tags, {
        NodeGroup = "compute"
      })
    }
  }

  # Fargate profiles for serverless workloads
  fargate_profiles = {
    default = {
      name = "default"
      selectors = [
        {
          namespace = "kube-system"
          labels = {
            k8s-app = "kube-dns"
          }
        },
        {
          namespace = "daorsagro"
          labels = {
            compute-type = "fargate"
          }
        }
      ]

      tags = merge(local.common_tags, {
        Profile = "fargate-default"
      })
    }
  }

  # OIDC Identity provider
  cluster_identity_providers = {
    sts = {
      client_id = "sts.amazonaws.com"
    }
  }

  tags = local.common_tags
}

# KMS Key for EKS encryption
resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-eks-key"
  })
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${local.cluster_name}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# RDS for PostgreSQL
resource "aws_db_subnet_group" "main" {
  name       = "${local.cluster_name}-db-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-db-subnet-group"
  })
}

resource "aws_security_group" "rds" {
  name_prefix = "${local.cluster_name}-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-rds-sg"
  })
}

resource "aws_db_instance" "main" {
  identifier = "${local.cluster_name}-postgres"

  # Engine configuration
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.rds_instance_class

  # Storage configuration
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds.arn

  # Database configuration
  db_name  = "daorsagro"
  username = "postgres"
  password = var.db_password

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Performance Insights
  performance_insights_enabled = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn

  # Deletion protection
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-postgres"
  })
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "RDS Encryption Key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-rds-key"
  })
}

# ElastiCache for Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.cluster_name}-cache-subnet"
  subnet_ids = module.vpc.private_subnets

  tags = local.common_tags
}

resource "aws_security_group" "elasticache" {
  name_prefix = "${local.cluster_name}-cache-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-cache-sg"
  })
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${local.cluster_name}-redis"
  description                = "Redis cluster for DaorsAgro"

  # Engine configuration
  engine               = "redis"
  engine_version       = "7.0"
  node_type           = var.redis_node_type
  port                = 6379

  # Cluster configuration
  num_cache_clusters = 2
  parameter_group_name = "default.redis7"

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.elasticache.id]

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_auth_token

  # Backup
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-redis"
  })
}

# S3 Bucket for document storage
resource "aws_s3_bucket" "documents" {
  bucket = "${local.cluster_name}-documents"

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-documents"
  })
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "documents" {
  bucket = aws_s3_bucket.documents.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.s3.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# KMS Key for S3 encryption
resource "aws_kms_key" "s3" {
  description             = "S3 Encryption Key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-s3-key"
  })
}

# IAM Role for RDS monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${local.cluster_name}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Outputs
output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ids attached to the cluster control plane"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = module.eks.cluster_iam_role_name
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket name for document storage"
  value       = aws_s3_bucket.documents.bucket
}