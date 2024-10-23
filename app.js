const express = require('express');
const request = require('request');
const fs = require('fs');
const path = require('path');
const https = require('https'); // Import the https module

const app = express();
app.use(express.json());

const testConfig = {
    payeeAlias: "1231181189",
    host: "https://mss.cpc.getswish.net/swish-cpcapi",
    qrHost: "https://mpc.getswish.net/qrg-swish",
    cert: path.resolve(__dirname, 'ssl/Swish_Merchant_TestCertificate_1234679304.pem'),
    key: path.resolve(__dirname, 'ssl/Swish_Merchant_TestCertificate_1234679304.key'),
    ca: path.resolve(__dirname, 'ssl/Swish_TLS_RootCA.pem'),
    passphrase: "swish"
};

const prodConfig = {
    payeeAlias: "YOUR_PAYEE_ALIAS",
    host: "https://cpc.getswish.net/swish-cpcapi",
    qrHost: "https://mpc.getswish.net/qrg-swish",
    cert: path.resolve(__dirname, 'ssl/prod.pem'),
    key: path.resolve(__dirname, 'ssl/prod.key'),
    passphrase: null
};

const config = testConfig;

// Demo Web Frontend
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

// Create Payment Request
app.post('/paymentrequests', function (req, res) {
    const json = {
        payeePaymentReference: "0123456789",
        callbackUrl: "https://webhook.site/a8f9b5c2-f2da-4bb8-8181-fcb84a6659ea",
        payeeAlias: config.payeeAlias,
        payerAlias: req.body.payerAlias,
        amount: req.body.amount,
        currency: "SEK",
        message: req.body.message
    };

    const options = requestOptions('POST', `${config.host}/api/v1/paymentrequests`, json);

    request(options, (error, response, body) => {
        logResult(error, response);

        if (!response) {
            res.status(500).send(error);
            return;
        }

        res.status(response.statusCode);
        if (response.statusCode == 201) {
            const location = response.headers['location'];
            const token = response.headers['paymentrequesttoken'];

            const opt = requestOptions('GET', location);

            request(opt, (err, resp, bod) => {
                logResult(err, resp);

                if (!resp) {
                    res.status(500).send(err);
                    return;
                }

                const id = resp.body['id'];

                res.json({
                    url: location,
                    token: token,
                    id: id
                });
            });
        } else {
            res.send(body);
            return;
        }
    });
});

// Get Payment Request
app.get('/paymentrequests/:requestId', function (req, res) {
    const options = requestOptions('GET', `${config.host}/api/v1/paymentrequests/${req.params.requestId}`);

    request(options, (error, response, body) => {
        logResult(error, response);

        if (!response) {
            res.status(500).send(error);
            return;
        }

        res.status(response.statusCode);
        if (response.statusCode == 200) {
            res.json({
                id: response.body['id'],
                paymentReference: response.body['paymentReference'] || "",
                status: response.body['status']
            });
        } else {
            res.send(body);
            return;
        }
    });
});

// Create Refund
app.post('/refunds', function (req, res) {
    const json = {
        payeePaymentReference: "0123456789",
        originalPaymentReference: req.body.originalPaymentReference,
        callbackUrl: "https://webhook.site/a8f9b5c2-f2da-4bb8-8181-fcb84a6659ea",
        payerAlias: config.payeeAlias,
        amount: req.body.amount,
        currency: "SEK",
        message: req.body.message
    };

    const options = requestOptions('POST', `${config.host}/api/v1/refunds`, json);

    request(options, (error, response, body) => {
        logResult(error, response);

        if (!response) {
            res.status(500).send(error);
            return;
        }

        res.status(response.statusCode);
        if (response.statusCode == 201) {
            const location = response.headers['location'];
            const token = response.headers['paymentrequesttoken'];
            const opt = requestOptions('GET', location);

            request(opt, (err, resp, bod) => {
                logResult(err, resp);

                const id = resp.body['id'];
                const originalPaymentReference = resp.body['originalPaymentReference'];
                const status = resp.body['status'];

                res.json({
                    url: location,
                    token: token,
                    originalPaymentReference: originalPaymentReference,
                    status: status,
                    id: id
                });
            });
        } else {
            res.send(body);
            return;
        }
    });
});

// Get Refund
app.get('/refunds/:refundId', function (req, res) {
    const options = requestOptions('GET', `${config.host}/api/v1/refunds/${req.params.refundId}`);

    request(options, (error, response, body) => {
        logResult(error, response);

        if (!response) {
            res.status(500).send(error);
            return;
        }

        res.status(response.statusCode);
        if (response.statusCode == 200) {
            res.json({
                id: response.body['id'],
                originalPaymentReference: response.body['originalPaymentReference'] || "",
                status: response.body['status']
            });
        } else {
            res.send(body);
            return;
        }
    });
});

// Get QR Code
app.get('/qr/:token', function (req, res) {
    const token = req.params.token;

    const json = {
        token: token,
        size: "600",
        format: "png",
        border: "0"
    };

    const options = requestOptions('POST', `${config.qrHost}/api/v1/commerce`, json);

    request(options, (error, response, body) => {
        logResult(error, response);

        if (!response) {
            res.status(500).send(error);
            return;
        }

        res.status(response.statusCode);
        res.set('Content-Type', 'image/png'); // Set the content type for the QR code image
        res.send(body); // Send the QR code image in the response
    });
});

function requestOptions(method, uri, body) {
    return {
        method: method,
        uri: uri,
        json: true,
        body: body,
        'content-type': 'application/json',
        cert: fs.readFileSync(config.cert),
        key: fs.readFileSync(config.key),
        ca: config.ca ? fs.readFileSync(config.ca) : null,
        passphrase: config.passphrase
    };
}

function logResult(error, response) {
    if (error) {
        console.log(error);
    }
    if (response) {
        console.log(response.statusCode);
        console.log(response.headers);
        console.log(response.body);
    }
}

// Create HTTPS server
const httpsOptions = {
    key: fs.readFileSync(config.key),
    cert: fs.readFileSync(config.cert),
    ca: config.ca ? fs.readFileSync(config.ca) : null,
    passphrase: config.passphrase
};

https.createServer(httpsOptions, app) // Create HTTPS server
    .listen(3000, () => console.log(`Merchant Demo app listening on port 3000 over HTTPS`));
