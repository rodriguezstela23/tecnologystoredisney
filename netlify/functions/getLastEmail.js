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

    // ------------ Lógica de Disney+ -----------------
    const disneySubjects = [
      "Tu código de acceso único para Disney+" // Asunto específico de Disney+
    ];

    const disneyLinks = [
      "https://www.disneyplus.com/codigo" // Enlace que podría ser válido para Disney+
    ];

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

      // Verificar si es un correo con asunto de Disney+ y reciente
      if (
        toHeader &&
        toHeader.value.toLowerCase().includes(email.toLowerCase()) &&
        disneySubjects.some(subject => subjectHeader.value.includes(subject)) &&
        (now - timestamp) <= 10 * 60 * 1000 // 10 minutos de diferencia
      ) {
        const body = getMessageBody(message.data);
        console.log("🎬 Cuerpo del mensaje Disney+:", body);

        // Retornar el cuerpo del mensaje de Disney+ para mostrarlo en el frontend
        return { statusCode: 200, body: JSON.stringify({ alert: "Código de Disney+ encontrado", body }) };
      }
    }

    // ------------ Lógica de Netflix -----------------
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

      // Verificar si es un correo con asunto de Netflix y reciente
      if (
        toHeader &&
        toHeader.value.toLowerCase().includes(email.toLowerCase()) &&
        validSubjects.some(subject => subjectHeader.value.includes(subject)) &&
        (now - timestamp) <= 10 * 60 * 1000 // 10 minutos de diferencia
      ) {
        const body = getMessageBody(message.data);
        const link = extractLink(body, validLinks);
        if (link) {
          return { statusCode: 200, body: JSON.stringify({ link: link.replace(/\]$/, "") }) };
        }
      }
    }

    return { statusCode: 404, body: JSON.stringify({ message: "No se encontró un resultado para tu cuenta, vuelve a intentar nuevamente" }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// Función actualizada para obtener el cuerpo completo (HTML o texto)
function getMessageBody(message) {
  // Primero revisamos si ya existe una parte que contenga contenido HTML
  if (message.payload.parts) {
    // Recorremos todas las partes
    for (let part of message.payload.parts) {
      if (part.mimeType === "text/html" && part.body.data) {
        // Si encontramos contenido HTML, lo decodificamos y lo retornamos
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }
  }

  // Si no encontramos parte HTML, buscamos en el texto plano
  if (message.payload.body.data) {
    // Si no hay partes HTML, devolvemos la parte de texto plano
    return Buffer.from(message.payload.body.data, "base64").toString("utf-8");
  }

  // Si no hay cuerpo en texto plano o HTML, retornamos el snippet (una vista previa del mensaje)
  return message.snippet || "";
}

// Función para extraer enlaces válidos
function extractLink(text, validLinks) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  if (matches) {
    console.log("🔗 Enlaces encontrados en el correo:", matches);

    // Primero, buscaremos los enlaces válidos de tipo "account/travel/verify" o "account/update-primary-location"
    const preferredLinks = [
      "https://www.netflix.com/account/travel/verify?nftoken=",
      "https://www.netflix.com/account/update-primary-location?nftoken="
    ];

    // Buscamos primero los enlaces prioritarios (travel/verify o update-primary-location)
    const validLink = matches.find(url =>
      preferredLinks.some(valid => url.includes(valid))
    );

    // Si encontramos un enlace válido de los mencionados, se redirige a él
    if (validLink) {
      console.log("🔗 Redirigiendo al enlace válido encontrado:", validLink);
      return validLink.replace(/\]$/, "");
    }

    // Si no encontramos ninguno de los enlaces prioritarios, buscamos el enlace "password?g="
    const fallbackLink = matches.find(url => url.includes("https://www.netflix.com/password?g="));

    if (fallbackLink) {
      console.log("🔗 Redirigiendo al enlace de fallback encontrado:", fallbackLink);
      return fallbackLink.replace(/\]$/, "");
    }
  }
  return null;
}
