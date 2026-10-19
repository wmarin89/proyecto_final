const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

require('dotenv').config();

const app = express();
const PORT = 3000;

// ========================================
// CONFIGURACION GENERAL
// ========================================

// Recibir datos de formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuracion de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'clave-local-reporte-ciudadano',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60
    }
}));

// Archivos CSS, JavaScript e imagenes
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/js', express.static(path.join(__dirname, 'js')));


// ========================================
// PROTECCION DE PAGINAS
// ========================================

const paginasProtegidas = [
    '/active-incidents.html',
    '/my-reports.html',
    '/notifications.html',
    '/profile.html',
    '/report-details.html',
    '/report-incident.html'
];

// Verificar si el usuario inicio sesion
app.use((req, res, next) => {
    if (
        paginasProtegidas.includes(req.path) &&
        !req.session.usuario
    ) {
        return res.redirect('/login');
    }

    next();
});


// ========================================
// RUTAS DE LAS PAGINAS
// ========================================

// Pagina principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Acceso a index.html
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/session-status', (req, res) => {
    res.set('Cache-Control', 'no-store');

    res.json({
        autenticado: Boolean(req.session.usuario)
    });
});

// Pagina de inicio de sesion y registro
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'login.html'));
});

// Paginas protegidas
app.get('/active-incidents.html', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'templates', 'active-incidents.html')
    );
});

app.get('/my-reports.html', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'templates', 'my-reports.html')
    );
});

app.get('/notifications.html', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'templates', 'notifications.html')
    );
});

app.get('/profile.html', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'templates', 'profile.html')
    );
});

app.get('/report-details.html', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'templates', 'report-details.html')
    );
});

app.get('/report-incident.html', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'templates', 'report-incident.html')
    );
});


// ========================================
// CONEXION CON MYSQL
// ========================================

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'incidencias',
    waitForConnections: true,
    connectionLimit: 10
});


// ========================================
// PROBAR CONEXION CON MYSQL
// ========================================

app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT DATABASE() AS base'
        );

        res.json({
            mensaje: 'Conexion correcta con MySQL',
            base: rows[0].base
        });

    } catch (error) {
        console.error(
            'Error de conexion:',
            error.code,
            error.message
        );

        res.status(500).json({
            mensaje: 'No se pudo conectar con MySQL.'
        });
    }
});


// ========================================
// REGISTRAR USUARIO
// ========================================

app.post('/register', async (req, res) => {
    try {
        const {
            name,
            surname,
            dni,
            email,
            department,
            password,
            password_confirm,
            terms
        } = req.body || {};

        // Validar campos obligatorios
        if (
            !name || !surname || !dni || !email ||
            !department || !password || !password_confirm
        ) {
            return res.status(400).json({
                mensaje: 'Completa todos los campos obligatorios.'
            });
        }

        // Verificar que las contrasenas coincidan
        if (password !== password_confirm) {
            return res.status(400).json({
                mensaje: 'Las contrasenas no coinciden.'
            });
        }

        // Verificar aceptacion de terminos
        if (!terms) {
            return res.status(400).json({
                mensaje: 'Debes aceptar los terminos y condiciones.'
            });
        }

        const correo = email.trim().toLowerCase();
        const documento = dni.trim();

        // Comprobar DNI o correo duplicado
        const [existentes] = await db.execute(
            `SELECT id
             FROM usuarios
             WHERE dni = ? OR email = ?`,
            [documento, correo]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                mensaje: 'El DNI o el email ya estan registrados.'
            });
        }

        // Verificar departamento seleccionado
        const idDepartamento = Number(department);

        if (
            !Number.isInteger(idDepartamento) ||
            idDepartamento <= 0
        ) {
            return res.status(400).json({
                mensaje: 'El departamento seleccionado no es valido.'
            });
        }

        const [departamentos] = await db.execute(
            'SELECT id FROM departamentos WHERE id = ?',
            [idDepartamento]
        );

        if (departamentos.length === 0) {
            return res.status(400).json({
                mensaje: 'El departamento seleccionado no es valido.'
            });
        }

        // Encriptar contrasena
        const passwordHash = await bcrypt.hash(password, 12);
        const username = correo;

        // Guardar usuario en la base de datos
        await db.execute(
            `INSERT INTO usuarios
            (
                nombre,
                apellido,
                dni,
                email,
                departamento_id,
                username,
                password_hash
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                surname.trim(),
                documento,
                correo,
                idDepartamento,
                username,
                passwordHash
            ]
        );

        res.status(201).json({
            mensaje: 'Registro exitoso. Ya puedes iniciar sesion con tu email.'
        });

    } catch (error) {
        console.error(
            'Error al registrar:',
            error.code,
            error.message
        );

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                mensaje: 'El DNI o el email ya estan registrados.'
            });
        }

        res.status(500).json({
            mensaje: 'No se pudo completar el registro. Intenta nuevamente.'
        });
    }
});


// ========================================
// INICIAR SESION
// ========================================

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).send(
                'Ingresa tu correo electronico y contrasena.'
            );
        }

        const correo = username.trim().toLowerCase();

        // Buscar usuario por correo o nombre de usuario
        const [usuarios] = await db.execute(
            `SELECT
                id,
                nombre,
                apellido,
                email,
                password_hash
             FROM usuarios
             WHERE email = ? OR username = ?`,
            [correo, correo]
        );

        if (usuarios.length === 0) {
            return res.status(401).send(
                'Correo o contrasena incorrectos.'
            );
        }

        // Comparar contrasena ingresada con el hash guardado
        const correcto = await bcrypt.compare(
            password,
            usuarios[0].password_hash
        );

        if (!correcto) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Correo o contraseña equivocada, como ella eligiendote.'
            });
        }

        // Regenerar la sesion despues de autenticar
        req.session.regenerate((error) => {
            if (error) {
                console.error('Error al crear la sesion:', error);

                return res.status(500).send(
                    'No se pudo iniciar la sesion. Intenta nuevamente.'
                );
            }

            // Guardar usuario autenticado en la sesion
            req.session.usuario = {
                id: usuarios[0].id,
                nombre: usuarios[0].nombre,
                apellido: usuarios[0].apellido,
                email: usuarios[0].email
            };

            // Guardar sesion antes de redirigir
            req.session.save((errorGuardar) => {
                if (errorGuardar) {
                    console.error(
                        'Error al guardar la sesion:',
                        errorGuardar
                    );

                    return res.status(500).send(
                        'No se pudo guardar la sesion. Intenta nuevamente.'
                    );
                }

                res.json({
                    ok: true,
                    mensaje: `Pefeto Pefeto caballero, bienvenido ${usuarios[0].nombre} ${usuarios[0].apellido}`
                });
            });
        });

    } catch (error) {
        console.error(
            'Error al iniciar sesion:',
            error.code,
            error.message
        );

        res.status(500).send(
            'No se pudo iniciar sesion. Intenta nuevamente.'
        );
    }
});


/* ========================================
   CONSULTAR DATOS DEL PERFIL
======================================== */

app.get('/api/profile', async (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({
            mensaje: 'Debes iniciar sesión.'
        });
    }

    try {
        const [usuarios] = await db.execute(
            `SELECT
                u.id,
                u.nombre,
                u.apellido,
                u.dni,
                u.email,
                u.departamento_id,
                d.nombre AS departamento,
                u.fecha_registro
             FROM usuarios u
             LEFT JOIN departamentos d ON d.id = u.departamento_id
             WHERE u.id = ?`,
            [req.session.usuario.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                mensaje: 'No se encontró tu cuenta.'
            });
        }

        res.json(usuarios[0]);

    } catch (error) {
        console.error('Error al consultar el perfil:', error);

        res.status(500).json({
            mensaje: 'No se pudieron cargar tus datos.'
        });
    }
});


/* ========================================
   MODIFICAR DATOS DEL PERFIL
======================================== */

app.put('/api/profile', async (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({
            mensaje: 'Debes iniciar sesión.'
        });
    }

    try {
        const { nombre, apellido, dni, email, departamento_id } = req.body;

        if (
            !nombre?.trim() ||
            !apellido?.trim() ||
            !dni?.trim() ||
            !email?.trim() ||
            !departamento_id
        ) {
            return res.status(400).json({
                mensaje: 'Completa todos los campos.'
            });
        }

        const correo = email.trim().toLowerCase();
        const documento = dni.trim();
        const idDepartamento = Number(departamento_id);

        if (!Number.isInteger(idDepartamento) || idDepartamento <= 0) {
            return res.status(400).json({
                mensaje: 'Selecciona un departamento válido.'
            });
        }

        const [departamentos] = await db.execute(
            'SELECT id FROM departamentos WHERE id = ?',
            [idDepartamento]
        );

        if (departamentos.length === 0) {
            return res.status(400).json({
                mensaje: 'El departamento seleccionado no existe.'
            });
        }

        const [duplicados] = await db.execute(
            `SELECT id FROM usuarios
             WHERE (email = ? OR dni = ?)
             AND id <> ?`,
            [correo, documento, req.session.usuario.id]
        );

        if (duplicados.length > 0) {
            return res.status(409).json({
                mensaje: 'Ese correo o DNI ya pertenece a otra cuenta.'
            });
        }

        await db.execute(
            `UPDATE usuarios
             SET nombre = ?,
                 apellido = ?,
                 dni = ?,
                 email = ?,
                 username = ?,
                 departamento_id = ?
             WHERE id = ?`,
            [
                nombre.trim(),
                apellido.trim(),
                documento,
                correo,
                correo,
                idDepartamento,
                req.session.usuario.id
            ]
        );

        // Actualizar también los datos guardados en la sesión.
        req.session.usuario.nombre = nombre.trim();
        req.session.usuario.apellido = apellido.trim();
        req.session.usuario.email = correo;

        req.session.save((error) => {
            if (error) {
                console.error('Error al guardar la sesión:', error);

                return res.status(500).json({
                    mensaje: 'Los datos se actualizaron, pero no se pudo actualizar la sesión.'
                });
            }

            res.json({
                mensaje: 'Tus datos se actualizaron correctamente.'
            });
        });

    } catch (error) {
        console.error('Error al modificar el perfil:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                mensaje: 'Ese correo o DNI ya está registrado.'
            });
        }

        res.status(500).json({
            mensaje: 'No se pudieron modificar tus datos.'
        });
    }
});

/* ========================================
   ELIMINAR CUENTA
======================================== */

app.delete('/api/profile', async (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({
            mensaje: 'Debes iniciar sesión.'
        });
    }

    try {
        await db.execute(
            'DELETE FROM usuarios WHERE id = ?',
            [req.session.usuario.id]
        );

        req.session.destroy((error) => {
            if (error) {
                console.error('Error al cerrar la sesión:', error);

                return res.status(500).json({
                    mensaje: 'La cuenta fue eliminada, pero no se pudo cerrar la sesión.'
                });
            }

            res.clearCookie('connect.sid');

            res.json({
                mensaje: 'Tu cuenta fue eliminada correctamente.'
            });
        });

    } catch (error) {
        console.error('Error al eliminar la cuenta:', error);

        if (
            error.code === 'ER_ROW_IS_REFERENCED_2' ||
            error.code === 'ER_ROW_IS_REFERENCED'
        ) {
            return res.status(409).json({
                mensaje: 'No se puede eliminar la cuenta porque tiene reportes u otros registros asociados.'
            });
        }

        res.status(500).json({
            mensaje: 'No se pudo eliminar la cuenta.'
        });
    }
});

// ========================================
// CERRAR SESION
// ========================================

app.post('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error(
                'Error al cerrar sesion:',
                error
            );

            return res.status(500).send(
                'No se pudo cerrar la sesion.'
            );
        }

        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

app.get('/header.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'header.html'));
});

app.post('/api/change-password', async (req, res) => {
    try {
        // Comprobar que el usuario inició sesión
        if (!req.session || !req.session.usuario) {
            return res.status(401).json({
                mensaje: 'Tu sesión expiró. Iniciá sesión nuevamente.'
            });
        }

        const {
            currentPassword,
            newPassword,
            confirmNewPassword
        } = req.body;

        // Validar que todos los campos estén completos
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({
                mensaje: 'Completá los tres campos de contraseña.'
            });
        }

        // Validar la longitud mínima
        if (newPassword.length < 8) {
            return res.status(400).json({
                mensaje: 'La nueva contraseña debe tener al menos 8 caracteres.'
            });
        }

        // Comprobar que las contraseñas nuevas coincidan
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                mensaje: 'Las dos contraseñas nuevas no coinciden.'
            });
        }

        // Evitar que la contraseña nueva sea igual a la actual
        if (currentPassword === newPassword) {
            return res.status(400).json({
                mensaje: 'La nueva contraseña debe ser diferente de la actual.'
            });
        }

        const usuarioId = req.session.usuario.id;

        // Obtener la contraseña cifrada que está guardada en MySQL
        const [usuarios] = await db.execute(
            'SELECT password_hash FROM usuarios WHERE id = ?',
            [usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                mensaje: 'No se encontró el usuario.'
            });
        }

        // Verificar la contraseña actual
        const coincide = await bcrypt.compare(
            currentPassword,
            usuarios[0].password_hash
        );

        if (!coincide) {
            return res.status(400).json({
                mensaje: 'La contraseña actual es incorrecta.'
            });
        }

        // Generar el hash de la contraseña nueva
        const nuevoHash = await bcrypt.hash(newPassword, 10);

        // Actualizar la contraseña en la base de datos
        await db.execute(
            'UPDATE usuarios SET password_hash = ? WHERE id = ?',
            [nuevoHash, usuarioId]
        );

        return res.json({
            ok: true,
            mensaje: '¡Tu contraseña se cambió como ella te cambio a vos!'
        });

    } catch (error) {
        console.error('Error al cambiar la contraseña:', error);

        return res.status(500).json({
            mensaje: 'Ocurrió un error al cambiar la contraseña.'
        });
    }
});

// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(PORT, () => {
    console.log(
        `Servidor iniciado en http://localhost:${PORT}`
    );
});