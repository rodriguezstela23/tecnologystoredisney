document.getElementById("emailForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    var email = document.getElementById("email").value;

    // Hacemos la solicitud al endpoint que ejecuta el backend
    const response = await fetch("/.netlify/functions/getLastEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    // Verificar si se encuentra un enlace de Netflix
    if (data.link) {
        window.location.href = data.link; // Redirige automáticamente a Netflix
    } 
    // Verificar si se encuentra el código de Disney Plus
    else if (data.message && data.message.startsWith("Disney Plus Código")) {
        // Aquí mostramos el mensaje del código de Disney Plus de una forma clara
        alert(data.message); // Muestra el código de Disney Plus en un popup
    } 
    else {
        // Si no encontramos ningún enlace ni código de Disney Plus, mostramos un mensaje genérico
        alert("No se encontró resultado para tu cuenta, vuelve a intentarlo nuevamente.");
    }
});
