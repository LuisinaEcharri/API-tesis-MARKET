const mysql = require('mysql2/promise');
const fs = require('fs');
const { isGeneratorObject } = require('util/types');
const { config } = require('process');
const { console } = require('inspector');
const { resolveSoa } = require('dns');

async function initDatabase() {
    const connection = await mysql.createConnection({
        host: 'mysql-vrmarket-pladema-ef62.d.aivencloud.com',
        port: 26116,
        user: 'avnadmin',
        password: 'AVNS_BD6D-d03halBr0cMHzd',
        database: 'defaultdb'
    });

    console.log('Connected to the MySQL database.');
    return connection;
}

// Consulta SQL para obtener todos los productos y niveles
async function getAll() {
    const connection = await initDatabase();
    const [rows] = await connection.execute('SELECT DISTINCT(pd.id_producto_disponible), n.id_nivel, n.nombre_nivel, n.dificultad, p.id_producto, p.nombre_prod, pd.cantidad,pd.max, e.id_estanteria, e.gondola FROM nivel n JOIN producto_disponible pd ON n.id_nivel = pd.id_nivel JOIN producto p ON pd.id_producto = p.id_producto JOIN producto_estanteria pe ON pe.id_nivel = n.id_nivel JOIN estanteria e ON e.id_estanteria = pe.id_estanteria');
    // Crear un objeto para agrupar por niveles 
    const levels = {};

    rows.forEach(row => {
        const { id_nivel, nombre_nivel, dificultad, id_producto_disponible, id_producto, nombre_prod, cantidad, max, id_estanteria, gondola } = row;

        // Si el nivel no existe en el objeto, lo creamos
        if (!levels[id_nivel]) {
            levels[id_nivel] = {
                id_nivel: id_nivel,
                nombre: nombre_nivel,
                dificultad: dificultad,
                availableProducts: [],
                shelves: {} // Inicializamos shelves como un objeto
            };
        }
        // Agregamos el producto al array de productos disponibles en ese nivel
        if (!levels[id_nivel].availableProducts.find(p => p.id_producto_disponible === id_producto_disponible)) {
            levels[id_nivel].availableProducts.push({
                id_producto_disponible: id_producto_disponible,
                id_producto: id_producto,
                nombre: nombre_prod,
                cantidad: cantidad,
                max: max
            });
        }
        // Inicializamos el array de productos para la estantería si no existe
        if (!levels[id_nivel].shelves[id_estanteria]) {
            levels[id_nivel].shelves[id_estanteria] = {
                id_estanteria: id_estanteria,
                gondola: gondola,
                productos: []
            };
        }


    });

    const [segunda] = await connection.execute('SELECT n.id_nivel,pe.id_estanteria, pe.id_producto_estanteria, pe.cant_producto FROM nivel n JOIN producto_estanteria pe ON n.id_nivel = pe.id_nivel JOIN producto p ON pe.id_producto = p.id_producto ORDER BY n.nombre_nivel');
    segunda.forEach(row => {
        const { id_nivel, id_estanteria, id_producto_estanteria, cant_producto } = row;
        if (levels[id_nivel] && levels[id_nivel].shelves && levels[id_nivel].shelves[id_estanteria]) {
            levels[id_nivel].shelves[id_estanteria].productos.push({
                id_producto: id_producto_estanteria,
                cantidad: cant_producto
            });
        }
    });
    await connection.end();
    // Convertimos el objeto en un array de niveles
    return Object.values(levels);

}

async function getRemember(level) {
    const connection = await initDatabase();
    const [results] = await connection.execute('SELECT pd.id_producto, pd.cantidad, pd.max, p.nombre_prod FROM producto_disponible pd JOIN producto p ON pd.id_producto = p.id_producto JOIN nivel n ON pd.id_nivel = n.id_nivel WHERE n.id_nivel = ?', [level]); // Pasar level como parámetro

    if (results.length > 0) {
        const availableProducts = {};

        results.forEach(row => { // Usar results en lugar de rows
            const { id_producto, cantidad, max, nombre_prod } = row;

            if (!availableProducts[id_producto]) {
                availableProducts[id_producto] = {
                    id_producto: id_producto,
                    cantidad_producto: cantidad,
                    nombre: nombre_prod,
                    max: max
                };
            }
        });

        await connection.end();
        return Object.values(availableProducts);
    }

    await connection.end(); // Cerrar la conexión incluso si no hay resultados
    return [];
}

async function getLevel(level) {
    const connection = await initDatabase();
    const [rows] = await connection.execute('SELECT pe.id_estanteria, e.max, e.gondola,pe.id_producto, pe.id_producto_estanteria, pe.nombre, pe.cant_producto FROM producto_estanteria pe JOIN estanteria e ON pe.id_estanteria=e.id_estanteria JOIN producto p ON pe.id_producto = p.id_producto WHERE pe.id_nivel = ?', [level]);
    const shelves = {};
    rows.forEach(row => {
        const { id_estanteria, max, gondola, id_producto, id_producto_estanteria, nombre, cant_producto } = row;
        // Si la estantería no existe en el objeto, la creamos
        if (!shelves[id_estanteria]) {
            shelves[id_estanteria] = {
                id_estanteria: id_estanteria,
                max: max,
                gondola: gondola,
                productos: []
            };
        }
        // Agregamos el producto a la estantería correspondiente
        shelves[id_estanteria].productos.push({
            id_producto_estanteria: id_producto_estanteria,
            id_producto: id_producto,
            nombre: nombre,
            cantidad: cant_producto
        });
    });
    await connection.end();
    return Object.values(shelves);
}

async function setRemember(level, data) {
    // Crear la conexión a MySQL

    const connection = await initDatabase();
    // Preparar los datos que se van a actualizar
    const rememberProducts = data.remember; // Suponemos que data.remember es un array de productos

    // Hacer la actualización por cada producto en el nivel
    for (let product of rememberProducts) {
        const { id_producto, cantidad } = product; // Asumiendo que estos campos existen en los datos

        // Actualizar el producto en la base de datos MySQL
        const query = 'UPDATE producto_disponible SET cantidad = ? WHERE id_producto = ? AND id_nivel = ?';

        await connection.execute(query, [cantidad, id_producto, level]);
    }

    // Cerrar la conexión
    await connection.end();

    // Retornar true si la operación fue exitosa
    return true;
}

async function createResult(data) {
    // Inserta en la tabla RESULTADO en SQL
    const connection = await initDatabase();
    const [result] = await connection.execute('INSERT INTO RESULTADO(id_nivel, id_producto, date, name, tiempo) VALUES( ? , ? , ? , ? , ? , ? )', [
        data.level, // id_nivel
        data.id_producto, // id_prod_disp   // aca deberia pasar cada id???????????????????????????????????????????
        new Date(), // date (fecha actual)
        data.name, // name (nombre del resultado)
        0, // tiempo (inicialmente en 0)
    ]);
    const lastInsertId = await connection.execute('SELECT LAST_INSERT_ID() LIMIT 1');
    await connection.end();
    // Devuelve el id del resultado insertado
    return lastInsertId;
}

async function updateResult(id, data) {
    const connection = await initDatabase();
    if (data.porcentaje != null) {
        // Si el porcentaje no es nulo, actualiza solo el campo porcentaje
        await connection.execute('UPDATE resultado SET porcentaje = ? WHERE id_result = ?', [data.porcentaje, id]);
    } else {
        // Si el porcentaje es nulo, actualiza los demás campos si no son nulos
        const updates = [];
        if (data.tiempo != null) {
            updates.push(connection.execute('UPDATE resultado SET tiempo = ? WHERE id_result = ?', [data.tiempo, id]));
        }
        if (data.tiempo_estimulo != null) {
            updates.push(connection.execute('UPDATE resultado SET tiempo_estimulo = ? WHERE id_result = ?', [data.tiempo_estimulo, id]));
        }
        if (data.productos != null) {
            let prod = {};
            if (data.productos) {
                data.productos.forEach((x, index) => {
                    prod[index] = x.slice(0, x.indexOf("("));
                });
            }
            const productosStr = JSON.stringify(prod);
            updates.push(connection.execute('UPDATE resultado SET id_producto = ? WHERE id_result = ?', [productosStr, id]));
        }
        await Promise.all(updates);
    }
    await connection.end();
    return 'Updated';
}

async function searchResults(name) {
    const connection = await initDatabase();
    console.log('entro');
    const resultados = {};
    if (name) {
        const [results] = await connection.execute('SELECT r.id_result, r.fecha, r.nombre_persona, r.tiempo, n.nombre_nivel FROM resultado r JOIN nivel n ON r.id_nivel = n.id_nivel WHERE nombre_persona = ? ORDER BY fecha DESC LIMIT 10', [name]);


        if (results && results.length > 0) { // Verifica si results existe y tiene elementos
            results.forEach(row => {
                const { id_result, fecha, nombre_persona, tiempo, nombre_nivel } = row;

                if (!resultados[id_result]) {
                    resultados[id_result] = {
                        id: id_result,
                        name: nombre_persona,
                        level: nombre_nivel,
                        fecha_inicio: fecha,
                        tiempo: tiempo
                    };
                }
            });
        }
    } else {
        const [results] = await connection.execute('SELECT r.id_result, r.fecha, r.nombre_persona, r.tiempo, n.nombre_nivel FROM resultado r JOIN nivel n ON r.id_nivel = n.id_nivel ORDER BY fecha DESC LIMIT 10');


        if (results && results.length > 0) { // Verifica si results existe y tiene elementos
            results.forEach(row => {
                const { id_result, fecha, nombre_persona, tiempo, nombre_nivel } = row;

                if (!resultados[id_result]) {
                    resultados[id_result] = {
                        id: id_result,
                        nombre_persona: nombre_persona,
                        id_nivel: nombre_nivel,
                        fecha_inicio: fecha,
                        tiempo: tiempo
                    };
                }
            });
        }
    }

    await connection.end();
    return Object.values(resultados);
}

async function updateLevel(level, shelf, products) {
    const connection = await initDatabase();
    console.log('entro258');
    let keys = Object.keys(products);
    for (let e of keys) {
        if (products[e] > 0) {
            console.log('entro 263');
            let cant = await getCurrentProduct(e);
            console.log(e);
            if (!cant)
                cant = 1;
            for (let i = 0; i < products[e]; i++) {
                nombre = (e + "-" + cant)
                if (nombre != '') {
                    console.log(products[e]);
                    const [existe] = await connection.execute(
                        'SELECT pe.id_producto FROM producto_estanteria pe JOIN producto p ON pe.id_producto=p.id_producto WHERE pe.id_estanteria = ? AND pe.id_nivel = ? AND p.nombre_prod = ?', [parseInt(shelf), level, e]
                    );

                    if (existe && existe.length > 0) {
                        // Si existe, actualizar nombre y cantidad
                        await connection.execute(
                            'UPDATE producto_estanteria SET nombre = ?, cant_producto = ? WHERE id_estanteria = ? AND id_producto = ? AND id_nivel = ?', [nombre, cant, parseInt(shelf), existe[0].id_producto, level]
                        );
                    } else {
                        const [prod] = await connection.execute(
                            'SELECT id_producto FROM producto  WHERE nombre_prod = ?', [e]
                        );
                        let producto
                        prod.forEach(row => {
                            const { id_producto } = row;
                            producto = id_producto;
                        });
                        // Si no existe, insertar (simulando el merge)
                        console.log(producto, nombre, cant, level, parseInt(shelf));
                        await connection.execute(
                            'INSERT INTO producto_estanteria (id_estanteria, id_producto, nombre, cant_producto, id_nivel) VALUES (?, ?, ?, ?,?)', [parseInt(shelf), producto, nombre, cant, level]
                        );
                    }
                }
            }
        }

    }
    await connection.end();
}

async function existsLevel(level) {
    const connection = await initDatabase();
    // Paso 1: Consultar si el nivel existe en la tabla 'nivel'
    const [rows] = await connection.execute(
        `SELECT 1 FROM nivel WHERE id_nivel = ? LIMIT 1`, [level]
    );
    await connection.end();
    // Paso 2: Si la consulta devuelve algún resultado, el nivel existe
    return rows.length > 0;

}

async function createLevel(level) {
    const connection = await initDatabase();

    // Paso 1: Crear el nivel
    await connection.execute(
        `INSERT INTO nivel (id_nivel, dificultad, nombre_nivel) 
         VALUES (?, ?, ?)`, [level, parseInt(level), "Nivel " + level]
    );

    // Cerrar la conexión
    await connection.end();
}

async function updateToRemember(level, products, newLevel) {
    const connection = await initDatabase();
    let productsList = {};
    let availableProducts = {};
    console.log('entro 334');
    const [availableProductsRows] = await connection.execute('SELECT pd.id_producto_disponible, pd.id_producto, p.nombre_prod, pd.cantidad, p.max FROM producto_disponible pd JOIN producto p ON p.id_producto = pd.id_producto WHERE pd.id_nivel = ? ', [level]);
    console.log('entro 337');
    if (availableProductsRows && availableProductsRows > 0) { // Verifica si results existe y tiene elementos
        console.log('entro336');
        availableProductsRows.forEach(row => {
            console.log('entro337');
            const { id_producto_disponible, id_producto, nombre_prod, cantidad, max } = row;
            if (!availableProducts[id_producto]) {
                console.log('entro345');

                availableProducts[id_producto] = {
                    // Leer productos disponibles del nivel (optimizado)
                    id_producto: id_producto,
                    id_producto_disponible: id_producto_disponible,
                    nombre_prod: nombre_prod,
                    cantidad: cantidad,
                    max: max // Incluir la cantidad máxima desde la base de datos
                }
                console.log(nombre_prod);
            }
        });
    }

    console.log('entro355');
    // Procesar la lista de productos (sin cambios)
    Object.keys(products).forEach(x => {
        Object.keys(products[x]).forEach(y => {
            productsList[y] = (productsList[y] || 0) + parseInt(products[x][y]);
        });
    });
    console.log('entro 362');
    console.log(newLevel, productsList);

    let result;
    console.log('entro365');
    if (newLevel) {
        result = Object.keys(productsList).filter(y => productsList[y] != 0).map(x => ({ nombre: x, cantidad: 0, max: productsList[x] }));
    } else {
        result = Object.keys(productsList).filter(y => productsList[y] != 0).map(x => {
            let prod = null; // Inicializa prod a null
            for (const key in availableProducts) {
                if (availableProducts.hasOwnProperty(key) && availableProducts[key].nombre_prod === x) {
                    prod = availableProducts[key];
                    break; // Detén el bucle una vez que encuentres el producto
                }
            }

            if (prod) {
                return {
                    id_producto: prod.id_producto,
                    nombre: x,
                    cantidad: prod.cantidad,
                    max: productsList[x]
                };
            } else {
                return { nombre: x, cantidad: 0, max: productsList[x] };
            }
        });
    }

    // Actualizar la base de datos (optimizado y con manejo de transacciones)

    if (result.length != 0) {
        console.log('entro87');
        for (const prod of result) {
            console.log(prod.nombre);
            const [idproducto] = await connection.execute('SELECT id_producto FROM producto WHERE nombre_prod = ?', [prod.nombre]);
            const [productodisp] = await connection.execute('SELECT 1 FROM producto_disponible WHERE id_producto = ? AND id_nivel = ?', [idproducto[0].id_producto, level]);
            console.log('entro prodisp')
            if (productodisp.length > 0) {
                console.log('entro producto')
                    // Actualizar producto existente
                await connection.execute(
                    'UPDATE producto_disponible SET cantidad = ? , max = ? WHERE id_producto = ? ', [prod.cantidad, prod.max, idproducto[0].id_producto]
                );
            } else {
                console.log('entro insert')
                    // Insertar nuevo producto y relación nivel-producto
                await connection.execute(
                    'INSERT INTO producto_disponible (id_producto, cantidad, max, id_nivel) VALUES( ? , ? , ? , ? )', [idproducto[0].id_producto, prod.cantidad, prod.max, level]
                );
            }
        }



    }
    await connection.end();
}
async function getCurrentProduct(name) {
    const connection = await initDatabase();

    const [rows] = await connection.execute(
        "SELECT current FROM producto WHERE nombre_prod = ?", [name]
    );
    await connection.end();
    if (rows.length > 0) {
        return rows[0].current; // Devuelve el valor de 'current'
    } else {
        return null; // Devuelve null si no se encuentra el producto
    }
}


async function getShelvesConfig() {

    const connection = await initDatabase();
    const query = 'SELECT id_estanteria, max FROM estanteria ORDER BY id_estanteria';

    const [rows] = await connection.execute(query);
    await connection.end();

    let arr = [];
    rows.forEach(row => {
        arr.push({
            id_estanteria: row.id_estanteria,
            max: row.max,
        });
    });
    return arr;

}

module.exports = { getAll, getLevel, getRemember, setRemember, createResult, updateResult, searchResults, updateLevel, existsLevel, createLevel, updateToRemember, getShelvesConfig }