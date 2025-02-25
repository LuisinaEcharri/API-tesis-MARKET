const express = require("express")
const notification = require("./notifications")
const db = require("./database")
const app = express()
const bodyParser = require('body-parser');

// Configurar cabeceras y cors
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
    next();
});

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Ruta para el endpoint raíz
app.get('/', (req, res) => {
    res.send('Welcome to the API');
});

app.post('/login', async(req, res) => {
    const { dni, password } = req.body;
    console.log('dniapp:', dni);
    console.log('password app:', password);
    const result = await db.login(dni, password);
    res.json(result);
});

app.post('/registro', async(req, res) => {
    const { nombre, dni, password, celular } = req.body;
    const result = await db.registro(dni, nombre, password, celular);
    res.json(result);
});

// app.post("/action", function (req, res) {
//     res.send("Sending notification to a topic...");
//     const data = {
//         topic: "config",
//         titulo: req.body.title,
//         mensaje: req.body.body,
//         data: req.body.data
//     };
//     notification.sendPushToTopic(data);
// });

app.get('/level', async function(req, res) {
    res.send(await db.getAll());
});

app.get('/level/:id', async function(req, res) {
    res.send(await db.getLevel(req.params.id));
});

// updatea id_estanteria e id_prod_disp de determinado nivel
// app.put('/level/:id', async function (req, res) {
//     await db.setRemember(req.params.id, req.body);
//     res.send("level " + req.params.id + " updated");
// });

app.post('/level/:id', async function(req, res) {
    await db.setRemember(req.params.id, req.body);
    res.send("level " + req.params.id + " updated");
});

app.get('/level/remember/:id', async function(req, res) {
    res.send(await db.getRemember(req.params.id));
});

app.put('/level', async function(req, res) {
    let index = Object.keys(req.body);
    if (await db.existsLevel(req.query.id)) {
        for (let e of index) {
            await db.updateLevel(req.query.id, e, req.body[e]);
            await db.updateToRemember(req.query.id, req.body, false);
        }
    } else {
        await db.createLevel(req.query.id);
        for (let e of index) {
            await db.updateLevel(req.query.id, e, req.body[e]);
            await db.updateToRemember(req.query.id, req.body, true);
        }
    }
    res.send();
});

// app.get('/result/:name', async function(req, res) {
//     if (req.params.name) {
//         res.send(await db.searchResults(req.params.name));
//     } else {
//         res.send(await db.searchResults());
//     }
// });

app.get('/result', async function(req, res) {
    if (req.query.name) {
        res.send(await db.searchResults(req.query.name));
    } else {
        res.send(await db.searchResults());
    }
});

app.post('/result', async function(req, res) {
    try {
        const insertId = await db.createResult(req.body);
        res.status(201).send({ id: insertId }); // Devuelve el ID insertado con un estado 201 (Created)
    } catch (error) {
        console.error(error);
        res.sendStatus(500); // Devuelve un estado 500 en caso de error
    }
});

app.put('/result/:id', async function(req, res) {
    res.send(await db.updateResult(req.params.id, req.body));
});

app.get('/shelvesConfig', async function(req, res) {
    res.send(await db.getShelvesConfig(req.query.id));
});

// Start the server
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});