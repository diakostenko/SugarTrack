# SugarTrack

SugarTrack - это прототип веб-приложения для поддержки пользователей в двух сценариях:

- версия для диабета (дневник питания, замеры, лекарства, дашборд),
- версия для РПП/эмоционального трекинга (дашборд, эмо-дневник, срочная помощь).

Проект на текущем этапе включает проработанный UI/UX и базовую аутентификацию: основные страницы уже сверстаны в едином стиле, реализованы регистрация и вход, а расширенная бизнес-логика и интеграции будут добавляться дальше.

## Стек

- Node.js
- Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- `bcrypt`
- `express-rate-limit`
- `dotenv`
- Bootstrap 5

## Структура проекта

```text
SugarTrack/
|- .env
|- .gitignore
|- index.js
|- middleware/
|  `- authJwt.js
|- models/
|  `- user.js
|- package.json
|- package-lock.json
|- README.md
|- routes/
|  `- authRouter.js
`- public/
   |- index.html
   |- register.html
   |- login.html
   |- js/
   |  |- login.js
   |  `- register.js
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

- `public/register.html` - регистрация пользователя (базовая реализация)
- `public/login.html` - вход по e-mail и паролю (базовая реализация)

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
- Реализованы базовые регистрация и вход пользователя (e-mail + пароль).
- Доступ к разделам `diabetes` и `ed` разделен по типу пользователя.
- Большинство action-кнопок внутри страниц остаются статичными заглушками.
- Графики на страницах пока реализованы как визуальные placeholders.

## Roadmap

- Интеграция Chart.js вместо текущих заглушек диаграмм.
- Подключение API продуктов для расчетов и справочной информации.

## Лицензия

MIT

