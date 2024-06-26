const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuração para servir arquivos estáticos na pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
    host: 'db',
    user: 'root',
    password: 'sua_senha',
    database: 'minha_aplicacao'
};

// Criar pool de conexões
const pool = mysql.createPool(dbConfig);

// Função para inicializar o banco de dados (opcional)
function initializeDatabase() {
    const createClienteTable = `
        CREATE TABLE IF NOT EXISTS Cliente (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            telefone VARCHAR(50)
        );
    `;

    const createCompraTable = `
        CREATE TABLE IF NOT EXISTS Compra (
            id INT AUTO_INCREMENT PRIMARY KEY,
            data DATE NOT NULL,
            valor DECIMAL(10, 2) NOT NULL,
            status VARCHAR(50)
        );
    `;

    const createCompraClienteTable = `
        CREATE TABLE IF NOT EXISTS Compra_Cliente (
            cliente_id INT,
            compra_id INT,
            PRIMARY KEY (cliente_id, compra_id),
            FOREIGN KEY (cliente_id) REFERENCES Cliente(id) ON DELETE CASCADE,
            FOREIGN KEY (compra_id) REFERENCES Compra(id) ON DELETE CASCADE
        );
    `;

    pool.query(createClienteTable, err => {
        if (err) {
            console.error('Erro ao criar tabela Cliente:', err);
            return;
        }
        console.log('Tabela Cliente verificada/criada com sucesso.');
    });

    pool.query(createCompraTable, err => {
        if (err) {
            console.error('Erro ao criar tabela Compra:', err);
            return;
        }
        console.log('Tabela Compra verificada/criada com sucesso.');
    });

    pool.query(createCompraClienteTable, err => {
        if (err) {
            console.error('Erro ao criar tabela Compra_Cliente:', err);
            return;
        }
        console.log('Tabela Compra_Cliente verificada/criada com sucesso.');
    });
}

// Inicializar o banco de dados (opcional)
initializeDatabase();

// Rota para adicionar um cliente
app.post('/clientes', (req, res) => {
    const { nome, email, telefone } = req.body;
    const sql = 'INSERT INTO Cliente (nome, email, telefone) VALUES (?, ?, ?)';
    pool.query(sql, [nome, email, telefone], (err, result) => {
        if (err) {
            console.error('Erro ao adicionar cliente:', err);
            return res.status(500).json({ error: 'Erro ao adicionar cliente' });
        }
        res.send('Cliente adicionado com sucesso!');
    });
});

// Rota para listar todos os clientes
app.get('/clientes', (req, res) => {
    const sql = `
        SELECT Cliente.*, Compra.*
        FROM Cliente
        LEFT JOIN Compra_Cliente ON Cliente.id = Compra_Cliente.cliente_id
        LEFT JOIN Compra ON Compra_Cliente.compra_id = Compra.id
    `;
    pool.query(sql, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rota para adicionar uma compra
app.post('/compras', (req, res) => {
    const { data, valor, status, clienteId } = req.body;
    const sqlCompra = 'INSERT INTO Compra (data, valor, status) VALUES (?, ?, ?)';
    pool.query(sqlCompra, [data, valor, status], (err, result) => {
        if (err) {
            console.error('Erro ao adicionar compra:', err);
            return res.status(500).json({ error: 'Erro ao adicionar compra' });
        }
        const compraId = result.insertId;
        const sqlCompraCliente = 'INSERT INTO Compra_Cliente (cliente_id, compra_id) VALUES (?, ?)';
        pool.query(sqlCompraCliente, [clienteId, compraId], (err, result) => {
            if (err) {
                console.error('Erro ao associar compra ao cliente:', err);
                return res.status(500).json({ error: 'Erro ao associar compra ao cliente' });
            }
            res.send('Compra adicionada com sucesso!');
        });
    });
});

// Rota para listar todas as compras
app.get('/compras', (req, res) => {
    const sql = `
        SELECT Compra.*, Cliente.*
        FROM Compra
        LEFT JOIN Compra_Cliente ON Compra.id = Compra_Cliente.compra_id
        LEFT JOIN Cliente ON Compra_Cliente.cliente_id = Cliente.id
    `;
    pool.query(sql, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rota padrão para servir o arquivo index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
