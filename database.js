const mysql = require('mysql2/promise');
const fs = require('fs');
const { isGeneratorObject } = require('util/types');

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
    const [rows] = await connection.execute('SELECT * FROM nivel WHERE id_nivel = ?', [level]);
    await connection.end();
    return rows;
}

// PROBAR ID_PROD_DISP QUE NO EXISTAAAAAAAAA
// updatea solo id_prod_disp. Si el level que fue pasado por parametro no existe,inserta la tupla (con id_estanteria si es especificado en el body, sino por defecto se pone id_estanteria=1)
// aclaracion: si en el body se le pasa id_estanteria y en los parametro un nivel que ya existe, id_estanteria no se va a modificar, id_prod_disp si
async function setRemember(level, data) {
    const connection = await initDatabase();
    const [levelRows] = await connection.execute('SELECT * FROM nivel WHERE id_nivel = ?', [level]);
    let res= 0;
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
        ? await connection.execute('SELECT * FROM resultado WHERE nombre_persona = ?', [name])
        : await connection.execute('SELECT * FROM resultado ORDER BY fecha DESC LIMIT 10');
    await connection.end();
    return rows;
}

async function updateLevel(level, shelf, products) {
    const connection = await initDatabase();
    await connection.execute('UPDATE estanteria SET productos = ? WHERE id_estanteria = ?', [JSON.stringify(products), shelf]);
    await connection.end();
}

async function existsLevel(level) {
    const connection = await initDatabase();
    const [rows] = await connection.execute('SELECT 1 FROM nivel WHERE id_nivel = ?', [level]);
    await connection.end();
    return rows.length > 0;
}

async function createLevel(level) {
    const connection = await initDatabase();
    await connection.execute('INSERT INTO nivel (id_nivel, nombre_nivel, dificultad, id_estanteria) VALUES (?, ?, ?, ?)', [level, `Nivel ${level}`, parseInt(level), null]);
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

    let availableProducts = availableProductsRows;

    // Combinar productos
    keys.forEach(x => {
        Object.keys(products[x]).forEach(y => {
            if (productsList.hasOwnProperty(y)) {
                productsList[y] += parseInt(products[x][y]);
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
        const updateQueries = result.map(async (prod) => {
            // Insertar o actualizar productos disponibles
            const [prodResult] = await connection.execute(
                `INSERT INTO productosDisponibles (nombre_prod_disp, cantidad, max) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad), max = VALUES(max)`,
                [prod.nombre, prod.cantidad, prod.max]
            );
            const prodId = prod.id_prod_disp || prodResult.insertId;

            // Insertar relación nivel - productosDisponibles
            await connection.execute(
                `INSERT INTO nivelProductosDisp (id_nivel, id_prod_disp) VALUES (?, ?)
                ON DUPLICATE KEY UPDATE id_nivel = VALUES(id_nivel), id_prod_disp = VALUES(id_prod_disp)`,
                [level, prodId]
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
}

async function getShelvesConfig() {
    const connection = await initDatabase();
    const [rows] = await connection.execute('SELECT * FROM estanteria');
    await connection.end();
    return rows;
}

module.exports = {
    getAll,
    getLevel,
    getRemember,
    setRemember,
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

// async function getRemember(level){   
//     const data = db.collection('level').doc(level);
//     const doc = await data.get();
//     if (!doc.exists) {
//         return []
//     } else {
//         return doc.data().availableProducts
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

// async function setRemember(level,data){
//     const levelRef = db.collection('level').doc(level);
//     const res = await levelRef.update({availableProducts: data.remember});
//     return res

// }

// async function createResult(data){
//     const docRef = await db.collection("results").add({level:data.level,date:new Date(),name:data.name,tiempo:0,productos:FieldValue.arrayUnion({})});
//     return docRef.id

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

// module.exports = {getAll,getLevel,getRemember,setRemember,createResult,updateResult,searchResults,updateLevel,existsLevel,createLevel,updateToRemember,getShelvesConfig}