// ВАЖНО: Вставь сюда НОВУЮ ссылку из Google Apps Script!
const GOOGLE_API_URL = 'https://script.google.com/macros/s/AKfycbzErOvwKa58E140t7Dw99aZDFrURiF7Iq6JeDLPsUdsUfn8iFdMNasUP82WfKc4GkUP/exec';
// Обновленная функция для отрисовки красивой карточки
// Обновленная функция для отрисовки карточки-аккордеона
function renderSingleWish(wish) {
    const li = document.createElement('li');
    li.className = 'wish-item';
    li.id = `wish-${wish.id}`;

    // Добавляем атрибут data-category для фильтра
    li.setAttribute('data-category', wish.category || 'Прочее');

    // Шапка карточки (кликабельная)
    let htmlContent = `
        <div class="wish-header" onclick="toggleWishDetails('${wish.id}')">
            <strong style="font-size: 16px; text-align: left; display: flex; align-items: center; flex-wrap: wrap; gap: 5px;">
                ${wish.item} 
                <span class="category-badge">${wish.category || 'Прочее'}</span>
                <span class="arrow-icon" id="arrow-${wish.id}">▼</span>
            </strong>
            <button class="btn-delete" onclick="event.stopPropagation(); deleteWish('${wish.id}')">❌</button>
        </div>
        
        <div class="wish-details" id="details-${wish.id}" style="display: none;">
    `;

    // Картинка товара (если есть)
    if (wish.image) {
        htmlContent += `<img src="${wish.image}" style="width: 100%; max-height: 200px; border-radius: 8px; object-fit: contain; background: #f9f9f9; padding: 5px; margin-top: 10px;">`;
    }

    // Ссылка на покупку (если есть)
    // Ссылка на покупку (если есть)
    if (wish.link) {
        let cleanLink = wish.link.trim();

        // Умный поиск: если вставили текст вместе со ссылкой (как делает кнопка "Поделиться" в Озон/WB)
        const linkMatch = cleanLink.match(/(https?:\/\/[^\s]+)/);

        if (linkMatch) {
            cleanLink = linkMatch[0]; // Вытаскиваем строго саму ссылку
        } else if (!cleanLink.startsWith('http')) {
            cleanLink = 'https://' + cleanLink; // Добавляем https://, если ввели просто "ozon.ru/..."
        }

        htmlContent += `<a href="${cleanLink}" target="_blank" style="display: block; background: #f1f2f6; color: #2f3542; padding: 8px 15px; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: bold; width: 100%; text-align: center; margin-top: 15px; box-sizing: border-box; transition: 0.2s;">🛒 Открыть в магазине</a>`;
    }

    // Закрываем скрытый блок
    htmlContent += `</div>`;

    li.innerHTML = htmlContent;

    if (wish.user === 'муж') {
        document.getElementById('husbandList').appendChild(li);
    } else {
        document.getElementById('wifeList').appendChild(li);
    }
}

async function loadWishes() {
    const response = await fetch(GOOGLE_API_URL);
    const wishes = await response.json();
    document.getElementById('husbandList').innerHTML = '';
    document.getElementById('wifeList').innerHTML = '';
    wishes.forEach(wish => renderSingleWish(wish));
}

// Превращаем картинку в текстовый формат Base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

// Загружаем картинку на Google Диск
async function uploadImageToDrive(file) {
    const base64Data = await getBase64(file);
    const response = await fetch(GOOGLE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'upload',
            filename: file.name,
            mimeType: file.type,
            data: base64Data
        })
    });
    const result = await response.json();
    if (result.status === 'success') {
        return result.url;
    } else {
        throw new Error(result.message);
    }
}

async function addWish(user) {
    const titleInput = document.getElementById('wishInput');
    document.getElementById('fileName').innerText = 'Файл не выбран';
    const linkInput = document.getElementById('linkInput');
    const imageInput = document.getElementById('imageInput');
    const statusText = document.getElementById('uploadStatus');

    const text = titleInput.value.trim();
    const link = linkInput.value.trim();
    const category = document.getElementById('categoryInput').value; // Забираем категорию

    if (!text) { alert("Введите название!"); return; }

    let imageUrl = '';

    if (imageInput.files.length > 0) {
        statusText.innerText = "⏳ Загружаю картинку на Google Диск...";
        const file = imageInput.files[0];
        try {
            imageUrl = await uploadImageToDrive(file);
        } catch (error) {
            statusText.innerText = "❌ Ошибка загрузки";
            console.error(error);
            return;
        }
    }

    statusText.innerText = "⏳ Сохраняю вишлист...";
    const tempId = new Date().getTime().toString();
    const wishData = { id: tempId, action: 'add', user: user, item: text, link: link, image: imageUrl, category: category };

    renderSingleWish(wishData);

    titleInput.value = ''; linkInput.value = ''; imageInput.value = '';
    statusText.innerText = "✅ Готово!";
    setTimeout(() => statusText.innerText = '', 2000);
    document.getElementById('categoryInput').value = 'Прочее';

    fetch(GOOGLE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(wishData)
    });
}

function deleteWish(id) {
    const itemElement = document.getElementById(`wish-${id}`);
    if (itemElement) itemElement.remove();

    fetch(GOOGLE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', id: id })
    });
}
// Меняем текст при выборе файла
document.getElementById('imageInput').addEventListener('change', function (e) {
    const fileNameSpan = document.getElementById('fileName');
    if (e.target.files.length > 0) {
        fileNameSpan.innerText = e.target.files[0].name; // Показываем имя файла
    } else {
        fileNameSpan.innerText = 'Файл не выбран'; // Возвращаем как было
    }
});

// --- Логика меню настроек ---

// Открытие/закрытие меню
function toggleSettings() {
    document.getElementById("settingsDropdown").classList.toggle("show");
}

// Закрываем меню, если кликнуть мимо него
window.onclick = function (event) {
    if (!event.target.matches('.settings-btn')) {
        const dropdown = document.getElementById("settingsDropdown");
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
}

// Фильтрация желаний
function filterWishes(who) {
    const husbandCard = document.getElementById('husbandCard');
    const wifeCard = document.getElementById('wifeCard');

    if (who === 'all') {
        husbandCard.style.display = 'block';
        wifeCard.style.display = 'block';
    } else if (who === 'husband') {
        husbandCard.style.display = 'block';
        wifeCard.style.display = 'none';
    } else if (who === 'wife') {
        husbandCard.style.display = 'none';
        wifeCard.style.display = 'block';
    }
}
// Функция для раскрытия и скрытия карточки
function toggleWishDetails(id) {
    const detailsDiv = document.getElementById(`details-${id}`);
    const arrowSpan = document.getElementById(`arrow-${id}`);

    // Если пусто (нет ни картинки, ни ссылки) — нечего раскрывать
    if (detailsDiv.innerHTML.trim() === '') return;

    if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'flex';
        detailsDiv.style.flexDirection = 'column';
        arrowSpan.innerText = '▲'; // Меняем стрелочку вверх
    } else {
        detailsDiv.style.display = 'none';
        arrowSpan.innerText = '▼'; // Возвращаем стрелочку вниз
    }
}

// Фильтрация по категориям
function filterByCategory(category) {
    const allItems = document.querySelectorAll('.wish-item');
    allItems.forEach(item => {
        // Если выбрано "Все" ИЛИ категория карточки совпадает с выбранной
        if (category === 'all' || item.getAttribute('data-category') === category) {
            item.style.display = 'block'; // Показываем
        } else {
            item.style.display = 'none';  // Прячем
        }
    });
}

// --- ЛОГИКА ПАЛИТРЫ ЦВЕТОВ И ПАМЯТИ ---

const colorPicker = document.getElementById('themeColorPicker');

// Вспомогательная функция: переводит цвет из HEX (#ffffff) в RGB (255, 255, 255) для нашего матового стекла
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

// 1. Проверяем, есть ли сохраненный цвет в памяти браузера при входе
const savedColor = localStorage.getItem('myThemeColor');
if (savedColor) {
    colorPicker.value = savedColor; // Ставим цвет в палитру
    document.documentElement.style.setProperty('--card-color', hexToRgb(savedColor)); // Применяем к сайту
}

// 2. Слушаем, когда пользователь крутит палитру
colorPicker.addEventListener('input', function (event) {
    const chosenHexColor = event.target.value;

    // Красим окошки в реальном времени
    document.documentElement.style.setProperty('--card-color', hexToRgb(chosenHexColor));

    // Сохраняем выбор в вечную память браузера
    localStorage.setItem('myThemeColor', chosenHexColor);
});

loadWishes();