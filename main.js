const { Command }=require('commander');
const http=require('http');
const fs=require('fs');
const path=require('path'); //файловий шлях
const { formidable } = require('formidable');
//частина 2
//база даних в памяті
let inventory=[];
let nextId=1;






// створення нового CLI
//( інтерфейс командного рядка)
const program=new Command();

program
.requiredOption('-h, --host <host>', 'Адреса сервера')
.requiredOption('-p, --port <port>', 'Порт сервера')
.requiredOption('-c, --cache <path>', 'Шлях до директоріїї кешу')

.parse(process.argv);//argv-усі аргументи командного рядка
const options=program.opts();

//файл опція кеш
if(!fs.existsSync(options.cache)) 
{
  fs.mkdirSync(options.cache,{recursive: true});//recursive створи всі відсутні папки
  console.log(`створено директорію кешу: ${options.cache}`);
}

// ств http серв
const server=http.createServer((req,res)=> //- req = запит від клієнта (що він хоче).
                                           //- res = відповідь сервера (що він повертає).
 {
   //- req.url → бере URL‑адресу запиту (наприклад, /products?id=5). Це шлях, який клієнт запитує у твого HTTP‑сервера.
//- req.method → бере HTTP‑метод запиту (наприклад, GET, POST, PUT, DELETE). Це показує, що саме клієнт хоче зробити.
   const url=req.url;
   const method=req.method;
 console.log(`Отримано запит: ${method} ${url}`)
   
     // Обробка різних ендпоінтів
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
  else if (url === '/inventory' && method !== 'GET') {
    // Якщо /inventory але не GET метод - 405
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed\n');
  }
    else if (method === 'GET' && url.startsWith('/inventory/'))
    {
  handleGetInventoryItem(req, res);
}
      else if (method === 'PUT' && url.startsWith('/inventory/') && !url.endsWith('/photo'))
      {
  handleUpdateInventoryItem(req, res);
}
        else if (method === 'GET' && url.startsWith('/inventory/') && url.endsWith('/photo')) {
  handleGetInventoryItemPhoto(req, res);
}
          else if (method === 'PUT' && url.startsWith('/inventory/') && url.endsWith('/photo')) {
  handleUpdateInventoryItemPhoto(req, res);
}
            
     else if (url.startsWith('/inventory/') && url.endsWith('/photo') && method !== 'PUT' && method !== 'GET') {
  // Якщо /inventory/:id/photo але не PUT або GET метод - 405
  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed\n');
}       
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сторінку не знайдено\n');
  }
});

//запускаю сервер
server.listen(options.port,options.host,()=>{console.log(`Сервер запущено на http://${options.host}:${options.port}`);});
                               
//НЕРОЗБИРАВ ЦЕЙ КОД ПОВНІСТЮ
// Обробка реєстрації нового пристрою
function handleRegister(req, res) {
  const form = formidable({
    uploadDir: options.cache,
    keepExtensions: true,
    multiples: false
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Помилка при обробці форми\n');
      return;
    }

    // Перевірка обов'язкового поля inventory_name
    const inventoryName = fields.inventory_name ? fields.inventory_name[0] : '';
    if (!inventoryName) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Ім\'я пристрою є обов\'язковим\n');
      return;
    }

    // Обробка фото
    let photoPath = null;
    if (files.photo && files.photo[0]) {
      photoPath = `/inventory/${nextId}/photo`;
    }

    // Створення нового пристрою
    const newItem = {
      id: nextId++,
      name: inventoryName,
      description: fields.description ? fields.description[0] : '',
      photo: photoPath
    };

    inventory.push(newItem);

    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(newItem));
  });
}

// Обробка отримання списку інвентарю
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


// Обробка отримання конкретного пристрою за ID
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
 
 // Обробка оновлення інформації про пристрій
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
      
      // Оновлюємо поля, якщо вони передані
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


// Обробка отримання фото пристрою
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

  // Перевірка чи є фото
  if (!item.photo) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Фото не знайдено\n');
    return;
  }

  // Тимчасово - повертаємо тестове повідомлення
  // Пізніше додамо реальну роботу з файлами
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Фото пристрою (тимчасово)\n');
}
  
  // Обробка оновлення фото пристрою
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
    multiples: false
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Помилка при обробці фото\n');
      return;
    }

    // Оновлюємо шлях до фото
    if (files.photo && files.photo[0]) {
      inventory[itemIndex].photo = `/inventory/${id}/photo`;
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: 'Фото оновлено', photo: inventory[itemIndex].photo }));
  });
}
