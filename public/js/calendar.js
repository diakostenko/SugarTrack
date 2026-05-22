class CalendarManager {
    constructor(medicinesPage) {
        this.medicinesPage = medicinesPage;
        this.currentDate = new Date();
        this.events = [];
        this.elements = {};

        this.init();
    }

    async init() {
        this.cacheElements();
        this.bindEvents();
        await this.loadEvents();
        this.renderCalendar();
        this.renderEventsList();
    }

    cacheElements() {
        this.elements.calendarGrid = document.getElementById('calendarGrid');
        this.elements.calendarTitle = document.getElementById('calendarTitle');
        this.elements.prevMonthBtn = document.getElementById('prevMonthBtn');
        this.elements.nextMonthBtn = document.getElementById('nextMonthBtn');
        this.elements.todayBtn = document.getElementById('todayBtn');
        this.elements.eventsList = document.getElementById('eventsList');

        this.elements.eventModalEl = document.getElementById('eventModal');
        this.elements.eventModal = this.elements.eventModalEl ? new bootstrap.Modal(this.elements.eventModalEl) : null;
        this.elements.eventForm = document.getElementById('eventForm');
        this.elements.eventType = document.getElementById('eventType');
        this.elements.eventTitle = document.getElementById('eventTitle');
        this.elements.eventDate = document.getElementById('eventDate');
        this.elements.eventDescription = document.getElementById('eventDescription');
    }

    bindEvents() {
        this.elements.prevMonthBtn?.addEventListener('click', () => this.changeMonth(-1));
        this.elements.nextMonthBtn?.addEventListener('click', () => this.changeMonth(1));
        this.elements.todayBtn?.addEventListener('click', () => this.goToToday());

        document.addEventListener('click', (e) => {
            if (e.target.closest('.js-open-event-modal')) {
                this.openEventModal();
            }
        });

        this.elements.eventForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addEvent();
        });

        this.elements.eventModalEl?.addEventListener('hidden.bs.modal', () => {
            this.resetEventForm();
        });
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.renderCalendar();
    }

    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
    }

    getMonthName(month) {
        const names = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        return names[month];
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // обновляем заголовок
        if (this.elements.calendarTitle) {
            this.elements.calendarTitle.textContent = `${this.getMonthName(month)} ${year}`;
        }

        // первый день месяца
        const firstDay = new Date(year, month, 1);
        // последний день месяца
        const lastDay = new Date(year, month + 1, 0);

        // день недели первого дня (0 = воскресенье, переводим в понедельник = 0)
        let firstDayOfWeek = firstDay.getDay();
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

        const daysInMonth = lastDay.getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const today = new Date();
        const todayStr = this.getDateKey(today);

        let html = '';

        // дни предыдущего месяца
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            html += `<div class="cal-day other-month">${day}</div>`;
        }

        // дни текущего месяца
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = this.getDateKey(new Date(year, month, day));
            const dayEvents = this.events.filter(e => e.date === dateStr);

            let classes = 'cal-day';
            if (dateStr === todayStr) classes += ' today-cal';
            if (dayEvents.length > 0) classes += ' has-event';

            const hasDoctorEvent = dayEvents.some(e => e.type === 'doctor');
            if (hasDoctorEvent) classes += ' has-appointment';

            let dotsHtml = '';
            if (dayEvents.length > 0) {
                const uniqueTypes = [...new Set(dayEvents.map(e => e.type))];
                dotsHtml = `<div class="cal-event-dots">
                    ${uniqueTypes.map(type => `<span class="cal-event-dot dot-${type}"></span>`).join('')}
                </div>`;
            }

            html += `<div class="${classes}">${day}${dotsHtml}</div>`;
        }

        // дни следующего месяца
        const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (firstDayOfWeek + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            html += `<div class="cal-day other-month">${day}</div>`;
        }

        if (this.elements.calendarGrid) {
            this.elements.calendarGrid.innerHTML = html;
        }
    }

    renderEventsList() {
        if (!this.elements.eventsList) return;

        if (this.events.length === 0) {
            this.elements.eventsList.innerHTML = `
                <div class="events-empty-state">
                    <i class="bi bi-calendar-x"></i>
                    <div class="mt-2">Событий пока нет</div>
                    <div class="small mt-1">Добавьте первое событие в календарь</div>
                </div>
            `;
            return;
        }

        // сортируем по дате
        const sortedEvents = [...this.events].sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        // показываем только будущие события
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingEvents = sortedEvents.filter(e => new Date(e.date) >= today);

        if (upcomingEvents.length === 0) {
            this.elements.eventsList.innerHTML = `
                <div class="events-empty-state">
                    <i class="bi bi-check-circle"></i>
                    <div class="mt-2">Нет предстоящих событий</div>
                </div>
            `;
            return;
        }

        this.elements.eventsList.innerHTML = upcomingEvents.map(event => {
            const iconClass = {
                pill: 'bi-capsule-pill',
                dose: 'bi-droplet-half',
                doctor: 'bi-hospital'
            }[event.type] || 'bi-calendar-event';

            const iconType = `event-icon--${event.type}`;

            const date = new Date(event.date);
            const dateStr = `${date.getDate()} ${this.getMonthName(date.getMonth()).toLowerCase()}`;

            return `
                <div class="event-item">
                    <div class="event-icon ${iconType}">
                        <i class="bi ${iconClass}"></i>
                    </div>
                    <div>
                        <div class="event-title">${this.escapeHtml(event.title)}</div>
                        <div class="event-sub">${dateStr}${event.description ? ' · ' + this.escapeHtml(event.description) : ''}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    openEventModal() {
        this.resetEventForm();
        // устанавливаем сегодняшнюю дату по умолчанию
        if (this.elements.eventDate) {
            const today = new Date();
            this.elements.eventDate.value = this.getDateKey(today);
        }
        this.elements.eventModal?.show();
    }

    resetEventForm() {
        this.elements.eventForm?.reset();
        if (this.elements.eventType) this.elements.eventType.value = 'pill';
    }

    async addEvent() {
        const type = this.elements.eventType?.value || 'pill';
        const title = this.elements.eventTitle?.value.trim() || '';
        const date = this.elements.eventDate?.value || '';
        const description = this.elements.eventDescription?.value.trim() || '';

        if (!title) {
            this.medicinesPage.showMessage('Введите название события', 'warning');
            return;
        }

        if (!date) {
            this.medicinesPage.showMessage('Выберите дату события', 'warning');
            return;
        }

        try {
            await this.medicinesPage.requestJSON('/diabetes/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, title, date, description })
            });

            this.elements.eventModal?.hide();
            await this.loadEvents();
            this.renderCalendar();
            this.renderEventsList();
            this.medicinesPage.showMessage('Событие добавлено', 'success');
        } catch (error) {
            console.error('Ошибка добавления события:', error);
            this.medicinesPage.showMessage(error.message || 'Не удалось добавить событие', 'danger');
        }
    }

    async loadEvents() {
        try {
            const data = await this.medicinesPage.requestJSON('/diabetes/events');
            this.events = data.events || [];
        } catch (error) {
            console.error('Ошибка загрузки событий:', error);
            this.events = [];
        }
    }

    getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }
}

// экспортируем для использования в medicines.js
window.CalendarManager = CalendarManager;
