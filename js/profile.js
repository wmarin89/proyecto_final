document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('profile-form');
    const mensaje = document.getElementById('profile-message');
    const botonEliminar = document.getElementById('delete-account-button');

    const mostrarMensaje = (texto, tipo) => {
        mensaje.textContent = texto;
        mensaje.className = `profile-message ${tipo}`;
        mensaje.hidden = false;
    };

    const ocultarMensaje = () => {
        mensaje.textContent = '';
        mensaje.hidden = true;
    };

    // Cargar los datos de la cuenta
    const cargarPerfil = async () => {
        try {
            const respuesta = await fetch('/api/profile', {
                cache: 'no-store'
            });

            const datos = await respuesta.json();

            if (respuesta.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (!respuesta.ok) {
                throw new Error(datos.mensaje || 'No se pudo cargar el perfil.');
            }

            formulario.elements.nombre.value = datos.nombre || '';
            formulario.elements.apellido.value = datos.apellido || '';
            formulario.elements.dni.value = datos.dni || '';
            formulario.elements.email.value = datos.email || '';
            formulario.elements.departamento_id.value =
                datos.departamento_id || '';

            const fecha = document.getElementById('fecha_registro');

            if (datos.fecha_registro) {
                const fechaRegistro = new Date(datos.fecha_registro);

                fecha.value = Number.isNaN(fechaRegistro.getTime())
                    ? ''
                    : fechaRegistro.toLocaleDateString('es-AR');
            } else {
                fecha.value = 'No disponible';
            }

        } catch (error) {
            mostrarMensaje(error.message, 'error');
        }
    };

    // Guardar las modificaciones
    formulario.addEventListener('submit', async (event) => {
        event.preventDefault();
        ocultarMensaje();

        const botonGuardar = formulario.querySelector(
            'button[type="submit"]'
        );

        botonGuardar.disabled = true;

        try {
            const datos = {
                nombre: formulario.elements.nombre.value,
                apellido: formulario.elements.apellido.value,
                dni: formulario.elements.dni.value,
                email: formulario.elements.email.value,
                departamento_id: formulario.elements.departamento_id.value
            };

            const respuesta = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });

            const resultado = await respuesta.json();

            if (respuesta.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (!respuesta.ok) {
                throw new Error(
                    resultado.mensaje || 'No se pudieron guardar los cambios.'
                );
            }

            mostrarMensaje(resultado.mensaje, 'success');

        } catch (error) {
            mostrarMensaje(error.message, 'error');
        } finally {
            botonGuardar.disabled = false;
        }
    });

    // Eliminar la cuenta con confirmación
    botonEliminar.addEventListener('click', async () => {
        const confirmacion = confirm(
            '¿Estás seguro de que querés eliminar tu cuenta? Esta acción no se puede deshacer.'
        );

        if (!confirmacion) {
            return;
        }

        const segundaConfirmacion = confirm(
            'Confirmá nuevamente: se eliminará tu cuenta de Reporte Ciudadano.'
        );

        if (!segundaConfirmacion) {
            return;
        }

        ocultarMensaje();
        botonEliminar.disabled = true;

        try {
            const respuesta = await fetch('/api/profile', {
                method: 'DELETE'
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    resultado.mensaje || 'No se pudo eliminar la cuenta.'
                );
            }

            alert(resultado.mensaje);
            window.location.href = '/login';

        } catch (error) {
            mostrarMensaje(error.message, 'error');
        } finally {
            botonEliminar.disabled = false;
        }
    });

    cargarPerfil();
});