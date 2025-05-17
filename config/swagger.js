const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Appeals API',
      version: '1.0.0',
      description: 'API for managing anonymous appeals with statuses: new, in-progress, completed, canceled.',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Local development server',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'], // Paths to files with JSDoc comments
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};