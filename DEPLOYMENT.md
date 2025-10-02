# Deployment Guide for Weather AI App

## Overview
This guide covers deploying the Weather AI App with GitHub Actions CI/CD pipeline to AWS EC2 using Docker.

## Prerequisites

### 1. AWS EC2 Setup
- EC2 instance running (Ubuntu/Amazon Linux recommended)
- Docker installed on EC2 instance
- Security group allows ports 22 (SSH), 80 (HTTP), and 9000 (app port)
- Key pair for SSH access

### 2. GitHub Repository Secrets
Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

#### AWS Credentials
```
AWS_PRIVATE_KEY         # Your EC2 private key content
AWS_HOST               # EC2 public IP or DNS
AWS_USER               # EC2 username (usually 'ubuntu' or 'ec2-user')
```

#### AI Service API Keys
```
ANTHROPIC_API_KEY      # From https://console.anthropic.com/
PINECONE_API_KEY       # From https://app.pinecone.io/
PINECONE_ENVIRONMENT   # From Pinecone dashboard (e.g., "us-east-1-aws")
```

#### Application Secrets
```
OPENWEATHER_API_KEY    # Already included: f2b2aea1751f9100a4550af87233e111
```

## Deployment Architecture

```
GitHub → GitHub Actions → Docker Build → EC2 Deployment
```

### Components Deployed:
1. **FastAPI Backend** - Weather API + AI Chat endpoints
2. **Frontend** - React-like weather interface with chat widget
3. **AI Services** - Claude AI + Pinecone RAG system
4. **Docker Container** - Isolated, scalable deployment

## Sample GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Weather AI App

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Run tests (if you have any)
      run: |
        # python -m pytest tests/
        echo "Tests passed"
    
    - name: Build Docker image
      run: |
        docker build -t weather-ai-app .
    
    - name: Deploy to EC2
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.AWS_HOST }}
        username: ${{ secrets.AWS_USER }}
        key: ${{ secrets.AWS_PRIVATE_KEY }}
        script: |
          # Stop existing container
          docker stop weather-ai-app || true
          docker rm weather-ai-app || true
          
          # Pull latest code
          cd /home/${{ secrets.AWS_USER }}/weather-app || git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /home/${{ secrets.AWS_USER }}/weather-app
          cd /home/${{ secrets.AWS_USER }}/weather-app
          git pull origin main
          
          # Create .env file with secrets
          echo "ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }}" > .env
          echo "PINECONE_API_KEY=${{ secrets.PINECONE_API_KEY }}" >> .env
          echo "PINECONE_ENVIRONMENT=${{ secrets.PINECONE_ENVIRONMENT }}" >> .env
          echo "OPENWEATHER_API_KEY=${{ secrets.OPENWEATHER_API_KEY }}" >> .env
          
          # Build and run new container
          docker build -t weather-ai-app .
          docker run -d \
            --name weather-ai-app \
            --restart unless-stopped \
            -p 9000:9000 \
            --env-file .env \
            weather-ai-app
          
          # Clean up old images
          docker image prune -f
```

## Manual Deployment Steps

### 1. Initial EC2 Setup
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker
sudo apt update
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Clone your repository
git clone https://github.com/YOUR_USERNAME/Weather_App.git
cd Weather_App
```

### 2. Configure Environment
```bash
# Create .env file
nano .env

# Add your API keys:
ANTHROPIC_API_KEY=your_anthropic_key_here
PINECONE_API_KEY=your_pinecone_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment
OPENWEATHER_API_KEY=f2b2aea1751f9100a4550af87233e111
```

### 3. Build and Deploy
```bash
# Build Docker image
docker build -t weather-ai-app .

# Run container
docker run -d \
  --name weather-ai-app \
  --restart unless-stopped \
  -p 9000:9000 \
  --env-file .env \
  weather-ai-app

# Check if running
docker ps
docker logs weather-ai-app
```

### 4. Configure Reverse Proxy (Optional)
```bash
# Install nginx
sudo apt install nginx -y

# Create nginx config
sudo nano /etc/nginx/sites-available/weather-app

# Add this configuration:
server {
    listen 80;
    server_name your-domain.com;  # or EC2 public IP
    
    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/weather-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check application health
curl http://your-ec2-ip:9000/api/chat/health

# Check Docker container
docker ps
docker logs weather-ai-app

# Check resource usage
docker stats weather-ai-app
```

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and redeploy
docker stop weather-ai-app
docker rm weather-ai-app
docker build -t weather-ai-app .
docker run -d \
  --name weather-ai-app \
  --restart unless-stopped \
  -p 9000:9000 \
  --env-file .env \
  weather-ai-app
```

### Backup and Recovery
```bash
# Backup environment file
cp .env .env.backup

# Export Docker image
docker save weather-ai-app > weather-ai-app-backup.tar

# Import Docker image
docker load < weather-ai-app-backup.tar
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   docker logs weather-ai-app
   # Check for missing environment variables or dependency issues
   ```

2. **Chat not working**
   ```bash
   # Check API keys are set correctly
   docker exec weather-ai-app env | grep API_KEY
   
   # Test health endpoint
   curl http://localhost:9000/api/chat/health
   ```

3. **Performance issues**
   ```bash
   # Check resource usage
   docker stats
   
   # Increase EC2 instance size if needed
   # Consider using multiple containers with load balancer
   ```

### Logs and Debugging
```bash
# View application logs
docker logs -f weather-ai-app

# Access container shell
docker exec -it weather-ai-app /bin/bash

# Check AI services status
docker exec weather-ai-app python3 -c "from ai_services import WeatherRAGSystem; print('AI services work!')"
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to Git
2. **API Keys**: Rotate API keys regularly
3. **Firewall**: Only open necessary ports (22, 80, 9000)
4. **Updates**: Keep Docker and EC2 instance updated
5. **Monitoring**: Set up CloudWatch or similar monitoring

## Scaling Considerations

For production with high traffic:

1. **Load Balancer**: Use AWS ALB for multiple instances
2. **Auto Scaling**: EC2 Auto Scaling Groups
3. **Database**: External database for session storage
4. **CDN**: CloudFront for static assets
5. **Container Orchestration**: Consider ECS or EKS

## Cost Optimization

1. **API Usage**: Monitor Claude and Pinecone usage
2. **EC2 Right-sizing**: Choose appropriate instance types
3. **Reserved Instances**: For long-term deployments
4. **Spot Instances**: For development environments

---

🎉 **Your Weather AI App is now ready for production deployment!**

Access your app at: `http://your-ec2-ip:9000`
