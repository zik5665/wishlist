// ВАЖНО: Вставьте СЮДА новую ссылку после развертывания!
const GOOGLE_API_URL = 'https://script.google.com/macros/s/AKfycbxdGSXjHj0E3eHEWim0RGIRATt_5XLC_w_EO2Rt-VsqJwO5N-xElbziHwStFBeUEVRpOg/exec';

// --- 1. ОТРИСОВКА КАРТОЧЕК ---
function renderSingleWish(wish) {
    const li = document.createElement('li');
    li.className = 'wish-item';
    li.id = `wish-${wish.id}`;
    li.setAttribute('data-category', wish.category || 'Прочее');
    li.setAttribute('data-history', wish.history ? 'true' : 'false'); // Метка истории

    // Если товар в истории, он выглядит иначе (без лишних кнопок)
    if (wish.history) {
        li.innerHTML = `
            <div class="wish-header" onclick="toggleWishDetails('${wish.id}')" style="background: #fffdf0;">
                <strong style="font-size: 16px; display: flex; align-items: center; gap: 5px;">
                    🎉 ${wish.item} 
                    <span class="arrow-icon" id="arrow-${wish.id}">▼</span>
                </strong>
                <button class="btn-delete" onclick="event.stopPropagation(); deleteWish('${wish.id}')">❌</button>
            </div>
            <div class="wish-details" id="details-${wish.id}" style="display: none; flex-direction: column; text-align: center;">
                <span style="font-size: 12px; color: #7f8c8d; margin-top: 10px;">Вот как это выглядит в реальности:</span>
                ${wish.realImage ? `<img src="${wish.realImage}" class="history-real-img">` : '📸 Фото не прикрепили'}
            </div>
        `;
    }
    // Обычная активная карточка
    else {
        const boughtClass = wish.bought ? 'item-is-bought' : '';
        const boughtBtnIcon = wish.bought ? '↩' : '🎁';

        let htmlContent = `
            <div class="wish-header ${boughtClass}" id="header-${wish.id}" onclick="toggleWishDetails('${wish.id}')">
                <strong style="font-size: 16px; display: flex; align-items: center; flex-wrap: wrap; gap: 5px;">
                    ${wish.item} 
                    <span class="category-badge">${wish.category || 'Прочее'}</span>
                    <span class="arrow-icon" id="arrow-${wish.id}">▼</span>
                </strong>
                
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn-bought" id="btn-bought-${wish.id}" title="Отметить/Вернуть" onclick="event.stopPropagation(); toggleBought('${wish.id}')">${boughtBtnIcon}</button>
                    <button class="btn-delete" onclick="event.stopPropagation(); deleteWish('${wish.id}')">❌</button>
                </div>
            </div>
            
            <div class="wish-details" id="details-${wish.id}" style="display: none;">
        `;

        if (wish.image) {
            htmlContent += `<img src="${wish.image}" style="width: 100%; max-height: 200px; border-radius: 8px; object-fit: contain; background: #f9f9f9; padding: 5px; margin-top: 10px;">`;
        }

        if (wish.link) {
            let cleanLink = wish.link.trim().match(/(https?:\/\/[^\s]+)/) ? wish.link.trim().match(/(https?:\/\/[^\s]+)/)[0] : (wish.link.trim().startsWith('http') ? wish.link.trim() : 'https://' + wish.link.trim());
            htmlContent += `<a href="${cleanLink}" target="_blank" style="display: block; background: #f1f2f6; color: #2f3542; padding: 8px 15px; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: bold; width: 100%; text-align: center; margin-top: 15px;">🛒 Открыть в магазине</a>`;
        }

        // Если товар отмечен как купленный, показываем кнопку отправки в историю
        if (wish.bought) {
            htmlContent += `<button class="btn-history" id="btn-history-${wish.id}" onclick="triggerHistoryUpload('${wish.id}')">📸 Отправить в Историю</button>`;
        }

        htmlContent += `</div>`;
        li.innerHTML = htmlContent;
    }

    if (wish.user === 'муж') {
        document.getElementById('husbandList').appendChild(li);
    } else {
        document.getElementById('wifeList').appendChild(li);
    }
}

// --- 2. ЗАГРУЗКА, ДОБАВЛЕНИЕ, ФИЛЬТРЫ ---
async function loadWishes() {
    const response = await fetch(GOOGLE_API_URL);
    const wishes = await response.json();
    document.getElementById('husbandList').innerHTML = '';
    document.getElementById('wifeList').innerHTML = '';
    wishes.forEach(wish => renderSingleWish(wish));
    filterWishes('all'); // По умолчанию показываем только активные
    checkAchievements();
}

function filterWishes(who) {
    const husbandCard = document.getElementById('husbandCard');
    const wifeCard = document.getElementById('wifeCard');
    const allItems = document.querySelectorAll('.wish-item');

    // Сбрасываем видимость карточек
    husbandCard.style.display = 'block';
    wifeCard.style.display = 'block';

    if (who === 'history') {
        // Режим истории: показываем только товары с data-history="true"
        document.querySelector('.title-husband').innerHTML = '📜 История Миши';
        document.querySelector('.title-wife').innerHTML = '📜 История Катюши';
        allItems.forEach(item => {
            item.style.display = (item.getAttribute('data-history') === 'true') ? 'block' : 'none';
        });
    } else {
        // Режим активных желаний
        document.querySelector('.title-husband').innerHTML = '<img src="img/husband.png" class="avatar-icon"> Миша';
        document.querySelector('.title-wife').innerHTML = '<img src="img/wife.png" class="avatar-icon"> Катюша';

        if (who === 'husband') wifeCard.style.display = 'none';
        if (who === 'wife') husbandCard.style.display = 'none';

        allItems.forEach(item => {
            // Прячем всё, что в истории. Показываем только активные (data-history="false")
            if (item.getAttribute('data-history') === 'true') {
                item.style.display = 'none';
            } else {
                item.style.display = 'block';
            }
        });
    }
}

// --- 3. ОТПРАВКА В ИСТОРИЮ (С ФОТО) ---
let currentHistoryId = null;

function triggerHistoryUpload(id) {
    currentHistoryId = id;
    document.getElementById('historyImageInput').click(); // Вызываем скрытое окно выбора файла
}

document.getElementById('historyImageInput').addEventListener('change', async function (e) {
    if (e.target.files.length === 0) return;
    const file = e.target.files[0];
    const id = currentHistoryId;
    const statusText = document.getElementById('uploadStatus');

    statusText.innerText = "📸 Загружаем фото в Зал Славы...";
    try {
        const realImageUrl = await uploadImageToDrive(file);

        await fetch(GOOGLE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'moveToHistory', id: id, realImage: realImageUrl })
        });

        statusText.innerText = "✅ Успешно перенесено в Историю!";
        setTimeout(() => { statusText.innerText = ''; }, 3000);

        // Перезагружаем список, чтобы карточка обновилась
        loadWishes();
    } catch (error) {
        statusText.innerText = "❌ Ошибка загрузки фото";
        console.error(error);
    }
});

// --- ОСТАЛЬНОЙ ВАШ КОД НИЖЕ (ОН НЕ ИЗМЕНИЛСЯ) ---

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
        try { imageUrl = await uploadImageToDrive(imageInput.files[0]); }
        catch (error) { statusText.innerText = "❌ Ошибка загрузки"; return; }
    }

    statusText.innerText = "⏳ Сохраняю вишлист...";
    const tempId = new Date().getTime().toString();
    const wishData = { id: tempId, action: 'add', user: user, item: text, link: link, image: imageUrl, category: category, bought: false, history: false };

    renderSingleWish(wishData);
    filterWishes('all'); // Принудительно показываем активные после добавления

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

function toggleBought(id) {
    const header = document.getElementById(`header-${id}`);
    const btn = document.getElementById(`btn-bought-${id}`);
    const historyBtn = document.getElementById(`btn-history-${id}`);

    if (header.classList.contains('item-is-bought')) {
        header.classList.remove('item-is-bought');
        btn.innerText = '🎁';
        if (historyBtn) historyBtn.remove(); // Прячем кнопку отправки в историю
    } else {
        header.classList.add('item-is-bought');
        btn.innerText = '↩';

        // Показываем кнопку отправки в историю
        const detailsDiv = document.getElementById(`details-${id}`);
        if (!document.getElementById(`btn-history-${id}`)) {
            const btnHtml = document.createElement('button');
            btnHtml.className = 'btn-history';
            btnHtml.id = `btn-history-${id}`;
            btnHtml.innerText = '📸 Отправить в Историю';
            btnHtml.onclick = () => triggerHistoryUpload(id);
            detailsDiv.appendChild(btnHtml);
        }

        // Раскрываем карточку, чтобы показать новую кнопку!
        detailsDiv.style.display = 'flex';
        detailsDiv.style.flexDirection = 'column';
        document.getElementById(`arrow-${id}`).innerText = '▲';
    }

    checkAchievements();
    fetch(GOOGLE_API_URL, { method: 'POST', body: JSON.stringify({ action: 'toggleBought', id: id }) });
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

// --- УДАЛЕНИЕ И ТАЙМЕРЫ ---
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
        checkAchievements();
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
        checkAchievements();
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
    fetch(GOOGLE_API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', id: id }) });
}

function checkAchievements() {
    const boughtItems = document.querySelectorAll('.item-is-bought').length + document.querySelectorAll('[data-history="true"]').length;
    let title = ''; let icon = '';

    if (boughtItems >= 20) { title = 'Бог Подарков'; icon = '👑'; }
    else if (boughtItems >= 10) { title = 'Главный Волшебник'; icon = '🧙‍♂️'; }
    else if (boughtItems >= 5) { title = 'Эльф-помощник'; icon = '🧝‍♂️'; }
    else if (boughtItems >= 1) { title = 'Санта-новичок'; icon = '🎅'; }

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
        badge.style.transform = 'translateY(-100px)';
        badge.style.border = '2px solid #f1f2f6';
        document.body.appendChild(badge);
    }

    if (title) {
        badge.innerHTML = `<span style="font-size: 20px;">${icon}</span> ${title} (${boughtItems})`;
        badge.style.transform = 'translateY(0)';
    } else {
        badge.style.transform = 'translateY(-100px)';
    }
}

const imageInput = document.getElementById('imageInput');
if (imageInput) {
    imageInput.addEventListener('change', function (e) {
        const fileNameSpan = document.getElementById('fileName');
        if (e.target.files.length > 0) fileNameSpan.innerText = e.target.files[0].name;
        else fileNameSpan.innerText = 'Файл не выбран';
    });
}

function toggleSettings() { document.getElementById("settingsDropdown").classList.toggle("show"); }
window.onclick = function (event) {
    if (!event.target.matches('.settings-btn') && !event.target.closest('#settingsDropdown')) {
        const dropdown = document.getElementById("settingsDropdown");
        if (dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
    }
}

function filterByCategory(category) {
    const allItems = document.querySelectorAll('.wish-item');
    allItems.forEach(item => {
        if (item.getAttribute('data-history') === 'true') return; // В истории категории не фильтруем
        if (category === 'all' || item.getAttribute('data-category') === category) item.style.display = 'block';
        else item.style.display = 'none';
    });
}

// ОБОИ И ПАЛИТРА
const colorPicker = document.getElementById('themeColorPicker');
function hexToRgb(hex) {
    return `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`;
}
if (localStorage.getItem('myThemeColor') && colorPicker) {
    colorPicker.value = localStorage.getItem('myThemeColor');
    document.documentElement.style.setProperty('--card-color', hexToRgb(colorPicker.value));
}
if (colorPicker) {
    colorPicker.addEventListener('input', function (e) {
        document.documentElement.style.setProperty('--card-color', hexToRgb(e.target.value));
        localStorage.setItem('myThemeColor', e.target.value);
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

function applyBackground(mode, customUrl, customSize) {
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';

    if (mode === 'default') {
        document.body.style.backgroundImage = '';
        document.body.style.backgroundSize = 'cover';
        if (customBgWrapper) customBgWrapper.style.display = 'none';
    } else if (mode === 'custom') {
        if (customBgWrapper) customBgWrapper.style.display = 'flex';
        document.body.style.backgroundImage = customUrl ? `url('${customUrl}')` : '';
        document.body.style.backgroundSize = customSize;
    } else if (presets[mode]) {
        if (customBgWrapper) customBgWrapper.style.display = 'none';
        document.body.style.backgroundImage = `url('${presets[mode]}')`;
        document.body.style.backgroundSize = 'cover';
    }
}

if (bgSelect) {
    bgSelect.value = localStorage.getItem('myBgMode') || 'default';
    bgInput.value = localStorage.getItem('myBackgroundUrl') || '';
    bgSizeSelect.value = localStorage.getItem('myBackgroundSize') || 'cover';
    applyBackground(bgSelect.value, bgInput.value, bgSizeSelect.value);

    bgSelect.addEventListener('change', (e) => {
        localStorage.setItem('myBgMode', e.target.value);
        applyBackground(e.target.value, bgInput.value.trim(), bgSizeSelect.value);
    });
    bgInput.addEventListener('input', (e) => {
        localStorage.setItem('myBackgroundUrl', e.target.value.trim());
        applyBackground('custom', e.target.value.trim(), bgSizeSelect.value);
    });
    bgSizeSelect.addEventListener('change', (e) => {
        localStorage.setItem('myBackgroundSize', e.target.value);
        applyBackground('custom', bgInput.value.trim(), e.target.value);
    });
}

loadWishes();