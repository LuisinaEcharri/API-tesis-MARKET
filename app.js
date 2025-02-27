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


function verificarToken(req, res, next) {
    const token = req.headers["authorization"]; // Recibe el DNI como token

    if (!token) {
        return res.status(403).json({ message: "Token requerido" });
    }

    req.user = { dni: token }; // Guarda el DNI en req.user directamente
    next();
}


// Ruta para el endpoint raíz
app.get('/', (req, res) => {
    res.send('Welcome to the API');
});


app.post("/login", async (req, res) => {
    const { dni, password } = req.body;
    console.log("dniapp:", dni);
    console.log("password app:", password);
    
    const result = await db.login(dni, password); // Valida en la BD

    if (result.success) {
        res.json({ success: true, token: dni }); // ENVÍA EL DNI COMO TOKEN
    } else {
        res.status(401).json({ success: false, message: "DNI o contraseña incorrectos" });
    }
});


app.post('/registro', async(req, res) => {
    const { nombre, dni, password, celular } = req.body;
    const result = await db.registro(dni, nombre, password, celular);
    res.json(result);
});

app.post("/action", function (req, res) {
    res.send("Sending notification to a topic...");
    const data = {
        topic: "config",
        titulo: req.body.title,
        mensaje: req.body.body,
        data: req.body.data
    };
    notification.sendPushToTopic(data);
});

app.get('/level', verificarToken, async function(req, res) {
    const dni = req.user.dni; // Extrae el dni del token
    console.log('dni',dni);
    const levels = await db.getAll(dni); // Filtra los niveles según el dni
    res.send(levels);
});


app.get('/level/:id',verificarToken, async function(req, res) {
    const dni = req.user.dni; // Extrae el dni del token
    console.log('req params id',req.params.id);
    console.log('dnilevel',dni)
    res.send(await db.getLevel(req.params.id, dni));
});

// updatea id_estanteria e id_prod_disp de determinado nivel
// app.put('/level/:id', async function (req, res) {
//     await db.setRemember(req.params.id, req.body);
//     res.send("level " + req.params.id + " updated");
// });

app.post('/level/:id',verificarToken,  async function(req, res) {
    const dni = req.user.dni; //
    await db.setRemember(req.params.id, req.body, dni);
    res.send("level " + req.params.id + " updated");
});

app.get('/level/remember/:id', verificarToken, async function(req, res) {
    const dni = req.user.dni; // Extrae el dni del token
    res.send(await db.getRemember(req.params.id, dni));
});

app.put('/level', verificarToken, async function(req, res) {
    let index = Object.keys(req.body);
    const dni = req.user.dni;
    if (await db.existsLevel(req.query.id, dni)) {
        for (let e of index) {
            await db.updateLevel(req.query.id, e, req.body[e],dni);
            await db.updateToRemember(req.query.id, req.body, false, dni);
        }
    } else {
        await db.createLevel(req.query.id, dni);
        for (let e of index) {
            await db.updateLevel(req.query.id, e, req.body[e], dni);
            await db.updateToRemember(req.query.id, req.body, true, dni);
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

app.get('/result',verificarToken, async function(req, res) {
    const dni = req.user.dni;
    if (req.query.name) {
        res.send(await db.searchResults(dni,req.query.name));
    } else {
        res.send(await db.searchResults(dni));
    }
});

app.post('/result',verificarToken, async function(req, res) {
    try {
        const dni = req.user.dni;
        const insertId = await db.createResult(req.body, dni);
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