const mysql = require('mysql2/promise');
const fs = require('fs');
const { isGeneratorObject } = require('util/types');
const { config } = require('process');

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

///////////////////////////////////////////INSERCION DE PRODUCTOS CON IMG////////////////////////////////////////////////////////

// // Función para insertar productos con imágenes
// async function insertProductWithImage(productName, imagePath) {
//     // Leer el archivo de imagen en un buffer
//     const imageBuffer = fs.readFileSync(imagePath);

//     // Crear la conexión a la base de datos
//     const connection = await mysql.createConnection({
//                 host: 'mysql-vrmarket-pladema-ef62.d.aivencloud.com',
//                 port: 26116,
//                 user: 'avnadmin',
//                 password: 'AVNS_BD6D-d03halBr0cMHzd',
//                 database: 'defaultdb'
//             });

//     // Ejecutar la consulta de inserción
//     const [result] = await connection.execute(
//         'INSERT INTO producto (nombre_prod, img) VALUES (?, ?)', 
//         [productName, imageBuffer]
//     );
//     // Cerrar la conexión
//     await connection.end();
//     return result;
// }

// // Insertar los productos con las imágenes correspondientes
// async function insertProducts() {
//     try {
//         let result;

//         result = await insertProductWithImage('Producto A', 'img\\Aceites-Nueva-Etiqueta.jpg');
//         console.log('Producto A insertado con éxito:', result);

//         result = await insertProductWithImage('Producto B', 'img\\bottle.jpg');
//         console.log('Producto B insertado con éxito:', result);

//     } catch (err) {
//         console.error('Error al insertar el producto:', err);
//     }
// }

// // Llamar a la función para insertar los productos
// insertProducts();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function getAll() {
    const connection = await initDatabase();
    const [rows] = await connection.execute('SELECT * FROM nivel');
    await connection.end();
    return rows;
}

async function getRemember(level) {
    const connection = await initDatabase();
    const [rows] = await connection.execute('SELECT id_prod_disp FROM nivel WHERE id_nivel = ?', [level]);
    await connection.end();
    return rows;
}

async function getLevel(level) {
    const connection = await initDatabase();
    const [rows] = await connection.execute('SELECT id_producto, id_estanteria, cant_productos FROM nivel WHERE id_nivel = ? and id_config_ejercicio = ?', [level, id_config]);
    await connection.end();
    return rows;
}


// async function getLevel(level){
//     let arr = []
//     const levelRef = await db.collection('level').doc(level).collection("shelves").get();
//     levelRef.forEach(res=>{
//         arr.push(res.data())
//     });
//     return arr
// }


// PROBAR ID_PROD_DISP QUE NO EXISTAAAAAAAAA
// updatea solo id_prod_disp. Si el level que fue pasado por parametro no existe,inserta la tupla (con id_estanteria si es especificado en el body, sino por defecto se pone id_estanteria=1)
// aclaracion: si en el body se le pasa id_estanteria y en los parametro un nivel que ya existe, id_estanteria no se va a modificar, id_prod_disp si
async function setRemember(level, data) {
    const connection = await initDatabase();
    const [levelRows] = await connection.execute('SELECT * FROM nivel WHERE id_nivel = ?', [level]);
    let res = 0;
    if (levelRows.length === 0) {
        const idEstanteria = data.id_estanteria !== undefined && data.id_estanteria !== null ? data.id_estanteria : 1;
        res = await connection.execute('INSERT INTO nivel (id_nivel, nombre_nivel, dificultad, id_estanteria, id_prod_disp) VALUES (?, ?, ?, ?, ?)', [level, `Nivel ${level}`, parseInt(level), idEstanteria, data.id_prod_disp]);
    } else {
        res = await connection.execute('UPDATE nivel SET id_prod_disp = ? WHERE id_nivel = ?', [data.id_prod_disp, level]);
    }
    await connection.end();
    return res;
}

// updatea id_estanteria e id_prod_disp de determinado nivel
// async function setRemember(level, data) {
//     const connection = await initDatabase();
//     const updates = [];
//     if (data.id_prod_disp != null) updates.push(connection.execute('UPDATE nivel SET id_prod_disp = ? WHERE id_nivel = ?', [JSON.stringify(data.id_prod_disp), level]));
//     if (data.id_estanteria != null) updates.push(connection.execute('UPDATE nivel SET id_estanteria = ? WHERE id_nivel = ?', [data.id_estanteria, level]));
//     await Promise.all(updates);
//     await connection.end();
//     return updates.length > 0 ? 'Updated' : 'No updates';
// }

async function getProductsOfLevel(level) {
    const connection = await initDatabase();
    const [rows] = await connection.execute('SELECT p.id_prod_disp, p.nombre_prod_disp, p.cantidad, p.max FROM productosDisponibles p INNER JOIN nivelProductosDisp npd ON p.id_prod_disp = npd.id_prod_disp WHERE npd.id_nivel = ?', [level]);
    await connection.end();
    return rows;
}

async function createResult(data) {
    const connection = await initDatabase();
    const fields = ['fecha', 'id_nivel', 'nombre_persona'];
    const values = ['NOW()', '?', '?'];
    const params = [data.id_nivel, data.nombre_persona];

    // Helper function to handle optional fields
    function addOptionalField(fieldName, fieldValue) {
        if (fieldValue !== undefined) {
            fields.push(fieldName);
            values.push('?');
            params.push(fieldValue !== null ? fieldValue : null);
        }
    }

    // Add optional fields
    addOptionalField('id_producto', data.id_producto);
    addOptionalField('porcentaje', data.porcentaje);
    addOptionalField('tiempo', data.tiempo);
    addOptionalField('tiempoEstimulo', data.tiempoEstimulo);

    const query = `INSERT INTO resultado (${fields.join(', ')}) VALUES (${values.join(', ')})`;
    const res = await connection.execute(query, params);
    const insertId = res[0].insertId;

    await connection.end();
    return insertId;
}

// async function updateResult(id, data) {
//     const connection = await initDatabase();
//     const updates = [];
//     if (data.porcentaje != null) updates.push(connection.execute('UPDATE resultado SET porcentaje = ? WHERE id_result = ?', [data.porcentaje, id]));
//     if (data.tiempo != null) updates.push(connection.execute('UPDATE resultado SET tiempo = ? WHERE id_result = ?', [data.tiempo, id]));
//     if (data.tiempo_estimulo != null) updates.push(connection.execute('UPDATE resultado SET tiempo_estimulo = ? WHERE id_result = ?', [data.tiempo_estimulo, id]));
//     await Promise.all(updates);
//     await connection.end();
//     return updates.length > 0 ? 'Updated' : 'No updates';
// }

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
        if (data.id_producto != null) {
            updates.push(connection.execute('UPDATE resultado SET id_producto = ? WHERE id_result = ?', [data.id_producto, id]));
        }
        await Promise.all(updates);
    }
    await connection.end();
    return 'Updated';
}

async function searchResults(name) {
    const connection = await initDatabase();
    const [rows] = name
        ?
        await connection.execute('SELECT * FROM resultado r JOIN ejercicio i ON r.id_ejercicio = i.id_ejercicio WHERE id_participante = ?', [name]) :
        await connection.execute('SELECT * FROM resultado ORDER BY fecha DESC LIMIT 10');
    // no iria con lo de arriba?
    await connection.end();
    return rows;
}

async function updateLevel(level, shelf, products) {
    const connection = await initDatabase();
    await connection.execute('UPDATE productos_estanteria_nivel SET id_producto = ? WHERE id_estanteria = ?', [JSON.stringify(products), shelf]);
    // le deberia pasar id_nivel y config_ejercicio no?
    await connection.end();
}

async function existsLevel(level) {
    const connection = await initDatabase();
    const [rows] = await connection.execute('SELECT 1 FROM productos_estanteria_nivel WHERE id_nivel = ? and id_config_ejercicio = id_config', [level, id_config]);
    // aca chequear nivel o producto estanteria?
    await connection.end();
    return rows.length > 0;
}



/// aca estanteria no esto debria ser en producto_estanteria nivel?
async function createLevel(level) {
    const connection = await initDatabase();
    await connection.execute('INSERT INTO prod (id_nivel, nombre_nivel, dificultad, id_estanteria) VALUES (?, ?, ?, ?)', [level, `Nivel ${level}`, parseInt(level), null]);
    for (let i = 1; i <= 24; i++) {
        await connection.execute('INSERT INTO estanteria (id_estanteria, max, cantidad, id_producto) VALUES (?, ?, ?, ?)', [i, 0, 0, null]);
    }
    await connection.end();
}

async function updateToRemember(level, products, newLevel) {
    const connection = await getConnection();
    let set = new Set();
    let keys = Object.keys(products);
    let productsList = {};

    // Leer productos disponibles del nivel
    const [availableProductsRows] = await connection.execute(
        `SELECT p.id_prod_disp, p.nombre_prod_disp, p.cantidad 
        FROM productosDisponibles p
        INNER JOIN nivelProductosDisp npd ON p.id_prod_disp = npd.id_prod_disp
        WHERE npd.id_nivel = ?`, [level]);
    ws;

    // Combinar productos
    keys.forEach(x => {
        Object.keys(products[x]).forEach(y => {
            if (productsList.hasOwnProperty(y)) {
                productsList[y] += parseInt(prod
                    let availableProducts = availableProductsRoucts[x][y]);
            } else {
                productsList[y] = parseInt(products[x][y]);
            }
        });
    });

    let result;
    if (newLevel) {
        result = Object.keys(productsList).filter(y => productsList[y] != 0).map(x => ({ nombre: x, cantidad: 0, max: productsList[x] }));
    } else {
        result = Object.keys(productsList).filter(y => productsList[y] != 0).map(x => {
            let prod = availableProducts.find(y => y.nombre_prod_disp === x);
            if (prod) {
                return { id_prod_disp: prod.id_prod_disp, nombre: x, cantidad: prod.cantidad > productsList[x] ? productsList[x] : prod.cantidad, max: productsList[x] };
            } else {
                return { nombre: x, cantidad: 0, max: productsList[x] };
            }
        });
    }

    // Actualizar la base de datos
    if (result.length != 0) {
        const updateQueries = result.map(async(prod) => {
            // Insertar o actualizar productos disponibles
            const [prodResult] = await connection.execute(
                `INSERT INTO productosDisponibles (nombre_prod_disp, cantidad, max) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad), max = VALUES(max)`, [prod.nombre, prod.cantidad, prod.max]
            );
            const prodId = prod.id_prod_disp || prodResult.insertId;

            // Insertar relación nivel - productosDisponibles
            await connection.execute(
                `INSERT INTO nivelProductosDisp (id_nivel, id_prod_disp) VALUES (?, ?)
                ON DUPLICATE KEY UPDATE id_nivel = VALUES(id_nivel), id_prod_disp = VALUES(id_prod_disp)`, [level, prodId]
            );
        });
        await Promise.all(updateQueries);
    }
    await connection.end();
}


async function getCurrentProduct(name) {
    const connection = await initDatabase();
    const [rows] = await connection.execute('SELECT cantidad FROM productosDisponibles WHERE nombre_prod_disp = ?', [name]);
    await connection.end();
    return rows.length ? rows[0].cantidad : null;
    /// aca deberiamos ver como tratar el id_config
}

async function getShelvesConfig(level) {
    const connection = await initDatabase();
    const [rows] = await connection.execute('SELECT * FROM productos_estanteria_nivel WHERE id_nivel = ?', [level]);
    await connection.end();
    return rows;
    /// aca deberiamos ver como tratar el id_config
}

module.exports = {
    getAll,
    getLevel,
    getRemember,
    setRemember,
    getProductsOfLevel,
    createResult,
    updateResult,
    searchResults,
    updateLevel,
    existsLevel,
    createLevel,
    updateToRemember,
    getCurrentProduct,
    getShelvesConfig
};



// const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
// const { getFirestore, Timestamp, FieldValue ,addDoc, updateDoc,doc} = require('firebase-admin/firestore');


// const db = getFirestore();

// async function getAll(){
//     let arr = []
//     const snapshot = await db.collection('level').get()
//     snapshot.forEach(res=>{
//         arr.push(res.data())
//     });
//     return arr
// }

// Consulta SQL para obtener todos los productos y niveles
async function getAll() {
    const [rows] = await connection.execute(`SELECT p.id_producto, p.nombre_prod, n.id_nivel, n.nombre_nivel, po.cant_productos, n.dificultad, po.max
        FROM productos_objetivo po join producto p on po.id_producto = p.id_producto join nivel n on po.id_nivel = n.id_nivel
        WHERE id_config_ejercio = ? 
        ORDER BY nombre_nivel
    `);
    // Crear un objeto para agrupar por niveles 
    const niveles = {};

    rows.forEach(row => {
        const { id_producto, nombre_prod, id_nivel, nombre_nivel, cant_productos, dificultad, max } = row;

        // Si el nivel no existe en el objeto, lo creamos
        if (!niveles[id_nivel]) {
            niveles[id_nivel] = {
                id: id_nivel,
                name: nombre_nivel,
                dificultad: dificultad,
                availableProducts: []
            };
        }

        // Agregamos el producto al array de productos disponibles en ese nivel
        niveles[nombre_nivel].availableProducts.push({
            id: id_producto,
            name: nombre_prod,
            cantidad: cant_productos,
            max: max
        });
    });

    // Convertimos el objeto en un array de niveles
    return Object.values(niveles);

}
// async function getRemember(level){   
//     const data = db.collection('level').doc(level);
//     const doc = await data.get();
//     if (!doc.exists) {
//         return []
//     } else {
//         return doc.data().availableProducts
//     }

// }
async function getRemember(level) {
    const [rows] = await connection.execute(`SELECT  po. id_producto, po.cant_productos, po.max, p.nombre_prod
        FROM productos_objetivo po join producto p on po.id_producto = p.poducto
        WHERE id_config_ejercicio = ? and id_nivel = ?
    `)[config, level];

    if (rows.length > 0) {
        const availableProducts = {};

        rows.forEach(row => {
            const { id_producto, cant_productos, max, nombre_prod } = row;

            if (!availableProducts[id_producto]) {
                availableProducts[id_producto] = {
                    id: id_producto,
                    cantidad: cant_productos,
                    max: max,
                    nombre: nombre_prod
                };

            }

        });

        // Convertimos el objeto en un array de resultados
        return Object.values(availableProducts);
    }
    return [];
}
// async function getRemember(level){   
//     const recordar = await connection.execute('SELECT id_producto, cant_productos FROM productos_objetivo WHERE id_nivel = ? and id_config_ejercio = ? and cant_productos > 0', [level, config]);
//     if (recordar) {
//         return data.get()
//     } else {
//          return []
//     }

// }


// async function getLevel(level){
//     let arr = []
//     const levelRef = await db.collection('level').doc(level).collection("shelves").get();
//     levelRef.forEach(res=>{
//         arr.push(res.data())
//     });
//     return arr
// }


async function getLevel(level) {
    const [rows] = await connection.execute(`SELECT e.gondola, e.id_producto, e.name
        FROM estanteria e join nivel n  on e.id_nivel=n.id_nivel
        WHERE e.name = ?
        ORDER BY gondola`, [level]);
    const shelves = {};
    rows.forEach(row => {
        const { gondola, id_producto, name } = row;
        // Si la estantería no existe en el objeto, la creamos
        if (!shelves[gondola]) {
            shelves[gondola] = {
                gondola: gondola,
                productos: []
            };
        }
        // Agregamos el producto a la estantería correspondiente
        shelves[gondola].productos.push({
            name,
        });
    });
    return Object.values(shelves);
}
// async function setRemember(level,data){
//     const levelRef = db.collection('level').doc(level);
//     const res = await levelRef.update({availableProducts: data.remember});
//     return res

// }

async function setRemember(level, data) {
    // Crear la conexión a MySQL
    const connection = await mysql.createConnection({
        host: 'localhost', // Cambia esto por tu host
        user: 'user', // Cambia esto por tu usuario de la base de datos
        password: 'password', // Cambia esto por tu contraseña de la base de datos
        database: 'database' // Cambia esto por tu base de datos
    });

    // Preparar los datos que se van a actualizar
    const rememberProducts = data.remember; // Suponemos que data.remember es un array de productos

    // Hacer la actualización por cada producto en el nivel
    for (let product of rememberProducts) {
        const {
            cantidad,
            id_producto,
            nombre
        } = product;
        const query = `
            UPDATE productos_disponible
            SET cantidad = ?
            WHERE id_nivel = ?  AND nombre_nivel = ?
        `;

        await connection.execute(query, [cantidad, nombre, level]);
    }

    // Cerrar la conexión
    await connection.end();

    // Retornar true si la operación fue exitosa
    return true;
}

// async function createResult(data){
//     const docRef = await db.collection("results").add({level:data.level,date:new Date(),name:data.name,tiempo:0,productos:FieldValue.arrayUnion({})});
//    const levelRef = await connection.execute('INSERT INTO RESULTADO (id_nivel, id_prod_disp) VALUES (?, ?)}
//return docRef.id

// }

// async function updateResult(id,data){
//     const docRef = db.collection("results").doc(id)

//     console.log(data)

//     if(data.percentage != null){
//         let res = docRef.update({percentage:data.percentage});
//         return res
//     }else{
//         let prod = {}
//         if(data.productos){
//             data.productos.forEach((x,index)=>{
//                 prod[index]=x.slice(0,x.indexOf("("))
//             })
//         }
//         console.log(data);
//         let res = docRef.update({date:Timestamp.now(),tiempo:data.time,productos:prod, tiempoEstimulo:data.stimulusTime});
//         return res
//     }
// }

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
        if (data.id_producto != null) {
            updates.push(connection.execute('UPDATE resultado SET id_producto = ? WHERE id_result = ?', [data.id_producto, id]));
        }
        await Promise.all(updates);
    }
    await connection.end();
    return 'Updated';
}
// async function searchResults(name){
//     let arr = []
//     let docRef;
//     if(name)
//        docRef = await db.collection("results").where('name', '==', name).docs();
//     else
//     docRef = await db.collection("results").orderBy('date','desc').limit(10).get();    
//     docRef.forEach(res=>{
//         arr.push(res.data())
//     });
//     return arr;

// }
async function searchResults(name) {
    const [rows] = await connection.execute(`SELECT  r.id_ejercicio, r.fecha_inicio, r.nombre_resultado, r.tiempo, n.nombre_nivel
        FROM resultado r join nivel n on r.id_nivel= n.id_nivel 
        WHERE nombre_resultado = ? 
        ORDER BY fecha_inicio desc
        LIMIT 10
    `)[name];

    const resultados = {};

    rows.forEach(row => {
        const { id_ejercicio, fecha_inicio, nombre_resultado, tiempo, nombre_nivel } = row;

        // Si el nivel no existe en el objeto, lo creamos
        if (!resultados[id_ejercicio]) {
            resultados[id_ejercicio] = {
                id: id_ejercicio,
                name: nombre_resultado,
                level: nombre_nivel,
                fecha_inicio: fecha_inicio,
                tiempo: tiempo
            };

        }

    });

    // Convertimos el objeto en un array de resultados
    return Object.values(resultados);

}

// async function updateLevel(level,shelf,products){
//     let id = null
//     //const levelExist = await (await db.collection('level').doc(level).get()).exists
//     const docRef = await db.collection('level').doc(level).collection("shelves").where("gondola", "==", parseInt(shelf)).get()
//     docRef.forEach(res=>{
//         id = res.id
//     });
//     let arr = []
//     let keys = Object.keys(products)
//     for (let e of keys){
//         if( products[e] > 0){
//             let cant = await getCurrentProduct(e);
//             if(!cant)
//                 cant = 1;
//             for(let i = 0; i < products[e]; i++){
//                 arr.push(e+"-"+cant)
//             }

//         }
//     }
//     //if(arr.length != 0){
//         await db.collection('level').doc(level).collection("shelves").doc(id).set({productos:arr},{merge: true});
//   //  }

// }

// async function existsLevel(level){
//     return (await db.collection('level').doc(level).get()).exists;
// }


// async function createLevel(level){
//     await db.collection('level').doc(level).set({"dificultad":parseInt(level),"name":"Nivel "+level,availableProducts:[]})
//     for(let i=1;i<=24;i++)
//         await db.collection('level').doc(level).collection('shelves').add({gondola:i,productos:[]})
// }

// async function updateToRemember(level,products, newLevel){
//     let set = new Set();
//     let keys = Object.keys(products)
//     let doc = (await db.collection('level').doc(level).get()).data()
//     let productsList = {}

//     keys.forEach(x =>{
//         Object.keys(products[x]).forEach(y => {
//            if(productsList.hasOwnProperty(y)){
//                 productsList[y] += parseInt(products[x][y])
//            } else {
//                 productsList[y] = parseInt(products[x][y])
//            }
//         })
//     });
//     // Object.keys(productsList).forEach(x => {
//     //     let prod = doc.availableProducts.find(y => y.nombre == x)
//     //     if(prod){
//     //          productsList[x] =  prod.cantidad > productsList[x] ? productsList[x] : prod.cantidad
//     //     }
//     // })

//     console.log(newLevel,productsList);
//     let result
//     if(newLevel){
//         result = Object.keys(productsList).filter(y => productsList[y] != 0).map(x => ({nombre:x,cantidad:0,max:productsList[x]}));
//     } else {

//         result = Object.keys(productsList).filter(y => productsList[y] != 0).map(x => {
//             let prod = doc.availableProducts.find(y => y.nombre == x)
//             if(prod){
//                 return {nombre:x,cantidad:prod.cantidad > productsList[x] ? productsList[x] :prod.cantidad,max:productsList[x]}
//             } else {
//                 return {nombre:x,cantidad:0 ,max:productsList[x]}
//             }
//             }
//         );
//     }
//     if(result.length != 0){
//         await db.collection('level').doc(level).set({availableProducts:result},{merge: true});
//     }
// }

// async function getCurrentProduct(name){
//     let ref = await db.collection("products").where("name", "==", name ).get()
//     let current;
//     ref.forEach(res=>{
//         current = res.data().current;
//     });
//     return current

// }

// async function getShelvesConfig(){
//     let arr = []
//     const levelRef = await db.collection('shelves').get();
//     levelRef.forEach(res=>{
//         arr.push(res.data())
//     });
//     return arr
// }
async function getShelvesConfig() {
    // Crear la conexión a MySQL
    const connection = await mysql.createConnection({
        host: 'localhost', // Cambia esto por tu host
        user: 'user', // Cambia esto por tu usuario de la base de datos
        password: 'password', // Cambia esto por tu contraseña de la base de datos
        database: 'database' // Cambia esto por tu base de datos
    });

    // Consulta SQL para obtener toda la configuración de las estanterías
    const query = `
        SELECT id_producto, id_estanteria, id_nivel , nivel_asociado
        FROM estanterias
        ORDER BY id_estanteria
    `;

    const [rows] = await connection.execute(query); // Ejecutar la consulta sin parámetros, ya que queremos todas las estanterías

    // Cerrar la conexión
    await connection.end();

    // Estructurar los datos en el formato deseado
    let arr = [];

    rows.forEach(row => {
        arr.push({
            id_estanteria: row.id_estanteria,
            nombre: row.nombre,
            capacidad: row.capacidad, // Asumo que "capacidad" es el campo que corresponde a la configuración de la estantería
            nivel_asociado: row.nivel_asociado // Nivel al que está asociada la estantería, si tienes este dato
        });
    });

    return arr;

}


// module.exports = {getAll,getLevel,getRemember,setRemember,createResult,updateResult,searchResults,updateLevel,existsLevel,createLevel,updateToRemember,getShelvesConfig}
// module.exports = {getAll,getLevel,getRemember,setRemember,createResult,updateResult,searchResults,updateLevel,existsLevel,createLevel,updateToRemember,getShelvesConfig}
// module.exports = {getAll,getLevel,getRemember,setRemember,createResult,updateResult,searchResults,updateLevel,existsLevel,createLevel,updateToRemember,getShelvesConfig}
// module.exports = {getAll,getLevel,getRemember,setRemember,createResult,updateResult,searchResults,updateLevel,existsLevel,createLevel,updateToRemember,getShelvesConfig}