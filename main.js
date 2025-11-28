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
  if (method === 'GET' && url === '/')// - Умова url === '/' означає: перевіряємо, чи клієнт звернувся саме до кореневого шляху сайту
  {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сервер інвентаризації працює!\n');
  }
  else if (method === 'POST' && url === '/register') //- Це перевірка: якщо клієнт надіслав POST‑запит на адресу /register, тоді викликається функція handleRegister.
  {
    handleRegister(req, res);
  }
  else if (method === 'GET' && url === '/inventory')
  {
    handleGetInventory(req, res);
  }
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Сторінку не знайдено\n');
  }
   else if (url === '/inventory' && method !== 'GET') {
  // Якщо /inventory але не GET метод - 405
  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed\n');
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
