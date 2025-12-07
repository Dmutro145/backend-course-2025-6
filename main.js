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
  console.log('Створено директорію кешу: ' + options.cache);
}

const server = http.createServer((req, res) => {
  const url = req.url;
  const method = req.method;
  console.log('Отримано запит: ' + method + ' ' + url);

  if (method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сервер інвентаризації працює!\n');
    return;
  }

  if (method === 'GET' && url === '/RegisterForm.html') {
    handleRegisterForm(req, res);
    return;
  }

  if (method === 'GET' && url === '/SearchForm.html') {
    handleSearchForm(req, res);
    return;
  }

  if (url === '/register') {
    if (method === 'POST') {
      handleRegister(req, res);
      return;
    }
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed\n');
    return;
  }

  if (url === '/search') {
    if (method === 'POST') {
      handleSearch(req, res);
      return;
    }
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed\n');
    return;
  }

  if (url.startsWith('/inventory')) {
    const urlPath = url.split('?')[0];
    const parts = urlPath.split('/').filter(p => p);
    const id = parts.length > 1 ? parseInt(parts[1]) : NaN;
    const action = parts[2];

    if (parts.length === 1) {
      if (method === 'GET') {
        handleGetInventory(req, res);
        return;
      }
    }

    if (!isNaN(id) && parts.length === 2) {
      if (method === 'GET') {
        handleGetInventoryItem(req, res, id);
        return;
      }
      if (method === 'PUT') {
        handleUpdateInventoryItem(req, res, id);
        return;
      }
      if (method === 'DELETE') {
        handleDeleteInventoryItem(req, res, id);
        return;
      }
    }

    if (!isNaN(id) && action === 'photo') {
      if (method === 'GET') {
        handleGetInventoryItemPhoto(req, res, id);
        return;
      }
      if (method === 'PUT') {
        handleUpdateInventoryItemPhoto(req, res, id);
        return;
      }
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 - Сторінку не знайдено\n');
});

server.listen(options.port, options.host, () => {
  console.log('Сервер запущено на http://' + options.host + ':' + options.port);
});

function handleGetInventory(req, res) {
  console.log('Отримання всіх пристроїв. Кількість: ' + inventory.length);
  const inventoryWithLinks = inventory.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    photo: item.photo ? 'http://' + options.host + ':' + options.port + item.photo : null
  }));

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(inventoryWithLinks, null, 2));
}

function handleGetInventoryItem(req, res, id) {
  console.log('Отримання пристрою ID: ' + id);
  
  const item = inventory.find(item => item.id === id);
  
  if (!item) {
    console.log('Пристрій ID ' + id + ' не знайдено');
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Пристрій не знайдено' }));
    return;
  }

  const itemWithPhoto = {
    id: item.id,
    name: item.name,
    description: item.description,
    photo: item.photo ? 'http://' + options.host + ':' + options.port + item.photo : null
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(itemWithPhoto, null, 2));
}

function handleUpdateInventoryItem(req, res, id) {
  console.log('Оновлення пристрою ID: ' + id);
  
  const itemIndex = inventory.findIndex(item => item.id === id);

  if (itemIndex === -1) {
    console.log('Пристрій ID ' + id + ' не знайдено');
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Пристрій не знайдено' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log('Отримані дані: ' + JSON.stringify(data));
      
      if (data.name !== undefined) inventory[itemIndex].name = data.name;
      if (data.description !== undefined) inventory[itemIndex].description = data.description;

      const itemWithPhoto = {
        id: inventory[itemIndex].id,
        name: inventory[itemIndex].name,
        description: inventory[itemIndex].description,
        photo: inventory[itemIndex].photo ? 'http://' + options.host + ':' + options.port + inventory[itemIndex].photo : null
      };

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(itemWithPhoto, null, 2));
    } catch (error) {
      console.error('Помилка парсингу JSON: ' + error.message);
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Невірний JSON' }));
    }
  });
}

function handleUpdateInventoryItemPhoto(req, res, id) {
  console.log('Оновлення фото для ID: ' + id);
  
  const itemIndex = inventory.findIndex(item => item.id === id);

  if (itemIndex === -1) {
    console.log('Пристрій ID ' + id + ' не знайдено');
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Пристрій не знайдено' }));
    return;
  }

  const form = formidable({
    uploadDir: options.cache,
    keepExtensions: true,
    filename: (name, ext, part, form) => {
      return 'photo_' + id + ext;
    }
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Formidable error: ' + err.message);
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Помилка при завантаженні' }));
      return;
    }

    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;

    if (!photoFile) {
      console.log('Файл не передано');
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Файл фото не передано' }));
      return;
    }

    console.log('Фото збережено: ' + photoFile.newFilename);
    const photoPath = '/inventory/' + id + '/photo';
    inventory[itemIndex].photo = photoPath;

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      message: 'Фото оновлено',
      photo: inventory[itemIndex].photo,
      filename: photoFile.newFilename
    }, null, 2));
  });
}

function handleDeleteInventoryItem(req, res, id) {
  console.log('Видалення пристрою ID: ' + id);
  
  const itemIndex = inventory.findIndex(item => item.id === id);
  
  if (itemIndex === -1) {
    console.log('Пристрій ID ' + id + ' не знайдено');
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Пристрій не знайдено' }));
    return;
  }

  const deletedItem = inventory.splice(itemIndex, 1)[0];
  console.log('Пристрій видалено: ' + deletedItem.name);
  
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ 
    message: 'Пристрій видалено', 
    item: deletedItem 
  }, null, 2));
}

function handleRegister(req, res) {
  console.log('Реєстрація нового пристрою...');
  
  const newItemId = nextId;
  console.log('ID для нового пристрою: ' + newItemId);

  const form = formidable({
    uploadDir: options.cache,
    keepExtensions: true,
    multiples: false,
    filename: (name, ext, part, form) => {
      if (part.name === 'photo') {
        return 'photo_' + newItemId + ext;
      }
      return Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    }
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Formidable error: ' + err.message);
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Помилка при обробці форми' }));
      return;
    }

    const inventoryName = Array.isArray(fields.inventory_name) 
      ? fields.inventory_name[0] 
      : fields.inventory_name;
    const description = Array.isArray(fields.description) 
      ? fields.description[0] 
      : fields.description;

    console.log('Назва: ' + inventoryName + ', Опис: ' + description);

    let photoPath = null;
    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;

    if (photoFile && photoFile.size > 0) {
      console.log('Фото збережено: ' + photoFile.newFilename);
      photoPath = '/inventory/' + newItemId + '/photo';
    } else {
      console.log('Фото не додано');
    }

    const newItem = {
      id: newItemId,
      name: inventoryName,
      description: description,
      photo: photoPath
    };

    inventory.push(newItem);
    nextId++;

    console.log('Пристрій додано. Всього пристроїв: ' + inventory.length);

    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(newItem, null, 2));
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
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; background-color: #f5f5f5; }
        .form-container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
        input[type="text"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
        .checkbox-group { display: flex; align-items: center; gap: 10px; }
        input[type="checkbox"] { width: 18px; height: 18px; }
        button { background-color: #28a745; color: white; padding: 12px 30px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; }
        button:hover { background-color: #218838; }
        .required { color: red; }
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
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'ID пристрою є обов\'язковим' }));
        return;
      }
      
      console.log('Пошук: ' + id + ', з фото: ' + hasPhoto);
      
      const item = inventory.find(item => 
        item.id.toString() === id || item.name.toLowerCase().includes(id.toLowerCase())
      );
      
      if (!item) {
        console.log('Пристрій не знайдено');
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Пристрій не знайдено' }));
        return;
      }
      
      let description = item.description || '';
      
      if (hasPhoto && item.photo) {
        description += '\nФото: http://' + options.host + ':' + options.port + item.photo;
      }
      
      const searchResult = {
        id: item.id,
        name: item.name,
        description: description,
        photo: item.photo ? 'http://' + options.host + ':' + options.port + item.photo : null
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(searchResult, null, 2));
      
    } catch (error) {
      console.error('Помилка: ' + error.message);
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Помилка при обробці запиту' }));
    }
  });
}

function handleGetInventoryItemPhoto(req, res, id) {
  console.log('Отримання фото для ID: ' + id);
  
  const item = inventory.find(item => item.id === id);
  
  if (!item) {
    console.log('Пристрій ID ' + id + ' не знайдено');
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Пристрій не знайдено' }));
    return;
  }
  
  if (!item.photo) {
    console.log('Пристрій не має фото');
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Фото не знайдено' }));
    return;
  }

  console.log('Шукаємо файл для пристрою ' + id + ' у ' + options.cache);
  const files = fs.readdirSync(options.cache);
  console.log('Файли в папці: ' + files.join(', '));
  
  let foundFile = null;

  const prefixFiles = files.filter(f => f.startsWith('photo_' + id));
  if (prefixFiles.length > 0) {
    foundFile = prefixFiles[0];
    console.log('Знайдено файл: ' + foundFile);
  }
  
  if (!foundFile) {
    console.log('Файл не знайдено у файловій системі');
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Файл фото не знайдено' }));
    return;
  }

  const filePath = path.join(options.cache, foundFile);

  const ext = path.extname(foundFile).toLowerCase();
  
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

  try {
    const fileStats = fs.statSync(filePath);
    console.log('Розмір: ' + fileStats.size + ' bytes, MIME: ' + mime);
    
    res.writeHead(200, { 
      'Content-Type': mime,
      'Content-Length': fileStats.size,
      'Cache-Control': 'public, max-age=3600'
    });
    
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Помилка читання: ' + err.message);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Помилка читання файлу' }));
    });
    
    stream.pipe(res);
    console.log('Потік фото відправлено');
    
  } catch (err) {
    console.error('Помилка: ' + err.message);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Помилка читання файлу' }));
  }
}
