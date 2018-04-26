pragma solidity 0.4.23;

contract BillingInterface {
    function collectPrepayment(string promoCode)
    public
    payable;

    function register(string promoCode)
    public;

    function calculatePostPayment()
    public
    view
    returns (uint256);

    function collectPostPayment()
    public
    payable;
}
