const axios = require('axios');

const deezerApi = axios.create({
  baseURL: 'https://api.deezer.com',
  timeout: 8000,
});

module.exports = deezerApi;