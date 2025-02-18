document.getElementById("emailForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    var email = document.getElementById("email").value;

    const response = await fetch("/.netlify/functions/getLastEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    // Verificar si se encuentra un enlace de Netflix
    if (data.link) {
        window.location.href = data.link; // Redirige automáticamente
    } 
    // Verificar si se encuentra el código de Disney Plus
    else if (data.message && data.message.startsWith("Disney Plus Código")) {
        alert(data.message); // Muestra el código de Disney Plus
    } 
    else {
        alert("No se encontró resultado para tu cuenta, vuelve a intentarlo nuevamente.");
    }
});
