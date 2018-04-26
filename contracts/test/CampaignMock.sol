pragma solidity ^0.4.0;

import "../billing/Billing.sol";

contract CampaignMock {
    Billing public billing;

    uint256 public amountRaised;
    uint256 public fundingThreshold;

    function CampaignMock(Billing billing_)
    public
    {
        billing = billing_;
    }

    function setAmountRaised(uint256 amount)
    public
    {
        amountRaised = amount;
    }

    function setFundingThreshold(uint256 amount)
    public
    {
        fundingThreshold = amount;
    }

    function register(string promoCode)
    public
    {
        billing.register(promoCode);
    }

    function calculatePostPayment()
    public
    view
    returns (uint256)
    {
        return billing.calculatePostPayment();
    }

    function collectPostPayment()
    public
    payable
    {
        billing.collectPostPayment.value(msg.value)();
    }
}
