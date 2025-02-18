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

    // 🔹 Verificar en qué cuenta está buscando correos
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

    // 🔹 Filtrar correos por asunto
    const validNetflixSubjects = [
      "Importante: Cómo actualizar tu Hogar con Netflix",
      "Tu código de acceso temporal de Netflix",
      "Completa tu solicitud de restablecimiento de contraseña"
    ];

    const validNetflixLinks = [
      "https://www.netflix.com/account/travel/verify?nftoken=",
      "https://www.netflix.com/password?g=",
      "https://www.netflix.com/account/update-primary-location?nftoken="
    ];

    const validDisneyPlusSubjects = [
      "Tu código de acceso único para Disney+"
    ];

    const disneyPlusCodeRegex = /\b\d{6}\b/; // Regex para buscar un código de 6 dígitos

    let foundLink = null;
    let foundDisneyCode = null;

    // Buscar entre los correos
    for (let msg of response.data.messages) {
      const message = await gmail.users.messages.get({ userId: "me", id: msg.id });
      const headers = message.data.payload.headers;
      const toHeader = headers.find(h => h.name === "To");
      const subjectHeader = headers.find(h => h.name === "Subject");
      const dateHeader = headers.find(h => h.name === "Date");
      const timestamp = new Date(dateHeader.value).getTime();
      const now = new Date().getTime();

      console.log("📤 Destinatario del correo:", toHeader ? toHeader.value : "No encontrado");
      console.log("📌 Asunto encontrado:", subjectHeader ? subjectHeader.value : "No encontrado");
      console.log("🕒 Fecha del correo:", dateHeader ? dateHeader.value : "No encontrado");
      console.log("⏳ Diferencia de tiempo (ms):", now - timestamp);
      console.log("📝 Cuerpo del correo:", getMessageBody(message.data));

      // Verificar correos de Disney Plus
      if (
        toHeader &&
        toHeader.value.toLowerCase().includes(email.toLowerCase()) &&
        validDisneyPlusSubjects.some(subject => subjectHeader.value.includes(subject)) &&
        (now - timestamp) <= 10 * 60 * 1000 // Aumentar a 10 minutos para pruebas
      ) {
        const body = getMessageBody(message.data);
        const codeMatch = body.match(disneyPlusCodeRegex);
        if (codeMatch) {
          foundDisneyCode = codeMatch[0]; // Extraemos el código de 6 dígitos
          break; // Si encontramos el código, terminamos la búsqueda
        }
      }

      // Si no encontramos código de Disney Plus, buscamos por Netflix
      if (
        toHeader &&
        toHeader.value.toLowerCase().includes(email.toLowerCase()) &&
        validNetflixSubjects.some(subject => subjectHeader.value.includes(subject)) &&
        (now - timestamp) <= 10 * 60 * 1000 // Aumentar a 10 minutos para pruebas
      ) {
        const body = getMessageBody(message.data);
        const link = extractLink(body, validNetflixLinks);
        if (link) {
          foundLink = link.replace(/\]$/, ""); // Preparamos el link
          break; // Si encontramos el link de Netflix, terminamos la búsqueda
        }
      }
    }

    // Si encontramos código de Disney Plus
    if (foundDisneyCode) {
      return { statusCode: 200, body: JSON.stringify({ message: `Disney Plus Código: ${foundDisneyCode}` }) };
    }

    // Si encontramos link de Netflix
    if (foundLink) {
      return { statusCode: 200, body: JSON.stringify({ link: foundLink }) };
    }

    return { statusCode: 404, body: JSON.stringify({ message: "No se encontró un resultado para tu cuenta, vuelve a intentarlo nuevamente" }) };
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
    console.log("🔗 Enlaces encontrados en el correo:", matches);

    // Buscar enlaces válidos de Netflix
    const validLink = matches.find(url =>
      validLinks.some(valid => url.includes(valid))
    );

    if (validLink) {
      console.log("🔗 Redirigiendo al enlace válido encontrado:", validLink);
      return validLink.replace(/\]$/, "");
    }
  }
  return null;
}
