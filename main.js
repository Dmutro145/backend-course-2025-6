const { Command } = require('commander');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { formidable } = require('formidable');

let inventory = [];
let nextId = 1;

const program = new Command();
program
  .requiredOption('-h, --host <host>', 'Адреса сервера')
  .requiredOption('-p, --port <port>', 'Порт сервера')
  .requiredOption('-c, --cache <path>', 'Шлях до директорії кешу')
  .parse(process.argv);

const options = program.opts();

if (!fs.existsSync(options.cache)) {
  fs.mkdirSync(options.cache, { recursive: true });
  console.log(`створено директорію кешу: ${options.cache}`);
}

const server = http.createServer((req, res) => {
  const url = req.url;
  const method = req.method;
  console.log(`Отримано запит: ${method} ${url}`);

  // Корінь
  if (method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сервер інвентаризації працює!\n');
    return;
  }

  // HTML форми
  if (method === 'GET' && url === '/RegisterForm.html') { handleRegisterForm(req, res); return; }
  if (method === 'GET' && url === '/SearchForm.html') { handleSearchForm(req, res); return; }

  // POST /register
  if (url === '/register') {
    if (method === 'POST') { handleRegister(req, res); return; }
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed\n');
    return;
  }

  // POST /search
  if (url === '/search') {
    if (method === 'POST') { handleSearch(req, res); return; }
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed\n');
    return;
  }

  // /inventory і /inventory?...
  if (url.startsWith('/inventory')) {
    const urlParts = url.split('/');
    const id = parseInt(urlParts[2]);

    // /inventory/:id/photo
    if (!isNaN(id) && url.endsWith('/photo')) {
      if (method === 'GET') { handleGetInventoryItemPhoto(req, res); return; }
      if (method === 'PUT') { handleUpdateInventoryItemPhoto(req, res); return; }
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed\n');
      return;
    }

    // /inventory/:id
    if (!isNaN(id)) {
      if (method === 'GET') { handleGetInventoryItem(req, res); return; }
      if (method === 'PUT') { handleUpdateInventoryItem(req, res); return; }
      if (method === 'DELETE') { handleDeleteInventoryItem(req, res); return; }
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed\n');
      return;
    }

 // /inventory (GET або POST)
if (url === '/inventory' || url === '/inventory/' || url.startsWith('/inventory?')) {
  if (method === 'GET') { 
    console.log('Викликаємо handleGetInventory'); // ← Додайте для відладки
    handleGetInventory(req, res); 
    return; 
  }
  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed\n');
  return;
}

    // Необроблене
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Невірний запит\n');
    return;
  }

  // Всі інші - 404
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Сторінку не знайдено\n');
});


server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});


function handleGetInventory(req, res) {
   console.log('handleGetInventory викликано!');
  const inventoryWithLinks = inventory.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    photo: item.photo ? `http://${options.host}:${options.port}${item.photo}` : null
  }));

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(inventoryWithLinks));
}

function handleGetInventoryItem(req, res) {
  const urlParts = req.url.split('/');
  const id = parseInt(urlParts[2]);
  
  if (isNaN(id)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Невірний ID\n');
    return;
  }
  
  const item = inventory.find(item => item.id === id);
  
  if (!item) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Пристрій не знайдено\n');
    return;
  }

  const itemWithPhoto = {
    ...item,
    photo: item.photo ? `http://${options.host}:${options.port}${item.photo}` : null
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(itemWithPhoto));
}

function handleUpdateInventoryItemPhoto(req, res) {
  const urlParts = req.url.split('/');
  const id = parseInt(urlParts[2]);

  if (isNaN(id)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Невірний ID\n');
    return;
  }

  const itemIndex = inventory.findIndex(item => item.id === id);

  if (itemIndex === -1) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Пристрій не знайдено\n');
    return;
  }

  // ПРАВИЛЬНІ НАЛАШТУВАННЯ formidable
  const form = formidable({
    uploadDir: options.cache,
    keepExtensions: true,
    filename: (name, ext, part, form) => {
      // Якщо це поле 'photo', даємо йому конкретне ім'я
      if (part.name === 'photo') {
        return `photo_${id}${ext}`;
      }
      // Для інших полів - випадкове ім'я
      return `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    }
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Formidable error:', err);
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Помилка при завантаженні фото\n');
      return;
    }

    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;

    if (!photoFile || photoFile.size === 0) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Файл фото не передано\n');
      return;
    }

    // Перевіряємо, чи правильно збереглося
    console.log('Photo saved as:', photoFile.newFilename);
    console.log('In directory:', options.cache);

    // Оновлюємо шлях у базі даних
   inventory[itemIndex].photo = newPath; // також реальний шлях


    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      message: 'Фото оновлено',
      photo: inventory[itemIndex].photo,
      filename: photoFile.newFilename // для дебагу
    }));
  });
}
function handleDeleteInventoryItem(req, res) {
  const urlParts = req.url.split('/');
  const id = parseInt(urlParts[2]);
  
  if (isNaN(id)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Невірний ID\n');
    return;
  }
  
  const itemIndex = inventory.findIndex(item => item.id === id);
  
  if (itemIndex === -1) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Пристрій не знайдено\n');
    return;
  }

  const deletedItem = inventory.splice(itemIndex, 1)[0];
  
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ message: 'Пристрій видалено', item: deletedItem }));
}

function handleRegister(req, res) {
  console.log('=== ПОЧАТОК ОБРОБКИ ФОРМИ ===');
  
  // Зберігаємо ID перед створенням
  const newItemId = nextId;

  const form = formidable({
    uploadDir: options.cache,
    keepExtensions: true,
    multiples: false,
    allowEmptyFiles: true,
    minFileSize: 0,
    filename: (name, ext, part, form) => {
      // Для фото даємо конкретне ім'я
      if (part.name === 'photo') {
        return `photo_${newItemId}${ext}`;
      }
      // Для текстових полів - не змінюємо
      return part.originalFilename || `${Date.now()}${ext}`;
    }
  });

  form.parse(req, (err, fields, files) => {
    console.log('=== FORMIDABLE ЗАВЕРШИВ ПАРСИНГ ===');
    
    if (err) {
      console.error('ПОМИЛКА formidable:', err);
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Помилка при обробці форми\n');
      return;
    }

    // ... (обробка полів залишається як була)

    let photoPath = null;
    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;

    if (photoFile && photoFile.size > 0) {
      // Файл ВЖЕ збережений під правильним іменем завдяки filename функції
      console.log('Фото збережено як:', photoFile.newFilename);
      photoPath = newPath; // зберігаємо реальний шлях

    }

    const newItem = {
      id: newItemId,
      name: inventoryName,
      description: description,
      photo: photoPath
    };

    inventory.push(newItem);
    nextId++; // інкрементуємо після додавання

    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(newItem));
  });
}
function handleRegisterForm(req, res) {
  const htmlForm = `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Форма реєстрації пристрою</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; background-color: #f5f5f5; }
        .form-container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
        input[type="text"], textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
        textarea { height: 100px; resize: vertical; }
        input[type="file"] { width: 100%; padding: 10px 0; }
        button { background-color: #007bff; color: white; padding: 12px 30px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; }
        button:hover { background-color: #0056b3; }
        .required { color: red; }
    </style>
</head>
<body>
    <div class="form-container">
        <h1>Форма реєстрації пристрою</h1>
        <form action="/register" method="POST" enctype="multipart/form-data">
            <div class="form-group">
                <label for="inventory_name">Назва пристрою <span class="required">*</span></label>
                <input type="text" id="inventory_name" name="inventory_name" required>
            </div>
            <div class="form-group">
                <label for="description">Опис пристрою</label>
                <textarea id="description" name="description" placeholder="Опишіть пристрій..."></textarea>
            </div>
            <div class="form-group">
                <label for="photo">Фото пристрою</label>
                <input type="file" id="photo" name="photo" accept="image/*">
            </div>
            <button type="submit">Зареєструвати пристрій</button>
        </form>
    </div>
</body>
</html>`;

  res.writeHead(200, { 
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(htmlForm, 'utf8')
  });
  res.end(htmlForm);
}

function handleSearchForm(req, res) {
  const htmlForm = `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Форма пошуку пристрою</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 500px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .form-container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        input[type="text"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            box-sizing: border-box;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        input[type="checkbox"] {
            width: 18px;
            height: 18px;
        }
        button {
            background-color: #28a745;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
        }
        button:hover {
            background-color: #218838;
        }
        .required {
            color: red;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <h1>Форма пошуку пристрою</h1>
        <form action="/search" method="POST">
            <div class="form-group">
                <label for="id">Серійний номер або ID пристрою <span class="required">*</span></label>
                <input type="text" id="id" name="id" placeholder="Введіть ID або назву..." required>
            </div>
            
            <div class="form-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="has_photo" name="has_photo">
                    <label for="has_photo">Додати посилання на фото пристрою в опис</label>
                </div>
            </div>
            
            <button type="submit">Пошук пристрою</button>
        </form>
    </div>
</body>
</html>`;

  res.writeHead(200, { 
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(htmlForm, 'utf8')
  });
  res.end(htmlForm);
}

function handleSearch(req, res) {
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const params = new URLSearchParams(body);
      const id = params.get('id');
      const hasPhoto = params.get('has_photo') === 'on';
      
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('ID пристрою є обов\'язковим\n');
        return;
      }
      
      const item = inventory.find(item => 
        item.id.toString() === id || item.name.toLowerCase().includes(id.toLowerCase())
      );
      
      if (!item) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Пристрій не знайдено\n');
        return;
      }
      
      let description = item.description;
      
      if (hasPhoto && item.photo) {
        description += `\nФото: http://${options.host}:${options.port}${item.photo}`;
      }
      
      const searchResult = {
        id: item.id,
        name: item.name,
        description: description,
        photo: item.photo ? `http://${options.host}:${options.port}${item.photo}` : null
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(searchResult));
      
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Помилка при обробці запиту\n');
    }
  });
}
function handleGetInventoryItemPhoto(req, res) {
  console.log('=== GET PHOTO HANDLER ===');
  
  const urlParts = req.url.split('/');
  const id = parseInt(urlParts[2]);
  
  if (isNaN(id)) {
    console.log('Invalid ID');
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Невірний ID\n');
    return;
  }

  console.log('Looking for photo for ID:', id);
  
     const filePath = item.photo;
  
  if (!item) {
    console.log('Item not found in inventory');
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Пристрій не знайдено\n');
    return;
  }
  
  console.log('Item photo property:', item.photo);
  if (!item.photo) {
    console.log('Item has no photo property');
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Фото не знайдено\n');
    return;
  }

  console.log('Cache directory:', options.cache);
  const files = fs.readdirSync(options.cache);
  console.log('All files in cache:', files);
  
  let foundFile = null;

  const exactMatch = files.find(f =>
       f === `photo_${id}.jpg`
    || f === `photo_${id}.jpeg`
    || f === `photo_${id}.png`
    || f === `photo_${id}.webp`
  );

  if (exactMatch) {
    foundFile = exactMatch;
    console.log(`✓ Exact match found: ${foundFile}`);
  } else {
    const prefixFiles = files.filter(f => f.startsWith(`photo_${id}`));
    console.log(`Files with prefix "photo_${id}":`, prefixFiles);
    if (prefixFiles.length > 0) {
      foundFile = prefixFiles[0];
      console.log(`✓ Found by prefix: ${foundFile}`);
    }
  }
  
  if (!foundFile) {
    console.log(' No photo file found');
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Фото не знайдено у файловій системі\n');
    return;
  }

  const filePath = path.join(options.cache, foundFile);
  console.log('Full file path:', filePath);

  const ext = path.extname(foundFile).toLowerCase();
  console.log('File extension:', ext);
  
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.jfif': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
  };
  
  const mime = mimeTypes[ext] || 'application/octet-stream';
  console.log('MIME type:', mime);

  try {
    const fileStats = fs.statSync(filePath);
    console.log('File size:', fileStats.size, 'bytes');
    
    res.writeHead(200, { 
      'Content-Type': mime,
      'Content-Length': fileStats.size,
      'Cache-Control': 'public, max-age=3600'
    });
    
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Помилка читання файлу\n');
    });
    
    stream.pipe(res);
    console.log('✓ Stream started successfully');
    
  } catch (err) {
    console.error(' Error reading file:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Помилка читання файлу\n');
  }
}
