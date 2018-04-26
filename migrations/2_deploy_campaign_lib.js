const CampaignLib = artifacts.require("./CampaignLib.sol");
const Campaign = artifacts.require("./Campaign.sol");
const CampaignFactory = artifacts.require("./CampaignFactory.sol");

module.exports = (deployer) => {
    deployer.deploy(CampaignLib);
    deployer.link(CampaignLib, [Campaign, CampaignFactory]);
};
