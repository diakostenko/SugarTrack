document.addEventListener('DOMContentLoaded', () => {
    // инициализируем кнопку выхода
    initLogoutButton();
});

function initLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');

    if (!logoutBtn) {
        console.warn('Кнопка выхода не найдена');
        return;
    }

    logoutBtn.addEventListener('click', async () => {
        const confirmed = confirm('Вы уверены, что хотите выйти из аккаунта?');

        if (!confirmed) {
            return;
        }

        try {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Выход...';

            const response = await fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // очищаем localstorage
                localStorage.removeItem('userType');
                localStorage.removeItem('userId');
                localStorage.removeItem('rememberMe');

                // перенаправляем на страницу входа
                window.location.href = '/login.html';
            } else {
                console.error('Ошибка выхода:', data.error);
                alert('Ошибка выхода: ' + (data.error || 'Неизвестная ошибка'));

                logoutBtn.disabled = false;
                logoutBtn.innerHTML = '<i class="bi bi-box-arrow-right me-2"></i>Выйти из аккаунта';
            }
        } catch (error) {
            console.error('Ошибка при выходе:', error);
            alert('Ошибка при выходе из аккаунта');

            logoutBtn.disabled = false;
            logoutBtn.innerHTML = '<i class="bi bi-box-arrow-right me-2"></i>Выйти из аккаунта';
        }
    });
}
