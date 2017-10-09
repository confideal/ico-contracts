pragma solidity ^0.4.11;


import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/ownership/NoOwner.sol";


contract Token is MintableToken, NoOwner {
    string public version = "1.0.0";

    string public name;

    string public symbol;

    uint8 public decimals;

    enum TimeMode {
        Block,
        Timestamp
    }

    TimeMode public timeMode;

    mapping (address => uint256) public releaseTimes;

    function Token(
        string _name,
        string _symbol,
        uint8 _decimals,
        address[] _recipients,
        uint256[] _amounts,
        uint256[] _releaseTimes,
        uint8 _timeMode
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        timeMode = TimeMode(_timeMode);

        // Issue tokens to the recipients
        for (uint256 i = 0; i < _recipients.length; i ++) {
            mint(_recipients[i], _amounts[i]);
            if (_releaseTimes[i] > 0) {
                releaseTimes[_recipients[i]] = _releaseTimes[i];
            }
        }
    }

    function transfer(address _to, uint256 _value)
    returns (bool)
    {
        require(mintingFinished);
        require(!timeLocked(msg.sender));
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value)
    returns (bool)
    {
        require(mintingFinished);
        require(!timeLocked(_from));
        return super.transferFrom(_from, _to, _value);
    }

    function timeLocked(address _spender)
    returns (bool)
    {
        if (releaseTimes[_spender] == 0) {
            return false;
        }

        var _time = timeMode == TimeMode.Timestamp ? block.timestamp : block.number;
        if (releaseTimes[_spender] <= _time) {
            delete releaseTimes[_spender];
            return false;
        }

        return true;
    }
}
