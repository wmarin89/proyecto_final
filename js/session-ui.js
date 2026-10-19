document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('/session-status');
        const datos = await respuesta.json();

        // Si no hay sesión iniciada, no mostrar el botón.
        if (!datos.autenticado) {
            return;
        }

        // Crear el formulario para cerrar sesión.
        const formularioCerrarSesion = document.createElement('form');
        formularioCerrarSesion.action = '/logout';
        formularioCerrarSesion.method = 'POST';
        formularioCerrarSesion.classList.add('logout-floating-form');

        // Crear el botón.
        const botonCerrarSesion = document.createElement('button');
        botonCerrarSesion.type = 'submit';
        botonCerrarSesion.textContent = 'Cerrar sesión';
        botonCerrarSesion.classList.add('logout-floating-button');
        botonCerrarSesion.title = 'Cerrar la sesión actual';

        formularioCerrarSesion.appendChild(botonCerrarSesion);
        document.body.appendChild(formularioCerrarSesion);
    } catch (error) {
        console.error('No se pudo comprobar la sesión:', error);
    }
});