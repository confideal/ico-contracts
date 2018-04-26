const Billing = artifacts.require("./billing/Billing.sol");

module.exports = (deployer) => {
    deployer.deploy(Billing);
};
