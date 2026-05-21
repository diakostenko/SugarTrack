document.addEventListener('DOMContentLoaded', () => {
    // ═══ Вес ═══
    const weightInput = document.getElementById('weightInput');
    const saveWeightBtn = document.getElementById('saveWeightBtn');

    if (saveWeightBtn && weightInput) {
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
                    const result = await response.json();
                    alert('Вес успешно сохранён!');
                    console.log('Результат:', result);
                } else {
                    const error = await response.json();
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

    // ═══ Замеры тела ═══
    const heightInput = document.getElementById('heightInput');
    const waistInput = document.getElementById('waistInput');
    const hipsInput = document.getElementById('hipsInput');
    const chestInput = document.getElementById('chestInput');
    const armInput = document.getElementById('armInput');
    const bmiDisplay = document.getElementById('bmiDisplay');
    const saveMeasurementsBtn = document.getElementById('saveMeasurementsBtn');

    // Автоматический расчёт ИМТ при изменении роста или веса
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

    // Сохранение замеров
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

                    // Обновляем ИМТ
                    if (result.bmi && bmiDisplay) {
                        bmiDisplay.value = result.bmi;
                    }

                    console.log('Результат:', result);
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
});

// ═══ Гликемический индекс ═══
document.addEventListener('DOMContentLoaded', () => {
    const giSearchInput = document.getElementById('giSearchInput');
    const giSearchResults = document.getElementById('giSearchResults');
    const giPopularProducts = document.getElementById('giPopularProducts');
    const giSearchTableBody = document.getElementById('giSearchTableBody');
    const giPopularTableBody = document.getElementById('giPopularTableBody');

    let searchTimeout;

    // Функция определения уровня ГИ
    function getGILevel(gi) {
        if (gi <= 55) return { class: 'gi-low', text: 'Низкий' };
        if (gi <= 69) return { class: 'gi-mid', text: 'Средний' };
        return { class: 'gi-high', text: 'Высокий' };
    }

    // Функция отрисовки строки таблицы
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

    // Загрузка популярных продуктов при загрузке страницы
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

    // Поиск продуктов
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
            giSearchTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Ошибка поиска</td></tr>';
            giSearchResults.style.display = 'block';
            giPopularProducts.style.display = 'none';
        }
    }

    // Обработчик ввода в поиск (с задержкой)
    if (giSearchInput) {
        giSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length === 0) {
                giSearchResults.style.display = 'none';
                giPopularProducts.style.display = 'block';
                return;
            }

            searchTimeout = setTimeout(() => {
                searchProducts(query);
            }, 300); // Задержка 300мс для оптимизации
        });
    }

    // Загрузить популярные продукты при загрузке
    loadPopularProducts();
});

// ═══ Калькулятор хлебных единиц ═══
document.addEventListener('DOMContentLoaded', () => {
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

    // Поиск продуктов
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
            xeSearchDropdown.innerHTML = '<div class="xe-dropdown-empty">Ошибка поиска</div>';
            xeSearchDropdown.style.display = 'block';
        }
    }

    // Отрисовка выпадающего списка
    function renderXEDropdown(products) {
        const html = products.map(product => `
            <div class="xe-dropdown-item" data-product='${JSON.stringify(product)}'>
                <div class="xe-dropdown-item-name">${product.name}</div>
                <div class="xe-dropdown-item-info">
                    Углеводы: ${product.per100g?.carbs || 0} г на 100 г
                </div>
            </div>
        `).join('');

        xeSearchDropdown.innerHTML = html;
        xeSearchDropdown.style.display = 'block';

        // Добавляем обработчики клика
        xeSearchDropdown.querySelectorAll('.xe-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const product = JSON.parse(item.dataset.product);
                selectProduct(product);
            });
        });
    }

    // Выбор продукта
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

    // Расчет ХЕ
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

        // Формула: (углеводы на 100г * вес в граммах / 100) / 12
        const totalCarbs = (carbsPer100g * weight) / 100;
        const xe = totalCarbs / 12;

        xeResultValue.textContent = xe.toFixed(2);
        xeFormulaText.textContent = `(${carbsPer100g} × ${weight} ÷ 100) ÷ 12 = ${xe.toFixed(2)} ХЕ`;
        xeFormula.style.display = 'block';
    }

    // Обработчик ввода в поиск
    if (xeSearchInput) {
        xeSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length === 0) {
                xeSearchDropdown.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(() => {
                searchProductsForXE(query);
            }, 300);
        });

        // Закрытие dropdown при клике вне
        document.addEventListener('click', (e) => {
            if (!xeSearchInput.contains(e.target) && !xeSearchDropdown.contains(e.target)) {
                xeSearchDropdown.style.display = 'none';
            }
        });
    }

    // Обработчик изменения веса
    if (xeWeightInput) {
        xeWeightInput.addEventListener('input', calculateXE);
    }
});