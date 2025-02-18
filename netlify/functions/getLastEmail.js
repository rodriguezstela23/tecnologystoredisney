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
    console.log("Buscando correos en la cuenta:", gmailProfile.data.emailAddress);

    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10, // Buscar hasta 10 correos
    });

    console.log("Correos encontrados:", response.data.messages);

    if (!response.data.messages) {
      return { statusCode: 404, body: JSON.stringify({ message: "No hay mensajes recientes" }) };
    }

    // Nuevas variables para el asunto y el enlace de Disney+
    const disneySubject = "Tu código de acceso único para Disney+";
    const disneyCodeRegex = /Es necesario que verifiques la dirección de correo electrónico asociada a tu cuenta de MyDisney con este código de acceso que vencerá en 15 minutos\.(\d{6})\s*Si no lo solicitaste/;

    // Primero, buscar los correos de Disney+
    for (let msg of response.data.messages) {
      const message = await gmail.users.messages.get({ userId: "me", id: msg.id });
      const headers = message.data.payload.headers;
      const toHeader = headers.find(h => h.name === "To");
      const subjectHeader = headers.find(h => h.name === "Subject");
      const dateHeader = headers.find(h => h.name === "Date");
      const timestamp = new Date(dateHeader.value).getTime();
      const now = new Date().getTime();

      console.log("Destinatario del correo:", toHeader ? toHeader.value : "No encontrado");
      console.log("Asunto encontrado:", subjectHeader ? subjectHeader.value : "No encontrado");
      console.log("Fecha del correo:", dateHeader ? dateHeader.value : "No encontrado");
      console.log("Diferencia de tiempo (ms):", now - timestamp);
      console.log("Cuerpo del correo:", getMessageBody(message.data));

      // Si encontramos un correo de Disney+ y extraemos el código, responder con el código
      if (subjectHeader.value === disneySubject) {
        const body = getMessageBody(message.data);
        const match = body.match(disneyCodeRegex);
        
        if (match) {
          const disneyCode = match[1];
          return { statusCode: 200, body: JSON.stringify({ message: `Tu código de Disney Plus es ${disneyCode}` }) };
        }
      }
    }

    // 🔹 Si no encontramos Disney+, seguimos con la lógica de Netflix

    // Filtros para el asunto y enlaces de Netflix
    const validSubjects = [
      "Importante: Cómo actualizar tu Hogar con Netflix",
      "Tu código de acceso temporal de Netflix",
      "Completa tu solicitud de restablecimiento de contraseña"
    ];

    const validLinks = [
      "https://www.netflix.com/account/travel/verify?nftoken=",
      "https://www.netflix.com/password?g=",
      "https://www.netflix.com/account/update-primary-location?nftoken="
    ];

    // Búsqueda de correos de Netflix
    for (let msg of response.data.messages) {
      const message = await gmail.users.messages.get({ userId: "me", id: msg.id });
      const headers = message.data.payload.headers;
      const toHeader = headers.find(h => h.name === "To");
      const subjectHeader = headers.find(h => h.name === "Subject");
      const dateHeader = headers.find(h => h.name === "Date");
      const timestamp = new Date(dateHeader.value).getTime();
      const now = new Date().getTime();

      console.log("Destinatario del correo:", toHeader ? toHeader.value : "No encontrado");
      console.log("Asunto encontrado:", subjectHeader ? subjectHeader.value : "No encontrado");
      console.log("Fecha del correo:", dateHeader ? dateHeader.value : "No encontrado");
      console.log("Diferencia de tiempo (ms):", now - timestamp);
      console.log("Cuerpo del correo:", getMessageBody(message.data));

      if (
        toHeader &&
        toHeader.value.toLowerCase().includes(email.toLowerCase()) &&
        validSubjects.some(subject => subjectHeader.value.includes(subject)) &&
        (now - timestamp) <= 10 * 60 * 1000 // Aumentar a 10 minutos para pruebas
      ) {
        const body = getMessageBody(message.data);
        const link = extractLink(body, validLinks);
        if (link) {
          return { statusCode: 200, body: JSON.stringify({ link: link.replace(/\]$/, "") }) };
        }
      }
    }

    return { statusCode: 404, body: JSON.stringify({ message: "No se ha encontrado un resultado para tu cuenta, vuelve a intentarlo nuevamente" }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

function getMessageBody(message) {
  if (!message.payload.parts) {
    return message.snippet || "";
  }
  for (let part of message.payload.parts) {
    if (part.mimeType === "text/plain" && part.body.data) {
      return Buffer.from(part.body.data, "base64").toString("utf-8");
    }
  }
  return "";
}

function extractLink(text, validLinks) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  if (matches) {
    console.log("Enlaces encontrados en el correo:", matches);

    const preferredLinks = [
      "https://www.netflix.com/account/travel/verify?nftoken=",
      "https://www.netflix.com/account/update-primary-location?nftoken="
    ];

    const validLink = matches.find(url =>
      preferredLinks.some(valid => url.includes(valid))
    );

    if (validLink) {
      console.log("Redirigiendo al enlace válido encontrado:", validLink);
      return validLink.replace(/\]$/, "");
    }

    const fallbackLink = matches.find(url => url.includes("https://www.netflix.com/password?g="));

    if (fallbackLink) {
      console.log("Redirigiendo al enlace de fallback encontrado:", fallbackLink);
      return fallbackLink.replace(/\]$/, "");
    }
  }
  return null;
}
