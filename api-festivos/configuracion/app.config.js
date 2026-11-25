//Configuracion del servicio web
module.exports = {
    PUERTO: Number(process.env.PUERTO) || 3030,
    //Servidor al que Swagger UI envía las pruebas. Con '/' usa la misma dirección y
    //puerto desde donde se abrió la página, así funciona en local y con cualquier
    //puerto que publique Docker. Se puede fijar una URL completa con la variable
    URL_PUBLICA: process.env.URL_PUBLICA || '/'
}
