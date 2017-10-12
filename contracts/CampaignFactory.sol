pragma solidity 0.4.15;


import "./Campaign.sol";


contract CampaignFactory {
    event CampaignCreated(address campaignAddress);

    function createCampaign(
        string _id,
        address _beneficiary,
        string _name,
        string _website,
        bytes32 _whitePaperHash,
        // Params are combined to the array to avoid the “Stack too deep” error
        uint256[] _fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime,
        uint8[] _timeMode_bonusMode,
        uint256[] _bonusLevels,
        uint256[] _bonusRates,
        string _tokenName,
        string _tokenSymbol,
        uint8 _tokenDecimals,
        address[] _distributionRecipients,
        uint256[] _distributionAmounts,
        uint256[] _releaseTimes
    )
    public
    {
        var _campaign = new Campaign(
            _id,
            _beneficiary,
            _name,
            _website,
            _whitePaperHash
        );

        _campaign.setParams(
            _fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime,
            _timeMode_bonusMode,
            _bonusLevels,
            _bonusRates
        );

        _campaign.createToken(
            _tokenName,
            _tokenSymbol,
            _tokenDecimals,
            _distributionRecipients,
            _distributionAmounts,
            _releaseTimes
        );

        CampaignCreated(_campaign);
    }
}