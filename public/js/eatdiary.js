class EatDiary {
    constructor() {
        this.currentDate = new Date();
        this.meals = [];
        this.water = { glasses: 0, amount: 0 };
        this.dailyGoals = {
            calories: 2000,
            carbs: 250,
            protein: 100,
            fat: 65,
            water: 2000
        };

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.renderDatePicker();
        await this.loadDayData();
    }

    setupEventListeners() {
        // Кнопки навигации по датам
        document.addEventListener('click', (e) => {
            if (e.target.closest('.day-btn')) {
                const btn = e.target.closest('.day-btn');
                const offset = parseInt(btn.dataset.offset);
                this.changeDate(offset);
            }

            // Добавить продукт
            if (e.target.closest('.meal-card__add')) {
                const mealType = e.target.closest('.meal-section').dataset.mealType;
                this.openAddFoodModal(mealType);
            }

            // Удалить продукт
            if (e.target.closest('.delete-food-btn')) {
                const foodId = e.target.closest('.delete-food-btn').dataset.foodId;
                const mealId = e.target.closest('.meal-section').dataset.mealId;
                this.deleteFood(mealId, foodId);
            }

            // Добавить приём пищи
            if (e.target.closest('#addMealBtn')) {
                this.openAddMealModal();
            }

            // Добавить воду
            if (e.target.closest('#addWaterBtn')) {
                this.addWater();
            }

            // Клик по стакану воды
            if (e.target.closest('.water-cup')) {
                const index = parseInt(e.target.closest('.water-cup').dataset.index);
                this.toggleWater(index);
            }
        });
    }

    renderDatePicker() {
        const picker = document.querySelector('.day-picker');
        picker.innerHTML = '';

        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

        // Показываем 7 дней: 3 назад, сегодня, 3 вперёд
        for (let i = -3; i <= 3; i++) {
            const date = new Date(this.currentDate);
            date.setDate(date.getDate() + i);

            const isToday = i === 0;

            picker.innerHTML += `
        <button class="day-btn ${isToday ? 'active' : ''}" type="button" data-offset="${i}">
          <span class="day-name">${days[date.getDay()]}</span>
          <span class="day-num">${date.getDate()}</span>
        </button>
      `;
        }
    }

    changeDate(offset) {
        this.currentDate.setDate(this.currentDate.getDate() + offset);
        this.renderDatePicker();
        this.loadDayData();
    }

    async loadDayData() {
        try {
            const dateStr = this.currentDate.toISOString().split('T')[0];
            const response = await fetch(`/api/meals/day/${dateStr}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Ошибка загрузки данных');

            const data = await response.json();
            this.meals = data.meals;
            this.water = data.water;
            this.dailyTotals = data.totals;

            this.render();
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось загрузить данные');
        }
    }

    render() {
        this.renderMeals();
        this.renderWater();
        this.renderStats();
    }

    renderMeals() {
        const container = document.querySelector('.meals-container');
        if (!container) return;

        const mealTypes = {
            breakfast: { label: 'Завтрак', time: '07:30' },
            lunch: { label: 'Обед', time: '13:00' },
            snack: { label: 'Перекус', time: '16:30' },
            dinner: { label: 'Ужин', time: '19:00' }
        };

        container.innerHTML = Object.entries(mealTypes).map(([type, config]) => {
            const meal = this.meals.find(m => m.mealType === type) || {
                foods: [],
                totalCalories: 0
            };

            return this.renderMealCard(type, config, meal);
        }).join('');
    }

    renderMealCard(type, config, meal) {
        return `
      <div class="card register-card border-0 shadow-lg mb-4 meal-section" 
           data-meal-type="${type}" 
           data-meal-id="${meal._id || ''}">
        <div class="card-body p-4">
          <span class="badge dash-badge mb-2">${meal.time || config.time}</span>
          <h5 class="fw-bold mb-3">${config.label}</h5>
          <div class="meal-card">
            <div class="meal-card__header">
              <span class="meal-card__title">Продукты</span>
              <span class="meal-card__kcal">${meal.totalCalories || 0} ккал</span>
            </div>
            ${meal.foods.map(food => this.renderFoodItem(food)).join('')}
            <div class="meal-card__add" style="cursor: pointer;">
              <i class="bi bi-plus-circle"></i>
              Добавить продукт
            </div>
          </div>
        </div>
      </div>
    `;
    }

    renderFoodItem(food) {
        return `
      <div class="meal-item">
        <div>
          <div class="meal-item__name">${food.name}</div>
          <div class="meal-item__detail">
            ${food.weight} г · 
            У: ${food.carbs}г · 
            Б: ${food.protein}г · 
            Ж: ${food.fat}г
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="meal-item__kcal">${food.calories} ккал</span>
          <button class="btn btn-sm btn-link text-danger delete-food-btn" 
                  data-food-id="${food._id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
    }

    renderWater() {
        const waterCups = document.querySelector('.water-cups-container');
        if (!waterCups) return;

        waterCups.innerHTML = '';
        const totalCups = 8;

        for (let i = 0; i < totalCups; i++) {
            const filled = i < this.water.glasses;
            waterCups.innerHTML += `
        <div class="water-cup ${filled ? 'filled' : ''}" data-index="${i}">
          <i class="bi bi-droplet${filled ? '-fill' : ''}"></i>
        </div>
      `;
        }

        // Обновляем прогресс
        const waterProgress = (this.water.amount / this.dailyGoals.water) * 100;
        document.querySelector('.water-progress-bar').style.width = `${waterProgress}%`;
        document.querySelector('.water-amount').textContent = this.water.amount;
        document.querySelector('.water-percent').textContent = Math.round(waterProgress);
    }

    renderStats() {
        const totals = this.dailyTotals || { calories: 0, carbs: 0, protein: 0, fat: 0 };

        // Обновляем калории
        document.querySelector('.total-calories').textContent = totals.calories;
        const calProgress = (totals.calories / this.dailyGoals.calories) * 100;
        document.querySelector('.cal-progress-bar').style.width = `${calProgress}%`;
        document.querySelector('.cal-percent').textContent = Math.round(calProgress);

        // Обновляем БЖУ
        document.querySelector('.total-carbs').textContent = Math.round(totals.carbs);
        document.querySelector('.total-protein').textContent = Math.round(totals.protein);
        document.querySelector('.total-fat').textContent = Math.round(totals.fat);

        // Обновляем диаграмму
        this.updateDonutChart(totals);
    }

    updateDonutChart(totals) {
        const totalGrams = totals.carbs + totals.protein + totals.fat;

        if (totalGrams === 0) {
            document.querySelector('.donut').style.background = '#2e3240';
            return;
        }

        const carbsPercent = (totals.carbs / totalGrams) * 100;
        const proteinPercent = (totals.protein / totalGrams) * 100;
        const fatPercent = (totals.fat / totalGrams) * 100;

        const carbsDeg = (carbsPercent / 100) * 360;
        const proteinDeg = carbsDeg + (proteinPercent / 100) * 360;
        const fatDeg = proteinDeg + (fatPercent / 100) * 360;

        document.querySelector('.donut').style.background = `conic-gradient(
      #8b5cf6 0deg ${carbsDeg}deg,
      #a78bfa ${carbsDeg}deg ${proteinDeg}deg,
      #c4b5fd ${proteinDeg}deg ${fatDeg}deg,
      #2e3240 ${fatDeg}deg 360deg
    )`;

        // Обновляем легенду
        document.querySelector('.carbs-percent').textContent = Math.round(carbsPercent);
        document.querySelector('.protein-percent').textContent = Math.round(proteinPercent);
        document.querySelector('.fat-percent').textContent = Math.round(fatPercent);
    }

    async addWater() {
        try {
            const dateStr = this.currentDate.toISOString().split('T')[0];
            const response = await fetch(`/api/meals/water/${dateStr}/add`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Ошибка добавления воды');

            const data = await response.json();
            this.water = data;
            this.renderWater();
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось добавить воду');
        }
    }

    async toggleWater(index) {
        try {
            const dateStr = this.currentDate.toISOString().split('T')[0];

            // Если стакан заполнен - убираем, иначе добавляем
            const endpoint = index < this.water.glasses ? 'remove' : 'add';

            // Нужно добавить/убрать столько стаканов, чтобы достичь нужного индекса
            const targetGlasses = index + 1;
            const diff = Math.abs(targetGlasses - this.water.glasses);

            for (let i = 0; i < diff; i++) {
                const response = await fetch(`/api/meals/water/${dateStr}/${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) throw new Error('Ошибка изменения воды');
                this.water = await response.json();
            }

            this.renderWater();
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось изменить количество воды');
        }
    }

    openAddFoodModal(mealType) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'addFoodModal';
        modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content" style="background: var(--card-bg); border: 1px solid var(--card-border);">
          <div class="modal-header border-bottom" style="border-color: var(--card-border) !important;">
            <h5 class="modal-title fw-bold">Добавить продукт</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <!-- Поиск -->
            <div class="mb-4">
              <label class="form-label" style="color: var(--text-muted); font-size: 13px; font-weight: 600;">
                Поиск продукта
              </label>
              <div class="input-group">
                <input type="text" class="form-control" id="foodSearchInput" 
                       placeholder="Введите название продукта..." 
                       style="background: var(--input-bg); border-color: var(--input-border); color: var(--text-main);">
                <button class="btn btn-primary" type="button" id="searchBtn">
                  <i class="bi bi-search"></i> Найти
                </button>
              </div>
            </div>

            <!-- Результаты поиска -->
            <div id="searchResults" class="mb-3"></div>

            <!-- Форма добавления -->
            <div id="addFoodForm" style="display: none;">
              <div class="card" style="background: var(--input-bg); border-color: var(--card-border);">
                <div class="card-body">
                  <h6 class="fw-bold mb-3" id="selectedFoodName"></h6>
                  
                  <div class="row g-3">
                    <div class="col-12">
                      <label class="form-label" style="color: var(--text-muted); font-size: 13px; font-weight: 600;">
                        Вес (грамм)
                      </label>
                      <input type="number" class="form-control" id="foodWeight" value="100" min="1"
                             style="background: var(--input-bg); border-color: var(--input-border); color: var(--text-main);">
                    </div>
                    
                    <div class="col-12">
                      <div class="d-flex justify-content-between mb-2">
                        <span style="font-size: 13px; color: var(--text-muted);">Калории:</span>
                        <span id="calcCalories" class="fw-bold" style="color: var(--text-main);">0 ккал</span>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span style="font-size: 13px; color: var(--text-muted);">Углеводы:</span>
                        <span id="calcCarbs" class="fw-bold" style="color: var(--text-main);">0 г</span>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span style="font-size: 13px; color: var(--text-muted);">Белки:</span>
                        <span id="calcProtein" class="fw-bold" style="color: var(--text-main);">0 г</span>
                      </div>
                      <div class="d-flex justify-content-between">
                        <span style="font-size: 13px; color: var(--text-muted);">Жиры:</span>
                        <span id="calcFat" class="fw-bold" style="color: var(--text-main);">0 г</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-top" style="border-color: var(--card-border) !important;">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
            <button type="button" class="btn btn-primary" id="confirmAddFood" disabled>Добавить</button>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

        let selectedProduct = null;

        // Поиск продуктов
        const searchBtn = modal.querySelector('#searchBtn');
        const searchInput = modal.querySelector('#foodSearchInput');

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });

        searchBtn.addEventListener('click', async () => {
            const query = searchInput.value.trim();
            if (!query) return;

            searchBtn.disabled = true;
            searchBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Поиск...';

            try {
                const response = await fetch(`/api/meals/search?query=${encodeURIComponent(query)}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) throw new Error('Ошибка поиска');

                const products = await response.json();
                this.renderSearchResults(products, modal, (product) => {
                    selectedProduct = product;
                    this.showAddFoodForm(modal, product);
                });
            } catch (error) {
                console.error('Ошибка:', error);
                this.showError('Ошибка поиска продуктов');
            } finally {
                searchBtn.disabled = false;
                searchBtn.innerHTML = '<i class="bi bi-search"></i> Найти';
            }
        });

        // Изменение веса - пересчёт КБЖУ
        const weightInput = modal.querySelector('#foodWeight');
        weightInput.addEventListener('input', () => {
            if (selectedProduct) {
                this.updateCalculatedNutrients(modal, selectedProduct, parseFloat(weightInput.value) || 0);
            }
        });

        // Добавление продукта
        modal.querySelector('#confirmAddFood').addEventListener('click', async () => {
            await this.addFoodToMeal(mealType, selectedProduct, parseFloat(weightInput.value));
            bsModal.hide();
        });
    }

    renderSearchResults(products, modal, onSelect) {
        const container = modal.querySelector('#searchResults');

        if (products.length === 0) {
            container.innerHTML = `
        <div class="text-center py-4" style="color: var(--text-muted);">
          <i class="bi bi-search" style="font-size: 2rem; opacity: 0.5;"></i>
          <p class="mt-2 mb-0">Продукты не найдены</p>
        </div>
      `;
            return;
        }

        container.innerHTML = `
      <label class="form-label mb-2" style="color: var(--text-muted); font-size: 13px; font-weight: 600;">
        Результаты поиска (${products.length})
      </label>
      <div class="list-group" style="max-height: 300px; overflow-y: auto;">
        ${products.map(product => `
          <button type="button" class="list-group-item list-group-item-action search-result-item" 
                  data-barcode="${product.barcode}"
                  style="background: var(--input-bg); border-color: var(--card-border); color: var(--text-main);">
            <div class="d-flex align-items-start gap-3">
              ${product.image ? `
                <img src="${product.image}" alt="${product.name}" 
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
              ` : `
                <div style="width: 50px; height: 50px; background: var(--card-border); border-radius: 8px; 
                            display: flex; align-items: center; justify-content: center;">
                  <i class="bi bi-image" style="font-size: 1.5rem; opacity: 0.3;"></i>
                </div>
              `}
              <div class="flex-grow-1">
                <div class="fw-bold mb-1">${product.name}</div>
                ${product.brand ? `<div class="text-muted small mb-1">${product.brand}</div>` : ''}
                <div class="small" style="color: var(--text-muted);">
                  На 100г: ${product.per100g.calories} ккал · 
                  У: ${product.per100g.carbs}г · 
                  Б: ${product.per100g.protein}г · 
                  Ж: ${product.per100g.fat}г
                </div>
              </div>
            </div>
          </button>
        `).join('')}
      </div>
    `;

        // Обработка выбора продукта
        container.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                onSelect(products[index]);
            });
        });
    }

    showAddFoodForm(modal, product) {
        modal.querySelector('#addFoodForm').style.display = 'block';
        modal.querySelector('#selectedFoodName').textContent = product.name;
        modal.querySelector('#confirmAddFood').disabled = false;
        modal.querySelector('#foodWeight').value = '100';

        this.updateCalculatedNutrients(modal, product, 100);
    }

    updateCalculatedNutrients(modal, product, weight) {
        const factor = weight / 100;

        modal.querySelector('#calcCalories').textContent =
            Math.round(product.per100g.calories * factor) + ' ккал';
        modal.querySelector('#calcCarbs').textContent =
            Math.round(product.per100g.carbs * factor * 10) / 10 + ' г';
        modal.querySelector('#calcProtein').textContent =
            Math.round(product.per100g.protein * factor * 10) / 10 + ' г';
        modal.querySelector('#calcFat').textContent =
            Math.round(product.per100g.fat * factor * 10) / 10 + ' г';
    }

    async addFoodToMeal(mealType, product, weight) {
        try {
            console.log('Добавляем продукт:', { mealType, product, weight });

            const dateStr = this.currentDate.toISOString().split('T')[0];

            const mealTimes = {
                breakfast: '07:30',
                lunch: '13:00',
                snack: '16:30',
                dinner: '19:00'
            };

            // Вычисляем КБЖУ на основе веса
            const multiplier = weight / 100;

            const foodData = {
                name: product.name,
                barcode: product.barcode || '',
                weight: weight,
                calories: Math.round(product.per100g.calories * multiplier),
                carbs: Math.round(product.per100g.carbs * multiplier * 10) / 10,
                protein: Math.round(product.per100g.protein * multiplier * 10) / 10,
                fat: Math.round(product.per100g.fat * multiplier * 10) / 10
            };

            console.log('Отправляем данные:', foodData);

            const response = await fetch('/api/meals/add-food', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    date: dateStr,
                    mealType: mealType,
                    time: mealTimes[mealType],
                    food: foodData
                })
            });

            console.log('Ответ сервера статус:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Ошибка от сервера:', errorData);
                throw new Error(errorData.error || 'Ошибка добавления продукта');
            }

            const data = await response.json();
            console.log('Продукт успешно добавлен:', data);

            // Закрываем модалку
            const modalElement = document.getElementById('addFoodModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();

            // Перезагружаем данные
            await this.loadDayData();

            this.showSuccess('Продукт добавлен!');

        } catch (error) {
            console.error('Ошибка добавления продукта:', error);
            this.showError(`Не удалось добавить продукт: ${error.message}`);
        }
    }

    async deleteFood(mealId, foodId) {
        if (!confirm('Удалить продукт?')) return;

        try {
            const response = await fetch(`/api/meals/${mealId}/food/${foodId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Ошибка удаления');

            await this.loadDayData();
            this.showSuccess('Продукт удалён');
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError('Не удалось удалить продукт');
        }
    }

    openAddMealModal() {
        // Можно добавить модальное окно для создания кастомного приёма пищи
        this.showInfo('Выберите приём пищи и добавьте продукт');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'danger');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
        toast.style.zIndex = '9999';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new EatDiary();
});