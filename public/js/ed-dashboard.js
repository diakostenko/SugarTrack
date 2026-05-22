const quoteElement = document.getElementById('daily-quote');
const quoteAuthorElement = document.getElementById('daily-quote-author');
const refreshButton = document.getElementById('refresh-quote-btn');

// загрузка цитаты
async function loadQuote() {
    try {
        const response = await fetch('/ed/api/quote', {
            method: 'GET',
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Ошибка загрузки');
        }

        const data = await response.json();
        quoteElement.textContent = `«${data.quote}»`;
        quoteAuthorElement.textContent = data.autor ? `— ${data.autor}` : '';
    } catch (error) {
        quoteElement.textContent = 'Не удалось загрузить цитату. Попробуйте позже.';
        quoteAuthorElement.textContent = '';
    }
}

// загрузка статистики за неделю
async function loadWeeklyStats() {
    try {
        const response = await fetch('/ed/api/weekly-stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Ошибка загрузки статистики');

        const data = await response.json();

        document.getElementById('stat-total').textContent = data.total || 0;
        document.getElementById('stat-good').textContent = data.good || 0;
        document.getElementById('stat-normal').textContent = data.normal || 0;
        document.getElementById('stat-bad').textContent = data.bad || 0;

    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        document.getElementById('stat-total').textContent = '—';
        document.getElementById('stat-good').textContent = '—';
        document.getElementById('stat-normal').textContent = '—';
        document.getElementById('stat-bad').textContent = '—';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadQuote();
    loadWeeklyStats();

    if (refreshButton) {
        refreshButton.addEventListener('click', loadQuote);
    }
});
