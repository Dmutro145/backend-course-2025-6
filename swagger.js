const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Inventory API',
      version: '1.0.0',
      description: 'Документація для сервісу інвентаризації',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Локальний сервер',
      },
    ],
  },
  apis: ['./main.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
