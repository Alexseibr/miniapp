# Деплой "Куфор-Код" на один VPS (Docker + Nginx + SSL)

## Структура директорий
```
/opt/kufor-code
  docker-compose.yml
  /backend
    Dockerfile
    .env (создать из .env.example)
  /frontend
    Dockerfile
    .env (создать из .env.example)
  /nginx
    nginx.conf
    /certbot
      /conf  -> монтируется в /etc/letsencrypt
      /www   -> webroot для ACME
    dhparam.pem (опционально)
  /data
    /mongo -> данные MongoDB
```

## Переменные окружения
- `backend/.env` — backend (`MONGODB_URI`, `PORT=5000`, `NODE_ENV=production`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `API_BASE_URL=https://<YOUR_DOMAIN>/api`, `FRONTEND_BASE_URL=https://<YOUR_DOMAIN>`).
- `frontend/.env` — фронт (`VITE_API_BASE_URL=https://<YOUR_DOMAIN>/api`).

Скопируйте примеры `.env.example` и подставьте реальные значения и домен.

## Шаги развёртывания на VPS
1. Обновить пакеты и установить Docker:
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose -y
   ```
2. Клонировать проект и перейти в директорию:
   ```bash
   sudo mkdir -p /opt && cd /opt
   sudo git clone <REPO_URL> kufor-code
   cd kufor-code
   ```
3. Создать каталоги для данных и сертификатов:
   ```bash
   mkdir -p data/mongo nginx/certbot/www nginx/certbot/conf
   ```
4. Настроить конфиги и домен:
   - В `nginx/nginx.conf` замените `<YOUR_DOMAIN>` на ваш домен (например, `example.com`).
   - Заполните `backend/.env` и `frontend/.env` на основе `.env.example`.

5. Получить первичный SSL-сертификат (nginx должен слушать 80 порт):
   ```bash
   docker compose run --rm certbot certonly \
     --webroot -w /var/www/certbot \
     -d <YOUR_DOMAIN> \
     --email <YOUR_EMAIL> \
     --agree-tos \
     --no-eff-email
   ```
   Если nginx ещё не может стартовать из-за отсутствующих сертификатов, выполните ту же команду с флагом `--standalone` (порт 80 должен быть свободен), а затем поднимите весь стек.

6. Запустить сервисы:
   ```bash
   docker compose up -d --build
   ```

7. Проверить:
   - `https://<YOUR_DOMAIN>/` — отдает фронт.
   - `https://<YOUR_DOMAIN>/api/health` (если маршрут существует) — отвечает backend.

## Обновление сертификатов
Запланируйте cron-задачу на хосте для автоматического продления:
```
0 3 * * * cd /opt/kufor-code && docker compose run --rm certbot renew && docker compose kill -s HUP nginx
```

## Важные заметки
- Certbot использует webroot `/var/www/certbot` (смонтирован из `nginx/certbot/www`).
- Сертификаты хранятся в `nginx/certbot/conf` и монтируются в nginx в `/etc/letsencrypt`.
- Контейнер `nginx` слушает 80/443 и проксирует:
  - `/` → `frontend:80`
  - `/api/` и `/socket.io/` → `backend:5000`
- MongoDB хранит данные в `data/mongo` на хосте.
