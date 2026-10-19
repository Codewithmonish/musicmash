# Music Mash Deployment Guide

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Database Setup](#database-setup)
5. [Production Configuration](#production-configuration)
6. [Monitoring & Maintenance](#monitoring--maintenance)

## Environment Setup

### Required Environment Variables

#### Backend (application.properties)
```properties
# Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/music_mash
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

# JWT Configuration
jwt.secret=${JWT_SECRET}
jwt.expiration=86400000

# File Upload Configuration
file.upload-dir=${FILE_UPLOAD_DIR}
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8081/api
```

### Setting Environment Variables

#### Windows (PowerShell)
```powershell
$env:DB_USERNAME="your_db_username"
$env:DB_PASSWORD="your_db_password"
$env:JWT_SECRET="your_jwt_secret"
$env:FILE_UPLOAD_DIR="C:/uploads"
```

#### Linux/Mac
```bash
export DB_USERNAME="your_db_username"
export DB_PASSWORD="your_db_password"
export JWT_SECRET="your_jwt_secret"
export FILE_UPLOAD_DIR="/var/uploads"
```

## Backend Deployment

### Option 1: JAR Deployment

#### Build the JAR
```bash
cd music-mash-backend
mvn clean package -DskipTests
```

#### Run the JAR
```bash
java -jar target/music-mash-backend-1.0.0.jar
```

#### Run with Environment Variables
```bash
java -jar target/music-mash-backend-1.0.0.jar \
  --spring.datasource.username=${DB_USERNAME} \
  --spring.datasource.password=${DB_PASSWORD} \
  --jwt.secret=${JWT_SECRET}
```

### Option 2: Docker Deployment

#### Create Dockerfile
```dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/music-mash-backend-1.0.0.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### Build Docker Image
```bash
docker build -t music-mash-backend:latest .
```

#### Run Docker Container
```bash
docker run -d \
  -p 8081:8081 \
  -e DB_USERNAME=${DB_USERNAME} \
  -e DB_PASSWORD=${DB_PASSWORD} \
  -e JWT_SECRET=${JWT_SECRET} \
  music-mash-backend:latest
```

### Option 3: Systemd Service (Linux)

#### Create Service File
```ini
[Unit]
Description=Music Mash Backend Service
After=network.target

[Service]
Type=simple
User=musicmash
WorkingDirectory=/opt/music-mash/backend
ExecStart=/usr/bin/java -jar /opt/music-mash/backend/music-mash-backend-1.0.0.jar
Restart=always
RestartSec=10
Environment=DB_USERNAME=${DB_USERNAME}
Environment=DB_PASSWORD=${DB_PASSWORD}
Environment=JWT_SECRET=${JWT_SECRET}

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Service
```bash
sudo systemctl enable music-mash-backend
sudo systemctl start music-mash-backend
sudo systemctl status music-mash-backend
```

## Frontend Deployment

### Option 1: Static Hosting (Netlify, Vercel, GitHub Pages)

#### Build for Production
```bash
cd music-mash-frontend
npm run build
```

#### Deploy to Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```

### Option 2: Nginx Deployment

#### Build for Production
```bash
cd music-mash-frontend
npm run build
```

#### Configure Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/music-mash;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Deploy Files
```bash
sudo cp -r dist/* /var/www/music-mash/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 3: Docker Deployment

#### Create Dockerfile
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Build and Run
```bash
docker build -t music-mash-frontend:latest .
docker run -d -p 80:80 music-mash-frontend:latest
```

## Database Setup

### MySQL Setup

#### Install MySQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# CentOS/RHEL
sudo yum install mysql-server

# macOS
brew install mysql
```

#### Create Database
```sql
CREATE DATABASE music_mash;
CREATE USER 'musicmash'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON music_mash.* TO 'musicmash'@'localhost';
FLUSH PRIVILEGES;
```

#### Import Schema
```bash
mysql -u musicmash -p music_mash < DATABASE_SCHEMA.sql
```

#### Backup Database
```bash
mysqldump -u musicmash -p music_mash > backup.sql
```

 automated Backup (Cron)
```bash
# Add to crontab for daily backup at 2 AM
0 2 * * * mysqldump -u musicmash -pPASSWORD music_mash > /backups/music_mash_$(date +\%Y\%m\%d).sql
```

## Production Configuration

### Security Best Practices

1. **Use HTTPS**
   - Obtain SSL certificate from Let's Encrypt
   - Configure Nginx/Apache with SSL

2. **Environment Variables**
   - Never commit secrets to git
   - Use secure secret management
   - Rotate secrets regularly

3. **Database Security**
   - Use strong passwords
   - Restrict database access
   - Enable SSL for database connections

4. **API Security**
   - Implement rate limiting
   - Use CORS properly
   - Validate all inputs

### Performance Optimization

1. **Backend**
   - Enable connection pooling
   - Configure caching (Redis)
   - Optimize database queries
   - Enable GZIP compression

2. **Frontend**
   - Enable code splitting
   - Optimize images
   - Use CDN for static assets
   - Enable browser caching

3. **Database**
   - Add indexes to frequently queried columns
   - Optimize slow queries
   - Use read replicas for scaling

## Monitoring & Maintenance

### Health Checks

#### Backend Health Endpoint
```bash
curl http://localhost:8081/actuator/health
```

#### Database Connection Check
```bash
mysql -u musicmash -p -e "SELECT 1"
```

### Logging

#### Backend Logs
```bash
# View logs
tail -f /var/log/music-mash/backend.log

# Rotate logs
logrotate /etc/logrotate.d/music-mash
```

#### Nginx Logs
```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

### Monitoring Tools

#### Prometheus + Grafana
- Set up Prometheus for metrics collection
- Configure Grafana dashboards
- Monitor: CPU, memory, disk, network, application metrics

#### Uptime Monitoring
- Use services like UptimeRobot, Pingdom
- Monitor API endpoints
- Set up alerting for downtime

### Backup Strategy

1. **Database Backups**
   - Daily automated backups
   - Weekly full backups
   - Retain backups for 30 days
   - Store backups off-site

2. **File Storage Backups**
   - Backup uploaded files
   - Use object storage with versioning
   - Implement lifecycle policies

3. **Code Backups**
   - Use Git for version control
   - Tag releases
   - Maintain backup branches

### Update Procedure

1. **Backend Update**
   ```bash
   # Pull latest code
   git pull origin main
   
   # Build new JAR
   mvn clean package -DskipTests
   
   # Stop service
   sudo systemctl stop music-mash-backend
   
   # Backup current JAR
   cp music-mash-backend.jar music-mash-backend.jar.backup
   
   # Deploy new JAR
   cp target/music-mash-backend-1.0.0.jar /opt/music-mash/backend/
   
   # Start service
   sudo systemctl start music-mash-backend
   
   # Verify
   sudo systemctl status music-mash-backend
   ```

2. **Frontend Update**
   ```bash
   # Pull latest code
   git pull origin main
   
   # Build
   npm run build
   
   # Deploy
   sudo cp -r dist/* /var/www/music-mash/
   
   # Clear cache
   sudo systemctl reload nginx
   ```

### Troubleshooting

#### Backend Won't Start
```bash
# Check logs
sudo journalctl -u music-mash-backend -n 50

# Check port availability
netstat -tulpn | grep 8081

# Check database connection
mysql -u musicmash -p -h localhost music_mash
```

#### Frontend Not Loading
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify file permissions
ls -la /var/www/music-mash
```

#### Database Issues
```bash
# Check MySQL status
sudo systemctl status mysql

# Check database size
mysql -u musicmash -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema = 'music_mash'"

# Check slow queries
mysql -u musicmash -p -e "SHOW VARIABLES LIKE 'slow_query_log'"
```

## Scaling Considerations

### Horizontal Scaling
- Load balancer (Nginx, HAProxy)
- Multiple backend instances
- Session management (Redis)
- Database read replicas

### Vertical Scaling
- Increase server resources
- Optimize application performance
- Database tuning

### Cloud Deployment
- AWS: EC2, RDS, S3, CloudFront
- Google Cloud: Compute Engine, Cloud SQL, Cloud Storage
- Azure: VMs, Azure SQL, Blob Storage

## Support

For deployment issues:
1. Check logs first
2. Review configuration
3. Verify environment variables
4. Test database connectivity
5. Check firewall rules
