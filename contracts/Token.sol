pragma solidity 0.4.23;


import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/ownership/NoOwner.sol";


contract Token is MintableToken, NoOwner {
    string constant public version = "1.0.0";

    string public name;

    string public symbol;

    uint8 public decimals;

    enum TimeMode {
        Block,
        Timestamp
    }

    TimeMode public timeMode;

    mapping(address => uint256) public releaseTimes;

    function Token(
        string name_,
        string symbol_,
        uint8 decimals_,
        address[] recipients_,
        uint256[] amounts_,
        uint256[] releaseTimes_,
        uint8 timeMode_
    )
    public
    {
        require(recipients_.length == amounts_.length);
        require(recipients_.length == releaseTimes_.length);

        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        timeMode = TimeMode(timeMode_);

        // Mint pre-distributed tokens
        for (uint8 i = 0; i < recipients_.length; i++) {
            mint(recipients_[i], amounts_[i]);
            if (releaseTimes_[i] > 0) {
                releaseTimes[recipients_[i]] = releaseTimes_[i];
            }
        }
    }

    function transfer(address to, uint256 value)
    public
    returns (bool)
    {
        // Transfer is forbidden until minting is finished
        require(mintingFinished);

        // Transfer of time-locked funds is forbidden
        require(!timeLocked(msg.sender));

        return super.transfer(to, value);
    }

    function transferFrom(address from, address to, uint256 value)
    public
    returns (bool)
    {
        // Transfer is forbidden until minting is finished
        require(mintingFinished);

        // Transfer of time-locked funds is forbidden
        require(!timeLocked(from));

        return super.transferFrom(from, to, value);
    }

    // Checks if funds of a given address are time-locked
    function timeLocked(address spender)
    public
    returns (bool)
    {
        if (releaseTimes[spender] == 0) {
            return false;
        }

        // If time-lock is expired, delete it
        var time = timeMode == TimeMode.Timestamp ? block.timestamp : block.number;
        if (releaseTimes[spender] <= time) {
            delete releaseTimes[spender];
            return false;
        }

        return true;
    }
}
