// главный блок инициализации

let weightChart = null;

document.addEventListener('DOMContentLoaded', () => {
    loadWeightChart();
    initWeightSaving();
    initBodyMeasurements();
    initGISearch();
    initXECalculator();
    initHbA1c();
});

// график динамики веса

async function loadWeightChart() {
    try {
        const response = await fetch('/diabetes/api/weight/history');

        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        const canvas = document.getElementById('weightChart');
        const emptyState = document.getElementById('weightChartEmpty');

        if (!canvas || !emptyState) {
            console.error('Элементы графика не найдены');
            return;
        }

        if (!data.history || data.history.length === 0) {
            canvas.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        // показываем график
        canvas.style.display = 'block';
        emptyState.style.display = 'none';

        // подготовка данных
        const labels = data.history.map(entry => {
            const date = new Date(entry.date);
            return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        });

        const weights = data.history.map(entry => entry.weight);

        const minWeight = Math.min(...weights) - 1;
        const maxWeight = Math.max(...weights) + 1;

        // уничтожаем старый график
        if (weightChart) {
            weightChart.destroy();
        }

        // создаём график
        weightChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Вес (кг)',
                    data: weights,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
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
                            label: (context) => `${context.parsed.y} кг`
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
                        min: minWeight,
                        max: maxWeight,
                        grid: { color: 'rgba(139, 92, 246, 0.1)' },
                        ticks: {
                            color: '#a0a0a0',
                            font: { size: 11, weight: 600 },
                            callback: (value) => `${value} кг`
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки графика:', error);
        const canvas = document.getElementById('weightChart');
        const emptyState = document.getElementById('weightChartEmpty');
        if (canvas) canvas.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    }
}

// сохранение веса

function initWeightSaving() {
    const weightInput = document.getElementById('weightInput');
    const saveWeightBtn = document.getElementById('saveWeightBtn');

    if (!saveWeightBtn || !weightInput) {
        console.warn('Элементы сохранения веса не найдены');
        return;
    }

    saveWeightBtn.addEventListener('click', async () => {
        const weight = parseFloat(weightInput.value);

        if (!weight || weight <= 0) {
            alert('Введите корректное значение веса');
            return;
        }

        try {
            saveWeightBtn.disabled = true;
            saveWeightBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Сохранение...';

            const response = await fetch('/diabetes/api/weight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weight, date: new Date().toISOString() })
            });

            if (response.ok) {
                await response.json();
                alert('Вес успешно сохранён!');

                // обновляем график
                await loadWeightChart();
            } else {
                const error = await response.json();
                console.error('Ошибка сервера:', error);
                alert('Ошибка: ' + (error.error || 'Неизвестная ошибка'));
            }
        } catch (error) {
            console.error('Ошибка сохранения веса:', error);
            alert('Ошибка сохранения веса');
        } finally {
            saveWeightBtn.disabled = false;
            saveWeightBtn.innerHTML = '<i class="bi bi-check2 me-1"></i>Сохранить';
        }
    });
}

// замеры тела

function initBodyMeasurements() {
    const weightInput = document.getElementById('weightInput');
    const heightInput = document.getElementById('heightInput');
    const waistInput = document.getElementById('waistInput');
    const hipsInput = document.getElementById('hipsInput');
    const chestInput = document.getElementById('chestInput');
    const armInput = document.getElementById('armInput');
    const bmiDisplay = document.getElementById('bmiDisplay');
    const saveMeasurementsBtn = document.getElementById('saveMeasurementsBtn');

    function updateBMI() {
        const weight = parseFloat(weightInput?.value);
        const height = parseFloat(heightInput?.value);

        if (weight && height && height > 0) {
            const heightInMeters = height / 100;
            const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
            if (bmiDisplay) bmiDisplay.value = bmi;
        } else {
            if (bmiDisplay) bmiDisplay.value = '—';
        }
    }

    if (heightInput && weightInput) {
        heightInput.addEventListener('input', updateBMI);
        weightInput.addEventListener('input', updateBMI);
    }

    if (saveMeasurementsBtn) {
        saveMeasurementsBtn.addEventListener('click', async () => {
            const data = {
                height: parseFloat(heightInput?.value) || null,
                waist: parseFloat(waistInput?.value) || null,
                hips: parseFloat(hipsInput?.value) || null,
                chest: parseFloat(chestInput?.value) || null,
                arm: parseFloat(armInput?.value) || null
            };

            try {
                saveMeasurementsBtn.disabled = true;
                saveMeasurementsBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Сохранение...';

                const response = await fetch('/diabetes/api/body-measurements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    const result = await response.json();
                    alert('Замеры успешно сохранены!');

                    if (result.bmi && bmiDisplay) {
                        bmiDisplay.value = result.bmi;
                    }
                } else {
                    const error = await response.json();
                    alert('Ошибка: ' + (error.error || 'Неизвестная ошибка'));
                }
            } catch (error) {
                console.error('Ошибка сохранения замеров:', error);
                alert('Ошибка сохранения замеров');
            } finally {
                saveMeasurementsBtn.disabled = false;
                saveMeasurementsBtn.innerHTML = '<i class="bi bi-check2 me-1"></i>Сохранить все';
            }
        });
    }
}

// гликемический индекс

function initGISearch() {
    const giSearchInput = document.getElementById('giSearchInput');
    const giSearchResults = document.getElementById('giSearchResults');
    const giPopularProducts = document.getElementById('giPopularProducts');
    const giSearchTableBody = document.getElementById('giSearchTableBody');
    const giPopularTableBody = document.getElementById('giPopularTableBody');

    let searchTimeout;

    function getGILevel(gi) {
        if (gi <= 55) return { class: 'gi-low', text: 'Низкий' };
        if (gi <= 69) return { class: 'gi-mid', text: 'Средний' };
        return { class: 'gi-high', text: 'Высокий' };
    }

    function renderProductRow(product) {
        const giLevel = getGILevel(product.gi);
        const carbs = product.per100g?.carbs || 0;
        return `
            <tr>
                <td>${product.name}</td>
                <td><strong>${product.gi}</strong></td>
                <td><span class="gi-badge ${giLevel.class}">${giLevel.text}</span></td>
                <td>${carbs} г</td>
            </tr>
        `;
    }

    async function loadPopularProducts() {
        try {
            const response = await fetch('/diabetes/api/products/popular-gi');
            if (response.ok) {
                const data = await response.json();
                if (data.products && data.products.length > 0) {
                    giPopularTableBody.innerHTML = data.products.map(renderProductRow).join('');
                } else {
                    giPopularTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Продукты не найдены</td></tr>';
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки популярных продуктов:', error);
            giPopularTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Ошибка загрузки</td></tr>';
        }
    }

    async function searchProducts(query) {
        if (!query || query.trim().length < 2) {
            giSearchResults.style.display = 'none';
            giPopularProducts.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(`/diabetes/api/products/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.products && data.products.length > 0) {
                    giSearchTableBody.innerHTML = data.products.map(renderProductRow).join('');
                    giSearchResults.style.display = 'block';
                    giPopularProducts.style.display = 'none';
                } else {
                    giSearchTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Продукты не найдены</td></tr>';
                    giSearchResults.style.display = 'block';
                    giPopularProducts.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Ошибка поиска продуктов:', error);
        }
    }

    if (giSearchInput) {
        giSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            if (query.length === 0) {
                giSearchResults.style.display = 'none';
                giPopularProducts.style.display = 'block';
                return;
            }
            searchTimeout = setTimeout(() => searchProducts(query), 300);
        });
    }

    loadPopularProducts();
}

// калькулятор хлебных единиц

function initXECalculator() {
    const xeSearchInput = document.getElementById('xeSearchInput');
    const xeSearchDropdown = document.getElementById('xeSearchDropdown');
    const xeSelectedProduct = document.getElementById('xeSelectedProduct');
    const xeProductName = document.getElementById('xeProductName');
    const xeProductCarbs = document.getElementById('xeProductCarbs');
    const xeWeightInput = document.getElementById('xeWeightInput');
    const xeResultValue = document.getElementById('xeResultValue');
    const xeFormula = document.getElementById('xeFormula');
    const xeFormulaText = document.getElementById('xeFormulaText');

    let selectedProduct = null;
    let searchTimeout;

    async function searchProductsForXE(query) {
        if (!query || query.trim().length < 2) {
            xeSearchDropdown.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/diabetes/api/products/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.products && data.products.length > 0) {
                    renderXEDropdown(data.products);
                } else {
                    xeSearchDropdown.innerHTML = '<div class="xe-dropdown-empty">Продукты не найдены</div>';
                    xeSearchDropdown.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Ошибка поиска продуктов для ХЕ:', error);
        }
    }

    function renderXEDropdown(products) {
        const html = products.map(product => `
            <div class="xe-dropdown-item" data-product='${JSON.stringify(product)}'>
                <div class="xe-dropdown-item-name">${product.name}</div>
                <div class="xe-dropdown-item-info">Углеводы: ${product.per100g?.carbs || 0} г на 100 г</div>
            </div>
        `).join('');

        xeSearchDropdown.innerHTML = html;
        xeSearchDropdown.style.display = 'block';

        xeSearchDropdown.querySelectorAll('.xe-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const product = JSON.parse(item.dataset.product);
                selectProduct(product);
            });
        });
    }

    function selectProduct(product) {
        selectedProduct = product;
        xeProductName.textContent = product.name;
        xeProductCarbs.textContent = `Углеводы: ${product.per100g?.carbs || 0} г на 100 г`;
        xeSelectedProduct.style.display = 'block';
        xeSearchDropdown.style.display = 'none';
        xeSearchInput.value = '';
        xeWeightInput.disabled = false;
        xeWeightInput.value = '100';
        calculateXE();
    }

    function calculateXE() {
        if (!selectedProduct) {
            xeResultValue.textContent = '—';
            xeFormula.style.display = 'none';
            return;
        }

        const weight = parseFloat(xeWeightInput.value) || 0;
        const carbsPer100g = selectedProduct.per100g?.carbs || 0;

        if (weight <= 0 || carbsPer100g === 0) {
            xeResultValue.textContent = '—';
            xeFormula.style.display = 'none';
            return;
        }

        const totalCarbs = (carbsPer100g * weight) / 100;
        const xe = totalCarbs / 12;

        xeResultValue.textContent = xe.toFixed(2);
        xeFormulaText.textContent = `(${carbsPer100g} × ${weight} ÷ 100) ÷ 12 = ${xe.toFixed(2)} ХЕ`;
        xeFormula.style.display = 'block';
    }

    if (xeSearchInput) {
        xeSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            if (query.length === 0) {
                xeSearchDropdown.style.display = 'none';
                return;
            }
            searchTimeout = setTimeout(() => searchProductsForXE(query), 300);
        });

        document.addEventListener('click', (e) => {
            if (!xeSearchInput.contains(e.target) && !xeSearchDropdown.contains(e.target)) {
                xeSearchDropdown.style.display = 'none';
            }
        });
    }

    if (xeWeightInput) {
        xeWeightInput.addEventListener('input', calculateXE);
    }
}

// hba1c — гликированный гемоглобин

function initHbA1c() {
    const hba1cBtn = document.getElementById('hba1cBtn');
    const hba1cModal = new bootstrap.Modal(document.getElementById('hba1cModal'));
    const hba1cForm = document.getElementById('hba1cForm');
    const hba1cDateInput = document.getElementById('hba1cDateInput');

    // устанавливаем сегодняшнюю дату по умолчанию
    if (hba1cDateInput) {
        hba1cDateInput.valueAsDate = new Date();
    }

    // открытие модального окна
    if (hba1cBtn) {
        hba1cBtn.addEventListener('click', async () => {
            hba1cModal.show();
            await loadHbA1cData();
        });
    }

    // сохранение замера
    if (hba1cForm) {
        hba1cForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const value = parseFloat(document.getElementById('hba1cValueInput').value);
            const date = document.getElementById('hba1cDateInput').value;
            const note = document.getElementById('hba1cNoteInput').value.trim();

            if (!value || value < 3 || value > 20) {
                alert('Введите корректное значение HbA1c (от 3 до 20%)');
                return;
            }

            if (!date) {
                alert('Укажите дату замера');
                return;
            }

            const saveBtn = document.getElementById('hba1cSaveBtn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Сохранение...';

            try {
                const response = await fetch('/diabetes/api/hba1c', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value, date, note })
                });

                if (response.ok) {
                    alert('Замер HbA1c успешно сохранён!');
                    hba1cForm.reset();
                    hba1cDateInput.valueAsDate = new Date();
                    await loadHbA1cData();
                } else {
                    const error = await response.json();
                    alert('Ошибка: ' + (error.error || 'Неизвестная ошибка'));
                }
            } catch (error) {
                console.error('Ошибка сохранения HbA1c:', error);
                alert('Ошибка сохранения замера');
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bi bi-check2 me-1"></i>Сохранить замер';
            }
        });
    }
}

async function loadHbA1cData() {
    try {
        // загружаем последний результат
        const latestResponse = await fetch('/diabetes/api/hba1c/latest');
        if (latestResponse.ok) {
            const latestData = await latestResponse.json();
            displayLatestHbA1c(latestData.latest);
        }

        // загружаем историю
        const historyResponse = await fetch('/diabetes/api/hba1c/history');
        if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            displayHbA1cHistory(historyData.history);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных HbA1c:', error);
    }
}

function displayLatestHbA1c(latest) {
    const latestBlock = document.getElementById('hba1cLatest');
    const latestValue = document.getElementById('hba1cLatestValue');
    const latestDate = document.getElementById('hba1cLatestDate');
    const latestBadge = document.getElementById('hba1cLatestBadge');

    if (!latest) {
        latestBlock.style.display = 'none';
        return;
    }

    latestBlock.style.display = 'block';
    latestValue.textContent = `${latest.value}%`;
    latestDate.textContent = new Date(latest.date).toLocaleDateString('ru-RU');

    const interpretation = latest.interpretation;
    latestBadge.textContent = interpretation.text;
    latestBadge.style.backgroundColor = `${interpretation.color}33`;
    latestBadge.style.color = interpretation.color;
}

function displayHbA1cHistory(history) {
    const historyBlock = document.getElementById('hba1cHistory');
    const historyList = document.getElementById('hba1cHistoryList');

    if (!history || history.length === 0) {
        historyBlock.style.display = 'none';
        return;
    }

    historyBlock.style.display = 'block';

    const html = history.map(record => {
        const interpretation = record.interpretation;
        const date = new Date(record.date).toLocaleDateString('ru-RU');

        return `
            <div style="
                background: var(--input-bg);
                border: 1px solid var(--input-border);
                border-radius: 10px;
                padding: 12px;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div>
                    <div style="font-size: 18px; font-weight: 800; color: var(--text-main);">${record.value}%</div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${date}</div>
                    ${record.note ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; font-style: italic;">${record.note}</div>` : ''}
                </div>
                <div>
                    <span class="gi-badge" style="background-color: ${interpretation.color}33; color: ${interpretation.color};">
                        ${interpretation.text}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    historyList.innerHTML = html;
}
