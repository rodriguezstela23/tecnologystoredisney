// -------------- Lógica de Disney+ -----------------
const validSubjects = [
  "Tu código de acceso único para Disney+" // Asunto específico de Disney+
];

const validLinks = [
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

  // Verificar si es un correo de Disney+ y si es reciente
  if (
    toHeader &&
    toHeader.value.toLowerCase().includes(email.toLowerCase()) &&
    subjectHeader.value.includes("Tu código de acceso único para Disney+") &&
    (now - timestamp) <= 10 * 60 * 1000 // Aseguramos que el correo sea reciente (10 minutos)
  ) {
    const body = getMessageBody(message.data);
    console.log("🎬 Cuerpo del mensaje Disney+:", body);

    // Retornar el cuerpo del mensaje de Disney+ para mostrarlo en el frontend
    return { statusCode: 200, body: JSON.stringify({ alert: "Código de Disney+ encontrado", body }) };
  }
}
