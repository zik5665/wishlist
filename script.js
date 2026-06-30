// ВАЖНО: Ваша актуальная ссылка
const GOOGLE_API_URL = 'https://script.google.com/macros/s/AKfycbwok2LUeXa7dw8k9cxZM-X-WZc8ffVWVAOUKGkIJSza71ISTRcCUZaMB2q2dBNjHhyrLw/exec';

// --- 1. ОТРИСОВКА КАРТОЧЕК ---
function renderSingleWish(wish) {
    const li = document.createElement('li');
    li.className = 'wish-item';
    li.id = `wish-${wish.id}`;
    li.setAttribute('data-category', wish.category || 'Прочее');

    // Проверяем статус: куплено или нет
    const boughtClass = wish.bought ? 'item-is-bought' : '';
    const boughtBtnText = wish.bought ? '↩ Вернуть' : '🎁 Подарено';

    let htmlContent = `
        <div class="wish-header ${boughtClass}" id="header-${wish.id}" onclick="toggleWishDetails('${wish.id}')">
            <strong style="font-size: 16px; text-align: left; display: flex; align-items: center; flex-wrap: wrap; gap: 5px;">
                ${wish.item} 
                <span class="category-badge">${wish.category || 'Прочее'}</span>
                <span class="arrow-icon" id="arrow-${wish.id}">▼</span>
            </strong>
            
            <div style="display: flex; gap: 8px; align-items: center;">
                <button class="btn-bought" id="btn-bought-${wish.id}" onclick="event.stopPropagation(); toggleBought('${wish.id}')">${boughtBtnText}</button>
                <button class="btn-delete" onclick="event.stopPropagation(); deleteWish('${wish.id}')">❌</button>
            </div>
        </div>
        
        <div class="wish-details" id="details-${wish.id}" style="display: none;">
    `;

    if (wish.image) {
        htmlContent += `<img src="${wish.image}" style="width: 100%; max-height: 200px; border-radius: 8px; object-fit: contain; background: #f9f9f9; padding: 5px; margin-top: 10px;">`;
    }

    if (wish.link) {
        let cleanLink = wish.link.trim();
        const linkMatch = cleanLink.match(/(https?:\/\/[^\s]+)/);
        if (linkMatch) {
            cleanLink = linkMatch[0];
        } else if (!cleanLink.startsWith('http')) {
            cleanLink = 'https://' + cleanLink;
        }
        htmlContent += `<a href="${cleanLink}" target="_blank" style="display: block; background: #f1f2f6; color: #2f3542; padding: 8px 15px; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: bold; width: 100%; text-align: center; margin-top: 15px; box-sizing: border-box; transition: 0.2s;">🛒 Открыть в магазине</a>`;
    }

    // Закрываем скрытый блок (БЕЗ ДУБЛИРОВАНИЯ)
    htmlContent += `</div>`;
    li.innerHTML = htmlContent;

    if (wish.user === 'муж') {
        document.getElementById('husbandList').appendChild(li);
    } else {
        document.getElementById('wifeList').appendChild(li);
    }
}

// --- 2. ЗАГРУЗКА И ДОБАВЛЕНИЕ ---
async function loadWishes() {
    const response = await fetch(GOOGLE_API_URL);
    const wishes = await response.json();
    document.getElementById('husbandList').innerHTML = '';
    document.getElementById('wifeList').innerHTML = '';
    wishes.forEach(wish => renderSingleWish(wish));

    checkAchievements(); // Проверяем ачивки после загрузки
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

async function uploadImageToDrive(file) {
    const base64Data = await getBase64(file);
    const response = await fetch(GOOGLE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'upload', filename: file.name, mimeType: file.type, data: base64Data })
    });
    const result = await response.json();
    if (result.status === 'success') return result.url;
    throw new Error(result.message);
}

async function addWish(user) {
    const titleInput = document.getElementById('wishInput');
    const linkInput = document.getElementById('linkInput');
    const imageInput = document.getElementById('imageInput');
    const categoryInput = document.getElementById('categoryInput');
    const statusText = document.getElementById('uploadStatus');

    const text = titleInput.value.trim();
    const link = linkInput.value.trim();
    const category = categoryInput ? categoryInput.value : 'Прочее';

    if (!text) { alert("Введите название!"); return; }

    let imageUrl = '';
    if (imageInput.files.length > 0) {
        statusText.innerText = "⏳ Загружаю картинку на Google Диск...";
        try {
            imageUrl = await uploadImageToDrive(imageInput.files[0]);
        } catch (error) {
            statusText.innerText = "❌ Ошибка загрузки";
            console.error(error);
            return;
        }
    }

    statusText.innerText = "⏳ Сохраняю вишлист...";
    const tempId = new Date().getTime().toString();
    const wishData = { id: tempId, action: 'add', user: user, item: text, link: link, image: imageUrl, category: category, bought: false };

    renderSingleWish(wishData);

    titleInput.value = ''; linkInput.value = ''; imageInput.value = '';
    document.getElementById('fileName').innerText = 'Файл не выбран';
    if (categoryInput) categoryInput.value = 'Прочее';

    statusText.innerText = "✅ Готово!";
    setTimeout(() => statusText.innerText = '', 2000);

    fetch(GOOGLE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(wishData)
    });
}

// --- 3. ЛОГИКА УДАЛЕНИЯ И ОТМЕНЫ ---
let deleteTimeout;
let pendingDeleteId = null;

let isConfirmEnabled = localStorage.getItem('settingConfirm') !== 'false';
let isTimerEnabled = localStorage.getItem('settingTimer') !== 'false';

const confirmToggle = document.getElementById('confirmToggle');
const timerToggle = document.getElementById('timerToggle');
if (confirmToggle) confirmToggle.checked = isConfirmEnabled;
if (timerToggle) timerToggle.checked = isTimerEnabled;

function updateSettings() {
    isConfirmEnabled = document.getElementById('confirmToggle').checked;
    isTimerEnabled = document.getElementById('timerToggle').checked;
    localStorage.setItem('settingConfirm', isConfirmEnabled);
    localStorage.setItem('settingTimer', isTimerEnabled);
}

function deleteWish(id) {
    if (isConfirmEnabled && !confirm("Вы уверены, что хотите удалить это желание?")) return;
    const itemElement = document.getElementById(`wish-${id}`);
    if (!itemElement) return;

    if (isTimerEnabled) {
        itemElement.style.display = 'none';
        showUndoToast(id);
    } else {
        itemElement.remove();
        sendDeleteToGoogle(id);
        checkAchievements(); // Обновляем ачивки при удалении
    }
}

function showUndoToast(id) {
    pendingDeleteId = id;
    const toast = document.getElementById('undoToast');
    if (toast) toast.classList.add('show');
    clearTimeout(deleteTimeout);

    deleteTimeout = setTimeout(() => {
        if (toast) toast.classList.remove('show');
        const itemElement = document.getElementById(`wish-${pendingDeleteId}`);
        if (itemElement) itemElement.remove();
        sendDeleteToGoogle(pendingDeleteId);
        pendingDeleteId = null;
        checkAchievements(); // Обновляем ачивки после окончательного удаления
    }, 3000);
}

function cancelDelete() {
    clearTimeout(deleteTimeout);
    const toast = document.getElementById('undoToast');
    if (toast) toast.classList.remove('show');

    if (pendingDeleteId) {
        const itemElement = document.getElementById(`wish-${pendingDeleteId}`);
        if (itemElement) itemElement.style.display = 'block';
        pendingDeleteId = null;
    }
}

function sendDeleteToGoogle(id) {
    fetch(GOOGLE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', id: id })
    });
}

// --- 4. ФУНКЦИЯ ПОДАРЕНО И АЧИВКИ ---
function toggleBought(id) {
    const header = document.getElementById(`header-${id}`);
    const btn = document.getElementById(`btn-bought-${id}`);

    if (header.classList.contains('item-is-bought')) {
        header.classList.remove('item-is-bought');
        btn.innerText = '🎁 Подарено';
    } else {
        header.classList.add('item-is-bought');
        btn.innerText = '↩ Вернуть';

        const detailsDiv = document.getElementById(`details-${id}`);
        const arrowSpan = document.getElementById(`arrow-${id}`);
        if (detailsDiv && detailsDiv.style.display === 'flex') {
            detailsDiv.style.display = 'none';
            arrowSpan.innerText = '▼';
        }
    }

    checkAchievements(); // Считаем ачивки сразу после клика!

    fetch(GOOGLE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'toggleBought', id: id })
    });
}

// НОВАЯ СИСТЕМА АЧИВОК
function checkAchievements() {
    const boughtItems = document.querySelectorAll('.item-is-bought').length;
    let title = '';
    let icon = '';

    if (boughtItems >= 20) { title = 'Бог Подарков'; icon = '👑'; }
    else if (boughtItems >= 10) { title = 'Главный Волшебник'; icon = '🧙‍♂️'; }
    else if (boughtItems >= 5) { title = 'Эльф-помощник'; icon = '🧝‍♂️'; }
    else if (boughtItems >= 1) { title = 'Санта-новичок'; icon = '🎅'; }

    // Ищем или создаем плашку для ачивки
    let badge = document.getElementById('achievementBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'achievementBadge';
        badge.style.position = 'fixed';
        badge.style.top = '20px';
        badge.style.right = '20px';
        badge.style.background = 'rgba(255, 255, 255, 0.9)';
        badge.style.padding = '10px 20px';
        badge.style.borderRadius = '30px';
        badge.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        badge.style.fontWeight = '800';
        badge.style.color = '#2c3e50';
        badge.style.zIndex = '1000';
        badge.style.backdropFilter = 'blur(10px)';
        badge.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        badge.style.transform = 'translateY(-100px)'; // Скрыто сверху
        badge.style.border = '2px solid #f1f2f6';
        document.body.appendChild(badge);
    }

    if (title) {
        badge.innerHTML = `<span style="font-size: 20px;">${icon}</span> ${title} (${boughtItems})`;
        badge.style.transform = 'translateY(0)'; // Выезжает вниз
    } else {
        badge.style.transform = 'translateY(-100px)'; // Прячется наверх
    }
}

// --- 5. UI (МЕНЮ, АККОРДЕОН, ФИЛЬТРЫ) ---
const imageInput = document.getElementById('imageInput');
if (imageInput) {
    imageInput.addEventListener('change', function (e) {
        const fileNameSpan = document.getElementById('fileName');
        if (e.target.files.length > 0) fileNameSpan.innerText = e.target.files[0].name;
        else fileNameSpan.innerText = 'Файл не выбран';
    });
}

function toggleSettings() {
    document.getElementById("settingsDropdown").classList.toggle("show");
}

window.onclick = function (event) {
    if (!event.target.matches('.settings-btn') && !event.target.closest('#settingsDropdown')) {
        const dropdown = document.getElementById("settingsDropdown");
        if (dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
    }
}

function filterWishes(who) {
    const husbandCard = document.getElementById('husbandCard');
    const wifeCard = document.getElementById('wifeCard');
    const allItems = document.querySelectorAll('.wish-item');

    husbandCard.style.display = 'block';
    wifeCard.style.display = 'block';

    if (who === 'all') {
        allItems.forEach(item => item.style.display = 'block');
    }
    else if (who === 'husband') {
        wifeCard.style.display = 'none';
        allItems.forEach(item => item.style.display = 'block');
    }
    else if (who === 'wife') {
        husbandCard.style.display = 'none';
        allItems.forEach(item => item.style.display = 'block');
    }
    else if (who === 'bought') {
        allItems.forEach(item => {
            const header = item.querySelector('.wish-header');
            if (header && header.classList.contains('item-is-bought')) item.style.display = 'block';
            else item.style.display = 'none';
        });
    }
}

function toggleWishDetails(id) {
    const detailsDiv = document.getElementById(`details-${id}`);
    const arrowSpan = document.getElementById(`arrow-${id}`);
    if (detailsDiv.innerHTML.trim() === '') return;

    if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'flex';
        detailsDiv.style.flexDirection = 'column';
        arrowSpan.innerText = '▲';
    } else {
        detailsDiv.style.display = 'none';
        arrowSpan.innerText = '▼';
    }
}

// --- 6. ПАЛИТРА И ОБОИ ---
const colorPicker = document.getElementById('themeColorPicker');
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

const savedColor = localStorage.getItem('myThemeColor');
if (savedColor && colorPicker) {
    colorPicker.value = savedColor;
    document.documentElement.style.setProperty('--card-color', hexToRgb(savedColor));
}

if (colorPicker) {
    colorPicker.addEventListener('input', function (event) {
        const chosenHexColor = event.target.value;
        document.documentElement.style.setProperty('--card-color', hexToRgb(chosenHexColor));
        localStorage.setItem('myThemeColor', chosenHexColor);
    });
}

const bgSelect = document.getElementById('bgSelect');
const customBgWrapper = document.getElementById('customBgWrapper');
const bgInput = document.getElementById('bgUrlInput');
const bgSizeSelect = document.getElementById('bgSizeSelect');

const presets = {
    'preset1': 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?q=80&w=2070',
    'preset2': 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2048',
    'preset3': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073'
};

const savedBgMode = localStorage.getItem('myBgMode') || 'default';
const savedBgUrl = localStorage.getItem('myBackgroundUrl') || '';
const savedBgSize = localStorage.getItem('myBackgroundSize') || 'cover';

if (bgSelect) bgSelect.value = savedBgMode;
if (bgInput) bgInput.value = savedBgUrl;
if (bgSizeSelect) bgSizeSelect.value = savedBgSize;
applyBackground(savedBgMode, savedBgUrl, savedBgSize);

function applyBackground(mode, customUrl, customSize) {
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';

    if (mode === 'default') {
        document.body.style.backgroundImage = '';
        document.body.style.backgroundSize = 'cover';
        if (customBgWrapper) customBgWrapper.style.display = 'none';
    }
    else if (mode === 'custom') {
        if (customBgWrapper) customBgWrapper.style.display = 'flex';
        if (customUrl) {
            document.body.style.backgroundImage = `url('${customUrl}')`;
            document.body.style.backgroundSize = customSize;
        } else {
            document.body.style.backgroundImage = '';
        }
    }
    else if (presets[mode]) {
        if (customBgWrapper) customBgWrapper.style.display = 'none';
        document.body.style.backgroundImage = `url('${presets[mode]}')`;
        document.body.style.backgroundSize = 'cover';
    }
}

if (bgSelect) bgSelect.addEventListener('change', (event) => {
    const mode = event.target.value;
    localStorage.setItem('myBgMode', mode);
    applyBackground(mode, bgInput.value.trim(), bgSizeSelect.value);
});

if (bgInput) bgInput.addEventListener('input', (event) => {
    const url = event.target.value.trim();
    localStorage.setItem('myBackgroundUrl', url);
    applyBackground('custom', url, bgSizeSelect.value);
});

if (bgSizeSelect) bgSizeSelect.addEventListener('change', (event) => {
    const size = event.target.value;
    localStorage.setItem('myBackgroundSize', size);
    applyBackground('custom', bgInput.value.trim(), size);
});

// СТАРТ ПРИЛОЖЕНИЯ
loadWishes();