# Imagem base
FROM node:14

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código da aplicação
COPY . .

# Expor porta da aplicação
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["node", "server.js"]
