document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                email,
                password,
                rememberMe
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('userType', data.userType);
            localStorage.setItem('userId', data.userId);

            if (data.rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            }

            if (data.userType === 'diabetes') {
                window.location.href = '/diabetes/dashboard.html';
            } else if (data.userType === 'ed') {
                window.location.href = '/ed/dashboard.html';
            }
        } else {
            alert(`Ошибка: ${data.message}`);
        }
    } catch (error) {
        console.error('Ошибка при логине:', error);
        alert('Ошибка при отправке данных на сервер');
    }
});



