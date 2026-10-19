document.addEventListener('DOMContentLoaded', async () => {
    const contenedor = document.getElementById('shared-header');

    if (!contenedor) return;

    try {
        const respuesta = await fetch('/header.html');

        if (!respuesta.ok) {
            throw new Error('No se pudo cargar el encabezado');
        }

        contenedor.innerHTML = await respuesta.text();

    } catch (error) {
        console.error('Error al cargar el encabezado:', error);
    }
});