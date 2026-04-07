// Функция переключения блоков
function toggleUserTypeFields() {
    const userType = document.getElementById('userType').value;
    const diabetesFields = document.getElementById('diabetesFields');
    const edFields = document.getElementById('edFields');
    const diabetesGoals = document.getElementById('diabetesGoals');
    const edGoals = document.getElementById('edGoals');

    if (userType === 'diabetes') {
        diabetesFields.classList.remove('d-none');
        edFields.classList.add('d-none');
        diabetesGoals.classList.remove('d-none');
        edGoals.classList.add('d-none');
    } else if (userType === 'ed') {
        diabetesFields.classList.add('d-none');
        edFields.classList.remove('d-none');
        diabetesGoals.classList.add('d-none');
        edGoals.classList.remove('d-none');
    }
}

// Показываем блоки при загрузке страницы (по умолчанию диабет)
document.addEventListener('DOMContentLoaded', function() {
    toggleUserTypeFields();
});

// Показываем нужные поля при изменении типа
document.getElementById('userType').addEventListener('change', toggleUserTypeFields);

// Отправка формы на сервер
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Собираем основные данные
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        userType: document.getElementById('userType').value
    };

    // Собираем дополнительные данные в зависимости от типа пользователя
    if (formData.userType === 'diabetes') {
        formData.diabetesType = document.getElementById('diabetesType').value;
        formData.diagnosisYear = document.getElementById('diagnosisYear').value;
        formData.insulinUse = document.getElementById('insulinUse').value;
        formData.targetGlucose = document.getElementById('targetGlucose').value;
        formData.hba1cGoal = document.getElementById('hba1cGoal').value;
        formData.weightGoalDiabetes = document.getElementById('weightGoalDiabetes').value;
    } else if (formData.userType === 'ed') {
        formData.edType = document.getElementById('edType').value;
        formData.supportLevel = document.getElementById('supportLevel').value;
        formData.triggerWarnings = document.getElementById('triggerWarnings').value;
        formData.emotionalGoal = document.getElementById('emotionalGoal').value;
        formData.trackingFrequency = document.getElementById('trackingFrequency').value;
        formData.supportGoal = document.getElementById('supportGoal').value;
    }

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            alert(`${data.message} Перенаправление на вход...`);
            // Редирект на страницу логина
            window.location.href = '/auth/login';
        } else {
            alert(`Ошибка: ${data.message}`);
        }
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        alert('Ошибка при отправке данных на сервер');
    }
});

