// ═══════════════════════════════════════════════════════
// ЭМОЦИОНАЛЬНЫЙ ДНЕВНИК — Класс EmoDiary
// ═══════════════════════════════════════════════════════

class EmoDiary {
    constructor() {
        this.currentDate = new Date();
        this.meals = [];
        this.selectedRatings = {};

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.renderDatePicker();
        await this.loadDayData();
        await this.loadChartData();
    }

    // ───────────────────────────────────────────────────
    // Работа с датами
    // ───────────────────────────────────────────────────

    getDateKey(date = this.currentDate) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    renderDatePicker() {
        const picker = document.querySelector('.ed-day-picker');
        if (!picker) {
            console.warn('Элемент .ed-day-picker не найден');
            return;
        }

        picker.innerHTML = '';

        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

        for (let i = -3; i <= 3; i++) {
            const date = new Date(this.currentDate);
            date.setDate(date.getDate() + i);

            const isToday = i === 0;

            picker.innerHTML += `
                <button class="ed-day-btn ${isToday ? 'active' : ''}" type="button" data-offset="${i}">
                    <span>${days[date.getDay()]}</span>
                    <span class="ed-day-num">${date.getDate()}</span>
                </button>
            `;
        }
    }

    changeDate(offset) {
        this.currentDate.setDate(this.currentDate.getDate() + offset);
        this.renderDatePicker();
        this.loadDayData();
    }

    // ───────────────────────────────────────────────────
    // Загрузка данных с сервера
    // ───────────────────────────────────────────────────

    async loadDayData() {
        try {
            const dateStr = this.getDateKey();

            const response = await fetch(`/ed/api/day/${dateStr}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки данных');
            }

            const data = await response.json();
            this.meals = data.meals;

            this.render();
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            this.showError('Не удалось загрузить данные');
        }
    }

    // ───────────────────────────────────────────────────
    // Рендеринг карточек приёмов пищи
    // ───────────────────────────────────────────────────

    render() {
        const container = document.querySelector('.meals-container');
        if (!container) {
            console.warn('Элемент .meals-container не найден');
            return;
        }

        const mealTypes = {
            breakfast: { label: 'Завтрак', badge: 'Утро' },
            lunch: { label: 'Обед', badge: 'День' },
            dinner: { label: 'Ужин', badge: 'Вечер' },
            snacks: { label: 'Перекусы', badge: 'Паузы' }
        };

        container.innerHTML = Object.entries(mealTypes).map(([type, config]) => {
            const meal = this.meals.find(m => m.mealType === type) || {};
            return this.renderMealCard(type, config, meal);
        }).join('');
    }

    renderMealCard(type, config, meal) {
        const moodText = this.getMoodText(meal.moodRating);
        const moodClass = meal.moodRating ? `mood-${meal.moodRating}` : '';

        // Проверяем наличие заметки (учитываем null, undefined, пустую строку)
        const hasSavedNote = meal.note && meal.note.trim().length > 0;

        if (meal.moodRating) {
            this.selectedRatings[type] = meal.moodRating;
        }

        return `
            <div class="col-12 col-lg-6">
                <div class="card register-card border-0 shadow-lg h-100">
                    <div class="card-body p-0">
                        <div class="ed-meal-card h-100">
                            <div class="ed-meal-card__header">
                                <div>
                                    <div class="badge dash-badge mb-2">${config.badge}</div>
                                    <div class="ed-meal-card__title">${config.label}</div>
                                </div>
                                <span class="ed-meal-card__mood ${moodClass}" id="${type}-mood">${moodText}</span>
                            </div>
                            <div class="ed-meal-card__body">
                                
                                <div class="ed-choice-row mb-3">
                                    <button class="btn ed-choice-good ${meal.moodRating === 'good' ? 'active' : ''}" 
                                            type="button" data-meal="${type}" data-rating="good">
                                        <i class="bi bi-emoji-smile me-1"></i>Хорошо
                                    </button>
                                    <button class="btn ed-choice-normal ${meal.moodRating === 'normal' ? 'active' : ''}" 
                                            type="button" data-meal="${type}" data-rating="normal">
                                        <i class="bi bi-emoji-neutral me-1"></i>Нормально
                                    </button>
                                    <button class="btn ed-choice-bad ${meal.moodRating === 'bad' ? 'active' : ''}" 
                                            type="button" data-meal="${type}" data-rating="bad">
                                        <i class="bi bi-emoji-frown me-1"></i>Плохо
                                    </button>
                                </div>

                                <div class="ed-meal-card__text">Как прошёл ${config.label.toLowerCase()}? Оцени своё состояние и добавь заметку.</div>
                                
                                <div class="ed-meal-note-form ${hasSavedNote ? 'd-none' : ''}" id="${type}-note-form">
                                    <div class="mb-3">
                                        <label for="${type}-note" class="ed-meal-note__label">Заметка</label>
                                        <textarea 
                                            id="${type}-note" 
                                            class="form-control" 
                                            rows="3" 
                                            placeholder="Что ел(а), как себя чувствовал(а)..."
                                            style="
                                                background: var(--input-bg);
                                                border: 1px solid var(--input-border);
                                                color: var(--text-main);
                                                border-radius: 10px;
                                                font-size: 14px;
                                            "
                                        >${this.escapeHtml(meal.note || '')}</textarea>
                                    </div>

                                    <div class="ed-meal-actions">
                                        <button class="btn btn-primary" type="button" data-meal="${type}" id="save-${type}">
                                            <i class="bi bi-check2 me-1"></i>Сохранить
                                        </button>
                                    </div>
                                </div>

                                <div class="ed-meal-note-display ${hasSavedNote ? '' : 'd-none'}" id="${type}-note-display">
                                    <div class="ed-meal-note mb-3">
                                        <div class="ed-meal-note__label">Заметка</div>
                                        <div class="ed-meal-note__value" id="${type}-note-text">${this.escapeHtml(meal.note || '')}</div>
                                    </div>

                                    <div class="ed-meal-actions">
                                        <button class="btn btn-outline-secondary" type="button" data-meal="${type}" data-action="clear">
                                            <i class="bi bi-x-lg me-1"></i>Очистить
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ───────────────────────────────────────────────────
    // Обработчики событий
    // ───────────────────────────────────────────────────

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.ed-day-btn')) {
                const btn = e.target.closest('.ed-day-btn');
                const offset = parseInt(btn.dataset.offset);
                this.changeDate(offset);
            }

            if (e.target.closest('[data-rating]')) {
                const btn = e.target.closest('[data-rating]');
                const meal = btn.dataset.meal;
                const rating = btn.dataset.rating;
                this.selectRating(meal, rating);
            }

            if (e.target.closest('[id^="save-"]')) {
                const btn = e.target.closest('[id^="save-"]');
                const meal = btn.dataset.meal;
                this.saveMeal(meal);
            }

            if (e.target.closest('[data-action="clear"]')) {
                const btn = e.target.closest('[data-action="clear"]');
                const meal = btn.dataset.meal;
                this.clearMeal(meal);
            }
        });
    }

    selectRating(meal, rating) {
        this.selectedRatings[meal] = rating;

        document.querySelectorAll(`[data-meal="${meal}"][data-rating]`).forEach(btn => {
            btn.classList.remove('active');
        });

        const selectedBtn = document.querySelector(`[data-meal="${meal}"][data-rating="${rating}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }

        this.updateMoodBadge(meal, rating);
    }

    updateMoodBadge(meal, rating) {
        const badge = document.getElementById(`${meal}-mood`);
        if (!badge) return;

        badge.classList.remove('mood-good', 'mood-normal', 'mood-bad');
        badge.textContent = this.getMoodText(rating);

        if (rating) {
            badge.classList.add(`mood-${rating}`);
        }
    }

    getMoodText(rating) {
        switch(rating) {
            case 'good': return 'Хорошо';
            case 'normal': return 'Нормально';
            case 'bad': return 'Плохо';
            default: return 'Не оценено';
        }
    }

    // ───────────────────────────────────────────────────
    // Сохранение приёма пищи
    // ───────────────────────────────────────────────────

    async saveMeal(mealType) {
        const rating = this.selectedRatings[mealType];
        const note = document.getElementById(`${mealType}-note`)?.value.trim() || '';

        if (!rating) {
            alert('Пожалуйста, выбери оценку (хорошо/нормально/плохо)');
            return;
        }

        const btn = document.getElementById(`save-${mealType}`);
        if (!btn) return;

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Сохранение...';

            const response = await fetch('/ed/api/save-meal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    date: this.getDateKey(),
                    mealType,
                    rating,
                    note
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка сохранения');
            }

            const data = await response.json();

            // Обновляем this.meals с новыми данными
            const mealIndex = this.meals.findIndex(m => m.mealType === mealType);
            if (mealIndex !== -1) {
                this.meals[mealIndex] = {
                    ...this.meals[mealIndex],
                    moodRating: rating,
                    note: note
                };
            } else {
                this.meals.push({
                    mealType: mealType,
                    moodRating: rating,
                    note: note
                });
            }

            // Переключаемся на режим просмотра
            this.switchToViewMode(mealType, note);
            this.showSuccess('Запись сохранена!');

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.showError(`Не удалось сохранить: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check2 me-1"></i>Сохранить';
        }
    }

    // ───────────────────────────────────────────────────
    // Переключение между режимами
    // ───────────────────────────────────────────────────

    switchToViewMode(mealType, noteText) {
        const form = document.getElementById(`${mealType}-note-form`);
        const display = document.getElementById(`${mealType}-note-display`);
        const noteTextEl = document.getElementById(`${mealType}-note-text`);

        if (form && display && noteTextEl) {
            form.classList.add('d-none');
            display.classList.remove('d-none');
            noteTextEl.textContent = noteText || 'Нет заметки';
        }
    }

    switchToEditMode(mealType) {
        const form = document.getElementById(`${mealType}-note-form`);
        const display = document.getElementById(`${mealType}-note-display`);

        if (form && display) {
            form.classList.remove('d-none');
            display.classList.add('d-none');
        }
    }

    // ───────────────────────────────────────────────────
    // Очистка
    // ───────────────────────────────────────────────────

    async clearMeal(mealType) {
        if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
            return;
        }

        try {
            const response = await fetch('/ed/api/save-meal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    date: this.getDateKey(),
                    mealType,
                    rating: this.selectedRatings[mealType] || 'normal',
                    note: ''
                })
            });

            if (!response.ok) throw new Error('Ошибка удаления');

            const noteField = document.getElementById(`${mealType}-note`);
            if (noteField) {
                noteField.value = '';
            }

            this.selectedRatings[mealType] = null;

            document.querySelectorAll(`[data-meal="${mealType}"][data-rating]`).forEach(btn => {
                btn.classList.remove('active');
            });

            const badge = document.getElementById(`${mealType}-mood`);
            if (badge) {
                badge.textContent = 'Не оценено';
                badge.className = 'ed-meal-card__mood';
            }

            // Обновляем this.meals
            const mealIndex = this.meals.findIndex(m => m.mealType === mealType);
            if (mealIndex !== -1) {
                this.meals[mealIndex].note = '';
            }

            this.switchToEditMode(mealType);
            this.showSuccess('Запись удалена');

        } catch (error) {
            console.error('Ошибка удаления:', error);
            this.showError('Не удалось удалить запись');
        }
    }

    async loadChartData() {
        try {
            const response = await fetch('/ed/api/emotion-chart', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Ошибка загрузки данных диаграммы');

            const data = await response.json();
            this.renderChart(data.days);

        } catch (error) {
            console.error('Ошибка загрузки диаграммы:', error);
        }
    }

    renderChart(days) {
        const canvas = document.getElementById('emotionChart');
        if (!canvas) {
            console.warn('Canvas для диаграммы не найден');
            return;
        }

        const ctx = canvas.getContext('2d');

        const labels = Object.keys(days).map(dateStr => {
            const [, , day] = dateStr.split('-');
            return day;
        });

        const datasets = [
            {
                label: 'Завтрак',
                data: [],
                backgroundColor: [],
                barPercentage: 0.9,
                categoryPercentage: 0.9
            },
            {
                label: 'Обед',
                data: [],
                backgroundColor: [],
                barPercentage: 0.9,
                categoryPercentage: 0.9
            },
            {
                label: 'Ужин',
                data: [],
                backgroundColor: [],
                barPercentage: 0.9,
                categoryPercentage: 0.9
            },
            {
                label: 'Перекусы',
                data: [],
                backgroundColor: [],
                barPercentage: 0.9,
                categoryPercentage: 0.9
            }
        ];

        const colorMap = {
            good: 'rgba(34, 197, 94, 0.8)',
            normal: 'rgba(234, 179, 8, 0.8)',
            bad: 'rgba(239, 68, 68, 0.8)'
        };

        Object.values(days).forEach(day => {
            if (day.breakfast) {
                datasets[0].data.push(1);
                datasets[0].backgroundColor.push(colorMap[day.breakfast]);
            } else {
                datasets[0].data.push(0);
                datasets[0].backgroundColor.push('transparent');
            }

            if (day.lunch) {
                datasets[1].data.push(1);
                datasets[1].backgroundColor.push(colorMap[day.lunch]);
            } else {
                datasets[1].data.push(0);
                datasets[1].backgroundColor.push('transparent');
            }

            if (day.dinner) {
                datasets[2].data.push(1);
                datasets[2].backgroundColor.push(colorMap[day.dinner]);
            } else {
                datasets[2].data.push(0);
                datasets[2].backgroundColor.push('transparent');
            }

            if (day.snacks) {
                datasets[3].data.push(1);
                datasets[3].backgroundColor.push(colorMap[day.snacks]);
            } else {
                datasets[3].data.push(0);
                datasets[3].backgroundColor.push('transparent');
            }
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.parsed.y === 0) return null;
                                const mealType = context.dataset.label;
                                return `${mealType}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
                            font: {
                                size: 11,
                                weight: '600'
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        display: false,
                        max: 4
                    }
                }
            }
        });
    }

    // ───────────────────────────────────────────────────
    // Вспомогательные методы
    // ───────────────────────────────────────────────────

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'danger');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
        toast.style.zIndex = '9999';
        toast.style.minWidth = '300px';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// ═══════════════════════════════════════════════════════
// Инициализация при загрузке страницы
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница emodiary.html загружена');
    new EmoDiary();
});