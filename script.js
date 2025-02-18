document.getElementById("emailForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    var email = document.getElementById("email").value;

    const response = await fetch("/.netlify/functions/getLastEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    const data = await response.json();

    // Si encontramos un mensaje de Disney+
    if (data.alert) {
        // Mostrar solo la parte del cuerpo del mensaje desde el caracter 385 hasta el 624
        const fragment = data.body.substring(385, 624);
        alert(`¡Código de Disney+ encontrado! \n\n${fragment}`);
    } 
    // Si encontramos un enlace de Netflix
    else if (data.link) {
        window.location.href = data.link; // Redirige automáticamente
    } 
    // Si no se encuentra nada
    else {
        alert("No se encontró resultado para tu cuenta, vuelve a intentarlo nuevamente.");
    }
});
