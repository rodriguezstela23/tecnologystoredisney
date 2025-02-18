require("dotenv").config();
const { google } = require("googleapis");

exports.handler = async (event) => {
  try {
    const { email } = JSON.parse(event.body);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "https://pruebajajaja.netlify.app/api/auth/callback"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Verificar en qué cuenta está buscando correos
    const gmailProfile = await gmail.users.getProfile({ userId: "me" });
    console.log("🔍 Buscando correos en la cuenta:", gmailProfile.data.emailAddress);

    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10, // Buscar hasta 10 correos
    });

    console.log("📩 Correos encontrados:", response.data.messages);

    if (!response.data.messages) {
      return { statusCode: 404, body: JSON.stringify({ message: "No hay mensajes recientes" }) };
    }

    // Buscar en los correos si hay algún mensaje con el asunto de Disney
    const disneySubject = "Tu código de acceso único para Disney+";

    for (let msg of response.data.messages) {
      const message = await gmail.users.messages.get({ userId: "me", id: msg.id });
      const headers = message.data.payload.headers;
      const toHeader = headers.find(h => h.name === "To");
      const subjectHeader = headers.find(h => h.name === "Subject");

      if (subjectHeader && subjectHeader.value.includes(disneySubject)) {
        console.log("🎯 Correo con asunto de Disney+ encontrado");

        // Obtener el cuerpo del mensaje (en base64)
        const body = getMessageBody(message.data);
        
        // Buscar el código de Disney+ en el cuerpo (en base64 decodificado)
        const disneyCode = extractDisneyCode(body);

        if (disneyCode) {
          return { statusCode: 200, body: JSON.stringify({ message: `Tu código de Disney Plus es: ${disneyCode}` }) };
        } else {
          return { statusCode: 404, body: JSON.stringify({ message: "No se encontró el código de Disney+" }) };
        }
      }
    }

    return { statusCode: 404, body: JSON.stringify({ message: "No se encontró ningún correo de Disney+" }) };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// Función para obtener el cuerpo del mensaje
function getMessageBody(message) {
  if (!message.payload.parts) {
    return message.snippet || "";
  }
  for (let part of message.payload.parts) {
    if (part.mimeType === "text/html" && part.body.data) {
      return Buffer.from(part.body.data, "base64").toString("utf-8");
    }
  }
  return "";
}

// Función para extraer el código de Disney+ utilizando una expresión regular
function extractDisneyCode(body) {
  // La expresión regular busca el código dentro del HTML del mensaje
  const codeRegex = /Tu código de acceso único para Disney\+ es (\d{6})/;
  const match = body.match(codeRegex);

  if (match) {
    return match[1]; // Retorna el código encontrado
  }
  return null; // Si no se encuentra, retorna null
}
