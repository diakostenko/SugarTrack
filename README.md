# SugarTrack

SugarTrack - это прототип веб-приложения для поддержки пользователей в двух сценариях:

- версия для диабета (дневник питания, замеры, лекарства, дашборд),
- версия для РПП/эмоционального трекинга (дашборд, эмо-дневник, срочная помощь).

Проект на текущем этапе сфокусирован на UI/UX и статичных макетах: основные страницы уже сверстаны в едином стиле, а интерактивная логика и интеграции будут добавляться дальше.

## Стек

- Node.js
- Express
- Bootstrap 5
- Bootstrap Icons
- Mongoose (подключен как зависимость для будущей интеграции)

## Быстрый запуск

1. Установите зависимости:

```bash
npm install
```

2. Запустите сервер:

```bash
npm start
```

После запуска:

- `http://localhost:3000`
- `http://localhost:3000/register.html`
- `http://localhost:3000/login.html`

## Структура проекта

```text
SugarTrack/
|- index.js
|- package.json
|- README.md
`- public/
   |- index.html
   |- register.html
   |- login.html
   |- css/
   |  |- register.css
   |  |- dashboard.css
   |  |- eatdiary.css
   |  |- measurements.css
   |  |- medicines.css
   |  |- emodiary.css
   |  `- emergencyhelp.css
   |- diabetes/
   |  |- dashboard.html
   |  |- eatdiary.html
   |  |- measurements.html
   |  `- medicines.html
   `- ed/
      |- dashboard.html
      |- emodiary.html
      `- emergencyhelp.html
```

## Текущие разделы

### Общие страницы

- `public/register.html` - регистрация (демо-логика, редирект на логин)
- `public/login.html` - вход по e-mail и паролю (пока заглушка)

### Диабет-версия

- `public/diabetes/dashboard.html`
- `public/diabetes/eatdiary.html`
- `public/diabetes/measurements.html`
- `public/diabetes/medicines.html`

### ED-версия

- `public/ed/dashboard.html`
- `public/ed/emodiary.html`
- `public/ed/emergencyhelp.html`

## Текущее состояние

- Темная дизайн-система (серо-фиолетовая палитра) унифицирована между страницами.
- Навигация между ключевыми разделами настроена.
- Большинство action-кнопок являются статичными заглушками для демонстрации интерфейса.
- Графики на страницах пока реализованы как визуальные placeholders.

## Roadmap

- Подключение БД и моделей через Mongoose.
- Сохранение данных дневников/замеров/эмоциональных записей.
- Реальная авторизация и управление сессией пользователя.
- Интеграция Chart.js вместо текущих заглушек диаграмм.
- Подключение API продуктов для расчетов и справочной информации.

## Лицензия

MIT

