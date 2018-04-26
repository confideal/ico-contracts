pragma solidity 0.4.23;

import "./Token.sol";
import "./BillingInterface.sol";


library CampaignLib {
    using SafeMath for uint256;

    string constant public version = "1.0.0";

    enum TimeMode {
        Block,
        Timestamp
    }

    enum BonusMode {
        Flat,
        Block,
        Timestamp,
        AmountRaised,
        ContributionAmount
    }

    enum Stage {
        Init,
        Ready,
        InProgress,
        Failure,
        Success
    }

    struct CampaignParams {
        string id;
        address beneficiary;
        string name;
        string website;
        bytes32 whitePaperHash;
        uint256 fundingThreshold;
        uint256 fundingGoal;
        uint256 tokenPrice;
        uint256 startTime;
        uint256 finishTime;
        TimeMode timeMode;
        BonusMode bonusMode;
        uint256[] bonusLevels;
        uint256[] bonusRates; // coefficients in ether
    }

    struct CampaignData {
        CampaignParams params;
        address owner;
        uint256 amountRaised;
        uint256 minContribution;
        uint256 earlySuccessTimestamp;
        uint256 earlySuccessBlock;
        mapping(address => uint256) contributions;
        Token token;
        BillingInterface billing;
    }

    event Contribution(address sender, uint256 amount);

    event Refund(address recipient, uint256 amount);

    event Payout(address recipient, uint256 amount);

    event EarlySuccess();

    function stage(CampaignData storage campaign)
    internal
    view
    returns (Stage)
    {
        if (campaign.token == address(0)) {
            return Stage.Init;
        }

        var time = campaign.params.timeMode == TimeMode.Timestamp ? block.timestamp : block.number;

        if (time < campaign.params.startTime) {
            return Stage.Ready;
        }

        if (campaign.params.finishTime <= time) {
            if (campaign.amountRaised < campaign.params.fundingThreshold) {
                return Stage.Failure;
            }
            return Stage.Success;
        }

        if (campaign.params.fundingGoal <= campaign.amountRaised) {
            return Stage.Success;
        }

        return Stage.InProgress;
    }

    function init(
        CampaignData storage campaign,
        CampaignParams memory params
    )
    internal
    {
        require(params.fundingThreshold > 0);
        require(params.fundingThreshold <= params.fundingGoal);
        require(params.startTime < params.finishTime);
        require((params.timeMode == TimeMode.Block ? block.number : block.timestamp) < params.startTime);
        require(params.bonusLevels.length == params.bonusRates.length);

        campaign.params = params;
        campaign.owner = msg.sender;
    }

    function setBilling(
        CampaignData storage campaign,
        address billing,
        string promoCode
    )
    internal
    {
        require(stage(campaign) == Stage.Init);
        require(msg.sender == campaign.owner);

        assert(campaign.params.fundingGoal > 0);

        campaign.billing = BillingInterface(billing);

        if (msg.value > 0) { // prepayment
            campaign.billing.collectPrepayment.value(msg.value)(promoCode);
        } else { // post payment
            campaign.billing.register(promoCode);
        }
    }

    function createToken(
        CampaignData storage campaign,
        string tokenName,
        string tokenSymbol,
        uint8 tokenDecimals,
        address[] distributionRecipients,
        uint256[] distributionAmounts,
        uint256[] releaseTimes
    )
    internal
    {
        require(stage(campaign) == Stage.Init);
        require(msg.sender == campaign.owner);

        assert(address(campaign.billing) != address(0));

        campaign.token = new Token(
            tokenName,
            tokenSymbol,
            tokenDecimals,
            distributionRecipients,
            distributionAmounts,
            releaseTimes,
            uint8(campaign.params.timeMode)
        );

        campaign.minContribution = campaign.params.tokenPrice.div(10 ** uint256(campaign.token.decimals()));
        if (campaign.minContribution < 1 wei) {
            campaign.minContribution = 1 wei;
        }
    }

    function contribute(CampaignData storage campaign)
    public
    {
        require(stage(campaign) == Stage.InProgress);
        require(campaign.minContribution <= msg.value);

        campaign.contributions[msg.sender] = campaign.contributions[msg.sender].add(msg.value);

        // Calculate bonus
        uint256 level;
        uint256 tokensAmount;
        uint i;
        if (campaign.params.bonusMode == BonusMode.AmountRaised) {
            level = campaign.amountRaised;
            uint256 value = msg.value;
            uint256 weightedRateSum = 0;
            uint256 stepAmount;
            for (i = 0; i < campaign.params.bonusLevels.length; i++) {
                if (level <= campaign.params.bonusLevels[i]) {
                    stepAmount = campaign.params.bonusLevels[i].sub(level);
                    if (value <= stepAmount) {
                        level = level.add(value);
                        weightedRateSum = weightedRateSum.add(value.mul(campaign.params.bonusRates[i]));
                        value = 0;
                        break;
                    } else {
                        level = level.add(stepAmount);
                        weightedRateSum = weightedRateSum.add(stepAmount.mul(campaign.params.bonusRates[i]));
                        value = value.sub(stepAmount);
                    }
                }
            }
            weightedRateSum = weightedRateSum.add(value.mul(1 ether));

            tokensAmount = weightedRateSum
                .div(1 ether)
                .mul(10 ** uint256(campaign.token.decimals()))
                .div(campaign.params.tokenPrice);
        } else {
            tokensAmount = msg.value.mul(10 ** uint256(campaign.token.decimals())).div(campaign.params.tokenPrice);

            if (campaign.params.bonusMode != BonusMode.Flat) {
                if (campaign.params.bonusMode == BonusMode.Block) {
                    level = block.number;
                }
                if (campaign.params.bonusMode == BonusMode.Timestamp) {
                    level = block.timestamp;
                }
                if (campaign.params.bonusMode == BonusMode.ContributionAmount) {
                    level = msg.value;
                }

                for (i = 0; i < campaign.params.bonusLevels.length; i++) {
                    if (level <= campaign.params.bonusLevels[i]) {
                        tokensAmount = tokensAmount.mul(campaign.params.bonusRates[i]).div(1 ether);
                        break;
                    }
                }
            }
        }

        campaign.amountRaised = campaign.amountRaised.add(msg.value);

        // We don’t want more than the funding goal
        require(campaign.amountRaised <= campaign.params.fundingGoal);

        require(campaign.token.mint(msg.sender, tokensAmount));

        Contribution(msg.sender, msg.value);

        if (campaign.params.fundingGoal <= campaign.amountRaised) {
            campaign.earlySuccessTimestamp = block.timestamp;
            campaign.earlySuccessBlock = block.number;
            campaign.token.finishMinting();
            EarlySuccess();
        }
    }

    function withdrawPayout(CampaignData storage campaign)
    public
    {
        require(stage(campaign) == Stage.Success);
        require(msg.sender == campaign.params.beneficiary);

        if (!campaign.token.mintingFinished()) {
            campaign.token.finishMinting();
        }

        uint256 postPayment = campaign.billing.calculatePostPayment();
        campaign.billing.collectPostPayment.value(postPayment)();

        uint256 amount = this.balance;
        require(campaign.params.beneficiary.call.value(amount)());
        Payout(campaign.params.beneficiary, amount);
    }

    // Anyone can make tokens available when the campaign is successful
    function releaseTokens(CampaignData storage campaign)
    public
    {
        require(stage(campaign) == Stage.Success);
        require(!campaign.token.mintingFinished());
        campaign.token.finishMinting();
    }

    function withdrawRefund(CampaignData storage campaign)
    public
    {
        require(stage(campaign) == Stage.Failure);

        uint256 amount = campaign.contributions[msg.sender];

        require(amount > 0);

        campaign.contributions[msg.sender] = 0;

        msg.sender.transfer(amount);
        Refund(msg.sender, amount);
    }
}
