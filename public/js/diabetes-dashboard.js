class DiabetesDashboard {
    constructor() {
        this.glucoseChart = null;
        this.state = {
            latestGlucose: null,
            avgGlucose: null,
            mealsCount: 0,
            totalCarbs: 0,
            insulinList: [],
            pillList: [],
            glucoseChart: []
        };
        this.elements = {};

        this.init();
    }

    async init() {
        this.cacheElements();
        await this.loadDashboardData();
    }

    cacheElements() {
        this.elements.latestGlucoseValue = document.getElementById('latestGlucoseValue');
        this.elements.latestGlucoseTime = document.getElementById('latestGlucoseTime');
        this.elements.avgGlucose = document.getElementById('avgGlucose');
        this.elements.avgGlucoseNote = document.getElementById('avgGlucoseNote');
        this.elements.mealsCount = document.getElementById('mealsCount');
        this.elements.mealsNote = document.getElementById('mealsNote');
        this.elements.totalCarbs = document.getElementById('totalCarbs');
        this.elements.insulinTaken = document.getElementById('insulinTaken');
        this.elements.pillsTaken = document.getElementById('pillsTaken');
        this.elements.medicinesList = document.getElementById('medicinesList');
        this.elements.glucoseChart = document.getElementById('glucoseChart');
        this.elements.glucoseChartEmpty = document.getElementById('glucoseChartEmpty');
    }

    async requestJSON(url, options = {}) {
        const response = await fetch(url, {
            credentials: 'same-origin',
            ...options
        });

        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            throw new Error(data?.error || 'Ошибка запроса');
        }

        return data;
    }

    async loadDashboardData() {
        try {
            const data = await this.requestJSON('/diabetes/api/dashboard');

            this.state.latestGlucose = data.latestGlucose;
            this.state.avgGlucose = data.avgGlucose;
            this.state.mealsCount = data.mealsCount;
            this.state.totalCarbs = data.totalCarbs;
            this.state.insulinList = data.insulinList || [];
            this.state.pillList = data.pillList || [];
            this.state.glucoseChart = data.glucoseChart || [];

            this.render();
        } catch (error) {
            console.error('Ошибка загрузки дашборда:', error);
            this.showMessage('Не удалось загрузить данные', 'danger');
        }
    }

    render() {
        this.renderLatestGlucose();
        this.renderAvgGlucose();
        this.renderMeals();
        this.renderCarbs();
        this.renderMedicines();
        this.renderGlucoseChart();
    }

    renderLatestGlucose() {
        if (!this.elements.latestGlucoseValue || !this.elements.latestGlucoseTime) return;

        if (this.state.latestGlucose) {
            this.elements.latestGlucoseValue.textContent = this.state.latestGlucose.value;
            this.elements.latestGlucoseTime.textContent = `в ${this.state.latestGlucose.time}`;
        } else {
            this.elements.latestGlucoseValue.textContent = '—';
            this.elements.latestGlucoseTime.textContent = 'Нет данных';
        }
    }

    renderAvgGlucose() {
        if (!this.elements.avgGlucose || !this.elements.avgGlucoseNote) return;

        if (this.state.avgGlucose) {
            this.elements.avgGlucose.textContent = this.state.avgGlucose;

            const avg = parseFloat(this.state.avgGlucose);
            let note = 'В норме';
            if (avg < 3.9) note = 'Низкий уровень';
            else if (avg > 7.0) note = 'Высокий уровень';

            this.elements.avgGlucoseNote.textContent = note;
        } else {
            this.elements.avgGlucose.textContent = '—';
            this.elements.avgGlucoseNote.textContent = 'Нет данных';
        }
    }

    renderMeals() {
        if (!this.elements.mealsCount || !this.elements.mealsNote) return;

        this.elements.mealsCount.textContent = this.state.mealsCount;

        if (this.state.mealsCount === 0) {
            this.elements.mealsNote.textContent = 'Записей нет';
        } else if (this.state.mealsCount === 1) {
            this.elements.mealsNote.textContent = 'Один приём пищи';
        } else if (this.state.mealsCount >= 2 && this.state.mealsCount <= 4) {
            this.elements.mealsNote.textContent = `${this.state.mealsCount} приёма пищи`;
        } else {
            this.elements.mealsNote.textContent = `${this.state.mealsCount} приёмов пищи`;
        }
    }

    renderCarbs() {
        if (!this.elements.totalCarbs) return;
        this.elements.totalCarbs.textContent = `${this.state.totalCarbs} г`;
    }

    renderMedicines() {
        if (!this.elements.medicinesList || !this.elements.insulinTaken || !this.elements.pillsTaken) return;

        const totalInsulinDoses = this.state.insulinList.reduce((sum, m) => sum + m.dosesPerDay, 0);
        const takenInsulinDoses = this.state.insulinList.reduce((sum, m) => sum + m.takenCount, 0);

        const totalPillDoses = this.state.pillList.reduce((sum, p) => sum + p.dosesPerDay, 0);
        const takenPillDoses = this.state.pillList.reduce((sum, p) => sum + p.takenCount, 0);

        this.elements.insulinTaken.textContent = `${takenInsulinDoses}/${totalInsulinDoses}`;
        this.elements.pillsTaken.textContent = `${takenPillDoses}/${totalPillDoses}`;

        if (this.state.insulinList.length === 0 && this.state.pillList.length === 0) {
            this.elements.medicinesList.innerHTML = `
                <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
                    <i class="bi bi-capsule" style="font-size:48px; opacity:0.3; display:block; margin-bottom:12px;"></i>
                    <div>Нет назначенных лекарств</div>
                </div>
            `;
            return;
        }

        let html = '<ul class="list-unstyled mb-0 dash-schedule">';

        this.state.insulinList.forEach(med => {
            const progress = med.dosesPerDay > 0
                ? Math.round((med.takenCount / med.dosesPerDay) * 100)
                : 0;

            html += `
                <li class="dash-schedule-item">
                    <span class="dash-schedule-time">${med.takenCount}/${med.dosesPerDay}</span>
                    <div>
                        <div class="fw-semibold">${this.escapeHtml(med.name)}</div>
                        <div class="dash-schedule-sub">Инсулин · ${med.units} ед. · ${progress}% выполнено</div>
                    </div>
                </li>
            `;
        });

        this.state.pillList.forEach(pill => {
            const progress = pill.dosesPerDay > 0
                ? Math.round((pill.takenCount / pill.dosesPerDay) * 100)
                : 0;

            html += `
                <li class="dash-schedule-item">
                    <span class="dash-schedule-time">${pill.takenCount}/${pill.dosesPerDay}</span>
                    <div>
                        <div class="fw-semibold">${this.escapeHtml(pill.name)}</div>
                        <div class="dash-schedule-sub">Таблетки · ${progress}% выполнено</div>
                    </div>
                </li>
            `;
        });

        html += '</ul>';

        this.elements.medicinesList.innerHTML = html;
    }

    renderGlucoseChart() {
        if (!this.elements.glucoseChart || !this.elements.glucoseChartEmpty) return;

        if (!this.state.glucoseChart.length) {
            this.elements.glucoseChart.style.display = 'none';
            this.elements.glucoseChartEmpty.style.display = 'block';
            return;
        }

        this.elements.glucoseChart.style.display = 'block';
        this.elements.glucoseChartEmpty.style.display = 'none';

        const labels = this.state.glucoseChart.map(entry => {
            const date = new Date(entry.date);
            return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        });

        const values = this.state.glucoseChart.map(entry => parseFloat(entry.value));

        const backgroundColors = values.map(v => {
            if (v < 3.9) return 'rgba(250, 204, 21, 0.6)';
            if (v > 7.0) return 'rgba(248, 113, 113, 0.6)';
            return 'rgba(139, 92, 246, 0.6)';
        });

        const borderColors = values.map(v => {
            if (v < 3.9) return '#facc15';
            if (v > 7.0) return '#f87171';
            return '#8b5cf6';
        });

        if (this.glucoseChart) {
            this.glucoseChart.destroy();
        }

        this.glucoseChart = new Chart(this.elements.glucoseChart, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Глюкоза (ммоль/л)',
                    data: values,
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderColor: '#8b5cf6',
                    borderWidth: 3,
                    pointBackgroundColor: backgroundColors,
                    pointBorderColor: borderColors,
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#8b5cf6',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: (context) => {
                                const val = context.parsed.y;
                                let range = 'Норма';
                                if (val < 3.9) range = 'Низкая';
                                if (val > 7.0) range = 'Высокая';
                                return `${val} ммоль/л (${range})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(139, 92, 246, 0.1)' },
                        ticks: {
                            color: '#a0a0a0',
                            font: { size: 11, weight: 600 }
                        }
                    },
                    y: {
                        min: 0,
                        max: Math.max(...values, 10) + 2,
                        grid: { color: 'rgba(139, 92, 246, 0.1)' },
                        ticks: {
                            color: '#a0a0a0',
                            font: { size: 11, weight: 600 },
                            callback: (value) => `${value}`
                        }
                    }
                }
            }
        });
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

    showMessage(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3 shadow`;
        toast.style.zIndex = '9999';
        toast.style.minWidth = '280px';
        toast.style.maxWidth = 'calc(100vw - 32px)';
        toast.style.textAlign = 'center';
        toast.textContent = message;

        document.body.appendChild(toast);
        window.setTimeout(() => toast.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DiabetesDashboard();
});