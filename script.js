document.getElementById("emailForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    var email = document.getElementById("email").value;

    const response = await fetch("/.netlify/functions/getLastEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    const data = await response.json();

    // Si encontramos un código de Disney+
    if (data.alert) {
        // Mostrar el código de Disney+ en una alerta
        alert(data.alert);
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
