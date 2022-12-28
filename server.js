const fs = require('fs')
const faker = require('faker')
const express = require('express')
const Contenedor = require('./libs/contenedorDB.js')
const { options } = require('./libs/options')

const normalizr = require("normalizr")
const { Console } = require('console')
const { normalize, denormalize, schema} = normalizr

const {Router} = express
const router = Router()

const app = express()

const PORT = 8080

app.use(express.static('./public'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))

const messages = []
var normalizedSize, denormalizedSize, chatDataSaving = 0

//Set template engine
app.set('views', './views')
app.set('view engine', 'ejs')

const libreria = new Contenedor(options,"productos")



//Devuelve todos los productos: GET /api/productos
router.get("/", (req, res) => {
    return res.json(libreria.list)
})

//Devuelve un producto segun su ID: GET /api/productos/:id
router.get("/:id", (req, res) => {
    let id = req.params.id
    return res.json(libreria.find(id))
})

//Recibe y agrega un producto y lo devuelve con su ID asignado: POST /api/productos
router.post("/", (req, res) => {
    let obj = req.body
    libreria.insert(obj)
    return res.redirect('/')
})

//Recibe y actualiza un producto segun su id: PUT /api/productos/:id
router.put("/:id", (req, res) => {
    let obj = req.body
    let id = req.params.id
    let put = res.json(libreria.update(id,obj))
    return put
})

//Elimina un producto segun su ID
router.delete("/:id", (req,res) => {
    let id = req.params.id
    let deleted = res.json(libreria.delete(id))
    return(deleted)
})

app.use('/api/productos', router)

//Main
app.get('/', (req, res) => {
    return res.render('ejs/index', libreria)
})

//Desafio 9: Consigna 1: /api/productos-test
app.get("/api/productos-test", (req, res) => {
    let productos = []
    
    for(let i=0; i<5; i++ ){
        productos.push({
            nombre: faker.commerce.productName(),
            precio: faker.commerce.price(1, 200),
            foto: faker.image.image()
        })
    }
    
    return(res.json(productos))
})

app.get("/productos-test", (req,res) => {
    return res.render('ejs/index-test')
})



//Listening
const server = app.listen(process.env.PORT || PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`)
})

//Websocket para el chat
const io = require('socket.io')(server)

io.on("connection", (socket) => {
    let currentTime = new Date().toLocaleTimeString()
    console.log(`${currentTime} New user connected`)

    readChatFromFile()

    socket.emit('messages', messages)

    //Para emitir los mensajes que llegan y sea broadcast
    socket.on("newMessage", data => {
        data.id = messages.length+1
        messages.push(data)
        io.sockets.emit("messages", messages)

        writeChatToFile()
    })

    socket.on("newProduct", data => {
        libreria.insert(data)
        io.sockets.emit("products", data)
    })

})

function normalizeAndDenormalize(what, obj) {
    const authorSchema = new schema.Entity("author")
    const chatSchema = new schema.Entity("mensajes", {
        author: authorSchema,
    })

    if(what == "normalize") {
        return normalize(obj, [chatSchema])
    }else{
        return denormalize(obj.result, [chatSchema], obj.entities)
    }
    
}

async function writeChatToFile(){
    try{
        // Normalizamos para guardar la data de esa forma y ahorrar 
        const messagesNormalized = normalizeAndDenormalize("normalize", messages)

        await fs.promises.writeFile('data/chat.json',JSON.stringify(messagesNormalized))

    } catch (err) {
        console.log('no se pudo escribir el archivo ' + err)
    }
}

async function readChatFromFile(){
    try{
        //Leemos la fuente que esta normalizada
        const message = await fs.promises.readFile('data/chat.json')
        const messageList = JSON.parse(message)

        messages.splice(0, messages.length)

        //Denormalizamos la fuente
        const messagesDenormalized = normalizeAndDenormalize("denormalize", messageList)
        
        //La pasamos a la variables messagex
        for (const m of messagesDenormalized) {
            
            messages.push(m)
        }

    } catch (err) {
        console.log('no se pudo leer el archivo ' + err)
    }
}

//Manejador de errores
app.use(function(err,req,res,next){
    console.log(err.stack)
    res.status(500).send('Ocurrio un error: '+err)
})