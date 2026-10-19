document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Comprobar si hay una sesión iniciada
        const respuesta = await fetch('/session-status');
        const datos = await respuesta.json();

        // Si no hay sesión, no mostrar el botón
        if (!datos.autenticado) {
            return;
        }

        // 2. Crear el formulario de cierre de sesión
        const formularioCerrarSesion = document.createElement('form');

        formularioCerrarSesion.id = 'logout-floating-form';
        formularioCerrarSesion.action = '/logout';
        formularioCerrarSesion.method = 'POST';
        formularioCerrarSesion.classList.add('logout-floating-form');

        // 3. Crear el botón
        const botonCerrarSesion = document.createElement('button');

        botonCerrarSesion.type = 'submit';
        botonCerrarSesion.textContent = 'Cerrar sesión';
        botonCerrarSesion.classList.add('logout-floating-button');
        botonCerrarSesion.title = 'Cerrar la sesión actual';

        formularioCerrarSesion.appendChild(botonCerrarSesion);
        document.body.appendChild(formularioCerrarSesion);

        // 4. Crear la ventana de confirmación
        const modal = document.createElement('div');

        modal.id = 'logout-confirm-modal';
        modal.className = 'logout-confirm-modal';
        modal.hidden = true;

        modal.innerHTML = `
            <div class="logout-confirm-content"
                 role="dialog"
                 aria-modal="true"
                 aria-labelledby="logout-confirm-title">

                <h2 id="logout-confirm-title">Cerrar sesión</h2>

                <p>¿Estás seguro de que querés cerrar tu sesión?</p>

                <div class="logout-confirm-buttons">
                    <button type="button" id="confirm-logout">
                        Sí, cerrar sesión
                    </button>

                    <button type="button" id="cancel-logout">
                        Cancelar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 5. Obtener los botones de la ventana
        const confirmar = modal.querySelector('#confirm-logout');
        const cancelar = modal.querySelector('#cancel-logout');

        // 6. Abrir la ventana al intentar cerrar sesión
        formularioCerrarSesion.addEventListener('submit', (event) => {
            event.preventDefault();

            modal.hidden = false;
            confirmar.focus();
        });

        // 7. Confirmar el cierre de sesión
        confirmar.addEventListener('click', () => {
            // Enviar el formulario a /logout
            HTMLFormElement.prototype.submit.call(
                formularioCerrarSesion
            );
        });

        // 8. Cancelar el cierre de sesión
        cancelar.addEventListener('click', () => {
            modal.hidden = true;
            botonCerrarSesion.focus();
        });

        // 9. Cerrar al hacer clic fuera de la ventana
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.hidden = true;
                botonCerrarSesion.focus();
            }
        });

        // 10. Cerrar al presionar Escape
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !modal.hidden) {
                modal.hidden = true;
                botonCerrarSesion.focus();
            }
        });

    } catch (error) {
        console.error('No se pudo comprobar la sesión:', error);
    }
});