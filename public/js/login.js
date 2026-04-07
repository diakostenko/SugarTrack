// Обработчик отправки формы логина
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;

    alert(`Добро пожаловать! Вход выполнен для ${email} (демо-режим)`);

    // Пока не делаем редирект - это заглушка
    // В будущем здесь будет редирект на dashboard в зависимости от типа пользователя
});

