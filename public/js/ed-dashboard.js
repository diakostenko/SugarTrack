const quoteElement = document.getElementById('daily-quote');
const quoteAuthorElement = document.getElementById('daily-quote-author');
const refreshButton = document.getElementById('refresh-quote-btn');

async function loadQuote() {
    const response = await fetch('/ed/api/quote', {
        method: 'GET',
        credentials: 'same-origin'
    });

    if (!response.ok) {
        quoteElement.textContent = 'Не удалось загрузить цитату. Попробуйте позже.';
        quoteAuthorElement.textContent = '';
        return;
    }

    const data = await response.json();
    quoteElement.textContent = `«${data.quote}»`;
    quoteAuthorElement.textContent = data.autor ? `— ${data.autor}` : '';
}

document.addEventListener('DOMContentLoaded', () => {
    loadQuote().catch(() => {
        quoteElement.textContent = 'Не удалось загрузить цитату. Попробуйте позже.';
        quoteAuthorElement.textContent = '';
    });

    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            loadQuote().catch(() => {
                quoteElement.textContent = 'Не удалось загрузить цитату. Попробуйте позже.';
                quoteAuthorElement.textContent = '';
            });
        });
    }
});


