var CampaignFactory = artifacts.require("./CampaignFactory.sol");

module.exports = function (deployer) {
    deployer.deploy(CampaignFactory);
};
