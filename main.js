const { Command }=require('commander');
const http=require('http');
const fs=require('fs');
const path=require('path'); //файловий шлях

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
});

//запускаю сервер
server.listen(options.port,options.host,()=>{console.log(`Сервер запущено на http://${options.host}:${options.port}`);});
                               
//НЕРОЗБИРАВ ЦЕЙ КОД ПОВНІСТЮ
// Обробка реєстрації нового пристрою
function handleRegister(req, res) {
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      // Тимчасово - проста реалізація
      const newItem = {
        id: nextId++,
        name: "Новий пристрій",
        description: "Опис пристрою",
        photo: null
      };
      
      inventory.push(newItem);
      
      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(newItem));
      
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Помилка при реєстрації\n');
    }
  });
}

// Обробка отримання списку інвентарю
function handleGetInventory(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(inventory));
}
