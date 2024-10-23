const fs = require('fs');
const https = require('https');
const axios = require('axios');

// Read SSL certificates and keys
const agent = new https.Agent({
  cert: fs.readFileSync('./ssl/test.pem', { encoding: 'utf8' }), // Path to your certificate
  key: fs.readFileSync('./ssl/test.key', { encoding: 'utf8' }), // Path to your private key
  ca: fs.readFileSync('./ssl/Swish_TLS_RootCA.pem', { encoding: 'utf8' }), // Path to your CA
});

// Function to generate a UUID
function getUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0,
          v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Using Axios as HTTP library
const client = axios.create({
  httpsAgent: agent
});

// Setup the data object for the payment
const instructionId = getUUID(); // Generate a unique instruction ID
const data = {
  payeePaymentReference: '0123456789',
  callbackUrl: 'https://example.com/swishcallback',
  payeeAlias: '1234679304',
  currency: 'SEK',
  payerAlias: '4671234768',
  amount: '100',
  message: 'Kingston USB Flash Drive 8 GB'
};

// Make the PUT request to create the payment request
client.put(
  `https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests/${instructionId}`,
  data
).then((res) => {
  console.log('Payment request created:', res.data); // Log the response data
}).catch((error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    console.error('Error Response Data:', error.response.data);
    console.error('Error Response Status:', error.response.status);
    console.error('Error Response Headers:', error.response.headers);
  } else if (error.request) {
    // The request was made but no response was received
    console.error('No response received:', error.request);
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Error:', error.message);
  }
});
