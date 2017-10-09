const CampaignFactory = artifacts.require('CampaignFactory');
const Campaign = artifacts.require('Campaign');
const Token = artifacts.require('Token');

const SOME_ADDRESS = '0x2005d0df9a878228dcfc6da74ffa1e782a75c88d';
const WHITEPAPER_HASH = '0xc15a0175e131a752d83e216abc4e4ff3377278f83d50c0bec9bc3460e68696d6';
const TIME_MODE_TIMESTAMP = 1;
const BONUS_MODE_AMOUNT_RAISED = 3;

contract('CampaignFactory', function () {
    it('should create a campaign', function () {
        return CampaignFactory.deployed()
            .then(function (campaignFactory) {
                return campaignFactory.createCampaign(
                    'cnfdl',
                    SOME_ADDRESS,
                    'Confideal',
                    'https://confideal.io',
                    WHITEPAPER_HASH,
                    [10000, 20000, 10000, 1555555555, 1555588888],
                    [TIME_MODE_TIMESTAMP, BONUS_MODE_AMOUNT_RAISED],
                    [],
                    [],
                    'Confideal Token',
                    'CDL',
                    8,
                    [],
                    [],
                    []
                );
            })
            .then(function (result) {
                assert.equal(result.logs.length, 1);
                assert.equal(result.logs[0].event, 'CampaignCreated');
                return Campaign.at(result.logs[0].args.campaignAddress).token.call();
            })
            .then(function (tokenAddress) {
                return Token.at(tokenAddress).symbol.call();
            })
            .then(function (tokenSymbol) {
                assert.equal(tokenSymbol, 'CDL');
            });
    });
});