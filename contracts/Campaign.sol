pragma solidity ^0.4.11;


import "zeppelin-solidity/contracts/ownership/Claimable.sol";
import "zeppelin-solidity/contracts/ownership/HasNoTokens.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ReentrancyGuard.sol";

import "./Token.sol";


contract Campaign is Claimable, HasNoTokens, ReentrancyGuard {
    using SafeMath for uint256;

    string constant public version = "1.0.0";

    string public id;

    string public name;

    string public website;

    bytes32 public whitePaperHash;

    uint256 public fundingThreshold;

    uint256 public fundingGoal;

    uint256 public tokenPrice;

    enum TimeMode {
        Block,
        Timestamp
    }

    TimeMode public timeMode;

    uint256 public startTime;

    uint256 public finishTime;

    enum BonusMode {
        Flat,
        Block,
        Timestamp,
        AmountRaised,
        ContributionAmount
    }

    BonusMode public bonusMode;

    uint256[] public bonusLevels;

    uint256[] public bonusRates; // coefficients in wei

    address public beneficiary;

    uint256 public amountRaised;

    uint256 public earlySuccessTimestamp;

    uint256 public earlySuccessBlock;

    mapping (address => uint256) public contributions;

    Token public token;

    enum Stage {
        Init,
        Ready,
        InProgress,
        Failure,
        Success
    }

    function stage()
    public
    constant
    returns (Stage)
    {
        if (token == address(0)) {
            return Stage.Init;
        }

        var _time = timeMode == TimeMode.Timestamp ? block.timestamp : block.number;

        if (_time < startTime) {
            return Stage.Ready;
        }

        if (finishTime <= _time) {
            if (amountRaised < fundingThreshold) {
                return Stage.Failure;
            }
            return Stage.Success;
        }

        if (fundingGoal <= amountRaised) {
            return Stage.Success;
        }

        return Stage.InProgress;
    }

    modifier atStage(Stage _stage) {
        require(stage() == _stage);
        _;
    }

    event Contribution(address sender, uint256 amount);

    event Refund(address recipient, uint256 amount);

    event Payout(address recipient, uint256 amount);

    event EarlySuccess();

    function Campaign(
        string _id,
        address _beneficiary,
        string _name,
        string _website,
        bytes32 _whitePaperHash
    ) {
        id = _id;
        beneficiary = _beneficiary;
        name = _name;
        website = _website;
        whitePaperHash = _whitePaperHash;
    }

    function setParams(
        // Params are combined to the array to avoid the “Stack too deep” error
        uint256[] _fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime,
        uint8[] _timeMode_bonusMode,
        uint256[] _bonusLevels,
        uint256[] _bonusRates
    )
    public
    onlyOwner
    atStage(Stage.Init)
    {
        assert(fundingGoal == 0);

        fundingThreshold = _fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime[0];
        fundingGoal = _fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime[1];
        tokenPrice = _fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime[2];
        timeMode = TimeMode(_timeMode_bonusMode[0]);
        startTime = _fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime[3];
        finishTime = _fundingThreshold_fundingGoal_tokenPrice_startTime_finishTime[4];
        bonusMode = BonusMode(_timeMode_bonusMode[1]);
        bonusLevels = _bonusLevels;
        bonusRates = _bonusRates;

        require(fundingThreshold > 0);
        require(fundingThreshold <= fundingGoal);
        require(startTime < finishTime);
        require((timeMode == TimeMode.Block ? block.number : block.timestamp) < startTime);
        require(bonusLevels.length == bonusRates.length);
    }

    function createToken(
        string _tokenName,
        string _tokenSymbol,
        uint8 _tokenDecimals,
        address[] _distributionRecipients,
        uint256[] _distributionAmounts,
        uint256[] _releaseTimes
    )
    public
    onlyOwner
    atStage(Stage.Init)
    {
        assert(fundingGoal > 0);
        require(_distributionRecipients.length == _distributionAmounts.length);
        token = new Token(
            _tokenName,
            _tokenSymbol,
            _tokenDecimals,
            _distributionRecipients,
            _distributionAmounts,
            _releaseTimes,
            uint8(timeMode)
        );
    }

    function()
    public
    payable
    atStage(Stage.InProgress)
    {
        require(msg.value > 0);

        contributions[msg.sender] = contributions[msg.sender].add(msg.value);

        // Calculate bonus
        uint256 _level;
        uint256 _tokensAmount;
        uint i;
        if (bonusMode == BonusMode.AmountRaised) {
            _level = amountRaised;
            uint256 _value = msg.value;
            uint256 _weightedRateSum = 0;
            uint256 _stepAmount;
            for (i = 0; i < bonusLevels.length; i++) {
                if (_level <= bonusLevels[i]) {
                    _stepAmount = bonusLevels[i].sub(_level);
                    if (_value <= _stepAmount) {
                        _level = _level.add(_value);
                        _weightedRateSum = _weightedRateSum.add(_value.mul(bonusRates[i]));
                        _value = 0;
                        break;
                    } else {
                        _level = _level.add(_stepAmount);
                        _weightedRateSum = _weightedRateSum.add(_stepAmount.mul(bonusRates[i]));
                        _value = _value.sub(_stepAmount);
                    }
                }
            }
            _weightedRateSum = _weightedRateSum.add(_value.mul(1 ether));

            _tokensAmount = _weightedRateSum.div(1 ether).mul(10 ** uint256(token.decimals())).div(tokenPrice);
        } else {
            _tokensAmount = msg.value.mul(10 ** uint256(token.decimals())).div(tokenPrice);

            if (bonusMode == BonusMode.Block) {
                _level = block.number;
            }
            if (bonusMode == BonusMode.Timestamp) {
                _level = block.timestamp;
            }
            if (bonusMode == BonusMode.ContributionAmount) {
                _level = msg.value;
            }

            for (i = 0; i < bonusLevels.length; i++) {
                if (_level <= bonusLevels[i]) {
                    _tokensAmount = _tokensAmount.mul(bonusRates[i]).div(1 ether);
                    break;
                }
            }
        }

        amountRaised = amountRaised.add(msg.value);

        // We don’t want more than the funding goal
        require(amountRaised <= fundingGoal);

        token.mint(msg.sender, _tokensAmount);

        Contribution(msg.sender, msg.value);

        if (fundingGoal <= amountRaised) {
            earlySuccessTimestamp = block.timestamp;
            earlySuccessBlock = block.number;
            token.finishMinting();
            EarlySuccess();
        }
    }

    function withdrawPayout()
    public
    atStage(Stage.Success)
    {
        require(msg.sender == beneficiary);

        if (!token.mintingFinished()) {
            token.finishMinting();
        }

        var _amount = this.balance;
        require(beneficiary.call.value(_amount)());
        Payout(beneficiary, _amount);
    }

    // Anyone can make tokens available when the campaign is successful
    function releaseTokens()
    public
    atStage(Stage.Success)
    {
        require(!token.mintingFinished());
        token.finishMinting();
    }

    function withdrawRefund()
    public
    atStage(Stage.Failure)
    nonReentrant
    {
        var _amount = contributions[msg.sender];

        require(_amount > 0);

        contributions[msg.sender] = 0;

        msg.sender.transfer(_amount);
        Refund(msg.sender, _amount);
    }
}
