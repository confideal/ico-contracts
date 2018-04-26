const CampaignFactory = artifacts.require('CampaignFactory');
const Campaign = artifacts.require('Campaign');
const Token = artifacts.require('Token');

const SOME_ADDRESS = '0x2005d0df9a878228dcfc6da74ffa1e782a75c88d';
const WHITEPAPER_HASH = '0xc15a0175e131a752d83e216abc4e4ff3377278f83d50c0bec9bc3460e68696d6';
const TIME_MODE_TIMESTAMP = 1;
const BONUS_MODE_AMOUNT_RAISED = 3;

contract('CampaignFactory', () => {
    it('should create a campaign', () => {
        return CampaignFactory.deployed()
            .then(campaignFactory => campaignFactory.createCampaign(
                'cnfdl',
                SOME_ADDRESS,
                'Confideal',
                'https://confideal.io',
                WHITEPAPER_HASH,
                [10000, 20000, 10000, 1555555555, 1555588888, TIME_MODE_TIMESTAMP, BONUS_MODE_AMOUNT_RAISED, 8],
                [],
                [],
                'Confideal Token',
                'CDL',
                [],
                [],
                [],
                '',
                {
                    value: web3.toWei(9.95),
                }
            ))
            .then(result => {
                assert.equal(result.logs.length, 1);
                assert.equal(result.logs[0].event, 'CampaignCreated');
                return Campaign.at(result.logs[0].args.campaign).token.call();
            })
            .then(tokenAddress => Token.at(tokenAddress).symbol.call())
            .then(tokenSymbol => assert.equal(tokenSymbol, 'CDL'));
    });
});