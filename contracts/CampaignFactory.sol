pragma solidity 0.4.23;

import "zeppelin-solidity/contracts/ownership/Claimable.sol";

import "./Campaign.sol";


contract CampaignFactory is Claimable {
    address public billing;

    event CampaignCreated(address campaign);

    function CampaignFactory(address billingContract)
    public
    {
        billing = billingContract;
    }

    function createCampaign(
        string id,
        address beneficiary,
        string name,
        string website,
        // Params are combined to the array to avoid the “Stack too deep” error
        bytes32 whitePaperHash,
        uint256[] fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime_timeMode_bonusMode_tokenDecimals,
        uint256[] bonusLevels,
        uint256[] bonusRates,
        string tokenName,
        string tokenSymbol,
        address[] distributionRecipients,
        uint256[] distributionAmounts,
        uint256[] releaseTimes,
        string promoCode
    )
    public
    payable
    {
        Campaign campaign = new Campaign(
            id,
            beneficiary,
            name,
            website,
            whitePaperHash,
            fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime_timeMode_bonusMode_tokenDecimals,
            bonusLevels,
            bonusRates
        );

        campaign.setBilling.value(msg.value)(
            billing,
            promoCode
        );

        campaign.createToken(
            tokenName,
            tokenSymbol,
            uint8(fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime_timeMode_bonusMode_tokenDecimals[7]),
            distributionRecipients,
            distributionAmounts,
            releaseTimes
        );

        CampaignCreated(campaign);
    }

    function setBilling(address billingContract)
    public
    onlyOwner
    {
        billing = billingContract;
    }
}