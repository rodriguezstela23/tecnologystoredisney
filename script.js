document.getElementById("emailForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    var email = document.getElementById("email").value;

    const response = await fetch("/.netlify/functions/getLastEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    
    const data = await response.json();

    if (data.message && data.message.includes("Tu código de Disney Plus")) {
        // Si la respuesta contiene el código de Disney+
        alert(data.message); // Muestra el mensaje con el código
    } else if (data.link) {
        // Si se encuentra el link (probablemente de Netflix)
        window.location.href = data.link; // Redirige automáticamente
    } else {
        alert("No se encontró resultado para tu cuenta, vuelve a intentarlo nuevamente.");
    }
});
