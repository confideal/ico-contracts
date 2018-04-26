const Billing = artifacts.require("./billing/Billing.sol");
const CampaignFactory = artifacts.require("./CampaignFactory.sol");

module.exports = (deployer) => {
    deployer.deploy(CampaignFactory, Billing.address);
};
