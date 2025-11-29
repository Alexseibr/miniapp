# Развёртывание KETMAR Market на VPS

## Требования
- Debian 12 / Ubuntu 22.04
- 2+ GB RAM
- 20+ GB SSD
- Домен ketmar.by (настроенный на hoster.by)

---

## Часть 1: Подготовка сервера

```bash
# Обновление системы
apt update && apt upgrade -y
apt install -y curl wget git ufw nano htop unzip ca-certificates lsb-release gnupg

# Node.js 20 (нужен для сборки)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Docker
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] \
https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
> /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Nginx
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx

# Firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

---

## Часть 2: Загрузка проекта

```bash
# Создать директорию
mkdir -p /var/www/ketmar
cd /var/www/ketmar

# Вариант A: Клонировать из GitHub
git clone https://github.com/YOUR_REPO/ketmar-market.git .

# Вариант B: Загрузить архив через SCP
# На локальной машине:
# scp ketmar-market-backup.tar.gz root@YOUR_SERVER_IP:/var/www/ketmar/
# На сервере:
# tar -xzf ketmar-market-backup.tar.gz
```

---

## Часть 3: Настройка окружения

```bash
cd /var/www/ketmar

# Создать файл окружения
cp .env.production.example .env.production
nano .env.production
```

**Заполнить в .env.production:**
- `MONGO_PASSWORD` - надёжный пароль для MongoDB
- `BOT_TOKEN` - токен Telegram бота
- `JWT_SECRET` - секретный ключ (минимум 32 символа)
- `GCS_*` - данные Google Cloud Storage (для фото)

**Если используете GCS, добавить credentials:**
```bash
# Скопировать файл с ключами GCS
scp gcs-credentials.json root@YOUR_SERVER_IP:/var/www/ketmar/
```

---

## Часть 4: Запуск Docker

```bash
cd /var/www/ketmar

# Сборка и запуск
docker compose up -d --build

# Проверка статуса
docker compose ps

# Просмотр логов
docker compose logs -f app
```

**Должны работать контейнеры:**
- `ketmar-app` - основное приложение (порт 3000)
- `ketmar-mongo` - база данных MongoDB
- `ketmar-redis` - кэш и очереди Redis

---

## Часть 5: Настройка Nginx

### API и приложение (app.ketmar.by)

```bash
nano /etc/nginx/sites-available/ketmar.by
```

Вставить:

```nginx
# Редирект с www и основного домена
server {
    listen 80;
    server_name ketmar.by www.ketmar.by;
    return 301 https://app.ketmar.by$request_uri;
}

# Основное приложение
server {
    listen 80;
    server_name app.ketmar.by api.ketmar.by;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Активировать:

```bash
ln -s /etc/nginx/sites-available/ketmar.by /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## Часть 6: SSL сертификаты

```bash
# Получить сертификаты
certbot --nginx -d app.ketmar.by -d api.ketmar.by -d ketmar.by -d www.ketmar.by

# Автопродление (уже настроено)
systemctl enable certbot.timer
```

---

## Часть 7: Настройка DNS (hoster.by)

В панели hoster.by добавить A-записи:

| Запись | Тип | Значение |
|--------|-----|----------|
| @ | A | YOUR_SERVER_IP |
| www | A | YOUR_SERVER_IP |
| app | A | YOUR_SERVER_IP |
| api | A | YOUR_SERVER_IP |

TTL: 300-600

---

## Часть 8: Обновление Telegram Webhook

После запуска обновить webhook бота:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://app.ketmar.by/telegram-webhook"
```

---

## Полезные команды

```bash
# Перезапуск приложения
docker compose restart app

# Пересборка после изменений
docker compose up -d --build app

# Просмотр логов
docker compose logs -f app

# Остановка всех сервисов
docker compose down

# Бэкап MongoDB
docker exec ketmar-mongo mongodump --out /data/backup --authenticationDatabase admin -u ketmar_admin -p YOUR_PASSWORD
docker cp ketmar-mongo:/data/backup ./mongo-backup-$(date +%Y%m%d)

# Очистка Docker (осторожно!)
docker system prune -a
```

---

## Статус после развёртывания

- **MiniApp**: https://app.ketmar.by
- **API**: https://app.ketmar.by/api/...
- **Telegram Bot**: @KetmarM_bot
- **Health Check**: https://app.ketmar.by/health

---

## Troubleshooting

### Приложение не запускается
```bash
docker compose logs app
```

### MongoDB не подключается
```bash
docker compose logs mongo
docker exec -it ketmar-mongo mongosh -u ketmar_admin -p YOUR_PASSWORD
```

### Redis не работает
```bash
docker compose logs redis
docker exec -it ketmar-redis redis-cli ping
```

### Nginx ошибки
```bash
nginx -t
tail -f /var/log/nginx/error.log
```
