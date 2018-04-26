pragma solidity ^0.4.0;

contract BillingMock {
    struct Call {
        string method;
        string param;
        uint256 value;
    }

    Call[] public calls;

    uint256 public postPayment;

    function callsCount()
    public
    view
    returns (uint256)
    {
        return calls.length;
    }

    function setPostPayment(uint256 amount)
    public
    {
        postPayment = amount;
    }

    function collectPrepayment(string promoCode)
    public
    payable
    {
        calls.push(Call("collectPrepayment", promoCode, msg.value));
    }

    function register(string promoCode)
    public
    {
        calls.push(Call("register", promoCode, 0));
    }

    function calculatePostPayment()
    public
    view
    returns (uint256)
    {
        return postPayment;
    }

    function collectPostPayment()
    public
    payable
    {
        calls.push(Call("collectPostPayment", '', msg.value));
    }
}
