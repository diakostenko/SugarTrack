class MedicinesPage {
    constructor() {
        this.currentDate = new Date();
        this.glucoseChart = null;
        this.state = {
            insulinMeds: [],
            insulinTotals: { today: 0, norm: 0, percent: 0 },
            pillList: [],
            pillTotals: { total: 0, taken: 0, remaining: 0 },
            glucoseHistory: [],
            glucoseStats: { inRange: 0, above: 0, below: 0 }
        };
        this.elements = {};

        this.init();
    }

    async init() {
        this.cacheElements();
        this.bindEvents();
        await this.loadDayData();

        if (window.CalendarManager) {
            this.calendar = new CalendarManager(this);
        }
    }

    cacheElements() {
        // Инсулин
        this.elements.insulinList = document.getElementById('insulinList');
        this.elements.insulinEmptyState = document.getElementById('insulinEmptyState');
        this.elements.insulinToday = document.getElementById('insulinToday');
        this.elements.insulinNorm = document.getElementById('insulinNorm');
        this.elements.insulinPercent = document.getElementById('insulinPercent');
        this.elements.insulinForm = document.getElementById('insulinForm');
        this.elements.insulinModalEl = document.getElementById('insulinModal');
        this.elements.insulinModal = this.elements.insulinModalEl ? new bootstrap.Modal(this.elements.insulinModalEl) : null;
        this.elements.insulinNameInput = document.getElementById('insulinName');
        this.elements.insulinTypeInput = document.getElementById('insulinType');
        this.elements.insulinUnitsInput = document.getElementById('insulinUnits');
        this.elements.insulinDosesInput = document.getElementById('insulinDoses');

        // Таблетки
        this.elements.pillsList = document.getElementById('pillsList');
        this.elements.pillsEmptyState = document.getElementById('pillsEmptyState');
        this.elements.pillsTotal = document.getElementById('pillsTotal');
        this.elements.pillsTaken = document.getElementById('pillsTaken');
        this.elements.pillsRemaining = document.getElementById('pillsRemaining');
        this.elements.pillForm = document.getElementById('pillForm');
        this.elements.pillModalEl = document.getElementById('pillModal');
        this.elements.pillModal = this.elements.pillModalEl ? new bootstrap.Modal(this.elements.pillModalEl) : null;
        this.elements.pillNameInput = document.getElementById('pillName');
        this.elements.pillDosesInput = document.getElementById('pillDoses');

        // Глюкоза
        this.elements.glucoseChart = document.getElementById('glucoseChart');
        this.elements.glucoseChartEmpty = document.getElementById('glucoseChartEmpty');
        this.elements.glucoseInRange = document.getElementById('glucoseInRange');
        this.elements.glucoseAbove = document.getElementById('glucoseAbove');
        this.elements.glucoseBelow = document.getElementById('glucoseBelow');
        this.elements.glucoseInRangeBar = document.getElementById('glucoseInRangeBar');
        this.elements.glucoseAboveBar = document.getElementById('glucoseAboveBar');
        this.elements.glucoseBelowBar = document.getElementById('glucoseBelowBar');
        this.elements.glucoseForm = document.getElementById('glucoseForm');
        this.elements.glucoseModalEl = document.getElementById('glucoseModal');
        this.elements.glucoseModal = this.elements.glucoseModalEl ? new bootstrap.Modal(this.elements.glucoseModalEl) : null;
        this.elements.glucoseValueInput = document.getElementById('glucoseValue');
        this.elements.glucoseDateInput = document.getElementById('glucoseDate');
        this.elements.glucoseTimeInput = document.getElementById('glucoseTime');
        this.elements.glucoseNoteInput = document.getElementById('glucoseNote');
    }

    bindEvents() {
        document.addEventListener('click', (event) => {
            // Инсулин
            const openInsulinButton = event.target.closest('.js-open-insulin-modal');
            if (openInsulinButton) {
                this.openInsulinModal();
                return;
            }

            const doseButton = event.target.closest('.insulin-dose-dot');
            if (doseButton) {
                const medId = doseButton.dataset.medId;
                const doseIndex = Number.parseInt(doseButton.dataset.doseIndex, 10);
                if (medId && Number.isInteger(doseIndex)) {
                    this.toggleInsulinDose(medId, doseIndex);
                }
            }

            // Таблетки
            const openPillButton = event.target.closest('.js-open-pill-modal');
            if (openPillButton) {
                this.openPillModal();
                return;
            }

            const pillDoseButton = event.target.closest('.pill-dose-dot');
            if (pillDoseButton) {
                const pillId = pillDoseButton.dataset.pillId;
                const doseIndex = Number.parseInt(pillDoseButton.dataset.doseIndex, 10);
                if (pillId && Number.isInteger(doseIndex)) {
                    this.togglePillDose(pillId, doseIndex);
                }
            }
        });

        if (this.elements.insulinForm) {
            this.elements.insulinForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.addInsulin();
            });
        }

        if (this.elements.insulinModalEl) {
            this.elements.insulinModalEl.addEventListener('hidden.bs.modal', () => {
                this.resetInsulinForm();
            });
        }

        if (this.elements.pillForm) {
            this.elements.pillForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.addPill();
            });
        }

        if (this.elements.pillModalEl) {
            this.elements.pillModalEl.addEventListener('hidden.bs.modal', () => {
                this.resetPillForm();
            });
        }

        // Глюкоза
        if (this.elements.glucoseForm) {
            this.elements.glucoseForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.addGlucose();
            });
        }

        if (this.elements.glucoseModalEl) {
            this.elements.glucoseModalEl.addEventListener('show.bs.modal', () => {
                this.resetGlucoseForm();
            });
        }
    }

    getDateKey(date = this.currentDate) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async requestJSON(url, options = {}) {
        const response = await fetch(url, {
            credentials: 'same-origin',
            ...options,
            headers: {
                ...(options.headers || {})
            }
        });

        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            throw new Error(data?.error || data?.message || 'Ошибка запроса');
        }

        return data;
    }

    async loadDayData() {
        try {
            const dateKey = this.getDateKey();
            const [insulinData, pillsData, glucoseData] = await Promise.all([
                this.requestJSON(`/api/medicines/day/${dateKey}`),
                this.requestJSON(`/diabetes/pills/day/${dateKey}`),
                this.requestJSON(`/diabetes/api/glucose/history`)
            ]);

            this.state.insulinMeds = insulinData.insulinMeds || [];
            this.state.insulinTotals = insulinData.totals || { today: 0, norm: 0, percent: 0 };

            this.state.pillList = pillsData.pillList || [];
            this.state.pillTotals = pillsData.totals || { total: 0, taken: 0, remaining: 0 };

            this.state.glucoseHistory = glucoseData.history || [];
            this.state.glucoseStats = glucoseData.stats || { inRange: 0, above: 0, below: 0 };

            this.render();
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.showMessage('Не удалось загрузить данные', 'danger');
        }
    }

    // ── Инсулин ──

    openInsulinModal() {
        this.resetInsulinForm();
        this.elements.insulinModal?.show();
        this.elements.insulinNameInput?.focus();
    }

    resetInsulinForm() {
        if (!this.elements.insulinForm) return;
        this.elements.insulinForm.reset();
        if (this.elements.insulinTypeInput) this.elements.insulinTypeInput.value = 'short';
        if (this.elements.insulinUnitsInput) this.elements.insulinUnitsInput.value = '4';
        if (this.elements.insulinDosesInput) this.elements.insulinDosesInput.value = '1';
    }

    async addInsulin() {
        const name = this.elements.insulinNameInput?.value.trim() || '';
        const insulinType = this.elements.insulinTypeInput?.value === 'long' ? 'long' : 'short';
        const units = Number.parseInt(this.elements.insulinUnitsInput?.value, 10);
        const dosesPerDay = Number.parseInt(this.elements.insulinDosesInput?.value, 10);

        if (!name) {
            this.showMessage('Введите название препарата.', 'warning');
            return;
        }

        if (!Number.isInteger(units) || units < 1) {
            this.showMessage('Количество единиц должно быть больше нуля.', 'warning');
            return;
        }

        if (!Number.isInteger(dosesPerDay) || dosesPerDay < 1) {
            this.showMessage('Количество приёмов должно быть больше нуля.', 'warning');
            return;
        }

        try {
            await this.requestJSON('/api/medicines/insulin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    insulinType,
                    units,
                    dosesPerDay
                })
            });

            this.elements.insulinModal?.hide();
            await this.loadDayData();
            this.showMessage('Инсулин добавлен.', 'success');
        } catch (error) {
            console.error('Ошибка добавления инсулина:', error);
            this.showMessage(error.message || 'Не удалось добавить инсулин', 'danger');
        }
    }

    async toggleInsulinDose(medId, doseIndex) {
        try {
            const dateKey = this.getDateKey();
            await this.requestJSON(`/api/medicines/insulin/${medId}/doses/${doseIndex}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ date: dateKey })
            });

            await this.loadDayData();
        } catch (error) {
            console.error('Ошибка обновления инсулина:', error);
            this.showMessage(error.message || 'Не удалось обновить приём', 'danger');
        }
    }

    // ── Таблетки ──

    openPillModal() {
        this.resetPillForm();
        this.elements.pillModal?.show();
        this.elements.pillNameInput?.focus();
    }

    resetPillForm() {
        if (!this.elements.pillForm) return;
        this.elements.pillForm.reset();
        if (this.elements.pillDosesInput) this.elements.pillDosesInput.value = '1';
    }

    async addPill() {
        const name = this.elements.pillNameInput?.value.trim() || '';
        const dosesPerDay = Number.parseInt(this.elements.pillDosesInput?.value, 10);

        if (!name) {
            this.showMessage('Введите название препарата.', 'warning');
            return;
        }

        if (!Number.isInteger(dosesPerDay) || dosesPerDay < 1) {
            this.showMessage('Количество приёмов должно быть больше нуля.', 'warning');
            return;
        }

        try {
            await this.requestJSON('/diabetes/pills', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    dosesPerDay
                })
            });

            this.elements.pillModal?.hide();
            await this.loadDayData();
            this.showMessage('Таблетка добавлена.', 'success');
        } catch (error) {
            console.error('Ошибка добавления таблетки:', error);
            this.showMessage(error.message || 'Не удалось добавить таблетку', 'danger');
        }
    }

    async togglePillDose(pillId, doseIndex) {
        try {
            const dateKey = this.getDateKey();
            await this.requestJSON(`/diabetes/pills/${pillId}/doses/${doseIndex}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ date: dateKey })
            });

            await this.loadDayData();
        } catch (error) {
            console.error('Ошибка обновления таблетки:', error);
            this.showMessage(error.message || 'Не удалось обновить приём', 'danger');
        }
    }

    // ── Глюкоза ──

    resetGlucoseForm() {
        if (!this.elements.glucoseForm) return;
        this.elements.glucoseForm.reset();

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);

        if (this.elements.glucoseDateInput) this.elements.glucoseDateInput.value = dateStr;
        if (this.elements.glucoseTimeInput) this.elements.glucoseTimeInput.value = timeStr;
    }

    async addGlucose() {
        const value = parseFloat(this.elements.glucoseValueInput?.value);
        const date = this.elements.glucoseDateInput?.value;
        const time = this.elements.glucoseTimeInput?.value;
        const note = this.elements.glucoseNoteInput?.value.trim() || '';

        if (!value || value <= 0 || value > 30) {
            this.showMessage('Введите корректное значение глюкозы (0.1-30 ммоль/л)', 'warning');
            return;
        }

        if (!date || !time) {
            this.showMessage('Укажите дату и время', 'warning');
            return;
        }

        try {
            await this.requestJSON('/diabetes/api/glucose', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ value, date, time, note })
            });

            this.elements.glucoseModal?.hide();
            await this.loadDayData();
            this.showMessage('Замер глюкозы сохранён', 'success');
        } catch (error) {
            console.error('Ошибка сохранения глюкозы:', error);
            this.showMessage(error.message || 'Не удалось сохранить замер', 'danger');
        }
    }

    // ── Рендер ──

    render() {
        this.renderInsulinList();
        this.renderInsulinStats();
        this.renderPillsList();
        this.renderPillsStats();
        this.renderGlucoseChart();
        this.renderGlucoseStats();
    }

    renderInsulinList() {
        if (!this.elements.insulinList || !this.elements.insulinEmptyState) return;

        if (!this.state.insulinMeds.length) {
            this.elements.insulinList.innerHTML = '';
            this.elements.insulinEmptyState.style.display = 'block';
            return;
        }

        this.elements.insulinEmptyState.style.display = 'none';
        this.elements.insulinList.innerHTML = this.state.insulinMeds.map((medicine) => {
            const doseState = Array.isArray(medicine.doseState) ? medicine.doseState : [];

            return `
                <div class="med-item" data-med-id="${medicine._id}">
                    <div class="med-icon med-icon--insulin">
                        <i class="bi bi-droplet-fill"></i>
                    </div>
                    <div class="med-info">
                        <div class="med-name">${this.escapeHtml(medicine.name)}</div>
                        <div class="med-detail">${this.getTypeLabel(medicine.insulinType)} · ${medicine.units} ед. · ${medicine.dosesPerDay} ${this.getDosesWord(medicine.dosesPerDay)}</div>
                    </div>
                    <div class="med-doses" aria-label="Приёмы инсулина">
                        ${doseState.map((taken, index) => `
                            <button
                                type="button"
                                class="dose-dot dose-dot--interactive insulin-dose-dot ${taken ? 'taken' : ''}"
                                data-med-id="${medicine._id}"
                                data-dose-index="${index}"
                                title="Приём ${index + 1}"
                                aria-pressed="${taken ? 'true' : 'false'}"
                                aria-label="${taken ? 'Принято' : 'Не принято'} · приём ${index + 1}"
                            >
                                ${taken ? '<i class="bi bi-check2"></i>' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderInsulinStats() {
        const totals = this.state.insulinTotals || { today: 0, norm: 0, percent: 0 };
        if (this.elements.insulinToday) this.elements.insulinToday.textContent = `${totals.today ?? 0} ед.`;
        if (this.elements.insulinNorm) this.elements.insulinNorm.textContent = `${totals.norm ?? 0} ед.`;
        if (this.elements.insulinPercent) this.elements.insulinPercent.textContent = `${totals.percent ?? 0}%`;
    }

    renderPillsList() {
        if (!this.elements.pillsList || !this.elements.pillsEmptyState) return;

        if (!this.state.pillList.length) {
            this.elements.pillsList.innerHTML = '';
            this.elements.pillsEmptyState.style.display = 'block';
            return;
        }

        this.elements.pillsEmptyState.style.display = 'none';
        this.elements.pillsList.innerHTML = this.state.pillList.map((pill) => {
            const doseState = Array.isArray(pill.doseState) ? pill.doseState : [];

            return `
                <div class="med-item" data-pill-id="${pill._id}">
                    <div class="med-icon med-icon--pill">
                        <i class="bi bi-capsule"></i>
                    </div>
                    <div class="med-info">
                        <div class="med-name">${this.escapeHtml(pill.name)}</div>
                        <div class="med-detail">${pill.dosesPerDay} ${this.getDosesWord(pill.dosesPerDay)}</div>
                    </div>
                    <div class="med-doses" aria-label="Приёмы таблеток">
                        ${doseState.map((taken, index) => `
                            <button
                                type="button"
                                class="dose-dot dose-dot--interactive pill-dose-dot ${taken ? 'taken' : ''}"
                                data-pill-id="${pill._id}"
                                data-dose-index="${index}"
                                title="Приём ${index + 1}"
                                aria-pressed="${taken ? 'true' : 'false'}"
                                aria-label="${taken ? 'Принято' : 'Не принято'} · приём ${index + 1}"
                            >
                                ${taken ? '<i class="bi bi-check2"></i>' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderPillsStats() {
        const totals = this.state.pillTotals || { total: 0, taken: 0, remaining: 0 };
        if (this.elements.pillsTotal) this.elements.pillsTotal.textContent = `${totals.total ?? 0}`;
        if (this.elements.pillsTaken) this.elements.pillsTaken.textContent = `${totals.taken ?? 0}`;
        if (this.elements.pillsRemaining) this.elements.pillsRemaining.textContent = `${totals.remaining ?? 0}`;
    }

    renderGlucoseChart() {
        if (!this.elements.glucoseChart || !this.elements.glucoseChartEmpty) return;

        if (!this.state.glucoseHistory.length) {
            this.elements.glucoseChart.style.display = 'none';
            this.elements.glucoseChartEmpty.style.display = 'block';
            return;
        }

        this.elements.glucoseChart.style.display = 'block';
        this.elements.glucoseChartEmpty.style.display = 'none';

        const labels = this.state.glucoseHistory.map(entry => {
            const date = new Date(entry.date);
            return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        });

        const values = this.state.glucoseHistory.map(entry => parseFloat(entry.value));

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
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Глюкоза (ммоль/л)',
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 2,
                    borderRadius: 6
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

    renderGlucoseStats() {
        const stats = this.state.glucoseStats;

        if (this.elements.glucoseInRange) {
            this.elements.glucoseInRange.textContent = `${stats.inRange}%`;
        }
        if (this.elements.glucoseAbove) {
            this.elements.glucoseAbove.textContent = `${stats.above}%`;
        }
        if (this.elements.glucoseBelow) {
            this.elements.glucoseBelow.textContent = `${stats.below}%`;
        }

        if (this.elements.glucoseInRangeBar) {
            this.elements.glucoseInRangeBar.style.width = `${stats.inRange}%`;
        }
        if (this.elements.glucoseAboveBar) {
            this.elements.glucoseAboveBar.style.width = `${stats.above}%`;
        }
        if (this.elements.glucoseBelowBar) {
            this.elements.glucoseBelowBar.style.width = `${stats.below}%`;
        }
    }

    getTypeLabel(type) {
        return type === 'long' ? 'Длинный' : 'Короткий';
    }

    getDosesWord(count) {
        if (count === 1) return 'приём/день';
        if (count >= 2 && count <= 4) return 'приёма/день';
        return 'приёмов/день';
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
    new MedicinesPage();
});