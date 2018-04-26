const gasLimit = 4500000;

module.exports = {
    networks: {
        development: {
            host: 'localhost',
            port: 8888,
            network_id: 42,
            gas: gasLimit
        }
    },
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
};
