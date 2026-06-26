// ВАЖНО: Вставь сюда НОВУЮ ссылку из Google Apps Script!
const GOOGLE_API_URL = 'https://script.google.com/macros/s/AKfycbyTaxF1m6ui6PaKDwlqF9E_JWHWzhciuw1OzMGUtvpMFZu0jrsYDhHYVRxivVmVgYs6yQ/exec';
// Обновленная функция для отрисовки красивой карточки
function renderSingleWish(wish) {
    const li = document.createElement('li');
    li.className = 'wish-item';
    li.id = `wish-${wish.id}`;
    li.style.flexDirection = 'column';
    li.style.alignItems = 'center'; /* Центрируем содержимое */
    li.style.gap = '12px';
    li.style.position = 'relative';

    // Заголовок и крестик
    let htmlContent = `<div style="display: flex; justify-content: space-between; width: 100%; align-items: flex-start;">
                           <strong style="font-size: 18px; text-align: left;">${wish.item}</strong>
                           <button class="btn-delete" onclick="deleteWish('${wish.id}')" style="margin-left: 10px;">❌</button>
                       </div>`;

    // Картинка товара (если есть)
    if (wish.image) {
        htmlContent += `<img src="${wish.image}" style="width: 100%; max-height: 200px; border-radius: 8px; object-fit: contain; background: #f9f9f9; padding: 5px;">`;
    }

    // Ссылка на покупку (если есть)
    if (wish.link) {
        htmlContent += `<a href="${wish.link}" target="_blank" style="background: #f1f2f6; color: #2f3542; padding: 8px 15px; border-radius: 20px; text-decoration: none; font-size: 14px; font-weight: bold; width: 100%; text-align: center; transition: 0.2s;">🛒 Открыть в магазине</a>`;
    }

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
    const wishData = { id: tempId, action: 'add', user: user, item: text, link: link, image: imageUrl };

    renderSingleWish(wishData);

    titleInput.value = ''; linkInput.value = ''; imageInput.value = '';
    statusText.innerText = "✅ Готово!";
    setTimeout(() => statusText.innerText = '', 2000);

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

loadWishes();