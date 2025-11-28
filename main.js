const { Command }=require('commander');
const http=require('http');
const fs=require('fs');
const path=require('path'); //файловий шлях

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
   res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });//- заголовок Content-Type: text/plain 
   res.end(`Сервер працює!\n`);
 });

//запускаю сервер
server.listen(options.port,options.host,()=>{console.log(`Сервер запущено на http://${options.host}:${options.port}`);});