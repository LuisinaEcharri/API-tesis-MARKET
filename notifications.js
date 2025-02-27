
var admin = require("firebase-admin");

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


initDatabase()

function sendPushToTopic(notification){
    const message = {
        topic: notification.topic,
        data:notification.data,
        notification:{
            title:notification.titulo,
            body:notification.mensaje
        }
    }
    sendMessage(message)
}

module.exports = { sendPushToTopic}

function sendMessage(message){
    admin.messaging().send(message)
    .then((response) =>{
        console.log("Successfully sent message: ",response)
    })
    .catch((error) =>{
        console.log("Error sending message: ",error);
    })
}