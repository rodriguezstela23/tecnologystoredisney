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

    // 🔹 Buscar correo con el asunto de Disney+
    const disneySubject = "Tu código de acceso único para Disney+";
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

      // Verificar si el correo coincide con el email y el asunto de Disney+
      if (
        toHeader &&
        toHeader.value.toLowerCase().includes(email.toLowerCase()) &&
        subjectHeader.value.includes(disneySubject) &&
        (now - timestamp) <= 10 * 60 * 1000 // Aumentar a 10 minutos para pruebas
      ) {
        const body = getMessageBody(message.data);
        const code = extractDisneyCode(body);
        if (code) {
          return { statusCode: 200, body: JSON.stringify({ message: `Tu código de Disney Plus es ${code}` }) };
        }
      }
    }

    // 🔹 Continuar con la lógica de Netflix si no se encuentra el código de Disney+
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

    return { statusCode: 404, body: JSON.stringify({ message: "No se ha encuentra un resultado para tu cuenta, vuelve a intentar nuevamente" }) };
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

// Función para extraer el código de Disney+
function extractDisneyCode(text) {
  const codeRegex = /\b\d{6}\b/g; // Suponiendo que el código es de 6 dígitos
  const matches = text.match(codeRegex);
  if (matches && matches.length > 0) {
    return matches[0]; // Retorna el primer código encontrado
  }
  return null;
}

// Función para extraer el enlace de Netflix
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
