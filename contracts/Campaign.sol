pragma solidity 0.4.23;

import "zeppelin-solidity/contracts/ReentrancyGuard.sol";

import "./CampaignLib.sol";

contract Campaign is ReentrancyGuard {
    using CampaignLib for CampaignLib.CampaignData;

    string constant public version = "1.0.0";

    CampaignLib.CampaignData private data;

    function Campaign(
        string id,
        address beneficiary,
        string name,
        string website,
        bytes32 whitePaperHash,
        uint256[] fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime_timeMode_bonusMode,
        uint256[] bonusLevels,
        uint256[] bonusRates
    )
    public
    {
        CampaignLib.CampaignParams memory params = CampaignLib.CampaignParams(
            id,
            beneficiary,
            name,
            website,
            whitePaperHash,
            fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime_timeMode_bonusMode[0],
            fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime_timeMode_bonusMode[1],
            fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime_timeMode_bonusMode[2],
            fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime_timeMode_bonusMode[3],
            fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime_timeMode_bonusMode[4],
            CampaignLib.TimeMode(fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime_timeMode_bonusMode[5]),
            CampaignLib.BonusMode(fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime_timeMode_bonusMode[6]),
            bonusLevels,
            bonusRates
        );
        data.init(params);
    }

    function setBilling(
        address billing,
        string promoCode
    )
    external
    payable
    {
        data.setBilling(billing, promoCode);
    }

    function createToken(
        string tokenName,
        string tokenSymbol,
        uint8 tokenDecimals,
        address[] distributionRecipients,
        uint256[] distributionAmounts,
        uint256[] releaseTimes
    )
    external
    {
        data.createToken(
            tokenName,
            tokenSymbol,
            tokenDecimals,
            distributionRecipients,
            distributionAmounts,
            releaseTimes
        );
    }

    function()
    external
    payable
    {
        data.contribute();
    }

    function withdrawPayout()
    external
    nonReentrant
    {
        data.withdrawPayout();
    }

    // Anyone can make tokens available when the campaign is successful
    function releaseTokens()
    external
    {
        data.releaseTokens();
    }

    function withdrawRefund()
    external
    nonReentrant
    {
        data.withdrawRefund();
    }

    function token()
    external
    view
    returns (address)
    {
        return data.token;
    }

    function stage()
    external
    view
    returns (uint8)
    {
        return uint8(data.stage());
    }

    function id()
    external
    view
    returns (string)
    {
        return data.params.id;
    }

    function beneficiary()
    external
    view
    returns (address)
    {
        return data.params.beneficiary;
    }

    function name()
    external
    view
    returns (string)
    {
        return data.params.name;
    }

    function website()
    external
    view
    returns (string)
    {
        return data.params.website;
    }

    function whitePaperHash()
    external
    view
    returns (bytes32)
    {
        return data.params.whitePaperHash;
    }

    function fundingThreshold()
    external
    view
    returns (uint256)
    {
        return data.params.fundingThreshold;
    }

    function fundingGoal()
    external
    view
    returns (uint256)
    {
        return data.params.fundingGoal;
    }

    function tokenPrice()
    external
    view
    returns (uint256)
    {
        return data.params.tokenPrice;
    }

    function timeMode()
    external
    view
    returns (uint8)
    {
        return uint8(data.params.timeMode);
    }

    function startTime()
    external
    view
    returns (uint256)
    {
        return data.params.startTime;
    }

    function finishTime()
    external
    view
    returns (uint256)
    {
        return data.params.finishTime;
    }

    function bonusMode()
    external
    view
    returns (uint8)
    {
        return uint8(data.params.bonusMode);
    }

    function bonusLevels(uint8 index)
    external
    view
    returns (uint256)
    {
        return data.params.bonusLevels[index];
    }

    function bonusRates(uint8 index)
    external
    view
    returns (uint256)
    {
        return data.params.bonusRates[index];
    }

    function amountRaised()
    external
    view
    returns (uint256)
    {
        return data.amountRaised;
    }

    function minContribution()
    external
    view
    returns (uint256)
    {
        return data.minContribution;
    }

    function earlySuccessTimestamp()
    external
    view
    returns (uint256)
    {
        return data.earlySuccessTimestamp;
    }

    function earlySuccessBlock()
    external
    view
    returns (uint256)
    {
        return data.earlySuccessBlock;
    }

    function contributions(address from)
    external
    view
    returns (uint256)
    {
        return data.contributions[from];
    }
}
