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
    database: 'minha_aplicacao',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

function initializeDatabase() {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Erro ao conectar ao banco de dados:', err);
            return;
        }

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

        connection.query(createClienteTable, err => {
            if (err) {
                console.error('Erro ao criar tabela Cliente:', err);
                return;
            }
            console.log('Tabela Cliente verificada/criada com sucesso.');

            // Criação da tabela Compra após a tabela Cliente ser criada
            connection.query(createCompraTable, err => {
                if (err) {
                    console.error('Erro ao criar tabela Compra:', err);
                    return;
                }
                console.log('Tabela Compra verificada/criada com sucesso.');

                // Criação da tabela Compra_Cliente após as tabelas Cliente e Compra serem criadas
                connection.query(createCompraClienteTable, err => {
                    if (err) {
                        console.error('Erro ao criar tabela Compra_Cliente:', err);
                        return;
                    }
                    console.log('Tabela Compra_Cliente verificada/criada com sucesso.');
                });
            });
        });

        connection.release();
    });
}

// Chamar a função para inicializar o banco de dados
initializeDatabase();

// Rotas para criar e listar Clientes
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

app.get('/clientes', (req, res) => {
    const sql = 'SELECT id, nome, email, telefone FROM Cliente';
    pool.query(sql, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rotas para criar e listar Compras
app.post('/compras', (req, res) => {
    const { data, valor, status, clienteId } = req.body;
    // Formata a data para o formato desejado (dia/mês/ano)
    const dataFormatada = new Date(data).toLocaleDateString('pt-BR');
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
            // Retorna mensagem de sucesso e dados da compra formatados
            res.send(`Compra adicionada com sucesso! Data: ${dataFormatada}`);
        });
    });
});

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
        // Formata cada compra com data no formato desejado
        results.forEach(compra => {
            compra.data = new Date(compra.data).toLocaleDateString('pt-BR');
        });
        res.json(results);
    });
});

// Rota padrão para servir o arquivo index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
