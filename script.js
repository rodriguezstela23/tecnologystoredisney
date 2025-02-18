document.getElementById("emailForm").addEventListener("submit", async function(event) {
  event.preventDefault();
  var email = document.getElementById("email").value;

  const response = await fetch("/.netlify/functions/getLastEmail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  // Verificamos si la respuesta contiene el mensaje completo con el código de Disney+
  if (data.message && data.message.includes("Tu código de acceso único para Disney+")) {
    // Si la respuesta contiene el mensaje completo de Disney+, lo mostramos
    document.getElementById("messageDisplay").innerText = data.message; // Mostrar el cuerpo completo
  } else if (data.link) {
    // Si se encuentra el link (probablemente de Netflix)
    window.location.href = data.link; // Redirige automáticamente
  } else {
    alert("No se encontró resultado para tu cuenta, vuelve a intentarlo nuevamente.");
  }
});
