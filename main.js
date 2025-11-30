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

  if (method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сервер інвентаризації працює!\n');
  }
  else if (method === 'POST' && url === '/register') {
    handleRegister(req, res);
  }
  else if (method === 'GET' && url === '/inventory') {
    handleGetInventory(req, res);
  }
  else if (url.startsWith('/inventory/')) {
    const urlParts = url.split('/');
    const id = parseInt(urlParts[2]);
    
    if (isNaN(id)) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Невірний ID\n');
      return;
    }
    
    if (method === 'GET' && url.endsWith('/photo')) {
      handleGetInventoryItemPhoto(req, res);
    }
    else if (method === 'PUT' && url.endsWith('/photo')) {
      handleUpdateInventoryItemPhoto(req, res);
    }
    else if (method === 'DELETE' && !url.endsWith('/photo')) {
      handleDeleteInventoryItem(req, res);
    }
    else if (method === 'PUT' && !url.endsWith('/photo')) {
      handleUpdateInventoryItem(req, res);
    }
    else if (method === 'GET' && !url.endsWith('/photo')) {
      handleGetInventoryItem(req, res);
    }
    else {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed\n');
    }
  }
  else if (url === '/inventory' && method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed\n');
  }
  else if (method === 'GET' && url === '/RegisterForm.html') {
    handleRegisterForm(req, res);
  }
    else if (method === 'GET' && url === '/SearchForm.html') {
  handleSearchForm(req, res);
}
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сторінку не знайдено\n');
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});

function handleGetInventory(req, res) {
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

function handleUpdateInventoryItem(req, res) {
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

  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try {
      const updateData = JSON.parse(body);
      
      if (updateData.name) {
        inventory[itemIndex].name = updateData.name;
      }
      if (updateData.description !== undefined) {
        inventory[itemIndex].description = updateData.description;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(inventory[itemIndex]));
      
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Невірний JSON\n');
    }
  });
}

function handleGetInventoryItemPhoto(req, res) {
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

  if (!item.photo) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Фото не знайдено\n');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Фото пристрою (тимчасово)\n');
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

  const form = formidable({
    uploadDir: options.cache,
    keepExtensions: true,
    multiples: false,
    allowEmptyFiles: true,
    minFileSize: 0
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Помилка при обробці фото\n');
      return;
    }

    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
    if (photoFile && photoFile.size > 0) {
      inventory[itemIndex].photo = `/inventory/${id}/photo`;
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: 'Фото оновлено', photo: inventory[itemIndex].photo }));
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
  
  const form = formidable({
    uploadDir: options.cache,
    keepExtensions: true,
    multiples: false,
    allowEmptyFiles: true,
    minFileSize: 0
  });

  form.parse(req, (err, fields, files) => {
    console.log('=== FORMIDABLE ЗАВЕРШИВ ПАРСИНГ ===');
    
    if (err) {
      console.error('ПОМИЛКА formidable:', err);
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Помилка при обробці форми\n');
      return;
    }

    console.log('Отримані поля:', fields);
    console.log('Отримані файли:', files);

    let inventoryName = '';
    let description = '';

    if (Array.isArray(fields.inventory_name)) {
      inventoryName = fields.inventory_name[0]?.trim() || '';
    } else {
      inventoryName = fields.inventory_name?.trim() || '';
    }

    if (Array.isArray(fields.description)) {
      description = fields.description[0]?.trim() || '';
    } else {
      description = fields.description?.trim() || '';
    }

    if (!inventoryName) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Ім\'я пристрою є обов\'язковим\n');
      return;
    }

    let photoPath = null;
    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
    if (photoFile && photoFile.size > 0) {
      photoPath = `/inventory/${nextId}/photo`;
    }

    const newItem = {
      id: nextId++,
      name: inventoryName,
      description: description,
      photo: photoPath
    };

    inventory.push(newItem);

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
 

// Обробка відображення форми пошуку
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
        <form action="/inventory" method="GET">
            <div class="form-group">
                <label for="search_query">Серійний номер або ID пристрою <span class="required">*</span></label>
                <input type="text" id="search_query" name="search_query" placeholder="Введіть ID або назву..." required>
            </div>
            
            <div class="form-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="include_photo" name="include_photo">
                    <label for="include_photo">Додати посилання на фото пристрою в опис</label>
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
 
