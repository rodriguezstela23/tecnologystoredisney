document.getElementById("emailForm").addEventListener("submit", async function(event) {
  event.preventDefault();
  
  // Obtener el correo del formulario
  var email = document.getElementById("email").value;

  // Hacer la solicitud a la función serverless de Netlify
  const response = await fetch("/.netlify/functions/getLastEmail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  // Obtener los datos de la respuesta
  const data = await response.json();

  if (data.message && data.message.includes("Tu código de Disney Plus")) {
    // Si la respuesta contiene el código de Disney+
    alert(data.message);  // Muestra el mensaje con el código
  } else if (data.link) {
    // Si se encuentra un enlace de Netflix
    window.location.href = data.link;  // Redirige automáticamente al enlace de Netflix
  } else {
    // Si no se encontró ni código de Disney+ ni enlace de Netflix
    alert("No se encontró resultado para tu cuenta, vuelve a intentarlo nuevamente.");
  }
});
