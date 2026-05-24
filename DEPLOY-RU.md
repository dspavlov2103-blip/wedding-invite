# Как отправить приглашение друзьям (публичная ссылка)

**Почему не открывается у друзей:** ссылка вида `http://localhost:3847` работает только на вашем компьютере. Друзьям нужна ссылка из интернета (`https://...`).

---

## Вариант А — быстро, на сегодня (5 минут)

Пока ваш ПК включён и скрипт запущен:

1. Дважды щёлкните **`start.bat`** (сайт на вашем ПК).
2. Правой кнопкой по **`share-online.ps1`** → **Выполнить с PowerShell**  
   (если ругается на политику: в PowerShell от администратора один раз:  
   `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`)
3. В окне появится строка вида:  
   `https://xxxx-xx-xx.trycloudflare.com`  
   **Эту ссылку** отправляйте в WhatsApp / Telegram.

Минусы: компьютер должен быть включён; ссылка меняется при каждом новом запуске скрипта.

---

## Вариант Б — постоянная ссылка (рекомендуется)

Бесплатный хостинг **Render.com** — сайт в интернете 24/7, анкета гостей сохраняется.

### Шаг 1. Репозиторий на GitHub

1. Зайдите на [github.com](https://github.com) → **New repository**.
2. Имя, например: `wedding-invite` → **Create** (без README).
3. На компьютере в папке проекта откройте **Git Bash** или PowerShell:

```powershell
cd C:\Users\user\wedding-invite-villa-romanov
git init
git add .
git commit -m "Свадебное приглашение"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/wedding-invite.git
git push -u origin main
```

(подставьте свой логин и URL репозитория)

### Шаг 2. Render

1. [render.com](https://render.com) → регистрация (можно через GitHub).
2. **New +** → **Web Service** → подключите репозиторий `wedding-invite`.
3. Настройки:
   - **Runtime:** Node
   - **Build Command:** `echo ok` (или пусто)
   - **Start Command:** `node server.js`
   - **Instance type:** Free
4. В **Environment** добавьте переменную:
   - `ADMIN_PASSWORD` = ваш пароль для `/admin` (не `svadba2026` в продакшене!)
5. **Create Web Service** — подождите 2–5 минут.

Готовая ссылка будет вида:  
`https://wedding-invite-xxxx.onrender.com`  
Её и отправляйте гостям.

**Админка:** `https://ваш-сайт.onrender.com/admin`  
Пароль — тот, что задали в `ADMIN_PASSWORD`.

### Важно про Render (бесплатный тариф)

- Первое открытие после простоя может грузиться **30–60 секунд** — это нормально.
- Ответы анкеты хранятся на сервере; периодически заходите в админку и **скачивайте CSV**.

---

## Что отправить друзьям

Одна короткая ссылка, например:

> Приглашение на нашу свадьбу 🌸  
> https://wedding-invite-xxxx.onrender.com

Не отправляйте `localhost` — у других не откроется.

---

## Локально у себя

- Сайт: `start.bat` → http://localhost:3847  
- Музыка: положите MP3 в `public/audio/na-beregu-neba-instrumental.mp3`  
- Имена и Telegram: `public/js/config.js`
